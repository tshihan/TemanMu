import { useState } from 'react'
import { initials } from './format'

// The prototype has one resident, so the photo is a bundled asset. A real unit would carry its own photo URL.
const RESIDENT_PHOTO = '/images/mum-profile.jpg'

/** The resident's photo, or their initials when the photo can't load. */
export function ResidentAvatar({ name, size }: { name: string; size: 'md' | 'lg' }) {
  const [failed, setFailed] = useState(false)
  return <span className={`cg-resident-avatar is-${size}`} aria-hidden="true">
    {failed ? initials(name.replace(/^Madam\s+/i, '')) : <img src={RESIDENT_PHOTO} alt="" onError={() => setFailed(true)} />}
  </span>
}
