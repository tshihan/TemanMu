import { Moon, Play, Sun } from 'lucide-react'
import type { Unit } from '../api/types'
import { GUARD, type Ctx } from './copy'
import type { ToneKind } from './sound'

export type Theme = 'light' | 'dark'

interface Props {
  unit: Unit; ctx: Ctx; theme: Theme; muted: boolean
  onTheme: (theme: Theme) => void; onToggleMute: () => void; onPreview: (kind: ToneKind) => void
}

export function SettingsTab({ unit, ctx, theme, muted, onTheme, onToggleMute, onPreview }: Props) {
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
      <div className="cg-setting-sound">
        <div className="cg-setting-row">
          <div><h2 className="cg-setting-title">Sounds</h2><span>Soft, distinct tones. Every sound also shows on screen.</span></div>
          <button type="button" role="switch" aria-checked={!muted} aria-label="Sounds" className="cg-switch" onClick={onToggleMute}><span /></button>
        </div>
        <div className="cg-previews">
          {([['morning', 'Morning'], ['alert', 'New alert'], ['reminder', 'Reminder']] as const).map(([kind, label]) =>
            <button key={kind} type="button" onClick={() => onPreview(kind)}><Play size={12} aria-hidden="true" />{label}</button>)}
        </div>
      </div>
    </section>
    <p className="cg-fineprint cg-pad">Prototype. Sensor data is simulated; alerts run live. Times are Malaysia time (MYT). TemanMu knows only water, electricity and door activity.</p>
  </div>
}
