import { lazy, Suspense, useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { Camera, DoorOpen, Droplets, Faucet, HeartHandshake, Lightbulb, MousePointer2, Watch, Zap } from 'lucide-react'
import { startScene } from '../landing/scene'
import './slides.css'
import './present.css'

// The 3D home pulls in three.js and the house models, so it loads on its own after the deck appears.
const PresentHome = lazy(() => import('./PresentHome').then(module => ({ default: module.PresentHome })))

const PAGE_COUNT = 5
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
      const el = now - start, i = Math.floor(el / cycle) % 3
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

// /present: a short presenting deck of Madam Lee alone at home (3D), the problem, the cover (TemanMu + team names), the solution, and how it works.
export function Present() {
  const howFlow = useHowFlowDot()
  const sceneRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLElement>(null)
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
        </div>
        <div className="slides-cover-main">
          <div className="slides-cover-copy">
            <h1>TemanMu</h1>
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
    </div>
  </main>
}
