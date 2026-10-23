import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Brain, Camera, DoorOpen, Droplets, Faucet, HeartHandshake, Home, Layers, Lightbulb, MousePointer2, PhoneCall, ShieldCheck, Users, Watch, Zap } from 'lucide-react'
import { startScene } from '../landing/scene'
import './slides.css'

const PAGE_COUNT = 13
const SLIDE_CANVAS_WIDTH = 1600 // matches .slides-fixed .slides-page in slides.css

const members = [
  { name: 'TAN SHIHAN', role: 'Team Leader & Project Manager', photo: '/images/team-tan-shi-han.jpeg', email: 'bryantan7837@gmail.com', phone: '01111651882' },
  { name: 'LIM JING JET', role: 'Legal & Sustainability Consultant', photo: '/images/team-lim-jing-jet-white.png', email: 'jingjetlim04@gmail.com', phone: '0182369448' },
  { name: 'KHOR HONG JUN', role: 'Frontend Engineer', photo: '/images/team-khor-hong-jun.jpeg', email: 'khorhongjun@gmail.com', phone: '0126758577' },
  { name: 'LEE YANG', role: 'Sales & Marketing', photo: '/images/team-lee-yang.jpeg', email: 'leeyang20040817@gmail.com', phone: '0174575100' },
  { name: 'CHO JING LING', role: 'Backend Engineer', photo: '/images/team-cho-jing-ling.jpeg', email: 'jinglingcho0670@gmail.com', phone: '0189129899' },
]

function MemberCard({ member }: { member: typeof members[number] }) {
  return <article className="slides-team-card">
    <img className="slides-team-photo" src={member.photo} alt={member.name} />
    <div className="slides-team-card-details">
      <h3>{member.name}</h3>
      <span className="slides-team-role">{member.role}</span>
      <a href={`mailto:${member.email}`}>{member.email}</a>
      <a href={`tel:${member.phone}`}>{member.phone}</a>
    </div>
  </article>
}

function TemanMuWordmark() {
  return <span className="slides-wordmark">
    <span className="slides-mark" aria-hidden="true">
      <svg width="34" height="34" viewBox="0 0 64 64">
        <path d="M14 29 L32 15 L50 29 V50 H14 Z" fill="none" stroke="#fef9ef" strokeWidth="3.6" strokeLinejoin="round" />
        <path d="M14 31 H50 M32 31 V50" stroke="#fef9ef" strokeWidth="3.6" />
        <rect x="35" y="34" width="12" height="13" fill="#f0b25a" />
      </svg>
    </span>
    <span className="slides-wordmark-text"><span>TemanMu</span></span>
  </span>
}

function PageFrame({ number, className = '', children }: { number: number; className?: string; children: ReactNode }) {
  return <section className={`slides-page ${className}`} aria-label={`Page ${number} of ${PAGE_COUNT}`}>
    <img className="slides-sdp-logo" src="/images/sdp-logo.png" alt="Sime Darby Property" />
    {children}
    <div className="slides-page-bottom"><span>TemanMu · Township care</span><span>{String(number).padStart(2, '0')} / {PAGE_COUNT}</span></div>
  </section>
}

function useHowFlowDot() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const box2Ref = useRef<HTMLDivElement>(null)
  const feedRef = useRef<HTMLDivElement>(null)
  const dotRef = useRef<HTMLSpanElement>(null)
  const rowRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)]

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const T = [900, 450, 450, 1100] // feed → spine → branch → highlight
    const cycle = T.reduce((a, b) => a + b, 0)
    const ease = (x: number) => (x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2)
    const colors = ['#4d6b3a', '#8b5a13', '#a95130']
    const start = performance.now()
    let raf = 0

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const wrap = wrapRef.current, box2 = box2Ref.current, feed = feedRef.current, dot = dotRef.current
      const rowEls = rowRefs.map(r => r.current)
      if (!wrap || !box2 || !feed || !dot || rowEls.some(r => !r)) return
      const wr = wrap.getBoundingClientRect()
      const z = wr.width / wrap.offsetWidth || 1 // rects are zoomed; inline left/top are not
      const rel = (el: Element) => { const r = el.getBoundingClientRect(); return { x: (r.left - wr.left) / z, y: (r.top - wr.top) / z, w: r.width / z, h: r.height / z } }
      const b = rel(box2)
      const fy = b.y + b.h / 2
      feed.style.top = `${fy}px`
      if (reduce) return
      const rows = rowEls.map(r => rel(r!))
      const x0 = b.x + b.w, xs = rows[0].x - 28, xe = rows[0].x - 4
      const el = Math.max(0, now - start), i = Math.floor(el / cycle) % 3
      let t = el % cycle, x: number, y: number, show = true, glow = false
      const ry = rows[i].y + rows[i].h / 2
      if (t < T[0]) { x = x0 + (xs - x0) * ease(t / T[0]); y = fy }
      else if ((t -= T[0]) < T[1]) { x = xs; y = fy + (ry - fy) * ease(t / T[1]) }
      else if ((t -= T[1]) < T[2]) { x = xs + (xe - xs) * ease(t / T[2]); y = ry }
      else { x = xe; y = ry; show = false; glow = true }
      dot.style.left = `${x}px`
      dot.style.top = `${y}px`
      dot.style.opacity = show ? '1' : '0'
      dot.style.background = x < xs ? '#a95130' : colors[i]
      rowEls.forEach((r, k) => r!.classList.toggle('is-active', glow && k === i))
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return { wrapRef, box2Ref, feedRef, dotRef, rowRefs }
}

