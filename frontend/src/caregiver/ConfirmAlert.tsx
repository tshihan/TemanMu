import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

export interface ConfirmOptions { title: string; message: string; confirmLabel: string }
type Ask = (options: ConfirmOptions) => Promise<boolean>

export const ConfirmContext = createContext<Ask>(async () => false)
/** In-app replacement for window.confirm: `if (!await confirm({...})) return`. */
export const useConfirm = () => useContext(ConfirmContext)

/** Owns the open alert. The app renders `alert` inside its frame and provides `confirm` to the tree. */
export function useConfirmAlert(): { confirm: Ask; alert: ReactNode } {
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null)
  const confirm = useCallback<Ask>(options => new Promise(resolve => {
    setPending(current => { current?.resolve(false); return { ...options, resolve } })
  }), [])
  const close = (ok: boolean) => { pending?.resolve(ok); setPending(null) }
  return { confirm, alert: pending ? <ConfirmAlert {...pending} onClose={close} /> : null }
}

function ConfirmAlert({ title, message, confirmLabel, onClose }: ConfirmOptions & { onClose: (ok: boolean) => void }) {
  const cancel = useRef<HTMLButtonElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    cancel.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); closeRef.current(false) } }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); previous?.focus?.() }
  }, [])
  return <div className="cg-alert-scrim">
    <div className="cg-alert" role="alertdialog" aria-modal="true" aria-labelledby="cg-alert-title" aria-describedby="cg-alert-message">
      <div className="cg-alert-text">
        <strong id="cg-alert-title">{title}</strong>
        <p id="cg-alert-message">{message}</p>
      </div>
      <div className="cg-alert-actions">
        <button ref={cancel} type="button" onClick={() => onClose(false)}>Cancel</button>
        <button type="button" className="is-confirm" onClick={() => onClose(true)}>{confirmLabel}</button>
      </div>
    </div>
  </div>
}
