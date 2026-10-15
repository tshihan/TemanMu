import { useEffect, useRef, useState } from 'react'
import { api, usingMock } from './api'
import { connectStore, markRoleViewed, useAppState } from './api/store'
import type { Role, Status } from './api/types'
import { TownshipView } from './dashboard/TownshipView'

const DEFAULT_SPLIT = 48
const MIN_PANEL_WIDTH = 420
const SPLIT_KEY = 'temanmu.splitPercent'
const statusLabels: Record<Status, string> = {
  routine: 'Routine',
  possible_away: 'Possible Away',
  unusual_inactivity: 'Unusual Inactivity',
  unresolved_concern: 'Unresolved Concern',
}

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
    try {
      await api.postReading({ unit_id: homeUnit.unit_id, sensor: 'water', value: 6 })
      await api.postReading({ unit_id: homeUnit.unit_id, sensor: 'water', value: 0 })
    } catch (error) { console.error('Could not send preview reading', error) }
    finally { setPreviewBusy(false) }
  }

  async function resetPreview() {
    if (!window.confirm('Reset the demo and clear its notifications?')) return
    try { await api.resetDemo() }
    catch (error) { console.error('Could not reset demo', error) }
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
            <h1 id="home-heading">Madam Lee’s home</h1>
          </div>
          <span className="panel-tag">3D scene slot</span>
        </div>
        <div className="home-stage">
          <div className="home-placeholder" aria-label="Placeholder for the simulated 3D home">
            <div className="placeholder-icon" aria-hidden="true">⌂</div>
            <h2>Simulated home</h2>
            <p>The interactive 3D scene will appear here. It will send tap, kettle and door readings through the shared API.</p>
            {usingMock && <div className="preview-controls">
              <button type="button" onClick={() => void previewWaterUse()} disabled={!loaded || previewBusy}>{previewBusy ? 'Sending…' : 'Preview water use'}</button>
              <button type="button" onClick={() => void resetPreview()}>Reset preview</button>
            </div>}
          </div>
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
            <h2>{role === 'township' ? 'Township overview' : 'Caregiver view'}</h2>
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
          {!loaded ? <p className="loading-state" role="status">Waiting for the first snapshot…</p> : role === 'township' ? <TownshipView /> : <>
            <div className="caregiver-card">
              <p className="eyebrow">Sarah Lee’s view</p>
              <h3>{homeUnit?.resident_name || 'Madam Lee Mei Ling'}</h3>
              <p>Unit {homeUnit?.unit_id || 'A-105'} · {homeUnit ? statusLabels[homeUnit.status] : 'Loading'}</p>
            </div>
            <div className="section-intro"><h3>Updates</h3><span>{notifications.filter(item => item.role === 'caregiver').length} messages</span></div>
            <div className="notification-list">
              {notifications.filter(item => item.role === 'caregiver').length ? notifications.filter(item => item.role === 'caregiver').map(item =>
                <article className="notification-row" key={item.notification_id}><strong>{item.kind.replaceAll('_', ' ')}</strong><p>{item.message}</p></article>) :
                <p className="empty-state">No updates yet. The morning scenario will add a reassurance message.</p>}
            </div>
            <p className="phase-note">Caregiver actions and the full notification flow arrive in Phase 4.</p>
          </>}
        </div>
        <div className="dashboard-footer">
          <span>{inactiveUnread ? `${inactiveUnread} unread for ${inactiveRole}` : 'Both roles are up to date'}</span>
          <span>Grace {config?.grace_period_seconds ?? '—'}s · Reminder {config?.reminder_interval_seconds ?? '—'}s</span>
        </div>
      </section>
    </div>
  </div>
}