export function Slides() {
  const howFlow = useHowFlowDot()
  const sceneRef = useRef<HTMLDivElement>(null)
  const thanksSceneRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLElement>(null)
  const [pptxStatus, setPptxStatus] = useState('')
  const [pptxExporting, setPptxExporting] = useState(false)
  const onExportPptx = async () => {
    if (!rootRef.current || pptxExporting) return
    setPptxExporting(true)
    setPptxStatus('Preparing slides…')
    try {
      const { exportSlidesToPptx } = await import('./exportPptx')
      await exportSlidesToPptx(rootRef.current, (current, total) => setPptxStatus(`Preparing slide ${current} of ${total}…`))
      setPptxStatus('PowerPoint downloaded.')
    } catch (error) {
      console.error('PowerPoint export failed', error)
      setPptxStatus('PowerPoint export failed. Please try again.')
    } finally {
      setPptxExporting(false)
    }
  }
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const fit = () => root.style.setProperty('--slides-zoom', String(root.clientWidth / SLIDE_CANVAS_WIDTH))
    const resize = new ResizeObserver(fit)
    resize.observe(root)
    fit()
    const freeze = () => root.classList.add('slides-exporting')
    const unfreeze = () => root.classList.remove('slides-exporting')
    window.addEventListener('beforeprint', freeze)
    window.addEventListener('afterprint', unfreeze)
    return () => {
      resize.disconnect()
      window.removeEventListener('beforeprint', freeze)
      window.removeEventListener('afterprint', unfreeze)
    }
  }, [])
  useEffect(() => startScene(sceneRef.current!, 'presentation'), [])
  useEffect(() => startScene(thanksSceneRef.current!, 'presentation'), [])
  useEffect(() => {
    const root = rootRef.current
    if (!root || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      })
    }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' })

    root.querySelectorAll('[data-slide-reveal]').forEach((element) => observer.observe(element))
    root.classList.add('slides-motion-ready')
    return () => observer.disconnect()
  }, [])
  return <main ref={rootRef} className="slides-root slides-fixed">
    <div className="slides-toolbar">
      <a href="/">← TemanMu</a>
      <span>Albert & Einstein · {PAGE_COUNT} of {PAGE_COUNT} sections drafted</span>
      <div className="slides-toolbar-actions">
        <span className="slides-export-status" role="status">{pptxStatus}</span>
        <button type="button" onClick={() => window.print()}>Save as PDF</button>
        <button type="button" onClick={onExportPptx} disabled={pptxExporting}>{pptxExporting ? 'Exporting…' : 'Export PPTX'}</button>
      </div>
    </div>
    <div className="slides-deck" aria-label="TemanMu presentation">
      <PageFrame number={1} className="slides-cover">
        <div ref={sceneRef} className="slides-live-scene" aria-hidden="true"><canvas data-lp="canvas" /></div>
        <div className="slides-cover-top">
          <TemanMuWordmark />
        </div>
        <div className="slides-cover-main">
          <div className="slides-cover-copy">
            <p className="slides-eyebrow">Sime Darby Property · Township of Tomorrow 2026</p>
            <h1>TemanMu</h1>
            <p className="slides-cover-tagline">Reassurance at home.<br /><em>Connection in the community.</em></p>
            <p className="slides-cover-intro">TemanMu reassures families that their loved ones are safe at home, and connects older residents living alone with their neighbours.</p>
            <span className="slides-scroll-cue">Scroll to meet the team <span aria-hidden="true">↓</span></span>
          </div>
        </div>
      </PageFrame>

      <PageFrame number={2} className="slides-team">
        <div className="slides-section-top"><TemanMuWordmark /><span>02 · The team</span></div>
        <div className="slides-team-content">
          <div className="slides-team-heading" data-slide-reveal>
            <p className="slides-eyebrow">Universiti Malaya</p>
            <h2>Albert &amp; Einstein</h2>
          </div>
          <div className="slides-team-row slides-team-row-first">{members.slice(0, 2).map(member => <MemberCard key={member.name} member={member} />)}</div>
          <div className="slides-team-row slides-team-row-second">{members.slice(2).map(member => <MemberCard key={member.name} member={member} />)}</div>
        </div>
      </PageFrame>

      <PageFrame number={3} className="slides-problem">
        <div className="slides-section-top"><TemanMuWordmark /><span>03 · The problem</span></div>
        <div className="slides-problem-main">
          <div className="slides-problem-copy" data-slide-reveal>
            <p className="slides-eyebrow">The problem</p>
            <h2>When someone lives alone, <em>silence is ambiguous.</em></h2>
            <div className="slides-problem-description">
              <p className="slides-problem-lead">When an older resident falls or becomes unwell alone, no one may notice until hours later. Families need a way to know when something has changed.</p>
              <svg className="slides-problem-alone-art" viewBox="0 0 240 170" role="img" aria-label="A softly lit room where an older resident walks, pauses, then moves again">
                <defs><radialGradient id="slides-room-glow"><stop offset="0" stopColor="#f6d974" stopOpacity=".75" /><stop offset="1" stopColor="#f6d974" stopOpacity="0" /></radialGradient></defs>
                <rect x="9" y="11" width="222" height="148" rx="9" fill="#f5eee1" stroke="#b98468" strokeWidth="3" />
                <path d="M10 139h220M120 12v22" fill="none" stroke="#c9ac97" strokeWidth="2.5" />
                <ellipse className="slides-room-light" cx="120" cy="93" rx="92" ry="73" fill="url(#slides-room-glow)" />
                <path d="M104 36h32l-5 11h-22z" fill="#e9c46a" stroke="#b98468" strokeWidth="2" strokeLinejoin="round" />
                <circle className="slides-room-bulb" cx="120" cy="49" r="5" fill="#f6d974" />
                <path d="M181 39h31v39h-31zM196.5 39v39M181 58.5h31" fill="#fffaf2" stroke="#d8c5ad" strokeWidth="2" />
                <path d="M28 119h24v20H28zM34 113h12" fill="none" stroke="#b98468" strokeWidth="2.5" strokeLinecap="round" />
                <g className="slides-room-resident">
                  <ellipse cx="72" cy="140" rx="16" ry="4" fill="#8b442933" />
                  <circle cx="72" cy="83" r="10" fill="#f4d9bd" stroke="#8b4429" strokeWidth="2" />
                  <path d="M63 79c1-11 16-13 19-2" fill="none" stroke="#7c6b63" strokeWidth="4" strokeLinecap="round" />
                  <path d="M62 101q10-10 20 0l3 23H59z" fill="#b76d4c" stroke="#8b4429" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M62 104 55 119m27-15 8 15" fill="none" stroke="#8b4429" strokeWidth="3" strokeLinecap="round" />
                  <path className="slides-room-leg-a" d="M67 124 63 138" fill="none" stroke="#8b4429" strokeWidth="3.5" strokeLinecap="round" />
                  <path className="slides-room-leg-b" d="M78 124 82 138" fill="none" stroke="#8b4429" strokeWidth="3.5" strokeLinecap="round" />
                </g>
              </svg>
            </div>
            <div className="slides-problem-risk" aria-label="NHMS 2018 findings for Malaysians aged 60 and above">
              <span>NHMS 2018 · Aged 60+</span>
              <div><p><strong>14.1%</strong> reported a fall in the previous 12 months</p><p><strong>17.0%</strong> had a limitation in basic daily activities</p></div>
            </div>
            <p className="slides-problem-thesis">Future townships need to support independent ageing <em>without sacrificing privacy or autonomy.</em></p>
          </div>
          <aside className="slides-problem-stat" aria-label="Older Malaysians living alone" data-slide-reveal>
            <span className="slides-problem-stat-kicker">Malaysia · aged 60+</span>
            <div className="slides-problem-figure">
              <div className="slides-problem-trend">
                <div className="slides-problem-trend-from"><span>2018</span><strong>6.3<small>%</small></strong></div>
                <span className="slides-problem-trend-arrow" aria-hidden="true">→</span>
                <div className="slides-problem-trend-to"><span>2025</span><strong>18.8<small>%</small></strong></div>
              </div>
              <p>of older Malaysians lived alone, <mark>nearly 3× in 7 years</mark></p>
            </div>
            <div className="slides-problem-support"><strong>33.1<small>%</small></strong><p>reported poor social support</p></div>
          </aside>
        </div>
        <div className="slides-problem-gap">
          <span className="slides-problem-gap-label">Current solution gap</span>
          <div className="slides-problem-gap-items">
            <article className="slides-problem-gap-card"><span className="slides-problem-gap-icon" aria-hidden="true"><Camera size={42} strokeWidth={1.6} /></span><div><b>Cameras</b><p>Raise privacy concerns and only see covered spaces.</p></div></article>
            <article className="slides-problem-gap-card"><span className="slides-problem-gap-icon" aria-hidden="true"><Watch size={42} strokeWidth={1.6} /></span><div><b>Wearables</b><p>Depend on being worn and charged; false alarms can occur.</p></div></article>
          </div>
        </div>
        <p className="slides-problem-sources" data-slide-reveal>Sources: <a href="https://iku.nih.gov.my/images/IKU/Document/REPORT/NHMS2018/FactsheetElderlyAged60yearsorMorefinal.pdf" target="_blank" rel="noreferrer">NHMS 2018 Elderly Health</a> · <a href="https://iku.nih.gov.my/images/nhms-2025/infographic-eng.pdf" target="_blank" rel="noreferrer">NHMS 2025 Key Findings</a> · <a href="https://iku.nih.gov.my/images/nhms-2025/nhms-2025-volume-2.pdf" target="_blank" rel="noreferrer">NHMS 2025 Vol. II</a> · <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC4087103/" target="_blank" rel="noreferrer">Fall Detection Devices systematic review</a></p>
      </PageFrame>

      <PageFrame number={4} className="slides-users">
        <div className="slides-section-top"><TemanMuWordmark /><span>04 · Who benefits</span></div>
        <div className="slides-users-layout">
          <div className="slides-users-rings" aria-label="Circles of care: the older resident at the centre, family around her, township around them">
            <div className="slides-users-ring slides-users-ring-township" />
            <div className="slides-users-ring slides-users-ring-family" />
            <div className="slides-users-ring slides-users-ring-resident"><span>01</span><strong>Older<br />resident</strong></div>
            <div className="slides-users-ring-label slides-users-ring-label-family"><span>02</span><strong>Family</strong></div>
            <div className="slides-users-ring-label slides-users-ring-label-township"><span>03</span><strong>Township</strong></div>
            <div className="slides-users-ring-note slides-users-ring-note-family">family living elsewhere</div>
            <div className="slides-users-ring-note slides-users-ring-note-township">nearby community support</div>
          </div>

          <div className="slides-users-copy" data-slide-reveal>
            <p className="slides-eyebrow">Target users</p>
            <h2>One person at home. <em>Two circles of care.</em></h2>
            <div className="slides-users-table">
              <div className="slides-users-table-head"><span>Who they are</span><span>Their challenge</span><span>What they need</span></div>
              <div className="slides-users-row slides-users-row-resident">
                <div><i /><strong>Older residents</strong></div>
                <p>Living alone can mean help is delayed, while monitoring can feel intrusive.</p>
                <p>Independence, privacy, and someone nearby to turn to.</p>
              </div>
              <div className="slides-users-row slides-users-row-family">
                <div><i /><strong>Families</strong></div>
                <p>From a distance, it is hard to know whether silence means rest or a need for help.</p>
                <p>Reassurance about their loved one, and clarity on when to act.</p>
              </div>
            </div>
            <aside className="slides-users-support">
              <strong>Township teams</strong>
              <div>
                <span>Nearby support</span>
                <p>An additional safeguard close to home when family cannot reach the resident quickly.</p>
              </div>
            </aside>
          </div>
        </div>
      </PageFrame>

      <PageFrame number={5} className="slides-solution">
        <div className="slides-section-top"><TemanMuWordmark /><span>05 · The solution</span></div>
        <div className="slides-solution-heading" data-slide-reveal>
          <p className="slides-eyebrow">The solution</p>        </div>
        <div className="slides-solution-columns">
          <section className="slides-solution-safety" aria-labelledby="slides-safety-title" data-slide-reveal>
            <h3 id="slides-safety-title">Safety</h3>
            <p className="slides-solution-lead">Small changes at home show whether daily activity is happening.</p>
            <div className="slides-sensor-demos" aria-label="Examples of the three home signals">
              <article className="slides-sensor-demo slides-sensor-water">
                <div className="slides-sensor-visual" aria-hidden="true"><Faucet className="slides-sensor-main-icon" /><span className="slides-water-stream" /><span className="slides-sensor-meter"><i /></span></div>
                <strong>Water meter</strong>
                <p><b>Tap runs</b> → water flow is recorded. A clue that someone may be washing, cooking or using the bathroom.</p>
              </article>
              <article className="slides-sensor-demo slides-sensor-power">
                <div className="slides-sensor-visual" aria-hidden="true"><Lightbulb className="slides-sensor-main-icon" /><Zap className="slides-power-spark" /><span className="slides-sensor-meter"><i /></span></div>
                <strong>Electricity meter</strong>
                <p><b>Appliance turns on</b> → power use changes. This adds context when other activity is quiet.</p>
              </article>
              <article className="slides-sensor-demo slides-sensor-door">
                <div className="slides-sensor-visual" aria-hidden="true"><span className="slides-door-frame"><span className="slides-door-panel" /></span><span className="slides-door-contact" /><span className="slides-door-signal" /></div>
                <strong>Door sensor</strong>
                <p><b>Door opens, then home stays quiet</b> → Possible Away. If this lasts longer than the resident’s usual outing, TemanMu checks in and alerts the caregiver if unanswered.</p>
              </article>
            </div>
            <div className="slides-learning-note">
              <strong>Learns what a normal day looks like for her</strong>
              <p>Over the first few weeks, TemanMu learns her usual wake-up time, outings and quiet hours. A late riser or a regular walker won’t trigger a false alarm.</p>
            </div>
          </section>
          <section className="slides-solution-companion" aria-labelledby="slides-companion-title" data-slide-reveal>
            <h3 id="slides-companion-title">Companion</h3>
            <div className="slides-buddy-stage">
              <div className="slides-buddy-ui" aria-hidden="true">
                <div className="slides-buddy-phone">
                  <div className="slides-buddy-phone-top"><span>TemanMu</span><span>Together</span></div>
                  <div className="slides-buddy-phone-card">
                    <span className="slides-buddy-phone-kicker">02 · A buddy</span>
                    <strong>Someone who shares Mum’s interests</strong>
                    <p>A local volunteer matched on what Mum enjoys.</p>
                    <span className="slides-buddy-phone-button">Find a buddy <span aria-hidden="true">→</span></span>
                    <MousePointer2 className="slides-buddy-pointer" />
                    <span className="slides-buddy-phone-pending">Looking for someone nearby…</span>
                  </div>
                </div>
              </div>
              <img className="slides-buddy-art" src="/images/community-buddy.png" alt="An older resident walking and chatting with a Community Buddy" />
            </div>
            <ul className="slides-connection-points">
              <li><strong>Community Buddy:</strong> A township volunteer joins a resident for nearby activities.</li>
              <li><strong>Neighbour matching:</strong> Connects residents with similar routines, such as two early walkers on the same street.</li>
            </ul>
          </section>
        </div>
      </PageFrame>

      <PageFrame number={6} className="slides-innovation">
        <div className="slides-section-top"><TemanMuWordmark /><span>06 · Innovation</span></div>
        <div className="slides-innovation-heading" data-slide-reveal>
          <p className="slides-eyebrow">Innovation</p>
          <h2>What makes TemanMu unique?</h2>
        </div>
        <div className="slides-innovation-grid">
          <article className="slides-innovation-card" data-slide-reveal>
            <Home className="slides-innovation-icon slides-innovation-icon-home" aria-hidden="true" />
            <div><span>01 · Effortless for residents</span><h3>Fits passively into daily life</h3><p>Water, electricity and door activity provide routine clues. Residents do not need to wear, charge or operate anything.</p></div>
          </article>
          <article className="slides-innovation-card" data-slide-reveal>
            <Layers className="slides-innovation-icon slides-innovation-icon-layers" aria-hidden="true" />
            <div><span>02 · More context</span><h3>Three signals cross-check</h3><p>Combining signals helps distinguish an outing from a concerning quiet period, with the goal of more accurate alerts and fewer false alarms.</p></div>
          </article>
          <article className="slides-innovation-card" data-slide-reveal>
            <Users className="slides-innovation-icon slides-innovation-icon-users" aria-hidden="true" />
            <div><span>03 · Faster human follow-up</span><h3>Caregiver + township response</h3><p>Both are notified when a concern remains. Family can check in remotely while a nearby township responder can visit promptly.</p></div>
          </article>
          <article className="slides-innovation-card" data-slide-reveal>
            <Brain className="slides-innovation-icon slides-innovation-icon-brain" aria-hidden="true" />
            <div><span>04 · Personal, not one-size-fits-all</span><h3>Alerts tuned to each home</h3><p>Typical systems use fixed rules, like “no movement for 12 hours.” TemanMu sets limits from each resident’s own history, and caregiver feedback keeps improving them.</p></div>
          </article>
        </div>
        <p className="slides-innovation-companion-note" data-slide-reveal><strong>Beyond safety</strong> · Community Buddy brings companionship and local activities into ordinary days.</p>
      </PageFrame>

      <PageFrame number={7} className="slides-how">
        <div className="slides-section-top"><TemanMuWordmark /><span>07 · How it works</span></div>
        <div className="slides-how-heading" data-slide-reveal>
          <p className="slides-eyebrow">How it works</p>
          <h2>Sensors notice. TemanMu checks. <em>People respond.</em></h2>
        </div>

        <div ref={howFlow.wrapRef} className="slides-how-flow2" aria-label="Safety workflow">
          <span ref={howFlow.dotRef} className="slides-how-dot" aria-hidden="true" />

          <div className="slides-how-inputs">
            <article className="slides-how-box">
              <span className="slides-how-label">1 · At home</span>
              <div className="slides-how-sensors" aria-hidden="true">
                <span><Droplets /></span><span><Zap /></span><span><DoorOpen /></span>
              </div>
              <h3>Water, electricity and door sensors pick up daily activity</h3>
              <p>No cameras. Nothing to wear or charge.</p>
            </article>
            <div className="slides-how-down" aria-hidden="true">↓</div>
            <article ref={howFlow.box2Ref} className="slides-how-box">
              <div className="slides-how-box-top">
                <span className="slides-how-label">2 · TemanMu</span>
                <span className="slides-how-bars" aria-hidden="true">{[.5, .8, .4, 1, .6, .9, .45].map((v, i) => <i key={i} style={{ height: `${22 * v}px`, animationDelay: `${i * .15}s` }} />)}</span>
              </div>
              <h3>Compares today with her usual routine</h3>
              <p>How long the home is normally quiet, and how long she is normally out.</p>
            </article>
          </div>

          <div className="slides-how-feed" aria-hidden="true"><div ref={howFlow.feedRef} /></div>

          <div className="slides-how-outcomes">
            <div className="slides-how-outcomes-head"><span /><span>3 · Result is one of</span><span>4 · What happens</span></div>

            <div className="slides-how-branch slides-how-branch-first">
              <span className="slides-how-stub" aria-hidden="true" />
              <div ref={howFlow.rowRefs[0]} className="slides-how-outcome slides-how-outcome-routine">
                <div><span>Routine</span><h3>Activity as usual</h3></div>
                <p>Family sees a calm status on their phone. <strong>No one needs to act.</strong></p>
              </div>
            </div>

            <div className="slides-how-branch">
              <span className="slides-how-stub" aria-hidden="true" />
              <div ref={howFlow.rowRefs[1]} className="slides-how-outcome slides-how-outcome-away">
                <div><span>Possible Away</span><h3>Door opened, then the home went quiet</h3></div>
                <div className="slides-how-chain"><b>Family is told she may be out</b><i>→</i><b>Family may call her</b><i>→</i><b>Home and okay? Back to Routine</b></div>
              </div>
            </div>

            <div className="slides-how-branch slides-how-branch-last">
              <span className="slides-how-stub" aria-hidden="true" />
              <div ref={howFlow.rowRefs[2]} className="slides-how-outcome slides-how-outcome-concern">
                <div><span>Unusual Inactivity</span><h3>Quiet for longer than usual</h3></div>
                <div className="slides-how-chain"><b>TemanMu calls her</b><i>→</i><b>No answer: family + township alerted</b><i>→</i><b>Someone checks, records outcome</b></div>
              </div>
            </div>
          </div>
        </div>

        <div className="slides-how-companion2">
          <HeartHandshake aria-hidden="true" />
          <p><strong>Companion on ordinary days</strong> · Family can invite her to nearby activities, match her with a volunteer buddy, or introduce her to a neighbour on the same routine.</p>
        </div>
      </PageFrame>

      <PageFrame number={8} className="slides-impact">
        <div className="slides-section-top"><TemanMuWordmark /><span>08 · Impact</span></div>
        <div className="slides-impact-heading" data-slide-reveal>
          <p className="slides-eyebrow">Impact · Three wins</p>
          <h2>More independence. <em>More peace of mind.</em><br />A stronger community.</h2>
        </div>
        <div className="slides-impact-grid" aria-label="Expected benefits for three groups">
          <article className="slides-impact-card slides-impact-residents" data-slide-reveal>
            <div className="slides-impact-art slides-impact-art-home" aria-hidden="true"><Home className="slides-impact-home" /><span className="slides-impact-person"><i /><i /></span><HeartHandshake className="slides-impact-heart" /></div>
            <span className="slides-impact-who">Who benefits · 01</span>
            <h3>Older residents</h3>
            <ul className="slides-impact-benefits">
              <li><strong>Greater independence</strong> in familiar surroundings</li>
              <li><strong>Stronger privacy</strong> without cameras or wearables</li>
              <li><strong>Closer connection</strong> through buddies and local activities</li>
            </ul>
            <div className="slides-impact-target"><strong>70%</strong><span>of residents expected to report greater confidence living independently after the pilot</span></div>
          </article>
          <article className="slides-impact-card slides-impact-caregivers" data-slide-reveal>
            <div className="slides-impact-art slides-impact-art-family" aria-hidden="true"><Home /><span className="slides-impact-connection" /><PhoneCall /></div>
            <span className="slides-impact-who">Who benefits · 02</span>
            <h3>Caregivers</h3>
            <ul className="slides-impact-benefits">
              <li><strong>Clearer reassurance</strong> about daily routines</li>
              <li><strong>Earlier awareness</strong> when something changes</li>
              <li><strong>Better coordination</strong> with nearby responders</li>
            </ul>
            <div className="slides-impact-target"><strong>80%</strong><span>report greater reassurance about their loved one’s day</span></div>
          </article>
          <article className="slides-impact-card slides-impact-township" data-slide-reveal>
            <div className="slides-impact-art slides-impact-art-township" aria-hidden="true"><Home /><span className="slides-impact-route" /><Users /><ShieldCheck className="slides-impact-shield" /></div>
            <span className="slides-impact-who">Who benefits · 03</span>
            <h3>Township</h3>
            <ul className="slides-impact-benefits">
              <li><strong>Better coordinated care</strong> with clear priorities and nearby follow-up</li>
              <li><strong>Stronger accountability</strong> through recorded actions and outcomes</li>
              <li><strong>Stronger township reputation</strong> as a caring, age-friendly community</li>
              <li><strong>Potential sales growth</strong> through greater appeal to families planning for ageing parents</li>
            </ul>
            <div className="slides-impact-target"><strong>70%</strong><span>of surveyed prospective buyers expected to view the township more positively after learning about TemanMu</span></div>
          </article>
        </div>
        <p className="slides-impact-caveat">Proposed pilot targets, not achieved results · Measure resident confidence, caregiver reassurance, and prospective buyer perceptions through surveys.</p>
      </PageFrame>

      <PageFrame number={9} className="slides-feasibility slides-feasibility-detail">
        <div className="slides-section-top"><TemanMuWordmark /><span>09 · Implementation feasibility</span></div>
        <div className="slides-feasibility-heading">
          <h2>Turning TemanMu Into a Deployable Township Service</h2>
          <p className="slides-feasibility-intro">Technically achievable · Resource-efficient · Operationally practical · Privacy-conscious</p>
        </div>
        <div className="slides-feasibility-detail-grid">
