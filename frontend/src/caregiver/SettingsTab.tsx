import { Moon, Sun } from 'lucide-react'
import type { Unit } from '../api/types'
import { AwayPeriods } from './AwayPeriods'
import { GUARD, type Ctx } from './copy'
import { initials } from './format'

export type Theme = 'light' | 'dark'

interface Props {
  unit: Unit; ctx: Ctx; now: number; awayReasons: Record<string, string | null>
  theme: Theme; onTheme: (theme: Theme) => void; onToast: (text: string) => void
}

export function SettingsTab({ unit, ctx, now, awayReasons, theme, onTheme, onToast }: Props) {
  return <div className="cg-page">
    <header className="cg-intro cg-tab-head">
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
    <AwayPeriods unit={unit} ctx={ctx} now={now} reasons={awayReasons} onToast={onToast} />
    <section className="cg-card cg-settings">
      <div>
        <h2 className="cg-setting-title">Appearance</h2>
        <div role="radiogroup" aria-label="Theme" className={`cg-segmented is-${theme}`}>
          <span className="cg-segmented-thumb" aria-hidden="true" />
          <button type="button" role="radio" aria-checked={theme === 'light'} onClick={() => onTheme('light')}><Sun size={16} aria-hidden="true" />Light</button>
          <button type="button" role="radio" aria-checked={theme === 'dark'} onClick={() => onTheme('dark')}><Moon size={16} aria-hidden="true" />Dark</button>
        </div>
      </div>
    </section>
    <p className="cg-fineprint">Prototype. Sensor data is simulated; alerts run live. Times are Malaysia time (MYT). TemanMu knows only water, electricity and door activity.</p>
  </div>
}
