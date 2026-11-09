import { ChevronRight, Moon, Sun } from 'lucide-react'
import type { Unit } from '../api/types'
import { GUARD, type Ctx } from './copy'
import { ResidentAvatar } from './Avatar'
import { EMERGENCY_ACCESS_STATUS, type EmergencyAccessRecord } from './emergency-access'

export type Theme = 'light' | 'dark'

interface Props {
  unit: Unit; ctx: Ctx; now: number; awayReasons: Record<string, string | null>
  theme: Theme; onTheme: (theme: Theme) => void; onToast: (text: string) => void
  onOpenRoutine: () => void
  emergencyAccess: EmergencyAccessRecord | null; onOpenEmergencyAccess: () => void
}

export function SettingsTab({ unit, ctx, theme, onTheme, onOpenRoutine, emergencyAccess, onOpenEmergencyAccess }: Props) {
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
    <section className="cg-card cg-access-record" aria-labelledby="cg-access-title">
      <h2 id="cg-access-title" className="cg-section-title">Emergency access</h2>
      {emergencyAccess ? <>
        <p className="cg-access-status">{EMERGENCY_ACCESS_STATUS}</p>
        <p className="cg-card-lead">{ctx.R}’s conditional emergency access consent was recorded during onboarding with the Sime Darby Property team.</p>
        <p className="cg-access-demo-note">Sample record · Demo</p>
        <button type="button" className="cg-access-link" onClick={onOpenEmergencyAccess} aria-haspopup="dialog">
          <span>View signed agreement</span><ChevronRight size={18} aria-hidden="true" />
        </button>
      </> : <p className="cg-card-lead">No emergency access agreement is on file for this household in this demo. Contact the onboarding team to discuss the arrangements.</p>}
    </section>
    <section className="cg-card cg-menu">
      <button type="button" className="cg-menu-row" onClick={onOpenRoutine}>
        <span>{ctx.R}’s routine</span><ChevronRight size={18} aria-hidden="true" />
      </button>
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
    <p className="cg-fineprint">Times are Malaysia time (MYT). TemanMu knows only water, electricity and door activity.</p>
  </div>
}