<article><h3><Lightbulb aria-hidden="true" />1. Technical Readiness</h3><div className="slides-feasibility-tiles"><div><Layers aria-hidden="true" /><span>React PWA</span></div><div><Zap aria-hidden="true" /><span>FastAPI</span></div><div><Droplets aria-hidden="true" /><span>Supabase</span></div></div><p className="slides-feasibility-card-body">Built using established, open-source technologies with no need to develop proprietary hardware or train complex AI models for the initial deployment.</p><p className="slides-feasibility-card-note">Existing prototype interfaces and APIs can be extended to compatible IoT gateways.</p></article>
<article><h3><Layers aria-hidden="true" />2. Infrastructure &amp; Resources</h3><div className="slides-feasibility-tiles"><div><Zap aria-hidden="true" /><span>Meters &amp; IoT</span></div><div><Layers aria-hidden="true" /><span>Cloud Hosting</span></div><div><Home aria-hidden="true" /><span>Installation &amp; Support</span></div></div><p className="slides-feasibility-card-body">Assess each pilot home and arrange installation of compatible smart water/electricity meters, door sensors and gateways where needed. Provide connectivity and cloud hosting for the service.</p><p className="slides-feasibility-card-note">Key resources: hardware procurement, qualified installers, IoT integration, connectivity, maintenance and secure hosting.</p></article>
<article><h3><Users aria-hidden="true" />3. Stakeholder &amp; Operational Support</h3><div className="slides-feasibility-tiles"><div><Home aria-hidden="true" /><span>Management</span></div><div><ShieldCheck aria-hidden="true" /><span>Security</span></div><div><HeartHandshake aria-hidden="true" /><span>Community</span></div></div><p className="slides-feasibility-card-body">Builds on township management and security operations instead of creating an entirely separate response organisation.</p><p className="slides-feasibility-card-note">Utility/IoT partners support data integration; caregivers verify concerns; coordinators and volunteers facilitate companionship.</p></article>
<article><h3><ShieldCheck aria-hidden="true" />4. Adoption &amp; Privacy Feasibility</h3><div className="slides-feasibility-tiles"><div><Camera aria-hidden="true" /><span>No Cameras</span></div><div><Watch aria-hidden="true" /><span>No Wearables</span></div><div><Users aria-hidden="true" /><span>Opt-in Consent</span></div></div><p className="slides-feasibility-card-body">Elderly residents are not required to operate an app or charge wearable devices, reducing participation barriers.</p><p className="slides-feasibility-card-note">Consent-based enrolment, restricted data access and secure storage are necessary before real deployment.</p></article>
        </div>
        <div className="slides-feasibility-dependencies"><strong>Key conditions for implementation</strong><p>Validate real meter-data availability, alert reliability, false-positive rates and township response capacity in the Q1 2027 pilot.</p></div>
      </PageFrame>

      <PageFrame number={10} className="slides-feasibility slides-roadmap">
        <div className="slides-section-top"><TemanMuWordmark /><span>10 · Implementation roadmap</span></div>
        <div className="slides-feasibility-heading" data-slide-reveal>
          <p className="slides-eyebrow">Proposed rollout · 2027–2028</p>
          <h2>Implementation Roadmap</h2>
        </div>
        <div className="slides-feasibility-timeline" aria-label="Five-phase proposed rollout for 2027–2028">
          <article><span className="slides-feasibility-time">Q1 2027</span><span className="slides-feasibility-dot" aria-hidden="true" /><div className="slides-roadmap-icon" aria-hidden="true"><Home /></div><span className="slides-roadmap-scope">10–20 homes</span><h3>Pilot deployment</h3><ul className="slides-feasibility-points"><li>Install compatible meters, gateways and door sensors; connect live readings.</li><li>Assign caregivers and responders; rehearse alerts and emergency handoff.</li></ul><div className="slides-roadmap-deliverable"><span>Phase 1 deliverable</span><strong>Supervised live-sensor pilot</strong></div></article>
          <article><span className="slides-feasibility-time">Q2 2027</span><span className="slides-feasibility-dot" aria-hidden="true" /><div className="slides-roadmap-icon" aria-hidden="true"><ShieldCheck /></div><span className="slides-roadmap-scope">Validation</span><h3>Test &amp; optimise</h3><ul className="slides-feasibility-points"><li>Establish household baselines; validate rules with annotated test scenarios.</li><li>Test outages and missed alerts; gather feedback and review privacy controls.</li></ul><div className="slides-roadmap-deliverable"><span>Phase 2 deliverable</span><strong>Refined rules &amp; response protocol</strong></div></article>
          <article><span className="slides-feasibility-time">Q3 2027</span><span className="slides-feasibility-dot" aria-hidden="true" /><div className="slides-roadmap-icon" aria-hidden="true"><Layers /></div><span className="slides-roadmap-scope">50–100 homes</span><h3>Township integration</h3><ul className="slides-feasibility-points"><li>Expand only if pilot safety and reliability criteria are met.</li><li>Embed dashboard, shift handovers and incident ownership; strengthen access control and service reliability.</li></ul><div className="slides-roadmap-deliverable"><span>Phase 3 deliverable</span><strong>Service across multiple blocks</strong></div></article>
          <article><span className="slides-feasibility-time">Q4 2027</span><span className="slides-feasibility-dot" aria-hidden="true" /><div className="slides-roadmap-icon" aria-hidden="true"><HeartHandshake /></div><span className="slides-roadmap-scope">Community</span><h3>Activate companionship</h3><ul className="slides-feasibility-points"><li>Launch interest-based Community Buddies and activities in existing spaces.</li><li>Screen volunteers; arrange consent-based neighbour introductions without sharing routines or unit details.</li></ul><div className="slides-roadmap-deliverable"><span>Phase 4 deliverable</span><strong>Operational companionship programme</strong></div></article>
          <article><span className="slides-feasibility-time">2028</span><span className="slides-feasibility-dot" aria-hidden="true" /><div className="slides-roadmap-icon" aria-hidden="true"><Users /></div><span className="slides-roadmap-scope">Scale-up</span><h3>Expand to townships</h3><ul className="slides-feasibility-points"><li>Standardise procurement, installation, APIs and responder training.</li><li>Separate township data; assess funding and staffing. Explore adaptive models only with sufficient consented data.</li></ul><div className="slides-roadmap-deliverable"><span>Phase 5 deliverable</span><strong>Repeatable deployment package</strong></div></article>
        </div>
        <p className="slides-feasibility-note">Home counts are planning assumptions, not programme commitments. Expansion depends on evidence from the preceding phase.</p>
      </PageFrame>

      <PageFrame number={11} className="slides-visual">
        <div className="slides-section-top"><TemanMuWordmark /><span>11 · Visual concept</span></div>
        <div className="slides-visual-heading" data-slide-reveal>
          <p className="slides-eyebrow">Visual concept · One moment, three views</p>
          <h2>From a quiet home <em>to a human response.</em></h2>
        </div>
        <div className="slides-visual-flow" aria-label="The Unusual Inactivity scenario seen from the home, the family and the township">
          <figure className="slides-visual-step slides-visual-home" data-slide-reveal>
            <div className="slides-visual-media"><img src="/images/visual-home-sensors.jpg" alt="3D view of Mum's flat with water meter, power meter and door sensor readings" /></div>
            <figcaption><span>1 · At home</span><h3>The home goes quiet</h3><p>No water use beyond her usual gap, power at standby, door closed. Only meters and a door sensor, no cameras.</p></figcaption>
          </figure>
          <span className="slides-visual-arrow" aria-hidden="true">→</span>
          <figure className="slides-visual-step slides-visual-family" data-slide-reveal>
            <div className="slides-visual-media"><span className="slides-visual-phone"><img src="/images/visual-caregiver-alert.jpg" alt="Caregiver app showing an Unusual inactivity alert with options to check in or ask the township to visit" /></span></div>
            <figcaption><span>2 · Family</span><h3>Sarah is alerted</h3><p>TemanMu called Mum first. No answer, so Sarah can check in herself or ask the township to visit.</p></figcaption>
          </figure>
          <span className="slides-visual-arrow" aria-hidden="true">→</span>
          <figure className="slides-visual-step slides-visual-township" data-slide-reveal>
            <div className="slides-visual-media"><img src="/images/visual-township-incident.png" alt="Township dashboard incident panel for unit A-105 with an I'll Check Now button" /></div>
            <figcaption><span>3 · Township</span><h3>A responder takes it</h3><p>The operator sees unit A-105 at the same time, accepts the check and records the outcome.</p></figcaption>
          </figure>
        </div>
        <p className="slides-visual-note">Screenshots from the working TemanMu prototype, Unusual Inactivity scenario, simulated data.</p>
      </PageFrame>

      <PageFrame number={12} className="slides-close">
        <div className="slides-section-top"><TemanMuWordmark /><span>12 · Why TemanMu should win</span></div>
        <div className="slides-close-heading" data-slide-reveal>
          <p className="slides-eyebrow">Why our team should win</p>
          <h2>Care for people. <em>Value for the township.</em></h2>
        </div>
        <div className="slides-close-statement" data-slide-reveal>
          <span className="slides-close-quote" aria-hidden="true">“</span>
          <p>TemanMu helps older residents live independently while giving caregivers a clearer view when daily routines change. Water, electricity and door signals offer privacy-conscious clues without cameras or wearables, while Community Buddies add companionship beyond safety. For Sime Darby Property, this could strengthen township appeal to multigenerational families, deepen resident engagement and create a care service that could expand across future developments. Our team has built a working prototype and planned a consent-based pilot with clear human response roles. Winning would help us test the idea in a real township, measure its impact and improve it with residents.</p>
        </div>
      </PageFrame>

      <PageFrame number={13} className="slides-thanks">
        <div ref={thanksSceneRef} className="slides-live-scene" aria-hidden="true"><canvas data-lp="canvas" /></div>
        <div className="slides-thanks-main">
          <span className="slides-thanks-mark" aria-hidden="true">
            <svg viewBox="0 0 64 64">
              <path d="M14 29 L32 15 L50 29 V50 H14 Z" fill="none" stroke="#fef9ef" strokeWidth="3.6" strokeLinejoin="round" />
              <path d="M14 31 H50 M32 31 V50" stroke="#fef9ef" strokeWidth="3.6" />
              <rect x="35" y="34" width="12" height="13" fill="#f0b25a" />
            </svg>
          </span>
          <h1>Thank you</h1>
          <p className="slides-thanks-name"><em>TemanMu</em></p>
          <p className="slides-thanks-team">Albert &amp; Einstein · Universiti Malaya</p>
        </div>
      </PageFrame>
    </div>
  </main>
}
