import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { api, usingMock } from './api'
import { connectStore, markRoleViewed, useAppState } from './api/store'
import type { Role } from './api/types'
import { CaregiverView } from './dashboard/CaregiverView'
import { TownshipView } from './dashboard/TownshipView'
import { mockScenarios, type MockScenario } from './mocks/api'

const DEFAULT_SPLIT = 48
const MIN_PANEL_WIDTH = 420
const SPLIT_KEY = 'temanmu.splitPercent'
const HomeEnvironment = lazy(() => import('./home/HomeEnvironment').then(module => ({ default: module.HomeEnvironment })))

function savedSplit(): number {
  const saved = Number(window.localStorage.getItem(SPLIT_KEY))
  return saved >= 30 && saved <= 70 ? saved : DEFAULT_SPLIT
}

function clampSplit(value: number, width: number): number {
  const minimum = Math.max(30, MIN_PANEL_WIDTH / Math.max(width, 1) * 100)
  if (minimum >= 50) return DEFAULT_SPLIT
  return Math.round(Math.max(minimum, Math.min(100 - minimum, value)) * 10) / 10
}

export default function App() {
  const { connected, loaded, units, notifications, config } = useAppState()
  const [role, setRole] = useState<Role>('township')
  const [split, setSplit] = useState(savedSplit)
  const [previewBusy, setPreviewBusy] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const workspace = useRef<HTMLDivElement>(null)
  const homeUnit = units.find(unit => unit.controllable)
  const activeUnread = notifications.filter(item => item.role === role && !item.read).length
  const inactiveRole: Role = role === 'township' ? 'caregiver' : 'township'
  const inactiveUnread = notifications.filter(item => item.role === inactiveRole && !item.read).length

  useEffect(() => connectStore(), [])
  useEffect(() => {
    if (loaded && activeUnread) void markRoleViewed(role).catch(error => console.error('Could not mark notifications read', error))
  }, [role, loaded, activeUnread])
  useEffect(() => { window.localStorage.setItem(SPLIT_KEY, String(split)) }, [split])
  useEffect(() => {
    const onResize = () => setSplit(value => clampSplit(value, workspace.current?.clientWidth || window.innerWidth))
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  function setSplitFromX(clientX: number) {
    const bounds = workspace.current?.getBoundingClientRect()
    if (!bounds || bounds.width < MIN_PANEL_WIDTH * 2 + 12) return
    const next = (clientX - bounds.left) / bounds.width * 100
    setSplit(clampSplit(next, bounds.width))
  }

  function switchRole(next: Role) { setRole(next) }

  async function previewWaterUse() {
    if (!homeUnit || previewBusy) return
    setPreviewBusy(true)
    setPreviewError(null)
    try {
      await api.postReading({ unit_id: homeUnit.unit_id, sensor: 'water', value: 6 })
      await api.postReading({ unit_id: homeUnit.unit_id, sensor: 'water', value: 0 })
    } catch (error) { setPreviewError(error instanceof Error ? error.message : 'Could not send reading') }
    finally { setPreviewBusy(false) }
  }

  async function runScenario(scenario: MockScenario) {
    if (previewBusy) return
    setPreviewBusy(true)
    setPreviewError(null)
    try { await mockScenarios.run(scenario) }
    catch (error) { setPreviewError(error instanceof Error ? error.message : 'Could not start scenario') }
    finally { setPreviewBusy(false) }
  }

  async function resetPreview() {
    if (!window.confirm('Reset the demo and clear its notifications?')) return
    setPreviewError(null)
    try { await api.resetDemo() }
    catch (error) { setPreviewError(error instanceof Error ? error.message : 'Could not reset demo') }
  }

  return <div className="app-shell">
    <header className="app-header">
      <div className="brand-block">
        <span className="brand-mark" aria-hidden="true">T</span>
        <div>
          <p className="brand-name">TemanMu</p>
          <p className="brand-caption">Township care prototype</p>
        </div>
      </div>
      <div className="header-meta">
        <span className="environment-label">{usingMock ? 'Simulated data' : 'Live backend'}</span>
        <span className={`connection-label ${connected ? 'is-connected' : ''}`} role="status">
          <span className="connection-dot" aria-hidden="true" />{connected ? 'Connected' : 'Connecting'}
        </span>
      </div>
    </header>

    <div className="workspace" ref={workspace} style={{ '--home-share': `${split}%` } as React.CSSProperties}>
      <section className="home-panel" aria-labelledby="home-heading">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Demo home · {homeUnit?.unit_id || 'A-105'}</p>
            <h1 id="home-heading">Madam Lee’s <em>home</em></h1>
          </div>
          <span className="panel-tag">3D home</span>
        </div>
        <div className="home-stage home-stage-3d">
          <Suspense fallback={<p className="home-scene-loading" role="status">Preparing the 3D home…</p>}>
            <HomeEnvironment />
          </Suspense>
          {usingMock && <details className="home-demo-controls">
            <summary>Demo controls</summary>
            <div className="mock-panel">
              <span className="mock-panel-label">Mock scenario controls</span>
              <div className="scenario-buttons">
                <button type="button" disabled={!loaded || previewBusy} onClick={() => void runScenario('normal_morning')}>Normal morning</button>
                <button type="button" disabled={!loaded || previewBusy} onClick={() => void runScenario('going_out')}>Going out</button>
                <button type="button" disabled={!loaded || previewBusy} onClick={() => void runScenario('unusual_inactivity')}>Unusual inactivity</button>
                <button type="button" disabled={!loaded || previewBusy} onClick={() => void runScenario('false_alarm_recovery')}>False alarm recovery</button>
              </div>
              <div className="preview-controls">
                <button type="button" onClick={() => void previewWaterUse()} disabled={!loaded || previewBusy}>{previewBusy ? 'Sending…' : 'Manual water use'}</button>
                <button type="button" onClick={() => void resetPreview()}>Reset preview</button>
              </div>
              {previewError && <p className="action-error" role="alert">{previewError}</p>}
            </div>
          </details>}
        </div>
        <div className="home-footer">
          <p className="privacy-note"><strong>For the audience only.</strong> TemanMu receives water, electricity and door data—not the character’s movements.</p>
          <div className="meter-strip" aria-label="Latest utility readings">
            <span>Water <strong>{homeUnit?.latest.water_lpm ?? 0} L/min</strong></span>
            <span>Power <strong>{homeUnit?.latest.power_kw ?? 0} kW</strong></span>
            <span>Door <strong>{homeUnit?.latest.door ?? 'closed'}</strong></span>
          </div>
        </div>
      </section>

      <div className="divider" role="separator" aria-label="Resize home and dashboard panels" aria-orientation="vertical" aria-valuemin={30} aria-valuemax={70} aria-valuenow={Math.round(split)} tabIndex={0}
        onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); setSplitFromX(event.clientX) }}
        onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) setSplitFromX(event.clientX) }}
        onPointerUp={event => event.currentTarget.releasePointerCapture(event.pointerId)}
        onDoubleClick={() => setSplit(DEFAULT_SPLIT)}
        onKeyDown={event => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault()
            setSplit(value => clampSplit(value + (event.key === 'ArrowRight' ? 2 : -2), workspace.current?.clientWidth || window.innerWidth))
          } else if (event.key === 'Home') setSplit(DEFAULT_SPLIT)
        }}>
        <span aria-hidden="true" />
      </div>

      <section className="dashboard-panel" aria-label="Dashboard">
        <div className="dashboard-header">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h2>{role === 'township' ? <>Township <em>overview</em></> : <>Caregiver <em>view</em></>}</h2>
          </div>
          <div className="role-switcher" role="tablist" aria-label="Dashboard role">
            {(['township', 'caregiver'] as Role[]).map(tabRole => {
              const unread = notifications.filter(item => item.role === tabRole && !item.read).length
              return <button key={tabRole} type="button" role="tab" id={`tab-${tabRole}`} aria-selected={role === tabRole} aria-controls={`panel-${tabRole}`}
                className={`role-tab ${role === tabRole ? 'is-active' : ''}`} onClick={() => switchRole(tabRole)}>
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
    </div>
  </div>
}
