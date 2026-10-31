import { Moon, Sun } from 'lucide-react'
import type { Unit } from '../api/types'
import { GUARD, type Ctx } from './copy'
import { ResidentAvatar } from './Avatar'

export type Theme = 'light' | 'dark'

interface Props {
  unit: Unit; ctx: Ctx; now: number; awayReasons: Record<string, string | null>
  theme: Theme; onTheme: (theme: Theme) => void; onToast: (text: string) => void
}

export function SettingsTab({ unit, ctx, theme, onTheme }: Props) {
  return <div className="cg-page">
    <header className="cg-page-head">
      <p className="cg-kicker">Settings</p>
      <h1 className="cg-large-title">Your setup.</h1>
    </header>
    <section className="cg-card cg-profile" aria-label="Resident">
      <div className="cg-profile-who">
      <ResidentAvatar name={unit.resident_name} size="lg" />
      <span className="cg-profile-text">
        <strong>{ctx.R}</strong>
        <span>{unit.resident_name}</span>
        <span>Unit {unit.unit_id}</span>
      </span>
      </div>
      <dl className="cg-profile-meta">
        <div><dt>Responders</dt><dd>You and {GUARD}</dd></div>
        <div><dt>Sensors</dt><dd>Water · Electricity · Door</dd></div>
      </dl>
    </section>
    <section className="cg-card cg-settings">
      <div>
        <h2 className="cg-section-title">Appearance</h2>
        <div role="radiogroup" aria-label="Theme" className="cg-segmented">
          <button type="button" role="radio" aria-checked={theme === 'light'} onClick={() => onTheme('light')}><Sun size={16} aria-hidden="true" />Light</button>
          <button type="button" role="radio" aria-checked={theme === 'dark'} onClick={() => onTheme('dark')}><Moon size={16} aria-hidden="true" />Dark</button>
        </div>
      </div>
    </section>
    <p className="cg-fineprint">Prototype. Sensor data is simulated; alerts run live. Times are Malaysia time (MYT). TemanMu knows only water, electricity and door activity.</p>
  </div>
}
