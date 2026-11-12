import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { BellRing, Camera, CreditCard, Droplets, Faucet, HeartHandshake, Home, Lightbulb, Lock, PhoneCall, ShieldCheck, Smartphone, Users, Watch, Zap } from 'lucide-react'
import { startScene } from '../landing/scene'
import { HardwareAppendix } from './HardwareAppendix'
import { MonitoringResearchAppendix, TemanMuAdvantages } from './MonitoringEvidence'
import './slides.css'
import './present.css'
import './final-slides.css'

// The 3D home pulls in three.js and the house models, so it loads on its own after the deck appears.
const PresentHome = lazy(() => import('./PresentHome').then(module => ({ default: module.PresentHome })))

const PAGE_COUNT = 11
const SHOW_APPENDIX_BUSINESS_MODEL = false
const SHOW_HARDWARE_APPENDICES = false
const APPENDIX_CONTENTS = [
  { id: 'A1', title: 'Pilot plan' },
  { id: 'A2', title: 'Machine learning' },
  { id: 'A3', title: 'Elderly usability' },
  { id: 'A4', title: 'Privacy' },
  { id: 'A5', title: 'Research evidence' },
  { id: 'A6', title: 'Home-entry safeguards' },
  { id: 'A7', title: 'Business model', show: SHOW_APPENDIX_BUSINESS_MODEL },
]

