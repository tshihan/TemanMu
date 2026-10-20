import { useEffect, useRef } from 'react'
import { startScene } from './scene'
import markup from './landing.html?raw'
import './landing.css'

export function Landing() {
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => startScene(rootRef.current!), [])
  return <div ref={rootRef} className="landing" dangerouslySetInnerHTML={{ __html: markup }} />
}
