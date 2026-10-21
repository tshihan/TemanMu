import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Activity, Brain, Camera, DoorOpen, Droplets, Faucet, HeartHandshake, Home, Layers, Lightbulb, MousePointer2, PhoneCall, ShieldCheck, Users, Watch, Zap } from 'lucide-react'
import { startScene } from '../landing/scene'
import './slides.css'

const PAGE_COUNT = 10

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
    <span className="slides-wordmark-text"><span>TemanMu</span><small>Township care</small></span>
  </span>
}

function PageFrame({ number, className = '', children }: { number: number; className?: string; children: ReactNode }) {
  return <section className={`slides-page ${className}`} aria-label={`Page ${number} of ${PAGE_COUNT}`}>
    <img className="slides-sdp-logo" src="/images/sdp-logo.png" alt="Sime Darby Property" />
    {children}
    <div className="slides-page-bottom"><span>TemanMu · Township care</span><span>{String(number).padStart(2, '0')} / {PAGE_COUNT}</span></div>
  </section>
}

export function Slides() {
  const sceneRef = useRef<HTMLDivElement>(null)
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
  useEffect(() => startScene(sceneRef.current!, 'presentation'), [])
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
  return <main ref={rootRef} className="slides-root">
    <div className="slides-toolbar">
      <a href="/">← TemanMu</a>
      <span>Albert & Einstein · 7 of {PAGE_COUNT} sections drafted</span>
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
            <p className="slides-cover-intro">TemanMu helps families feel reassured about their loved ones’ safety at home and connects older residents with Community Buddies and local activities.</p>
            <span className="slides-scroll-cue">Scroll to meet the team <span aria-hidden="true">↓</span></span>
          </div>
        </div>
      </PageFrame>

      <PageFrame number={2} className="slides-team">
        <div className="slides-section-top"><TemanMuWordmark /><span>02 · The team</span></div>
        <div className="slides-team-content">
          <div className="slides-team-heading" data-slide-reveal>
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
              <p className="slides-problem-lead">A caregiver cannot check every hour. A quiet home may mean everything is fine—or that help is needed. Some residents also lack regular social connection.</p>
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
          </div>
          <aside className="slides-problem-stat" aria-label="Older Malaysians living alone" data-slide-reveal>
            <span className="slides-problem-stat-kicker">Malaysia · aged 60+</span>
            <div className="slides-problem-figure" aria-label="Living alone rose from 6.3 percent in 2018 to 18.8 percent in 2025">
              <strong><span className="slides-problem-figure-start">6.3<small>%</small></span><span className="slides-problem-figure-end">18.8<small>%</small></span></strong>
              <div className="slides-problem-years" aria-hidden="true"><span>2018</span><span>→</span><span>2025</span></div>
              <p>of older Malaysians lived alone</p>
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
        <p className="slides-problem-sources" data-slide-reveal>Sources: <a href="https://iku.nih.gov.my/images/nhms-2025/infographic-eng.pdf" target="_blank" rel="noreferrer">NHMS 2025 Key Findings</a> · <a href="https://iku.nih.gov.my/images/nhms-2025/nhms-2025-volume-2.pdf" target="_blank" rel="noreferrer">NHMS 2025 Vol. II</a> · <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC4087103/" target="_blank" rel="noreferrer">Fall Detection Devices systematic review</a></p>
      </PageFrame>

      <PageFrame number={4} className="slides-users">
        <div className="slides-section-top"><TemanMuWordmark /><span>04 · Who benefits</span></div>
        <div className="slides-users-heading" data-slide-reveal>
          <p className="slides-eyebrow">Target users</p>
          <h2>For the person at home.<br /><em>For the people who care.</em></h2>
        </div>
        <div className="slides-users-grid">
          <article className="slides-user-card slides-user-resident" data-slide-reveal>
            <div className="slides-user-card-head"><span className="slides-user-number">01</span><div><span className="slides-user-overline">First pillar</span><h3>Older residents</h3></div></div>
            <p className="slides-user-summary">People such as Madam Lee, who live independently and want to keep their normal routine.</p>
            <ul className="slides-user-challenges">
              <li><strong>Safety</strong><span>A change in routine or medical issue may go unnoticed.</span></li>
              <li><strong>Privacy</strong><span>Cameras and wearables can feel intrusive or burdensome.</span></li>
              <li><strong>Connection</strong><span>Living alone can mean long stretches without contact.</span></li>
            </ul>
            <p className="slides-user-need"><span>What they need</span> Independence, privacy and human connection.</p>
          </article>
          <article className="slides-user-card slides-user-family" data-slide-reveal>
            <div className="slides-user-card-head"><span className="slides-user-number">02</span><div><span className="slides-user-overline">Second pillar</span><h3>Families</h3></div></div>
            <p className="slides-user-summary">Adult children and loved ones who may work or live away from the resident.</p>
            <ul className="slides-user-challenges">
              <li><strong>Visibility</strong><span>A phone call shows only one moment of the day.</span></li>
              <li><strong>Uncertainty</strong><span>Silence could mean asleep, out, or needing help.</span></li>
              <li><strong>Response</strong><span>When worried, they need someone nearby to check.</span></li>
            </ul>
            <p className="slides-user-need"><span>What they need</span> Daily reassurance and a clear path to action.</p>
          </article>
        </div>
      </PageFrame>

      <PageFrame number={5} className="slides-solution">
        <div className="slides-section-top"><TemanMuWordmark /><span>05 · The solution</span></div>
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
              <strong>Planned learning layer · Machine learning + PPO engine</strong>
              <p>Learn each resident’s patterns to make alerts more accurate and reduce false alarms. This will need validation with real-world data.</p>
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
            <p>A caregiver can request a <strong>Community Buddy</strong> matched by shared interests, so the resident has someone to join at a nearby activity.</p>
            <span className="slides-buddy-note">Voluntary participation · Human connection on ordinary days</span>
          </section>
        </div>
      </PageFrame>

      <PageFrame number={6} className="slides-innovation">
        <div className="slides-section-top"><TemanMuWordmark /><span>06 · Innovation</span></div>
        <div className="slides-innovation-heading" data-slide-reveal>
          <p className="slides-eyebrow">Innovation</p>
          <h2>How TemanMu works differently</h2>
        </div>
        <div className="slides-innovation-grid">
          <article className="slides-innovation-card" data-slide-reveal>
            <Home aria-hidden="true" />
            <div><span>01 · Effortless for residents</span><h3>Fits passively into daily life</h3><p>Water, electricity and door activity provide routine clues. Residents do not need to wear, charge or operate anything.</p></div>
          </article>
          <article className="slides-innovation-card" data-slide-reveal>
            <Layers aria-hidden="true" />
            <div><span>02 · More context</span><h3>Three signals cross-check</h3><p>Combining signals helps distinguish an outing from a concerning quiet period, with the goal of more accurate alerts and fewer false alarms.</p></div>
          </article>
          <article className="slides-innovation-card" data-slide-reveal>
            <Users aria-hidden="true" />
            <div><span>03 · Faster human follow-up</span><h3>Caregiver + township response</h3><p>Both are notified when a concern remains. Family can check in remotely while a nearby township responder can visit promptly.</p></div>
          </article>
          <article className="slides-innovation-card" data-slide-reveal>
            <Brain aria-hidden="true" />
            <div><span>04 · Planned learning layer</span><h3>Adapts to each resident</h3><p>Machine learning and the PPO engine aim to learn individual routines and refine alerts over time, subject to real-world validation.</p></div>
          </article>
        </div>
        <p className="slides-innovation-companion-note" data-slide-reveal><strong>Beyond safety</strong> · Community Buddy brings companionship and local activities into ordinary days.</p>
      </PageFrame>

      <PageFrame number={7} className="slides-how">
        <div className="slides-section-top"><TemanMuWordmark /><span>07 · How it works</span></div>
        <div className="slides-how-heading" data-slide-reveal>
          <p className="slides-eyebrow">How it works</p>
          <h2>Daily clues lead to <em>human care.</em></h2>
          <p>TemanMu notices a change in routine, explains what it knows, and gives people a clear way to check in.</p>
        </div>

        <div className="slides-how-flow" aria-label="Safety workflow">
          <article className="slides-how-step" data-slide-reveal>
            <span className="slides-how-step-number">01 · Listen</span>
            <div className="slides-how-signals" aria-hidden="true"><Droplets /><Zap /><DoorOpen /></div>
            <h3>Notice ordinary activity</h3>
            <p>Water, electricity and front-door events provide quiet clues throughout the day.</p>
          </article>
          <article className="slides-how-step" data-slide-reveal>
            <span className="slides-how-step-number">02 · Compare</span>
            <Activity className="slides-how-step-icon" aria-hidden="true" />
            <h3>Check the usual rhythm</h3>
            <p>TemanMu compares those clues with the resident’s usual quiet gap and outing time.</p>
          </article>
          <article className="slides-how-step" data-slide-reveal>
            <span className="slides-how-step-number">03 · Explain</span>
            <Layers className="slides-how-step-icon" aria-hidden="true" />
            <h3>Show the right status</h3>
            <p>Routine brings reassurance. An uncertain pattern becomes Possible Away or Unusual Inactivity.</p>
          </article>
        </div>

        <div className="slides-how-paths" aria-label="What happens after a change in routine">
          <article className="slides-how-path slides-how-path-away" data-slide-reveal>
            <div className="slides-how-path-title"><PhoneCall aria-hidden="true" /><div><span>Possible Away</span><h3>Caregiver chooses to check</h3></div></div>
            <p>A door event does not prove an outing. The caregiver may call; if the resident confirms they are home and okay, the caregiver returns the status to Routine.</p>
          </article>
          <article className="slides-how-path slides-how-path-concern" data-slide-reveal>
            <div className="slides-how-path-title"><ShieldCheck aria-hidden="true" /><div><span>Unusual Inactivity</span><h3>People follow up together</h3></div></div>
            <p>TemanMu makes a simulated check-in call. If there is no answer, caregiver and township are alerted; a person checks and records the outcome.</p>
          </article>
        </div>

        <div className="slides-how-companion" data-slide-reveal>
          <HeartHandshake aria-hidden="true" />
          <div><strong>Companion on ordinary days</strong><p>Caregiver requests a Community Buddy → matched by shared interest → invited to a nearby activity.</p></div>
        </div>
      </PageFrame>

      {Array.from({ length: PAGE_COUNT - 7 }, (_, index) => <PageFrame number={index + 8} className="slides-pending" key={index}>
        <div className="slides-section-top"><TemanMuWordmark /><span>{String(index + 8).padStart(2, '0')} · Coming next</span></div>
        <div className="slides-pending-content" data-slide-reveal><span className="slides-eyebrow">Section {String(index + 8).padStart(2, '0')}</span><h2>Next chapter.</h2><p>Waiting for your content and direction.</p></div>
      </PageFrame>)}
    </div>
  </main>
}
