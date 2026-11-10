import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Camera, CreditCard, Droplets, Faucet, HeartHandshake, Home, Lightbulb, MousePointer2, PhoneCall, ShieldCheck, Users, Watch, Zap } from 'lucide-react'
import { startScene } from '../landing/scene'
import './slides.css'
import './present.css'
import './final-slides.css'

// The 3D home pulls in three.js and the house models, so it loads on its own after the deck appears.
const PresentHome = lazy(() => import('./PresentHome').then(module => ({ default: module.PresentHome })))

const PAGE_COUNT = 10
const names = ['TAN SHIHAN', 'LIM JING JET', 'KHOR HONG JUN', 'LEE YANG', 'CHO JING LING']

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

// Moves the dot from "2 · TemanMu" along the branches to each outcome in turn.
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
      const rel = (el: Element) => { const r = el.getBoundingClientRect(); return { x: r.left - wr.left, y: r.top - wr.top, w: r.width, h: r.height } }
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

// /final-slides: copy of /present for the final round. Door sensor replaced by the lobby access card.
// /present: a short presenting deck of Madam Lee alone at home (3D), the problem, the cover (TemanMu + team names), the solution, and how it works.
export function FinalSlides() {
  const howFlow = useHowFlowDot()
  const sceneRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLElement>(null)
  const [pptxStatus, setPptxStatus] = useState('')
  const [pptxExporting, setPptxExporting] = useState(false)
  const [closingScene, setClosingScene] = useState<0 | 1>(0)
  const [closingVisible, setClosingVisible] = useState(false)
  const [closingReducedMotion, setClosingReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const closingArtRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setClosingReducedMotion(media.matches)
    media.addEventListener('change', update)
    const observer = new IntersectionObserver(([entry]) => setClosingVisible(entry.isIntersecting), { threshold: .35 })
    if (closingArtRef.current) observer.observe(closingArtRef.current)
    return () => { observer.disconnect(); media.removeEventListener('change', update) }
  }, [])
  useEffect(() => {
    if (!closingVisible || closingReducedMotion) return
    const timer = window.setTimeout(() => setClosingScene(scene => scene === 0 ? 1 : 0), 6500)
    return () => window.clearTimeout(timer)
  }, [closingVisible, closingReducedMotion, closingScene])
  const onExportPptx = async () => {
    if (!rootRef.current || pptxExporting) return
    setPptxExporting(true)
    setPptxStatus('Preparing slides…')
    try {
      const { exportSlidesToPptx } = await import('./exportPptx')
      await exportSlidesToPptx(rootRef.current, (current, total) => setPptxStatus(`Preparing slide ${current} of ${total}…`), 'TemanMu-final-deck.pptx')
      setPptxStatus('PowerPoint downloaded.')
    } catch (error) {
      console.error('PowerPoint export failed', error)
      setPptxStatus('PowerPoint export failed. Please try again.')
    } finally {
      setPptxExporting(false)
    }
  }
  // Printing (Save as PDF) uses the same still frames as the PowerPoint export.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const freeze = () => root.classList.add('slides-exporting')
    const unfreeze = () => root.classList.remove('slides-exporting')
    window.addEventListener('beforeprint', freeze)
    window.addEventListener('afterprint', unfreeze)
    return () => {
      window.removeEventListener('beforeprint', freeze)
      window.removeEventListener('afterprint', unfreeze)
    }
  }, [])
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
  // Right/Down/PageDown/Space go to the next page, Left/Up/PageUp to the previous one.
  useEffect(() => {
    const NEXT = ['ArrowRight', 'ArrowDown', 'PageDown', ' ']
    const PREV = ['ArrowLeft', 'ArrowUp', 'PageUp']
    // The page a smooth scroll is heading to, so quick repeated presses keep advancing instead of re-reading a mid-scroll position.
    let target = -1
    const onScrollEnd = () => { target = -1 }
    const onKeyDown = (event: KeyboardEvent) => {
      const step = NEXT.includes(event.key) ? 1 : PREV.includes(event.key) ? -1 : 0
      if (!step || event.altKey || event.ctrlKey || event.metaKey || (event.target as HTMLElement).closest?.('input, textarea, select, [contenteditable]')) return
      const pages = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('.slides-page') ?? [])
      if (!pages.length) return
      const current = target >= 0 ? target : pages.reduce((best, page, i) => Math.abs(page.getBoundingClientRect().top) < Math.abs(pages[best].getBoundingClientRect().top) ? i : best, 0)
      const next = Math.min(pages.length - 1, Math.max(0, current + step))
      event.preventDefault()
      if (next === current) return
      target = next
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      pages[next].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('scrollend', onScrollEnd)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scrollend', onScrollEnd)
    }
  }, [])

  return <main ref={rootRef} className="slides-root">
    {/* Kept small and out of the way so it doesn't distract while presenting; hidden in the PDF and PPTX. */}
    <div className="final-export">
      <span className="slides-export-status" role="status">{pptxStatus}</span>
      <button type="button" onClick={() => window.print()}>Save as PDF</button>
      <button type="button" onClick={onExportPptx} disabled={pptxExporting}>{pptxExporting ? 'Exporting…' : 'Export PPTX'}</button>
    </div>
    <div className="slides-deck" aria-label="TemanMu presentation">
      <PageFrame number={1} className="present-home">
        <Suspense fallback={null}><PresentHome /></Suspense>
        <div className="slides-section-top"><TemanMuWordmark /><span>01 · At home</span></div>
        <div className="present-home-copy" data-slide-reveal>
          <p className="slides-eyebrow">Meet Madam Lee</p>
          <h2>Madam Lee, <em>78</em></h2>
          <ul className="present-home-facts">
            <li>Lives on her own in a township flat</li>
            <li>Her children work in the city and visit when they can</li>
            <li>Cooks, tidies and gets through most days by herself</li>
          </ul>
        </div>
      </PageFrame>

      <PageFrame number={2} className="present-problem">
        <div className="slides-section-top"><TemanMuWordmark /><span>02 · The problem</span></div>
        <div className="present-problem-heading" data-slide-reveal>
          <p className="slides-eyebrow">The problem · Malaysia, aged 60+</p>
          <h2>More older Malaysians live alone. <em>Many feel unsupported.</em></h2>
        </div>
        <div className="present-problem-stats">
          <div className="present-problem-stat" data-slide-reveal>
            <span className="present-problem-label">01 · Living alone</span>
            <div className="present-problem-body">
              <div className="present-problem-bars" aria-label="6.3% in 2018, 18.8% in 2025">
                <div className="present-problem-bar present-problem-bar-from"><strong>6.3<small>%</small></strong><i /><span>2018</span></div>
                <div className="present-problem-bar present-problem-bar-to"><strong>18.8<small>%</small></strong><i /><span>2025</span></div>
              </div>
              <div className="present-problem-figure">
                <strong>3×</strong>
                <p>of older Malaysians lived alone, <mark>nearly 3× in 7 years</mark></p>
              </div>
            </div>
          </div>
          <div className="present-problem-stat" data-slide-reveal>
            <span className="present-problem-label">02 · Companionship</span>
            <div className="present-problem-body">
              <div className="present-problem-dots" aria-label="33 of 100 dots filled">
                {Array.from({ length: 100 }, (_, i) => <i key={i} className={i < 33 ? 'is-filled' : ''} style={i < 33 ? { '--i': i } as CSSProperties : undefined} />)}
              </div>
              <div className="present-problem-figure">
                <strong>33.1<small>%</small></strong>
                <p>reported poor social support</p>
              </div>
            </div>
          </div>
        </div>
        <div className="slides-problem-gap">
          <span className="slides-problem-gap-label">Current solution gap</span>
          <div className="slides-problem-gap-items">
            <article className="slides-problem-gap-card"><span className="slides-problem-gap-icon" aria-hidden="true"><Camera size={42} strokeWidth={1.6} /></span><div><b>Cameras</b><p>Raise privacy concerns and only see covered spaces.</p></div></article>
            <article className="slides-problem-gap-card"><span className="slides-problem-gap-icon" aria-hidden="true"><Watch size={42} strokeWidth={1.6} /></span><div><b>Wearables</b><p>Depend on being worn and charged; false alarms can occur.</p></div></article>
          </div>
        </div>
        <p className="present-problem-sources">Sources: <a href="https://iku.nih.gov.my/images/IKU/Document/REPORT/NHMS2018/FactsheetElderlyAged60yearsorMorefinal.pdf" target="_blank" rel="noreferrer">NHMS 2018 Elderly Health</a> · <a href="https://iku.nih.gov.my/images/nhms-2025/infographic-eng.pdf" target="_blank" rel="noreferrer">NHMS 2025 Key Findings</a> · <a href="https://iku.nih.gov.my/images/nhms-2025/nhms-2025-volume-2.pdf" target="_blank" rel="noreferrer">NHMS 2025 Vol. II</a></p>
      </PageFrame>

      <PageFrame number={3} className="slides-cover present-cover">
        <div ref={sceneRef} className="slides-live-scene" aria-hidden="true"><canvas data-lp="canvas" /></div>
        <div className="slides-cover-top">
          <TemanMuWordmark />
          <span className="present-team-name">Team Albert and Einstein</span>
        </div>
        <div className="slides-cover-main">
          <div className="slides-cover-copy">
            <h1>TemanMu</h1>
            <p className="slides-cover-tagline">Reassurance at home.<br /><em>Connection in the community.</em></p>
            <ul className="present-names">{names.map(name => <li key={name}>{name}</li>)}</ul>
          </div>
        </div>
      </PageFrame>

      <PageFrame number={4} className="slides-solution">
        <div className="slides-section-top"><TemanMuWordmark /><span>04 · The solution</span></div>
        <div className="slides-solution-heading" data-slide-reveal>
          <p className="slides-eyebrow">The solution</p>
        </div>
        <div className="slides-solution-columns">
          <section className="slides-solution-safety" aria-labelledby="present-safety-title" data-slide-reveal>
            <h3 id="present-safety-title">Safety</h3>
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
              <article className="slides-sensor-demo slides-sensor-card">
                <div className="slides-sensor-visual" aria-hidden="true"><span className="slides-card-reader"><span className="slides-card-reader-light" /></span><span className="slides-card-pass"><CreditCard /></span><span className="slides-card-wave" /></div>
                <strong>Access card</strong>
                <p><b>Taps out at the lobby, then home stays quiet</b> → Possible Away. If she is out longer than her usual outing, TemanMu checks in and alerts the caregiver if unanswered.</p>
              </article>
            </div>
            <div className="slides-learning-note">
              <strong>Two models learn her normal day</strong>
              <p>The <b>Quiet Gap Model</b> learns how long she usually goes without water. The <b>Outing Model</b> learns how long she is usually out after tapping her card. Both models use a different time limit for morning, afternoon and night, based on her usual routine.</p>
            </div>
          </section>
          <section className="slides-solution-companion" aria-labelledby="present-companion-title" data-slide-reveal>
            <h3 id="present-companion-title">Companion</h3>
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
            <p><strong>Two ways to connect.</strong> A <strong>Community Buddy</strong> (a township volunteer) joins a resident for nearby activities. <strong>Neighbour matching</strong> introduces residents with similar routines, such as two early walkers on the same street.</p>
          </section>
        </div>
      </PageFrame>

      <PageFrame number={5} className="slides-how present-how">
        <div className="slides-section-top"><TemanMuWordmark /><span>05 · How it works</span></div>
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
                <span><Droplets /></span><span><Zap /></span><span><CreditCard /></span>
              </div>
              <h3>Water, electricity and card taps pick up daily activity</h3>
              <p>No cameras. Nothing new to wear or charge: she uses the card she already has.</p>
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
                <div><span>Possible Away</span><h3>Card tapped out, then the home went quiet</h3></div>
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
      <PageFrame number={6} className="final-installation">
        <div className="slides-section-top">
          <p className="final-mentor-note">Mentor feedback: How can TemanMu be implemented in existing homes?</p>
          <span>06 · Feasibility</span>
        </div>
        <div className="final-installation-heading">
          <h2>Implementing TemanMu <em>in existing homes</em></h2>
          <p>Retrofit household monitoring, installed by qualified professionals.</p>
        </div>
        <div className="final-installation-columns">
          <section className="final-installation-column" aria-labelledby="final-electricity-title">
            <header className="final-utility-header">
              <div><span className="final-utility-label">01 · Electricity</span><h3 id="final-electricity-title">CT electricity monitor</h3></div>
              <img src="/images/partners/tnb.svg" alt="Tenaga Nasional Berhad (TNB)" width="170" height="70" />
            </header>
            <ol className="final-installation-steps">
              <li><span>1</span><div><h4>Survey the distribution board</h4><p>Check the home’s phase arrangement, load and suitable measurement point.</p></div></li>
              <li><span>2</span><div><h4>Install the CT monitor</h4><p>A registered electrical contractor fits matched current sensors and the monitor. The TNB billing meter stays in place.</p></div></li>
              <li><span>3</span><div><h4>Connect and commission</h4><p>Send readings over LAN/Wi-Fi or a managed gateway. Verify appliance changes and the household standby baseline.</p></div></li>
            </ol>
            <p className="final-utility-path">CT monitor <span>→</span> Home network / gateway <span>→</span> TemanMu</p>
          </section>
          <section className="final-installation-column" aria-labelledby="final-water-title">
            <header className="final-utility-header">
              <div><span className="final-utility-label">02 · Water</span><h3 id="final-water-title">NB-IoT water meter</h3></div>
              <img src="/images/partners/air-selangor.svg" alt="Air Selangor" width="150" height="85" />
            </header>
            <ol className="final-installation-steps">
              <li><span>1</span><div><h4>Survey the household supply</h4><p>Check pipe branches and storage tanks so the meter captures the intended indoor water use.</p></div></li>
              <li><span>2</span><div><h4>Install at the selected pipe</h4><p>A plumber fits the activity meter at the surveyed point. Preserve the utility billing meter and its seals.</p></div></li>
              <li><span>3</span><div><h4>Connect and test water use</h4><p>Provision NB-IoT connectivity and agreed data access. Test small tap uses, reporting delay and signal coverage.</p></div></li>
            </ol>
            <p className="final-utility-path">Water meter <span>→</span> NB-IoT network / platform <span>→</span> TemanMu</p>
          </section>
        </div>
      </PageFrame>
      <PageFrame number={7} className="final-landed">
        <div className="slides-section-top">
          <p className="final-mentor-note">Mentor feedback: How does this work for landed homes without a dedicated guardhouse?</p>
          <span>07 · Landed homes</span>
        </div>
        <div className="final-landed-heading">
          <h2>Extending TemanMu <em>to landed homes</em></h2>
          <p>The same household monitoring, connected to an agreed township response team.</p>
        </div>
        <div className="final-landed-content">
          <section className="final-landed-responders" aria-labelledby="final-landed-response-title">
            <img className="final-police-art" src="/images/final-slides/auxiliary-police.png" alt="Illustration of two approachable Auxiliary Police community responders" width="1024" height="1536" />
            <div>
              <h3 id="final-landed-response-title">Support beyond the guardhouse</h3>
              <p>Build on Sime Darby Property’s Auxiliary Police network for agreed local welfare checks.</p>
              <p className="final-landed-coverage">No dedicated guard at the home? A designated township team can respond within its agreed service area.</p>
            </div>
          </section>
          <figure className="final-landed-dashboard">
            <figcaption><div><span>Example · City of Elmina</span><h3>Ilham Residence 3</h3></div><a href="/township-landed" target="_blank" rel="noopener noreferrer">Open dashboard <span className="sr-only">in a new tab</span> ↗</a></figcaption>
            <a className="final-landed-preview" href="/township-landed" target="_blank" rel="noopener noreferrer" aria-label="Open the Ilham Residence 3 demo dashboard in a new tab"><img src="/images/final-slides/ilham-residence-3-dashboard.png" alt="Existing Ilham Residence 3 dashboard showing the 3D neighbourhood, sample household concerns and response panel" width="1180" height="790" /></a>
            <p className="final-landed-demo-note">Existing UI demo · simulated households and cases, not a live deployment.</p>
          </figure>
        </div>
        <ol className="final-landed-flow" aria-label="Proposed landed-home response workflow">
          <li><span>01</span><div><strong>Household concern</strong><p>Unusual activity remains unresolved after the resident check-in.</p></div></li>
          <li><span>02</span><div><strong>Family + township notified</strong><p>The designated team receives the home and concern details.</p></div></li>
          <li><span>03</span><div><strong>A responder accepts the check</strong><p>Follow the agreed procedure, record the outcome and escalate when needed.</p></div></li>
        </ol>
        <p className="final-landed-scope">Proposed Auxiliary Police engagement, subject to confirmed coverage and agreed duties. Outside coverage, arrange a nominated local contact or response partner.</p>
      </PageFrame>
      <PageFrame number={8} className="slides-impact final-impact">
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
      <PageFrame number={9} className="final-market">
        <div className="slides-section-top">
          <p className="final-mentor-note">Mentor feedback: How does TemanMu support Sime Darby Property’s business?</p>
          <span>09 · Business viability</span>
        </div>
        <div className="final-market-heading">
          <p className="slides-eyebrow">The family need</p>
          <h2>Parents want independence.<br /><em>Families need peace of mind.</em></h2>
          <p>A Care-Ready Home could give families another reason to choose SDP.</p>
        </div>
        <ol className="final-market-opportunities" aria-label="Three commercial opportunities for SDP" data-slide-reveal>
          <li><span>01</span>
            <svg className="final-opportunity-art" viewBox="0 0 100 76" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 35 36 13l26 22M17 30v34h38V30M29 64V46h14v18" />
              <circle cx="73" cy="45" r="18" fill="#f5eee1" />
              <path className="final-opportunity-check" pathLength="1" d="m64 45 6 6 12-13" />
            </svg>
            <h3>Differentiation</h3><p>Give families another reason to choose SDP through support for parents living independently.</p>
          </li>
          <li><span>02</span>
            <svg className="final-opportunity-art" viewBox="0 0 100 76" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 35 34 14l25 21M16 30v34h36V30M28 64V47h12v17" />
              <g className="final-opportunity-key"><circle cx="70" cy="30" r="10" fill="#f5eee1" /><path d="m70 40 0 24m0-7h9m-9-8h6" /><circle cx="70" cy="28" r="2" /></g>
            </svg>
            <h3>Premium positioning</h3><p>Create an optional Care-Ready home package for families seeking added reassurance.</p>
          </li>
          <li><span>03</span>
            <svg className="final-opportunity-art" viewBox="0 0 100 76" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 29 22 15l17 14M10 25v26h24V25M18 51V38h8v13M61 29l17-14 17 14M66 25v26h24V25M74 51V38h8v13" />
              <path className="final-opportunity-link" d="M22 59v6h56v-6" strokeDasharray="4 5" />
              <g className="final-opportunity-heart"><path d="M50 47s-10-6-10-12a5.5 5.5 0 0 1 10-3 5.5 5.5 0 0 1 10 3c0 6-10 12-10 12Z" fill="#f5eee1" /></g>
            </svg>
            <h3>Multigenerational demand</h3><p>Attract families considering a home for their parents nearby, with potential second-unit interest.</p>
          </li>
        </ol>
        <div className="final-market-numbers" aria-label="Supporting market context from SDP, DOSM and NHMS">
          <div><span>Elmina · Household context</span><strong><small>RM</small>16,667<small> / month</small></strong><p>Estimated average household income · SDP</p></div>
          <div><span>Elmina · Existing scale</span><strong>11,000<small>+</small></strong><p>Completed homes reported by SDP</p></div>
          <div><span>Malaysia · Ageing population</span><strong>8.4<small>%</small></strong><p>Aged 65+ in 2026 · DOSM</p></div>
          <div><span>Malaysia · Living alone</span><strong>18.8<small>%</small></strong><p>Aged 60+ in 2025 · NHMS<br />6.3% in 2018 · nearly 3×<br />≈770,000 people (rough estimate)</p></div>
        </div>
        <p className="final-market-note">Market context, not proven demand. Pricing, take-up and sales impact require pilot validation.</p>
        <p className="final-market-sources">Sources: <a href="https://www.simedarbyproperty.com/commercial/city-of-elmina" target="_blank" rel="noopener noreferrer">SDP · City of Elmina</a> · <a href="https://www.dosm.gov.my/portal-main/release-content/current-population-estimates-2026" target="_blank" rel="noopener noreferrer">DOSM · Population 2026</a> · <a href="https://iku.nih.gov.my/images/nhms-2025/infographic-eng.pdf" target="_blank" rel="noopener noreferrer">MOH · NHMS 2025, infographics 1 &amp; 3</a></p>
      </PageFrame>
      <PageFrame number={10} className="final-closing">
        <div className="slides-section-top"><TemanMuWordmark /><span>10 · Our promise</span></div>
        <div className="final-closing-main">
          <div className="final-closing-copy">
            <p className="slides-eyebrow">TemanMu · Independent living, connected care</p>
            <h2>Mum keeps her independence.<br /><em>Sarah stays connected.</em></h2>
            <p className="final-closing-value">A quiet change at home becomes a check-in. An unresolved concern reaches family and nearby support.</p>
            <p className="final-closing-township">Connecting the home, the family and the township.</p>
          </div>
          <figure ref={closingArtRef} className={`final-closing-art${closingVisible ? ' is-visible' : ''}`}>
            <div className="final-close-scenes">
              <div className={`final-close-scene final-close-work${closingScene === 0 ? ' is-active' : ''}`} aria-hidden={closingScene !== 0}>
                <img className="final-close-work-art" src="/images/final-slides/sarah-at-work.png" alt="Sarah working at her laptop while TemanMu keeps her connected to her mother at home" width="1536" height="1024" />
                <svg className="final-close-connection" viewBox="0 0 700 460" fill="none" aria-hidden="true"><path d="M165 145C270 145 230 280 370 280" stroke="currentColor" strokeWidth="2" strokeDasharray="5 7" /></svg>
                <div className="final-close-update">
                  <span>TemanMu</span>
                  <div><img src="/images/mum-profile.jpg" alt="" width="48" height="48" /><p><strong>Mum’s day has started</strong><span>Morning activity recorded</span></p></div>
                  <small>Illustrative routine update</small>
                </div>
              </div>
              <div className={`final-close-scene final-close-together${closingScene === 1 ? ' is-active' : ''}`} aria-hidden={closingScene !== 1}>
                <div className="final-close-family"><img src="/images/final-slides/sarah-and-madam-lee.png" alt="Sarah sitting beside Madam Lee, holding hands and smiling together" width="1536" height="1024" /></div>
                <svg className="final-close-heart" viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M30 46S10 34 10 22a11 11 0 0 1 20-6 11 11 0 0 1 20 6c0 12-20 24-20 24Z" /></svg>
              </div>
            </div>
            <figcaption><span className="final-close-caption-scene">{closingScene === 0 ? 'At work. Still connected.' : 'Together, when she can be.'}</span><span>Sarah &amp; Madam Lee · connected through TemanMu</span></figcaption>
          </figure>
        </div>
      </PageFrame>
      <section className="slides-page final-business-model" aria-label="Appendix A1: Proposed business model">
        <img className="slides-sdp-logo" src="/images/sdp-logo.png" alt="Sime Darby Property" />
        <div className="slides-section-top">
          <p className="final-mentor-note">Mentor feedback: Who pays for installation and the ongoing service?</p>
          <span>Appendix A1 · Business model</span>
        </div>
        <div className="final-model-heading">
          <p className="slides-eyebrow">Proposed funding model</p>
          <h2>Install once.<br /><em>Support through the township.</em></h2>
          <p>For participating managed developments: a buyer-funded installation, with ongoing service budgeted within agreed maintenance fees.</p>
        </div>
        <div className="final-model-columns">
          <section aria-labelledby="final-model-buyer">
            <span className="final-model-number">01 · One-off</span>
            <h3 id="final-model-buyer">Buyer pays for installation</h3>
            <ul><li>Household monitoring equipment</li><li>Professional installation and commissioning</li><li>Setup, connectivity checks and onboarding</li></ul>
            <p className="final-model-summary">A clear setup cost when the household joins.</p>
          </section>
          <section aria-labelledby="final-model-operator">
            <span className="final-model-number">02 · Ongoing</span>
            <h3 id="final-model-operator">Included in the agreed maintenance package</h3>
            <ul><li>Platform, data connectivity and voice check-ins</li><li>Device upkeep, support and a replacement allowance</li><li>Agreed local response provision</li></ul>
            <p className="final-model-summary">Management pays TemanMu under a service contract.</p>
          </section>
        </div>
        <div className="final-model-conditions">
          <div><strong>Budget it explicitly</strong><p>Confirm the eligible funding route, approvals and service cost with management. Inclusion may require a fee adjustment or subsidy.</p></div>
          <div><strong>Individual-title homes</strong><p>Where no shared maintenance arrangement exists, use an agreed estate-service package or an opt-in household plan.</p></div>
        </div>
        <p className="final-model-note">Proposed model, not a confirmed fee arrangement. Ongoing service is funded through the package; it is not cost-free. Validate cost per enrolled home and response capacity.</p>
        <div className="slides-page-bottom"><span>TemanMu · Township care</span><span>Appendix A1</span></div>
      </section>
      <section className="slides-page final-pilot" aria-label="Appendix A2: Pilot plan">
        <img className="slides-sdp-logo" src="/images/sdp-logo.png" alt="Sime Darby Property" />
        <div className="slides-section-top"><TemanMuWordmark /><span>Appendix A2 · Pilot plan</span></div>
        <div className="final-model-heading">
          <p className="slides-eyebrow">Proposed first pilot</p>
          <h2>Start small.<br /><em>Learn from real homes.</em></h2>
          <p>A supervised pilot to test the technology and the human response together.</p>
        </div>
        <ol className="final-market-opportunities" aria-label="Three pilot stages">
          <li><span>01</span><h3>5–10 consenting homes</h3><p>Begin with participating households and an agreed local response team.</p></li>
          <li><span>02</span><h3>Test the whole workflow</h3><p>Install real sensors and test data delivery, phone check-ins and welfare-check procedures.</p></li>
          <li><span>03</span><h3>Measure what matters</h3><p>Evaluate reliability, nuisance alerts, resident acceptance and responder workload.</p></li>
        </ol>
        <p className="final-model-note">Proposed pilot scope. Confirm installation, household consent and responder arrangements before deployment.</p>
        <div className="slides-page-bottom"><span>TemanMu · Township care</span><span>Appendix A2</span></div>
      </section>
    </div>
  </main>
}
