import { lazy, Suspense, useEffect, useState } from 'react'
import { usingMock } from './api'
import { connectStore, markRoleViewed, useAppState } from './api/store'
import type { Role } from './api/types'
import { Box, Building2, House } from 'lucide-react'
import { CaregiverApp } from './caregiver/CaregiverApp'
import { TownshipView } from './dashboard/TownshipView'
import './live.css'

const Landing = lazy(() => import('./landing/Landing').then(module => ({ default: module.Landing })))
const HomeEnvironment = lazy(() => import('./home/HomeEnvironment').then(module => ({ default: module.HomeEnvironment })))
const Slides = lazy(() => import('./slides/Slides').then(module => ({ default: module.Slides })))
const Present = lazy(() => import('./slides/Present').then(module => ({ default: module.Present })))
type Page = 'landing' | 'dashboard' | 'simulator' | 'caregiver' | 'slides' | 'present'
// Routes are real paths (/dashboard, /caregiver, ...). Anything else, including the landing page's own #how / #faq anchors, stays on the landing page.
const PAGES: Record<string, Page> = { '/simulator': 'simulator', '/dashboard': 'dashboard', '/caregiver': 'caregiver', '/slides': 'slides', '/present': 'present' }
const pageFromPath = (): Page => PAGES[window.location.pathname.replace(/\/+$/, '')] ?? 'landing'
// Old hash links (/#caregiver) keep working: rewrite them to the path form.
const legacy = window.location.pathname === '/' ? window.location.hash.slice(1) : ''
if (PAGES['/' + legacy]) window.history.replaceState(null, '', '/' + legacy)

export default function App() {
  const { connected, loaded, notifications, config } = useAppState()
  const [page] = useState<Page>(pageFromPath)
  const [role] = useState<Role>('township')
  const activeUnread = notifications.filter(item => item.role === role && !item.read).length
  const inactiveRole: Role = role === 'township' ? 'caregiver' : 'township'
  const inactiveUnread = notifications.filter(item => item.role === inactiveRole && !item.read).length

  useEffect(() => {
    if (page === 'slides' || page === 'present') return
    return connectStore()
  }, [page])
  useEffect(() => {
    // The caregiver app keeps its own read state (per item and "Mark all read").
    if (page === 'dashboard' && role === 'township' && loaded && activeUnread)
      void markRoleViewed(role).catch(error => console.error('Could not mark notifications read', error))
  }, [page, role, loaded, activeUnread])
  useEffect(() => {
    if (page !== 'landing') window.scrollTo(0, 0)
  }, [page])

  if (page === 'landing') return <Suspense fallback={null}><Landing /></Suspense>

  if (page === 'slides') return <Suspense fallback={null}><Slides /></Suspense>
  if (page === 'present') return <Suspense fallback={null}><Present /></Suspense>

  // The installed caregiver app (PWA start page): the phone screen only, no dashboard chrome.
  if (page === 'caregiver') return <CaregiverApp standalone />

  if (page === 'simulator') return <div className="live-shell">
    <nav className="live-rail" aria-label="TemanMu views">
      <a className="live-rail-logo" href="/" aria-label="TemanMu home">
        <svg width="30" height="30" viewBox="0 0 64 64" aria-hidden="true">
          <path d="M14 29 L32 15 L50 29 V50 H14 Z" fill="none" stroke="#fef9ef" strokeWidth="3.6" strokeLinejoin="round" />
          <path d="M14 31 H50 M32 31 V50" stroke="#fef9ef" strokeWidth="3.6" />
          <rect x="35" y="34" width="12" height="13" fill="#f0b25a" />
        </svg>
      </a>
      <a href="/" title="Landing page" aria-label="Landing page"><House size={19} aria-hidden="true" /></a>
      <a href="/simulator" title="Live 3D view" aria-label="Live 3D view" aria-current="page"><Box size={19} aria-hidden="true" /></a>
      <a href="/dashboard" target="_blank" rel="noopener" title="Product dashboard (new tab)" aria-label="Product dashboard, opens in a new tab"><Building2 size={19} aria-hidden="true" /></a>
      <span className={`live-rail-status ${connected ? 'is-connected' : ''}`} role="status" title={`${usingMock ? 'Simulated data' : 'Live backend'} · ${connected ? 'Connected' : 'Connecting'}`}>
        <span className="connection-dot" aria-hidden="true" /><span>{usingMock ? 'Mock' : 'Live'}</span>
      </span>
    </nav>
    <main className="live-main">
      <div className="live-stage-wrap">
        <Suspense fallback={<p className="home-scene-loading" role="status">Preparing the 3D home…</p>}>
          <HomeEnvironment />
        </Suspense>
      </div>
    </main>
  </div>

  return <div className="app-shell">
    <header className="app-header">
      <a className="brand-block" href="/" aria-label="TemanMu home" style={{ color: 'inherit', textDecoration: 'none' }}>
        <span className="brand-mark" aria-hidden="true">
          <svg width="34" height="34" viewBox="0 0 64 64">
            <path d="M14 29 L32 15 L50 29 V50 H14 Z" fill="none" stroke="#fef9ef" strokeWidth="3.6" strokeLinejoin="round" />
            <path d="M14 31 H50 M32 31 V50" stroke="#fef9ef" strokeWidth="3.6" />
            <rect x="35" y="34" width="12" height="13" fill="#f0b25a" />
          </svg>
        </span>
        <div>
          <p className="brand-name">TemanMu</p>
        </div>
      </a>
      <nav className="view-navigation" aria-label="Presentation views">
        <a href="/dashboard" target="_blank" rel="noopener" aria-current="page">Product dashboard</a>
        <a href="/simulator" target="_blank" rel="noopener">Live 3D view <span aria-hidden="true">↗</span></a>
        <a href="/caregiver" target="_blank" rel="noopener">Caregiver app <span aria-hidden="true">↗</span></a>
      </nav>
      {/* <div className="header-meta">
        <span className="environment-label">{usingMock ? 'Simulated data' : 'Live backend'}</span>
        <span className={`connection-label ${connected ? 'is-connected' : ''}`} role="status">
          <span className="connection-dot" aria-hidden="true" />{connected ? 'Connected' : 'Connecting'}
        </span>
      </div> */}
    </header>

    <main className="workspace workspace-dashboard">
      <section className="dashboard-panel" aria-label="TemanMu product dashboard">
        <div className="dashboard-header">
          <div>
            <p className="eyebrow">TemanMu product · {role === 'township' ? 'Township operator' : 'Caregiver'}</p>
            <h1>{role === 'township' ? 'Unit status' : <>Caregiver <em>view</em></>}</h1>
          </div>
        </div>
        <div className="dashboard-content">
          {!loaded ? <p className="loading-state" role="status">Waiting for the first snapshot…</p> : role === 'caregiver' ? <CaregiverApp /> : <TownshipView />}
        </div>
        {role === 'township' && <div className="dashboard-footer">
          <span>{inactiveUnread ? `${inactiveUnread} unread for ${inactiveRole}` : 'Both roles are up to date'} · Floors 2–24 use sample data</span>
          <span>Grace {config?.grace_period_seconds ?? '—'}s · Reminder {config?.reminder_interval_seconds ?? '—'}s</span>
        </div>}
      </section>
    </main>
  </div>
}
