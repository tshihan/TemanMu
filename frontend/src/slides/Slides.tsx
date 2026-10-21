import { useEffect, useRef, type ReactNode } from 'react'
import { Camera, Watch } from 'lucide-react'
import { startScene } from '../landing/scene'
import './slides.css'

const PAGE_COUNT = 10

const members = [
  { name: 'TAN SHIHAN', role: 'Team leader', photo: '/images/team-tan-shi-han.jpeg', email: 'bryantan7837@gmail.com', phone: '01111651882' },
  { name: 'LIM JING JET', photo: '/images/team-lim-jing-jet-white.png', email: 'jingjetlim04@gmail.com', phone: '0182369448' },
  { name: 'KHOR HONG JUN', photo: '/images/team-khor-hong-jun.jpeg', email: 'khorhongjun@gmail.com', phone: '0126758577' },
  { name: 'LEE YANG', photo: '/images/team-lee-yang.jpeg', email: 'leeyang20040817@gmail.com', phone: '0174575100' },
  { name: 'CHO JING LING', photo: '/images/team-cho-jing-ling.jpeg', email: 'jinglingcho0670@gmail.com', phone: '0189129899' },
]

function MemberCard({ member }: { member: typeof members[number] }) {
  return <article className="slides-team-card">
    <img className="slides-team-photo" src={member.photo} alt={member.name} />
    <div className="slides-team-card-details">
      <h3>{member.name}</h3>
      {'role' in member && <span className="slides-team-role">{member.role}</span>}
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
    {children}
    <div className="slides-page-bottom"><span>TemanMu · Township care</span><span>{String(number).padStart(2, '0')} / {PAGE_COUNT}</span></div>
  </section>
}

export function Slides() {
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
  return <main ref={rootRef} className="slides-root">
    <div className="slides-toolbar">
      <a href="#">← TemanMu</a>
      <span>Albert & Einstein · 4 of {PAGE_COUNT} sections drafted</span>
      <button type="button" onClick={() => window.print()}>Save as PDF</button>
    </div>
    <div className="slides-deck" aria-label="TemanMu presentation">
      <PageFrame number={1} className="slides-cover">
        <div ref={sceneRef} className="slides-live-scene" aria-hidden="true"><canvas data-lp="canvas" /></div>
        <div className="slides-cover-top">
          <TemanMuWordmark />
          <img className="slides-sdp-logo" src="/images/sdp-logo.png" alt="Sime Darby Property" />
        </div>
        <div className="slides-cover-main">
          <div className="slides-cover-copy">
            <p className="slides-eyebrow">Sime Darby Property · Township of Tomorrow 2026</p>
            <h1>TemanMu</h1>
            <p className="slides-cover-tagline">Reassurance at home.<br /><em>Connection in the community.</em></p>
            <p className="slides-cover-intro">Everyday home signals help families know when to check in. Local activities and a Community Buddy help older residents stay connected.</p>
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
            <p className="slides-problem-lead">A caregiver cannot check every hour. A quiet home may mean everything is fine—or that help is needed. Some residents also lack regular social connection.</p>
          </div>
          <aside className="slides-problem-stat" aria-label="Older Malaysians living alone" data-slide-reveal>
            <span className="slides-problem-stat-kicker">Malaysia · aged 60+</span>
            <strong>18.8<span>%</span></strong>
            <p>lived alone in 2025</p>
            <div className="slides-problem-growth"><span>6.3% <small>2018</small></span><span aria-hidden="true">→</span><span>18.8% <small>2025</small></span></div>
            <p className="slides-problem-support"><b>33.1%</b> of older Malaysians reported poor social support.</p>
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

      {Array.from({ length: PAGE_COUNT - 4 }, (_, index) => <PageFrame number={index + 5} className="slides-pending" key={index}>
        <div className="slides-section-top"><TemanMuWordmark /><span>{String(index + 5).padStart(2, '0')} · Coming next</span></div>
        <div className="slides-pending-content" data-slide-reveal><span className="slides-eyebrow">Section {String(index + 5).padStart(2, '0')}</span><h2>Next chapter.</h2><p>Waiting for your content and direction.</p></div>
      </PageFrame>)}
    </div>
  </main>
}
