import { Moon, Sun } from 'lucide-react'
import type { Unit } from '../api/types'
import { GUARD, type Ctx } from './copy'

export type Theme = 'light' | 'dark'

interface Props {
  unit: Unit; ctx: Ctx; theme: Theme
  onTheme: (theme: Theme) => void
}

export function SettingsTab({ unit, ctx, theme, onTheme }: Props) {
  return <div className="cg-page">
    <h1 className="cg-display cg-pad">Settings</h1>
    <section className="cg-card cg-profile">
      <strong className="cg-serif">{ctx.R}</strong>
      <span>{unit.resident_name} · Unit {unit.unit_id}</span>
      <span>Responders: you and {GUARD}</span>
    </section>
    <section className="cg-card cg-settings">
      <div>
        <h2 className="cg-setting-title">Appearance</h2>
        <div role="radiogroup" aria-label="Theme" className="cg-segmented">
          <button type="button" role="radio" aria-checked={theme === 'light'} onClick={() => onTheme('light')}><Sun size={16} aria-hidden="true" />Light</button>
          <button type="button" role="radio" aria-checked={theme === 'dark'} onClick={() => onTheme('dark')}><Moon size={16} aria-hidden="true" />Dark</button>
        </div>
      </div>
    </section>
    <p className="cg-fineprint cg-pad">Prototype. Sensor data is simulated; alerts run live. Times are Malaysia time (MYT). TemanMu knows only water, electricity and door activity.</p>
  </div>
}
