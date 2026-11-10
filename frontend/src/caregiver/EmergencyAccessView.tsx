import { useEffect, useRef } from 'react'
import { ChevronLeft } from 'lucide-react'
import { EMERGENCY_ACCESS_CHECK, EMERGENCY_ACCESS_RESPONSE, EMERGENCY_ACCESS_SAFEGUARD, EMERGENCY_ACCESS_STATUS, type EmergencyAccessRecord } from './emergency-access'

export function EmergencyAccessView({ record, onBack }: { record: EmergencyAccessRecord; onBack: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null)
  const backRef = useRef(onBack)
  useEffect(() => { backRef.current = onBack }, [onBack])

  useEffect(() => {
    const panel = panelRef.current
    const app = panel?.parentElement
    if (!panel || !app) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const inertBefore = new Map<HTMLElement, boolean>()
    const containBackground = () => {
      for (const child of app.children) {
        if (!(child instanceof HTMLElement) || child === panel || inertBefore.has(child)) continue
        inertBefore.set(child, child.inert)
        child.inert = true
      }
    }
    containBackground()
    // Realtime banners may arrive while the document is open.
    const observer = new MutationObserver(containBackground)
    observer.observe(app, { childList: true })
    panel.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); backRef.current(); return }
      if (event.key !== 'Tab') return
      const controls = [...panel.querySelectorAll<HTMLElement>('button, [tabindex="0"]')]
      const first = controls[0]
      const last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    panel.addEventListener('keydown', onKey)
    return () => {
      observer.disconnect()
      panel.removeEventListener('keydown', onKey)
      inertBefore.forEach((inert, element) => { element.inert = inert })
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [])

  return <div ref={panelRef} className="cg-sheet cg-emergency-access" role="dialog" aria-modal="true" aria-labelledby="cg-agreement-title" aria-describedby="cg-agreement-disclaimer">
    <header className="cg-agreement-head">
      <div className="cg-sheet-head">
        <button type="button" className="cg-icon-btn" aria-label="Back to Settings" onClick={onBack}><ChevronLeft size={22} aria-hidden="true" /></button>
        <h1 id="cg-agreement-title">Emergency access</h1>
      </div>
    </header>
    <div className="cg-sheet-body cg-agreement-body" tabIndex={0} role="region" aria-label="Emergency access agreement document">
      <section className="cg-card cg-agreement-summary" aria-label="Agreement summary">
        <p className="cg-access-status">{EMERGENCY_ACCESS_STATUS}</p>
        <p>{record.residentName} and {record.caregiverName} gave standing conditional consent during onboarding with the Sime Darby Property team.</p>
        <ul>
          <li>{EMERGENCY_ACCESS_CHECK}</li>
          <li>{EMERGENCY_ACCESS_SAFEGUARD}</li>
          <li>{EMERGENCY_ACCESS_RESPONSE}</li>
        </ul>
        <p>Sarah is the primary recipient of the alert. Guards do not force entry; public emergency responders handle emergencies requiring forced access.</p>
      </section>

      <article className="cg-card cg-agreement-document" aria-labelledby="cg-agreement-document-title">
        <header>
          <p className="cg-agreement-note">Complete sample agreement</p>
          <h2 id="cg-agreement-document-title">Emergency Access Authorization Agreement</h2>
        </header>
        <dl className="cg-agreement-meta">
          <div><dt>Household</dt><dd>Unit {record.unitId} · {record.residentName}</dd></div>
          <div><dt>Primary caregiver</dt><dd>{record.caregiverName}</dd></div>
          <div><dt>Team representative</dt><dd>{record.representative}</dd></div>
          <div><dt>Agreement version</dt><dd>{record.version}</dd></div>
          <div><dt>Sample signing date</dt><dd>{record.sampleSignedOn}</dd></div>
          <div><dt>Consent recorded in this demo</dt><dd>Standing conditional consent</dd></div>
        </dl>

        <section>
          <h3>1. Parties and purpose</h3>
          <p>This sample records the proposed understanding between {record.residentName} (resident), {record.caregiverName} (primary caregiver), and the Sime Darby Property team representative. Its sole purpose is to describe a limited emergency wellness check at Unit {record.unitId} when the resident may need urgent assistance.</p>
        </section>
        <section>
          <h3>2. Contact and external check first</h3>
          <p>The caregiver is the primary recipient of a TemanMu alert. The response team first attempts to contact the resident and caregiver. An appointed guard or Auxiliary Police responder conducts an external wellness check, such as ringing the doorbell, observing from outside, or asking for a response through the grille.</p>
          <p>{EMERGENCY_ACCESS_CHECK}</p>
          <p>An activity alert or an unanswered call alone is not enough: contact attempts and the external wellness check must both be completed first.</p>
        </section>
        <section>
          <h3>3. Limited standing permission</h3>
          <p>For this scenario, the resident and caregiver have already opted in to a check by the appointed response team under these conditions. Fresh in-app approval from Sarah is not required for each incident. Permission applies only to this household, this purpose and the safeguards below; it is not general access to the home.</p>
          <p>Entry may use only an agreed means of access that does not require force. This record does not provide a key, access code or permission to defeat a lock. If suitable access is unavailable, responders remain outside and coordinate further help.</p>
        </section>
        <section>
          <h3>4. Verification before and during entry</h3>
          <p>{EMERGENCY_ACCESS_SAFEGUARD}</p>
          <p>If neither safeguard can be maintained, the guard does not enter or continue the check alone. The team coordinates assistance from outside instead. Any recording is limited to the wellness check and handled under the separately agreed privacy and recording arrangements.</p>
        </section>
        <section>
          <h3>5. If something is wrong, call 999</h3>
          <p>{EMERGENCY_ACCESS_RESPONSE}</p>
          <p>Guards do not break doors, force locks or use this agreement as permission for forced entry. If an emergency is suspected, the team contacts 999 and coordinates with Bomba / Fire and Rescue or medical emergency responders as appropriate. Public authorities determine and carry out any emergency access within their own authority.</p>
          <p>The on-site team helps responders locate the home, reach the resident and communicate with the caregiver. This sample agreement does not confer public-authority powers.</p>
        </section>
        <section>
          <h3>6. Conduct and follow-up</h3>
          <p>The check is limited to locating the resident and obtaining appropriate help. Responders respect private belongings and leave private areas once the check or handover is complete. The team records who attended, the reason and means of access, the safeguard used, and the outcome, and updates the caregiver.</p>
        </section>
        <section>
          <h3>7. Changes to the agreement</h3>
          <p>For a real service, changes or withdrawal would be recorded with the onboarding team, with an updated agreement and effective date. This demonstration shows an existing record only; viewing or closing it does not grant, renew, change or withdraw consent.</p>
        </section>
        <section>
          <h3>8. Signatures</h3>
          <dl className="cg-agreement-signatures">
            <div><dt>Resident</dt><dd>{record.residentName}</dd><dd>Signed on {record.sampleSignedOn}</dd></div>
            <div><dt>Primary caregiver</dt><dd>{record.caregiverName}</dd><dd>Signed on {record.sampleSignedOn}</dd></div>
            <div><dt>Team representative</dt><dd>{record.representative}</dd><dd>Signed on {record.sampleSignedOn}</dd></div>
          </dl>
        </section>
      </article>
      <p id="cg-agreement-disclaimer" className="cg-agreement-disclaimer">Illustrative demo record only. This is not an executed contract or evidence of a confirmed Sime Darby Property partnership. Operational and legal approval remain separate.</p>
    </div>
  </div>
}
