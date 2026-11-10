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
    <header className="cg-page-head is-row cg-settings-head">
      <div>
        <p className="cg-kicker">Settings</p>
        <h1 className="cg-large-title">Your setup.</h1>
      </div>
      <div role="radiogroup" aria-label="Theme" className="cg-segmented cg-theme-switch">
        <button type="button" role="radio" aria-checked={theme === 'light'} aria-label="Light" title="Light" onClick={() => onTheme('light')}><Sun size={18} aria-hidden="true" /></button>
        <button type="button" role="radio" aria-checked={theme === 'dark'} aria-label="Dark" title="Dark" onClick={() => onTheme('dark')}><Moon size={18} aria-hidden="true" /></button>
      </div>
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
    <p className="cg-fineprint">Times are Malaysia time (MYT). TemanMu knows only water, electricity and door activity.</p>
  </div>
}