// Contents links scroll to their appendix page smoothly instead of jumping.
function jumpToAppendix(event: MouseEvent<HTMLAnchorElement>) {
  const target = document.querySelector(event.currentTarget.getAttribute('href') ?? '')
  if (!target) return
  event.preventDefault()
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}
// Hourly allowance, 6 AM to 11 PM. 'o' marks the outing allowance (card taps); the rest are quiet-gap allowances.
const LEARNS_HOURS: Array<[number, string?]> = [[22],[20],[22],[52,'o'],[52,'o'],[18],[20],[44],[50],[44],[20],[18],[22],[20],[24],[28],[88],[100]]
const names = ['TAN SHI HAN', 'LIM JING JET', 'KHOR HONG JUN', 'LEE YANG', 'CHO JING LING']

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
      // The slide is scaled to the window; screen measurements are divided by that scale so the line and dot land in slide pixels.
      const z = wr.width / wrap.offsetWidth || 1
      const rel = (el: Element) => { const r = el.getBoundingClientRect(); return { x: (r.left - wr.left) / z, y: (r.top - wr.top) / z, w: r.width / z, h: r.height / z } }
      const b = rel(box2)
      const rows = rowEls.map(r => rel(r!))
      // Leave box 2 at its middle, kept within the branch line's span (first to last result) so the two always meet.
      const top = rows[0].y + rows[0].h / 2, bottom = rows[2].y + rows[2].h / 2
      const fy = Math.min(Math.max(b.y + b.h / 2, top), bottom, b.y + b.h - 12)
      feed.style.top = `${fy}px`
      if (reduce) return
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
const SLIDE_CANVAS_WIDTH = 1600 // matches .slides-fixed .slides-page in slides.css

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
  // Every slide is a fixed 1600×900 (16:9) canvas, scaled to the window; printing uses the same still frames as the PowerPoint export.
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

  return <main ref={rootRef} className="slides-root slides-fixed slides-scaled">
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

      <PageFrame number={2} className="present-problem final-problem">
        <div className="slides-section-top"><TemanMuWordmark /><span>02 · The problem</span></div>
        <div className="present-problem-heading" data-slide-reveal>
          <p className="slides-eyebrow">The problem · Malaysia, aged 60+</p>
          <h2>More older Malaysians live alone. <em>Who notices when something goes wrong?</em></h2>
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
            <span className="present-problem-label">02 · Safety risk</span>
            <div className="present-problem-body">
              <svg className="final-problem-people" viewBox="0 0 300 270" role="img" aria-label="Seven people, with one slightly larger and shaded to represent about one in seven">
                {[{ x: 42, y: 52 }, { x: 114, y: 52 }, { x: 186, y: 52 }, { x: 258, y: 52 }, { x: 68, y: 179 }, { x: 150, y: 179 }, { x: 232, y: 179 }].map((person, i) => <g key={i} className={i === 5 ? 'is-highlighted' : undefined} transform={`translate(${person.x} ${person.y}) scale(${i === 5 ? 1.18 : 1})`}>
                  <circle cy="-12" r="20" />
                  <path d="M-30 48v-8a30 30 0 0 1 60 0v8a6 6 0 0 1-6 6h-48a6 6 0 0 1-6-6Z" />
                </g>)}
              </svg>
              <div className="present-problem-figure">
                <strong>14.3<small>%</small></strong>
                <p><mark>About 1 in 7</mark> Malaysians aged 60+ reported a fall in the previous 12 months · NHMS 2025</p>
              </div>
            </div>
          </div>
        </div>
        <div className="slides-problem-gap">
          <span className="slides-problem-gap-label">Current solution gap</span>
          <div className="slides-problem-gap-items">
            <article className="slides-problem-gap-card"><span className="slides-problem-gap-icon" aria-hidden="true"><Camera size={42} strokeWidth={1.6} /></span><div><b>Cameras</b><p>Can feel like being supervised at home, raising privacy concerns.</p><p className="final-gap-evidence"><strong>36.7%</strong> accepted home cameras for detecting falls or pain.<small>Swiss adult survey · n = 1,211 · <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC12948381/" target="_blank" rel="noopener noreferrer">Wangmo et al., 2026</a></small></p></div></article>
            <article className="slides-problem-gap-card"><span className="slides-problem-gap-icon" aria-hidden="true"><Watch size={42} strokeWidth={1.6} /></span><div><b>Wearables</b><p>Must remember to wear and charge it—may not suit older adults who struggle with this routine.</p><p className="final-gap-evidence"><strong>32%</strong> wore it on fewer than 4 of 14 days.<small>Small activity-monitoring pilot · 7 of 22 participants · <a href="https://aging.jmir.org/2024/1/e60209/" target="_blank" rel="noopener noreferrer">Ding et al., 2024</a></small></p></div></article>
          </div>
        </div>
        <p className="present-problem-sources">Sources: <a href="https://iku.nih.gov.my/images/IKU/Document/REPORT/NHMS2018/FactsheetElderlyAged60yearsorMorefinal.pdf" target="_blank" rel="noreferrer">NHMS 2018 Elderly Health</a> · <a href="https://iku.nih.gov.my/images/nhms-2025/infographic-eng.pdf" target="_blank" rel="noreferrer">NHMS 2025 Key Findings</a> · <a href="https://iku.nih.gov.my/images/nhms-2025/nhms-2025-volume-2.pdf#page=51" target="_blank" rel="noreferrer">NHMS 2025 Vol. II · Falls, p. 39</a></p>
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
          </section>
          <section className="slides-solution-companion final-learns" aria-labelledby="present-learns-title" data-slide-reveal>
            <h3 id="present-learns-title">Learns <em>her</em> day</h3>
            <p className="final-learns-lead">Start with agreed limits, then adapt them to her own routine.</p>

            <article className="fl-card">
              <span className="final-learns-label">Two ML models · one daily routine</span>
              <p className="final-learns-question">How long can it stay quiet before TemanMu checks?</p>
              <div className="fl-chart" role="img" aria-label="Illustrative bar chart: allowed quiet time is shortest in the morning and afternoon, longer during her usual nap and outings, and longest overnight">
                {LEARNS_HOURS.map(([h, k], i) => <div key={i}><span style={{ height: `${h}%`, background: k ? '#f5eee1' : h > 40 ? '#a95130' : '#c98d67', border: k ? '2px dashed #a95130' : 0, animationDelay: `${0.2 + i * 0.05}s` }} /></div>)}
                <span className="fl-tag" style={{ top: 56, left: '16.6%', width: '11.1%' }}>Out walking</span>
                <span className="fl-tag" style={{ top: 64, left: '38.9%', width: '16.7%' }}>Usual nap</span>
                <span className="fl-tag" style={{ top: 4, right: 0, width: '11.1%' }}>Asleep</span>
              </div>
              <div className="fl-axis"><span>6 AM</span><span>NOON</span><span>6 PM</span><span>MIDNIGHT</span></div>
              <div className="fl-models">
                <div><i /><div><b>Quiet Gap Model</b><p>Water and electricity. Learns how long her home is usually quiet at each time of day.</p></div></div>
                <div><i className="dash" /><div><b>Outing Model</b><p>Card taps. Learns how long her outings usually last, with a buffer so running late isn’t an alarm.</p></div></div>
              </div>
            </article>

            <div className="final-learns-note">
              <p><strong>At first: 4 daytime hours without activity → a check-in.</strong> A caregiver-agreed pilot setting; sleep, outings and missing data handled separately.</p>
              <p><strong>Then: retrained weekly using her latest 6 weeks of valid routine,</strong> so quiet-time and outing limits follow her changing habits.</p>
              <small>Proposed pilot settings, not a clinical rule. <a href="https://tunstallemergencyresponse.ie/wp-content/uploads/2025/08/communicall_digital_user_guide.pdf#page=24" target="_blank" rel="noopener noreferrer">Tunstall guide: custom inactivity schedules, p. 21</a>.<br />Demo simulation: ~1 false alarm/week vs 6.5 with a fixed 4-hour rule; real-home rates unvalidated.</small>
            </div>
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
                <div className="slides-how-chain final-how-response">
                  <div><b>TemanMu calls her</b><i>→</i><b>No answer: family + township alerted</b></div>
                  <div><i>→</i><b>Guard / Auxiliary Police checks</b><i>→</i><b>Records outcome</b></div>
                  <div><i>→</i><b>If emergency: call 999 immediately</b><i>→</i><b>Update incident log</b></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="slides-how-companion2">
          <HeartHandshake aria-hidden="true" />
          <p><strong>Companion on ordinary days</strong> · Family can invite her to nearby activities, match her with a volunteer buddy, or introduce her to a neighbour on the same routine.</p>
        </div>
      </PageFrame>
      <PageFrame number={6} className="monitoring-benefits">
        <div className="slides-section-top"><TemanMuWordmark /><span>06 · Innovative advantages</span></div>
        <TemanMuAdvantages eyebrow="Innovative advantages" />
      </PageFrame>
      <PageFrame number={7} className="final-installation">
        <div className="slides-section-top">
          <p className="final-mentor-note">Mentor feedback: How can TemanMu be implemented in existing homes?</p>
          <span>07 · Feasibility</span>
        </div>
        <div className="final-installation-heading">
          <h2>Reuse existing meters. <em>Connect through utilities.</em></h2>
          <p>Proposed TNB + Air Selangor collaboration · Minimal installation in eligible pilot homes.</p>
        </div>
        <div className="final-installation-columns">
          <section className="final-installation-column" aria-labelledby="final-electricity-title">
            <header className="final-utility-header">
              <div><span className="final-utility-label">01 · Electricity</span><h3 id="final-electricity-title">Existing smart meters</h3></div>
              <img src="/images/partners/tnb.svg" alt="Tenaga Nasional Berhad (TNB)" width="170" height="70" />
            </header>
            <ol className="final-installation-steps">
              <li><span>1</span><div><h4>Engage TNB’s innovation teams</h4><p>Approach TNB Research / TNB LABS Digital Solutions for a consent-based pilot.</p></div></li>
              <li><span>2</span><div><h4>Caregiver Data Consent framework</h4><p>Propose a resident-authorised application programming interface (API), aligned with the Personal Data Protection Act (PDPA).</p></div></li>
              <li><span>3</span><div><h4>Request more frequent readings</h4><p>Seek 1–5-minute measurement records and lower delivery delay, subject to meter and network capability.</p></div></li>
            </ol>
            <p className="final-utility-path">Existing meter <span>→</span> TNB data platform <span>→</span> TemanMu</p>
          </section>
          <section className="final-installation-column" aria-labelledby="final-water-title">
            <header className="final-utility-header">
              <div><span className="final-utility-label">02 · Water</span><h3 id="final-water-title">Existing unit meters</h3></div>
              <img src="/images/partners/air-selangor.svg" alt="Air Selangor" width="150" height="85" />
            </header>
            <ol className="final-installation-steps">
              <li><span>1</span><div><h4>Build on leak-detection infrastructure</h4><p>Engage Innovation &amp; Technology / Non-Revenue Water (NRW) teams on existing smart-meter data.</p></div></li>
              <li><span>2</span><div><h4>Propose automated welfare checks</h4><p>Add an “Abnormal Low Flow / Zero Flow Welfare Check” feature that prompts human contact.</p></div></li>
              <li><span>3</span><div><h4>Expand the NB-IoT pilot to SDP</h4><p>Invite expansion to equipped SDP townships; prefer individual-unit smart meters downstream of shared storage tanks.</p></div></li>
            </ol>
            <p className="final-utility-path">Existing meter <span>→</span> Air Selangor platform <span>→</span> TemanMu</p>
          </section>
          <section className="final-installation-column" aria-labelledby="final-access-title">
            <header className="final-utility-header">
              <div><span className="final-utility-label">03 · Access Card</span><h3 id="final-access-title">SDP access-card system</h3></div>
              <img className="final-access-card" src="/images/partners/sdp-access-card.png" alt="Sime Darby Property resident access card" width="640" height="363" />
            </header>
            <ol className="final-installation-steps">
              <li><span>1</span><div><h4>Who · Link her card to her unit</h4><p>Building management tags her existing card as a TemanMu resident. No new card or device.</p></div></li>
              <li><span>2</span><div><h4>Where · Choose which readers count</h4><p>Mark lobby, lift and gate readers as “going out” or “coming home”. Existing readers stay in place.</p></div></li>
              <li><span>3</span><div><h4>When · Every tap is time-stamped</h4><p>Tapped out with no activity at home: probably out. Tapped in but no water or electricity use soon after: someone checks.</p></div></li>
            </ol>
            <p className="final-utility-path">Card tap <span>→</span> SDP access system <span>→</span> TemanMu</p>
            <p className="final-access-note"><strong>Landed homes:</strong> use a door sensor.</p>
          </section>
        </div>
        <div className="final-installation-evidence">
          <p>Proposed partnerships · Data access, reporting intervals and welfare-check accuracy require pilot validation. NB-IoT: Narrowband Internet of Things.</p>
          <p>Sources: <a href="https://www.tnb.com.my/doing-business-with-tnb/education-research-consultancy/tnb-research" target="_blank" rel="noopener noreferrer">TNB Research</a> · <a href="https://www.tnblabs.com.my/digital-solutions" target="_blank" rel="noopener noreferrer">TNB LABS</a> · <a href="https://www.airselangor.com/about-us/innovation-and-technology" target="_blank" rel="noopener noreferrer">Air Selangor innovation</a> · <a href="https://hydrohub.airselangor.com/content/uploads/2023/01/PerformanceReport2019-2.pdf" target="_blank" rel="noopener noreferrer">NB-IoT pilot</a></p>
        </div>
      </PageFrame>
      <PageFrame number={8} className="final-landed">
        <div className="slides-section-top">
          <p className="final-mentor-note">Mentor feedback: How does this work for landed homes without a dedicated guardhouse?</p>
          <span>08 · Landed homes</span>
        </div>
        <div className="final-landed-heading">
          <h2>Extending TemanMu <em>to landed homes</em></h2>
          <p>Connecting household monitoring to each neighbourhood’s own guards.</p>
        </div>
        <div className="final-landed-content">
          <figure className="final-landed-dashboard">
            <figcaption>
              <span>Example · City of Elmina · Ilham Residence 3</span>
              <a href="/township-landed" target="_blank" rel="noopener noreferrer">Open dashboard <span className="sr-only">in a new tab</span> ↗</a>
            </figcaption>
            <a className="final-landed-preview" href="/township-landed" target="_blank" rel="noopener noreferrer" aria-label="Open the Ilham Residence 3 demo dashboard in a new tab">
              <img src="/images/final-slides/ilham-residence-3-dashboard.png" alt="Ilham Residence 3 dashboard showing the 3D neighbourhood, sample household concerns and response panel" width="1640" height="786" />
            </a>
            <p className="final-landed-sensor-note">Household monitoring: water and electricity patterns, with a door sensor to help identify possible outings.</p>
          </figure>
          <div className="final-landed-answers">
            <div className="final-landed-officers">
              <img src="/images/final-slides/neighbourhood-guards.png" alt="Two neighbourhood security guards" width="1024" height="1536" />
              <p>Guards appointed by the residents’ association</p>
            </div>
            <ol>
              <li><span>01</span><div><h3>Every neighbourhood <em>has its own guards</em></h3><p>Residents pay their residents’ association, which appoints the guards.</p></div></li>
              <li><span>02</span><div><h3>From alerts <em>to welfare checks</em></h3><p>Unresolved alerts go to the neighbourhood’s guard on duty, who can carry out consented welfare checks on the household.</p></div></li>
            </ol>
          </div>
        </div>
        <p className="final-landed-scope">Subject to agreement with the residents’ association and household consent. Dashboard: UI demo with simulated households and cases.</p>
      </PageFrame>
      <PageFrame number={9} className="slides-impact final-impact">
        <div className="slides-section-top"><TemanMuWordmark /><span>09 · Impact</span></div>
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
      <PageFrame number={10} className="final-market">
        <div className="slides-section-top">
          <p className="final-mentor-note">Mentor feedback: How does TemanMu support Sime Darby Property’s business?</p>
          <span>10 · Business viability</span>
        </div>
        <div className="final-viability-numbers" aria-label="Older residents in Sime Darby Property's home districts, from DOSM and NHMS" data-slide-reveal>
          <section className="final-viability-hero" aria-labelledby="final-viability-alone-title">
            <h3 className="final-viability-label" id="final-viability-alone-title">Seniors likely living alone around SDP’s townships</h3>
            <strong>≈89,000</strong>
            <p>older residents in Petaling and Klang districts<span>Estimate: 473,600 residents aged 60+ (DOSM 2026) × 18.8%, the national share of 60+ living alone (NHMS 2025)</span></p>
          </section>
          <section className="final-viability-districts" aria-labelledby="final-viability-districts-title">
            <div className="final-viability-districts-head">
              <h3 className="final-viability-label" id="final-viability-districts-title">Residents aged 60+ in SDP’s home districts</h3>
              <p className="final-viability-key" aria-hidden="true"><i className="is-alone" />Est. living alone<i />Others aged 60+</p>
            </div>
            <dl className="final-viability-rows">
              <div className="final-viability-row">
                <dt><b>Petaling</b><span>City of Elmina · Ara Damansara</span></dt>
                <dd className="final-viability-bar" style={{ '--bar': 322.7 / 322.7 } as CSSProperties} aria-label="322,700 aged 60+, of whom about 61,000 estimated living alone">
                  <i><span /></i>
                </dd>
                <dd className="final-viability-count"><strong>322,700</strong><span>≈61,000 alone</span></dd>
                <dd className="final-viability-growth"><strong>+32%</strong><span>since 2020</span></dd>
              </div>
              <div className="final-viability-row">
                <dt><b>Klang</b><span>Bandar Bukit Raja</span></dt>
                <dd className="final-viability-bar" style={{ '--bar': 150.9 / 322.7 } as CSSProperties} aria-label="150,900 aged 60+, of whom about 28,000 estimated living alone">
                  <i><span /></i>
                </dd>
                <dd className="final-viability-count"><strong>150,900</strong><span>≈28,000 alone</span></dd>
                <dd className="final-viability-growth"><strong>+32%</strong><span>since 2020</span></dd>
              </div>
            </dl>
            <p className="final-viability-national">Nationally, <strong>18.8%</strong> of people aged 60+ now live alone, up from 6.3% in 2018. <em>Nearly 3× in seven years.</em></p>
          </section>
        </div>
        <div className="final-viability-bridge">
          <h2>Parents want independence. <em>Families need peace of mind.</em></h2>
          <p>A Care-Ready Home could give families another reason to choose SDP.</p>
        </div>
        <ol className="final-viability-moves" aria-label="Three commercial opportunities for SDP" data-slide-reveal>
          <li>
            <svg className="final-opportunity-art" viewBox="0 0 100 76" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 35 36 13l26 22M17 30v34h38V30M29 64V46h14v18" />
              <circle cx="73" cy="45" r="18" fill="#f5eee1" />
              <path className="final-opportunity-check" pathLength="1" d="m64 45 6 6 12-13" />
            </svg>
            <h3>Differentiation</h3><p>Give families another reason to choose SDP through support for parents living independently.</p>
          </li>
          <li>
            <svg className="final-opportunity-art" viewBox="0 0 100 76" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 35 34 14l25 21M16 30v34h36V30M28 64V47h12v17" />
              <g className="final-opportunity-key"><circle cx="70" cy="30" r="10" fill="#f5eee1" /><path d="m70 40 0 24m0-7h9m-9-8h6" /><circle cx="70" cy="28" r="2" /></g>
            </svg>
            <h3>Premium positioning</h3><p>Create an optional Care-Ready home package for families seeking added reassurance.</p>
          </li>
          <li>
            <svg className="final-opportunity-art" viewBox="0 0 100 76" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 29 22 15l17 14M10 25v26h24V25M18 51V38h8v13M61 29l17-14 17 14M66 25v26h24V25M74 51V38h8v13" />
              <path className="final-opportunity-link" d="M22 59v6h56v-6" strokeDasharray="4 5" />
              <g className="final-opportunity-heart"><path d="M50 47s-10-6-10-12a5.5 5.5 0 0 1 10-3 5.5 5.5 0 0 1 10 3c0 6-10 12-10 12Z" fill="#f5eee1" /></g>
            </svg>
            <h3>Multigenerational demand</h3><p>Attract families considering a home for their parents nearby, with potential second-unit interest.</p>
          </li>
        </ol>
        <p className="final-market-note">Market context, not proven demand. District living-alone figures apply the national NHMS rate to DOSM district populations; no district-level survey exists yet. Pricing, take-up and sales impact require pilot validation.</p>
        <p className="final-market-sources">Sources: <a href="https://open.dosm.gov.my/data-catalogue/population_district?state=selangor&amp;district=petaling&amp;visual=table" target="_blank" rel="noopener noreferrer">DOSM · Population by district, 2020 &amp; 2026</a> · <a href="https://iku.nih.gov.my/images/nhms-2025/infographic-eng.pdf" target="_blank" rel="noopener noreferrer">MOH · NHMS 2025, infographics 1 &amp; 3</a></p>
      </PageFrame>
      <PageFrame number={11} className="final-closing">
        <div className="slides-section-top"><TemanMuWordmark /><span>11 · Our promise</span></div>
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
                <svg className="final-close-connection" viewBox="0 0 690 460" fill="none" aria-hidden="true"><path d="M165 150C195 252 320 262 419 243" stroke="currentColor" strokeWidth="2" strokeDasharray="5 7" /><circle cx="423" cy="242" r="4" fill="currentColor" /></svg>
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
      <section className="slides-page final-appendix-cover" aria-label="Appendix">
        <img className="slides-sdp-logo" src="/images/sdp-logo.png" alt="Sime Darby Property" />
        <div className="slides-section-top"><TemanMuWordmark /><span>Appendix</span></div>
        <div className="final-appendix-cover-main">
          <div className="final-appendix-cover-copy">
            <p className="slides-eyebrow">Supporting detail</p>
            <h2>Appendix</h2>
            <p>Further detail behind the pitch, prepared for questions.</p>
          </div>
          <ol className="final-appendix-cover-list" aria-label="Appendix contents">
            {APPENDIX_CONTENTS.filter(item => item.show !== false).map(item => <li key={item.id}><a href={`#appendix-${item.id.toLowerCase()}`} onClick={jumpToAppendix}><span>{item.id}</span>{item.title}</a></li>)}
          </ol>
        </div>
        <div className="slides-page-bottom"><span>TemanMu · Township care</span><span>Appendix</span></div>
      </section>
      <section id="appendix-a1" className="slides-page final-pilot" aria-label="Appendix A1: Pilot plan">
        <img className="slides-sdp-logo" src="/images/sdp-logo.png" alt="Sime Darby Property" />
        <div className="slides-section-top"><TemanMuWordmark /><span>Appendix A1 · Pilot plan</span></div>
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
        <div className="slides-page-bottom"><span>TemanMu · Township care</span><span>Appendix A1</span></div>
      </section>
      <section id="appendix-a2" className="slides-page final-ml" aria-label="Appendix A2: Machine learning models">
        <img className="slides-sdp-logo" src="/images/sdp-logo.png" alt="Sime Darby Property" />
        <div className="slides-section-top">
          <p className="final-mentor-note">Mentor feedback: How does the system learn a resident’s routine?</p>
          <span>Appendix A2 · Machine learning</span>
        </div>
        <div className="final-model-heading">
          <p className="slides-eyebrow">Personalised routine limits</p>
          <h2>Two models learn<br /><em>when a check-in is due.</em></h2>
          <p>Gradient-boosting quantile regression learns durations from Madam Lee’s own history, using time of day and day of week.</p>
        </div>
        <div className="final-ml-models">
          <section aria-labelledby="final-ml-quiet">
            <span className="final-model-number">01 · At home</span>
            <h3 id="final-ml-quiet">Quiet Gap Model</h3>
            <p className="final-ml-question">“How long does she usually go without using water?”</p>
            <dl>
              <div><dt>Learn from</dt><dd>Gaps between water uses while at home. Exclude outings, planned absences and meter outages.</dd></div>
              <div><dt>Predict</dt><dd>95th-percentile gap, with a 60-minute look-ahead to accommodate approaching rest periods.</dd></div>
              <div><dt>Apply</dt><dd>A validation-tuned multiplier; limit bounded between <b>45 minutes and 9 hours</b>.</dd></div>
            </dl>
          </section>
          <section aria-labelledby="final-ml-outing">
            <span className="final-model-number">02 · Away from home</span>
            <h3 id="final-ml-outing">Outing Model</h3>
            <p className="final-ml-question">“How long is she usually out after tapping her card?”</p>
            <dl>
              <div><dt>Learn from</dt><dd>Completed tap-out / return pairs, including differences between weekdays and weekends.</dd></div>
              <div><dt>Predict</dt><dd>Median outing duration for the departure time and day. Regular market trips can differ from walks.</dd></div>
              <div><dt>Apply</dt><dd>Validation-tuned extra minutes; limit bounded between <b>30 minutes and 6 hours</b>.</dd></div>
            </dl>
          </section>
        </div>
        <div className="final-ml-validation">
          <div><strong>8 weeks</strong><span>Simulated history: 6 weeks to train and tune; 2 untouched weeks to test against fixed-time rules.</span></div>
          <div><strong>15-minute slots</strong><span>Export a limit for each day and time slot. The app reads these limits; it does not retrain live.</span></div>
        </div>
        <p className="final-ml-response"><b>Learned limit exceeded</b><span aria-hidden="true"> → </span>Resident check-in<span aria-hidden="true"> → </span>Family / responder follow-up if unresolved</p>
        <p className="final-ml-note">Prototype: simulated history, compressed demo timing, no real-home accuracy claim. Electricity adds rule-based context; it is not an input to these two models. Unusual inactivity prompts a human check, not a diagnosis.</p>
        <div className="slides-page-bottom"><span>TemanMu · Township care</span><span>Appendix A2</span></div>
      </section>
      <section id="appendix-a3" className="slides-page final-no-app" aria-label="Appendix A3: No app for Madam Lee">
        <img className="slides-sdp-logo" src="/images/sdp-logo.png" alt="Sime Darby Property" />
        <div className="slides-section-top">
          <p className="final-mentor-note">Mentor feedback: What if the elderly resident is not tech-savvy?</p>
          <span>Appendix A3 · Elderly usability</span>
        </div>
        <div className="final-model-heading">
          <p className="slides-eyebrow">No app for Madam Lee</p>
          <h2>She lives her day.<br /><em>TemanMu works in the background.</em></h2>
          <p>No new digital routine to learn. Household signals support monitoring while she goes about her usual day.</p>
        </div>
        <div className="final-no-app-main">
        <div className="final-no-app-devices">
          {[
            { title: 'No apps', detail: 'Nothing to download, log into or tap every day.', art: <><rect x="66" y="12" width="108" height="180" rx="18" /><rect x="76" y="25" width="88" height="151" rx="8" fill="#efe6d8" /><path d="M106 31h28M111 184h18" /><text x="120" y="62" textAnchor="middle" stroke="none" fill="currentColor" fontSize="19" fontFamily="sans-serif">09:41</text>{[0, 1, 2, 3, 4, 5].map(i => <rect key={i} x={87 + (i % 3) * 24} y={82 + Math.floor(i / 3) * 31} width="17" height="18" rx="4" fill="#c9b9a3" stroke="none" />)}</> },
            { title: 'No cameras', detail: 'No indoor video watching her private moments.', art: <><path d="M39 58h124l28 50H63Z" fill="#efe6d8" /><path d="m45 48 110-14 28 20-137 18M75 109l13 25h52l17-25M112 135v25H65v-12H45v40h20v-14h61v-39" /><path d="m163 59 31 47 13-9-30-47Z" fill="#c9b9a3" /><path d="m180 71 11 18" /></> },
            { title: 'No wearables', detail: 'Nothing to remember to wear or keep charged.', art: <><path d="m93 58 6-44h42l6 44M93 148l6 46h42l6-46" fill="#efe6d8" /><rect x="76" y="54" width="88" height="98" rx="24" fill="#efe6d8" /><rect x="86" y="64" width="68" height="78" rx="16" /><path d="M165 86h7v19h-7M120 81v23l16 10" /><circle cx="120" cy="104" r="3" fill="currentColor" /><path d="M111 177h18" /></> },
          ].map(item => <article key={item.title}>
            <div className="final-no-app-mockup" aria-hidden="true">
              <svg className="final-no-app-device" viewBox="0 0 240 210" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">{item.art}</svg>
              <svg className="final-no-app-cross" viewBox="0 0 240 210" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round"><path d="m53 40 134 134M187 40 53 174" /></svg>
            </div>
            <div className="final-no-app-block"><h3>{item.title}</h3><p>{item.detail}</p></div>
          </article>)}
        </div>
        <div className="final-no-app-phone">
          <figure><img src="/images/final-slides/nokia-3310-photo.jpg" alt="Photo collage of a man holding a classic Nokia 3310, matching the photo in the Nokia meme" width="1084" height="610" /><figcaption>Yes, even a Nokia 3310.*</figcaption></figure>
          <div className="final-no-app-call">
            <PhoneCall aria-hidden="true" size={30} strokeWidth={1.7} />
            <div><strong>Just answer an ordinary phone call.</strong><p>When TemanMu or her caregiver checks in, a basic mobile phone is enough.</p></div>
          </div>
        </div>
        </div>
        <p className="final-no-app-note">*A working phone with supported network coverage is needed. Proposed voice check-ins require integration and pilot testing. The app and dashboard are for caregivers and operators.</p>
        <div className="slides-page-bottom"><span>TemanMu · Township care</span><span>Appendix A3</span></div>
      </section>
      <section id="appendix-a4" className="slides-page final-privacy" aria-label="Appendix A4: Privacy and access">
        <img className="slides-sdp-logo" src="/images/sdp-logo.png" alt="Sime Darby Property" />
        <div className="slides-section-top">
          <p className="final-mentor-note">Mentor question: Who can see Madam Lee’s household activity?</p>
          <span>Appendix A4 · Privacy</span>
        </div>
        <div className="final-model-heading">
          <p className="slides-eyebrow">Privacy without an indoor camera</p>
          <h2>Her daily routine stays private.<br /><em>Help is shared when needed.</em></h2>
        </div>
        <div className="final-privacy-flow">
          <div className="fp-home">
            <span className="fp-kicker">At home</span>
            <div className="fp-home-title"><span><Home aria-hidden="true" /></span><h3>Madam Lee’s home</h3></div>
            <div className="fp-signals">
              <div><Droplets aria-hidden="true" /><strong>Water activity</strong></div>
              <div><Zap aria-hidden="true" /><strong>Electricity usage</strong></div>
              <div><CreditCard aria-hidden="true" /><strong>Outing activity</strong></div>
            </div>
          </div>
          <div className="fp-line" aria-hidden="true"><span /><span /></div>
          <div className="fp-hub">
            <span><svg width="40" height="40" viewBox="0 0 64 64" aria-hidden="true"><path d="M14 29 L32 15 L50 29 V50 H14 Z" fill="none" stroke="#fef9ef" strokeWidth="3.6" strokeLinejoin="round" /><path d="M14 31 H50 M32 31 V50" stroke="#fef9ef" strokeWidth="3.6" /><rect x="35" y="34" width="12" height="13" fill="#f0b25a" /></svg></span>
            <strong>TemanMu</strong>
            <em>Compares today with her usual routine</em>
          </div>
          <div className="fp-split" aria-hidden="true">
            <span className="s1" /><span className="s2" /><span className="s3" /><span className="s4" /><span className="s5" />
            <span className="lbl l1">Every day</span>
            <span className="lock"><Lock /></span>
            <span className="lbl l2">Only if unusual</span>
          </div>
          <div className="fp-audiences">
            <section className="fp-aud-people" aria-labelledby="final-privacy-private">
              <div>
                <span className="fp-kicker">Resident + authorised caregiver</span>
                <h3 id="final-privacy-private">Her everyday life</h3>
                <p>Water-use history, household power activity and entry / exit routines.</p>
                <p className="fp-private">These records are not shared with township staff.</p>
              </div>
              <span className="fp-phone"><Smartphone aria-hidden="true" /></span>
            </section>
            <section className="fp-aud-team" aria-labelledby="final-privacy-shared">
              <div>
                <span className="fp-kicker">Township response team</span>
                <h3 id="final-privacy-shared">The information to help</h3>
                <p style={{ fontSize: 15 }}>No routine usage charts, outing history or continuous home / away tracking.</p>
              </div>
              <div className="fp-alert">
                <div className="fp-alert-head"><BellRing aria-hidden="true" /><span>Check needed</span></div>
                <ul><li>Home / location</li><li>Concern requiring a check</li><li>Resident check-in outcome</li><li>Response status and assigned responder</li></ul>
              </div>
            </section>
          </div>
        </div>
        <div className="final-privacy-principles"><span><b>Voluntary participation</b> with clear permissions</span><span><b>Withdrawal</b> and defined retention</span><span><b>Minimal incident records</b> with logged access</span></div>
        <p className="final-privacy-note">Intended access policy. The prototype still needs API and dashboard permissions aligned to this boundary. Sensor processing requires consent; closed incidents retain only an agreed minimum record.</p>
        <div className="slides-page-bottom"><span>TemanMu · Township care</span><span>Appendix A4</span></div>
      </section>
      {SHOW_HARDWARE_APPENDICES && <>
        <HardwareAppendix kind="ct" />
        <HardwareAppendix kind="water" />
      </>}
      <section id="appendix-a5" className="slides-page monitoring-research" aria-label="Appendix A5: Camera and wearable research">
        <img className="slides-sdp-logo" src="/images/sdp-logo.png" alt="Sime Darby Property" />
        <div className="slides-section-top"><TemanMuWordmark /><span>Appendix A5 · Research evidence</span></div>
        <MonitoringResearchAppendix />
        <div className="slides-page-bottom"><span>TemanMu · Township care</span><span>Appendix A5</span></div>
      </section>
      <section id="appendix-a6" className="slides-page final-entry" aria-label="Appendix A6: Consent and safeguards for home entry">
        <img className="slides-sdp-logo" src="/images/sdp-logo.png" alt="Sime Darby Property" />
        <div className="slides-section-top"><TemanMuWordmark /><span>Appendix A6 · Home-entry safeguards</span></div>
        <div className="final-model-heading">
          <p className="slides-eyebrow">Privacy during a welfare check</p>
          <h2>Her home. <em>Her permission.</em></h2>
        </div>
        <p className="final-entry-trigger"><BellRing aria-hidden="true" /><span>Unusual inactivity <b>→</b> Unanswered calls <b>→</b> Welfare check</span></p>
        <div className="final-entry-story">
          <div className="final-entry-scene"><img src="/images/final-slides/home-entry-flow-caregiver.png" alt="Madam Lee and her caregiver Sarah review the consent agreement with a guard." /></div>
          <div className="final-entry-scene"><img src="/images/final-slides/home-entry-flow-caregiver.png" alt="A guard rings the bell and knocks at a closed door." /></div>
          <div className="final-entry-scene"><img src="/images/final-slides/home-entry-flow-caregiver.png" alt="Two guards together at the doorway, one wearing a body camera." /></div>
          <span className="final-entry-arrow final-entry-arrow-one" aria-hidden="true">→</span>
          <span className="final-entry-arrow final-entry-arrow-two" aria-hidden="true">→</span>
        </div>
        <ol className="final-entry-captions">
          <li><span>01 · Agree beforehand</span><h3>Resident + caregiver agree.</h3><p>No consent → no routine guard entry.</p></li>
          <li><span>02 · Check at the door</span><h3>Ring. Knock. Call out.</h3><p>Allow time to respond before entry.</p></li>
          <li><span>03 · Enter only as agreed</span><h3>2 guards <em>or</em> 1 + body camera</h3><p>No response + prior consent.<br />Camera records throughout the check.</p></li>
        </ol>
        <div className="final-entry-emergency"><PhoneCall aria-hidden="true" /><div><strong>Emergency? Call 999.</strong><p>Guards do not force entry. Public emergency responders handle forced access.</p></div></div>
        <p className="final-entry-note">Proposed procedure · Resident consent, caregiver involvement and operator approval; agree footage access and retention before the pilot.</p>
        <div className="slides-page-bottom"><span>TemanMu · Township care</span><span>Appendix A6</span></div>
      </section>
      {SHOW_APPENDIX_BUSINESS_MODEL && <section id="appendix-a7" className="slides-page final-business-model" aria-label="Appendix A7: Proposed business model">
        <img className="slides-sdp-logo" src="/images/sdp-logo.png" alt="Sime Darby Property" />
        <div className="slides-section-top">
          <p className="final-mentor-note">Mentor feedback: Who pays for installation and the ongoing service?</p>
          <span>Appendix A7 · Business model</span>
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
        <div className="slides-page-bottom"><span>TemanMu · Township care</span><span>Appendix A7</span></div>
      </section>}
    </div>
  </main>
}
