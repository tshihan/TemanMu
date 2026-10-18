import { Moon, Play, Sun } from 'lucide-react'
import type { Unit } from '../api/types'
import { GUARD, type Ctx } from './copy'
import { initials } from './format'
import type { ToneKind } from './sound'

export type Theme = 'light' | 'dark'

interface Props {
  unit: Unit; ctx: Ctx; theme: Theme; muted: boolean
  onTheme: (theme: Theme) => void; onToggleMute: () => void; onPreview: (kind: ToneKind) => void
}

export function SettingsTab({ unit, ctx, theme, muted, onTheme, onToggleMute, onPreview }: Props) {
  return <div className="cg-page">
    <header className="cg-intro">
      <p className="cg-eyebrow">Settings</p>
      <h1 className="cg-display">Your <em>setup.</em></h1>
    </header>
    <section className="cg-card cg-profile" aria-label="Resident">
      <span className="cg-avatar cg-avatar-lg" aria-hidden="true">{initials(unit.resident_name.replace(/^Madam\s+/i, ''))}</span>
      <span className="cg-profile-text">
        <strong>{ctx.R}</strong>
        <span>{unit.resident_name}</span>
        <span>Unit {unit.unit_id}</span>
      </span>
      <dl className="cg-profile-meta">
        <div><dt>Responders</dt><dd>You and {GUARD}</dd></div>
        <div><dt>Sensors</dt><dd>Water · Electricity · Door</dd></div>
      </dl>
    </section>
    <section className="cg-card cg-settings">
      <div>
        <h2 className="cg-setting-title">Appearance</h2>
        <div role="radiogroup" aria-label="Theme" className={`cg-segmented is-${theme}`}>
          <span className="cg-segmented-thumb" aria-hidden="true" />
          <button type="button" role="radio" aria-checked={theme === 'light'} onClick={() => onTheme('light')}><Sun size={16} aria-hidden="true" />Light</button>
          <button type="button" role="radio" aria-checked={theme === 'dark'} onClick={() => onTheme('dark')}><Moon size={16} aria-hidden="true" />Dark</button>
        </div>
      </div>
      <div className="cg-setting-sound">
        <div className="cg-setting-row">
          <div><h2 className="cg-setting-title">Sounds</h2><span>Soft, distinct tones. Every sound also shows on screen.</span></div>
          <button type="button" role="switch" aria-checked={!muted} aria-label="Sounds" className="cg-switch" onClick={onToggleMute}><span /></button>
        </div>
        <div className="cg-previews">
          {([['morning', 'Morning'], ['alert', 'New alert'], ['reminder', 'Reminder']] as const).map(([kind, label]) =>
            <button key={kind} type="button" onClick={() => onPreview(kind)}><Play size={11} fill="currentColor" aria-hidden="true" />{label}</button>)}
        </div>
      </div>
    </section>
    <p className="cg-fineprint">Prototype. Sensor data is simulated; alerts run live. Times are Malaysia time (MYT). TemanMu knows only water, electricity and door activity.</p>
  </div>
}
