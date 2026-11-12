import { useRef, useState, type RefObject } from 'react'

export function useSaveAsPdf(rootRef: RefObject<HTMLElement | null>) {
  const pending = useRef(false)
  const [preparingPdf, setPreparingPdf] = useState(false)
  const [pdfStatus, setPdfStatus] = useState('')

  const saveAsPdf = async () => {
    const root = rootRef.current
    if (!root || pending.current) return
    pending.current = true
    setPreparingPdf(true)
    setPdfStatus('Preparing fonts and images…')
    try {
      await Promise.all([
        document.fonts.ready,
        ...Array.from(root.querySelectorAll('img'), image => image.decode()),
      ])
      // Allow decoded images and font metrics to reach the print layout.
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
      window.print()
      setPdfStatus('')
    } catch (error) {
      console.error('PDF preparation failed', error)
      setPdfStatus('An image could not load. Reload the page and try again.')
    } finally {
      pending.current = false
      setPreparingPdf(false)
    }
  }

  return { saveAsPdf, preparingPdf, pdfStatus }
}
