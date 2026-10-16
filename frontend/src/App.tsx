import { lazy, Suspense, useEffect, useState } from 'react'
import { usingMock } from './api'
import { connectStore, markRoleViewed, useAppState } from './api/store'
import type { Role } from './api/types'
import { CaregiverView } from './dashboard/CaregiverView'
import { TownshipView } from './dashboard/TownshipView'

const Landing = lazy(() => import('./landing/Landing').then(module => ({ default: module.Landing })))
const HomeEnvironment = lazy(() => import('./home/HomeEnvironment').then(module => ({ default: module.HomeEnvironment })))
type Page = 'landing' | 'dashboard' | 'simulator'
// Any other hash (including the landing page's own #how / #roles anchors) stays on the landing page.
const pageFromHash = (): Page => window.location.hash === '#simulator' ? 'simulator' : window.location.hash === '#dashboard' ? 'dashboard' : 'landing'

export default function App() {
  const { connected, loaded, units, notifications, config } = useAppState()
  const [page, setPage] = useState<Page>(pageFromHash)
  const [role, setRole] = useState<Role>('township')
  const homeUnit = units.find(unit => unit.controllable)
  const activeUnread = notifications.filter(item => item.role === role && !item.read).length
  const inactiveRole: Role = role === 'township' ? 'caregiver' : 'township'
  const inactiveUnread = notifications.filter(item => item.role === inactiveRole && !item.read).length

  useEffect(() => connectStore(), [])
  useEffect(() => {
    const onHashChange = () => setPage(pageFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  useEffect(() => {
    if (page === 'dashboard' && loaded && activeUnread)
      void markRoleViewed(role).catch(error => console.error('Could not mark notifications read', error))
  }, [page, role, loaded, activeUnread])
  useEffect(() => {
    if (page !== 'landing') window.scrollTo(0, 0)
  }, [page])

  if (page === 'landing') return <Suspense fallback={null}><Landing /></Suspense>

  return <div className="app-shell">
    <header className="app-header">
      <a className="brand-block" href="#" aria-label="TemanMu home" style={{ color: 'inherit', textDecoration: 'none' }}>
        <span className="brand-mark" aria-hidden="true">
          <svg width="34" height="34" viewBox="0 0 64 64">
            <path d="M14 29 L32 15 L50 29 V50 H14 Z" fill="none" stroke="#fef9ef" strokeWidth="3.6" strokeLinejoin="round" />
            <path d="M14 31 H50 M32 31 V50" stroke="#fef9ef" strokeWidth="3.6" />
            <rect x="35" y="34" width="12" height="13" fill="#f0b25a" />
          </svg>
        </span>
        <div>
          <p className="brand-name">TemanMu</p>
          <p className="brand-caption">Township care prototype</p>
        </div>
      </a>
      <nav className="view-navigation" aria-label="Presentation views">
        <a href="#dashboard" target="_blank" rel="noopener" aria-current={page === 'dashboard' ? 'page' : undefined}>Product dashboard</a>
        <a href="#simulator" target="_blank" rel="noopener" aria-current={page === 'simulator' ? 'page' : undefined}>Presenter simulator <span aria-hidden="true">↗</span></a>
      </nav>
      <div className="header-meta">
        <span className="environment-label">{usingMock ? 'Simulated data' : 'Live backend'}</span>
        <span className={`connection-label ${connected ? 'is-connected' : ''}`} role="status">
          <span className="connection-dot" aria-hidden="true" />{connected ? 'Connected' : 'Connecting'}
        </span>
      </div>
    </header>

    {page === 'simulator' ? <main className="workspace workspace-simulator">
      <section className="home-panel" aria-labelledby="home-heading">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Presenter tool · Demo input for {homeUnit?.unit_id || 'A-105'}</p>
            <h1 id="home-heading">Madam Lee’s <em>simulated home</em></h1>
          </div>
          <span className="panel-tag">Not part of the resident product</span>
        </div>
        <div className="home-stage home-stage-3d">
          <Suspense fallback={<p className="home-scene-loading" role="status">Preparing the 3D home…</p>}>
            <HomeEnvironment />
          </Suspense>
        </div>
      </section>
    </main> : <main className="workspace workspace-dashboard">
      <section className="dashboard-panel" aria-label="TemanMu product dashboard">
        <div className="dashboard-header">
          <div>
            <p className="eyebrow">TemanMu product · {role === 'township' ? 'Township operator' : 'Caregiver'}</p>
            <h1>{role === 'township' ? <>Township <em>overview</em></> : <>Caregiver <em>view</em></>}</h1>
          </div>
          <div className="role-switcher" role="tablist" aria-label="Dashboard role">
            {(['township', 'caregiver'] as Role[]).map(tabRole => {
              const unread = notifications.filter(item => item.role === tabRole && !item.read).length
              return <button key={tabRole} type="button" role="tab" id={`tab-${tabRole}`} aria-selected={role === tabRole} aria-controls={`panel-${tabRole}`}
                className={`role-tab ${role === tabRole ? 'is-active' : ''}`} onClick={() => setRole(tabRole)}>
                {tabRole === 'township' ? 'Township' : 'Caregiver'}
                {role !== tabRole && unread > 0 && <span className="role-badge" aria-label={`${unread} unread notifications`}>{unread}</span>}
              </button>
            })}
          </div>
        </div>
        <div className="dashboard-content" role="tabpanel" id={`panel-${role}`} aria-labelledby={`tab-${role}`}>
          {!loaded ? <p className="loading-state" role="status">Waiting for the first snapshot…</p> : role === 'township' ? <TownshipView /> : <CaregiverView />}
        </div>
        <div className="dashboard-footer">
          <span>{inactiveUnread ? `${inactiveUnread} unread for ${inactiveRole}` : 'Both roles are up to date'}</span>
          <span>Grace {config?.grace_period_seconds ?? '—'}s · Reminder {config?.reminder_interval_seconds ?? '—'}s</span>
        </div>
      </section>
    </main>}
  </div>
}
