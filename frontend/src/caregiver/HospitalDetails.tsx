import { useEffect, useRef, type ReactNode } from 'react'
import { Hospital, X } from 'lucide-react'
import type { Incident } from '../api/types'
import { hospitalGuard, hospitalNote } from './hospital-transfer'

const dateFormat = new Intl.DateTimeFormat('en-MY', {
  timeZone: 'Asia/Kuala_Lumpur', day: 'numeric', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})
const dateLabel = (value?: string | null) => value && Number.isFinite(Date.parse(value)) ? dateFormat.format(new Date(value)) : 'Not recorded'

export function HospitalDetails({ incident, onClose, children }: { incident: Incident | null; onClose: () => void; children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])
  useEffect(() => {
    const panel = ref.current
    const app = panel?.closest('.cg-app')
    if (!panel || !app) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const siblings = [...app.children].filter(child => child !== panel && !child.matches('.cg-push, .cg-toast')) as HTMLElement[]
    const previousInert = siblings.map(child => child.inert)
    siblings.forEach(child => { child.inert = true })
    panel.querySelector<HTMLButtonElement>('button')?.focus()
    const onKey = (event: Event) => {
      const key = event as KeyboardEvent
      if (key.key === 'Escape') { key.preventDefault(); closeRef.current(); return }
      if (key.key !== 'Tab') return
      // New alert banners remain reachable while the background app is inert.
      const controls = [...app.querySelectorAll<HTMLElement>('.cg-hospital-details button, .cg-push')]
      const first = controls[0]
      const last = controls.at(-1)
      if (key.shiftKey && document.activeElement === first) { key.preventDefault(); last?.focus() }
      else if (!key.shiftKey && document.activeElement === last) { key.preventDefault(); first?.focus() }
    }
    app.addEventListener('keydown', onKey)
    return () => {
      app.removeEventListener('keydown', onKey)
      siblings.forEach((child, index) => { child.inert = previousInert[index] })
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return <div ref={ref} className="cg-sheet cg-hospital-details" role="dialog" aria-modal="true" aria-labelledby="cg-hospital-title">
    <header><div><Hospital size={24} aria-hidden="true" /><h2 id="cg-hospital-title">Hospital transfer</h2></div><button type="button" className="cg-icon-btn" aria-label="Close hospital details" onClick={onClose}><X size={22} aria-hidden="true" /></button></header>
    <div className="cg-hospital-details-body">
    <p className="cg-hospital-timezone">Times shown in Malaysia time.</p>
    <dl>
      <div><dt>Time sent to hospital</dt><dd>{dateLabel(incident?.hospital_sent_at)}</dd></div>
      <div><dt>Hospital</dt><dd>{incident?.hospital_name?.trim() || 'Not recorded'}</dd></div>
      <div><dt>Guard</dt><dd>{hospitalGuard(incident) || 'Not recorded'}</dd></div>
      <div><dt>Guard’s note</dt><dd>{hospitalNote(incident) || 'Not recorded'}</dd></div>
      <div><dt>Recorded at</dt><dd>{dateLabel(incident?.closed_at)}</dd></div>
    </dl>
    <p className="cg-hospital-explainer">Inactivity checks are paused until you confirm a return home. Water and power safety alerts remain active.</p>
    </div>
    {children}
  </div>
}
