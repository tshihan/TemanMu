import { useEffect, useRef, useState } from 'react'
import './hardware-appendix.css'

const ctSteps = [
  ['Current flows', 'An appliance draws alternating current through the home’s electrical wiring.'],
  ['The clamp senses it', 'The changing magnetic field induces a smaller signal in the CT’s internal coil.'],
  ['The monitor measures', 'Electronics read the signal. A voltage reference enables real-power measurement.'],
  ['Readings reach TemanMu', 'A connected monitor sends timestamped readings through an agreed data connection.'],
]
const waterSteps = [
  ['Sound measures flow', 'Two sensors send ultrasonic pulses with and against the water flow.'],
  ['The meter counts usage', 'The travel-time difference gives flow rate; adding flow over time gives water volume.'],
  ['NB-IoT sends readings', 'A cellular module transmits small data packets through the mobile operator’s network.'],
  ['TemanMu receives data', 'The meter platform forwards authorised readings through an agreed integration.'],
]

function CtDiagram() {
  return <svg className="hardware-diagram" viewBox="0 0 1400 310" role="img" aria-labelledby="ct-diagram-title ct-diagram-desc">
    <title id="ct-diagram-title">From electrical current to household activity readings</title>
    <desc id="ct-diagram-desc">A split-core current transformer surrounds one insulated wire. Its internal coil senses the changing magnetic field without touching the conductor. A monitor reads the secondary signal and sends data to TemanMu.</desc>
    <g className="hardware-scene hardware-scene-0">
      <text x="245" y="30" textAnchor="middle" className="hardware-svg-label">One insulated AC conductor</text>
      <path d="M45 145H465" stroke="#cbbbaa" strokeWidth="22" strokeLinecap="round" />
      <path className="hardware-current" d="M50 145H460" stroke="#a95130" strokeWidth="4" strokeDasharray="12 22" />
      <path d="M65 213q12-34 24 0t24 0t24 0t24 0" fill="none" stroke="#a95130" strokeWidth="3" />
      <text x="110" y="259" textAnchor="middle" className="hardware-svg-small">Alternating current</text>
    </g>
    <g className="hardware-scene hardware-scene-1">
      <ellipse className="hardware-field" cx="272" cy="145" rx="77" ry="100" fill="none" stroke="#a95130" strokeWidth="2" strokeDasharray="5 7" />
      <ellipse cx="272" cy="145" rx="42" ry="70" fill="none" stroke="#8b4429" strokeWidth="24" />
      <path d="M272 63v24M272 203v24" stroke="#fef9ef" strokeWidth="4" />
      {[0, 1, 2, 3, 4].map(i => <ellipse key={i} cx="312" cy={116 + i * 13} rx="17" ry="7" fill="none" stroke="#edc69d" strokeWidth="3" />)}
      <path d="M330 165H501V115H610M330 182H516V132H610" fill="none" stroke="#8b4429" strokeWidth="2.5" />
      <path className="hardware-packet" d="M333 165H501V115H610" fill="none" stroke="#a95130" strokeWidth="5" strokeDasharray="8 330" />
      <text x="295" y="278" textAnchor="middle" className="hardware-svg-label">CT clamp + internal coil</text>
      <text x="491" y="82" textAnchor="middle" className="hardware-svg-small">Small sensor signal</text>
    </g>
    <g className="hardware-scene hardware-scene-2">
      <rect x="610" y="55" width="230" height="187" rx="14" fill="#f5eee1" stroke="#c6b6a5" strokeWidth="2" />
      <text x="725" y="89" textAnchor="middle" className="hardware-svg-label">Electricity monitor</text>
      <rect x="637" y="110" width="176" height="62" rx="5" fill="#fef9ef" stroke="#d1c9bf" />
      <path className="hardware-wave" d="M650 140q13-34 26 0t26 0t26 0t26 0t26 0" fill="none" stroke="#a95130" strokeWidth="3" />
      <text x="725" y="202" textAnchor="middle" className="hardware-svg-small">Current + voltage reference</text>
      <text x="725" y="223" textAnchor="middle" className="hardware-svg-small">Power over time</text>
    </g>
    <g className="hardware-scene hardware-scene-3">
      <path d="M840 145H1090" className="hardware-data-line" fill="none" stroke="#c6b6a5" strokeWidth="2" />
      <path d="M840 145H1090" className="hardware-packet" fill="none" stroke="#a95130" strokeWidth="5" strokeDasharray="9 45" />
      <text x="963" y="103" textAnchor="middle" className="hardware-svg-small">Configured connection</text>
      <text x="963" y="193" textAnchor="middle" className="hardware-svg-small">e.g. gateway + internet</text>
      <rect x="1090" y="80" width="265" height="145" rx="14" fill="#eef1e4" stroke="#c3cdb7" strokeWidth="2" />
      <text x="1222" y="123" textAnchor="middle" className="hardware-svg-brand">TemanMu</text>
      <path d="M1117 182h28v-12h27v-27h27v27h28v12h27v-8h28v8h27" fill="none" stroke="#4d6b3a" strokeWidth="3" />
      <text x="1222" y="270" textAnchor="middle" className="hardware-svg-small">Look for changes in usage</text>
    </g>
  </svg>
}

function WaterDiagram() {
  return <svg className="hardware-diagram" viewBox="0 0 1400 310" role="img" aria-labelledby="water-diagram-title water-diagram-desc">
    <title id="water-diagram-title">Ultrasonic water measurement and NB-IoT transmission</title>
    <desc id="water-diagram-desc">Water passes through a meter. Sound travels faster downstream than upstream; the time difference gives flow rate and accumulated volume. A cellular NB-IoT module sends readings via the mobile network to a meter platform, then through an authorised integration to TemanMu. The illustration is schematic, not a selected device.</desc>
    <g className="hardware-scene hardware-scene-0">
      <path d="M42 133H445M42 209H445" stroke="#b7c7c1" strokeWidth="5" />
      <path d="M42 171H445" stroke="#e0e9e3" strokeWidth="68" />
      <path className="hardware-water-flow" d="M45 171H445" fill="none" stroke="#4d6b3a" strokeWidth="3" strokeDasharray="15 30" />
      <rect x="140" y="124" width="30" height="22" rx="4" fill="#8b4429" />
      <rect x="325" y="195" width="30" height="22" rx="4" fill="#8b4429" />
      <path d="M155 146 340 195" fill="none" stroke="#a95130" strokeWidth="2" />
      <path className="hardware-sound-down" d="M155 146 340 195" fill="none" stroke="#a95130" strokeWidth="6" strokeDasharray="8 200" />
      <path className="hardware-sound-up" d="M340 188 155 139" fill="none" stroke="#4d6b3a" strokeWidth="6" strokeDasharray="8 200" />
      <text x="244" y="52" textAnchor="middle" className="hardware-svg-label">Ultrasonic measurement</text>
      <text x="244" y="81" textAnchor="middle" className="hardware-svg-small">With the flow: faster · against: slower</text>
      <text x="244" y="256" textAnchor="middle" className="hardware-svg-small">Water flows towards the home →</text>
    </g>
    <g className="hardware-scene hardware-scene-1">
      <path d="M355 209H482V113H515" fill="none" stroke="#c6b6a5" strokeWidth="2" />
      <rect x="515" y="57" width="200" height="179" rx="14" fill="#f5eee1" stroke="#c6b6a5" strokeWidth="2" />
      <text x="615" y="89" textAnchor="middle" className="hardware-svg-label">Meter electronics</text>
      <text x="615" y="131" textAnchor="middle" className="hardware-svg-brand">Δ time → flow</text>
      <text x="615" y="163" textAnchor="middle" className="hardware-svg-small">Add flow over time</text>
      <text x="615" y="202" textAnchor="middle" className="hardware-svg-label">Volume + timestamp</text>
      <text x="615" y="272" textAnchor="middle" className="hardware-svg-small">Measurement happens here</text>
    </g>
    <g className="hardware-scene hardware-scene-2">
      <path d="M715 145H908" className="hardware-data-line" fill="none" stroke="#c6b6a5" strokeWidth="2" />
      <path d="M715 145H908" className="hardware-packet" fill="none" stroke="#a95130" strokeWidth="5" strokeDasharray="9 45" />
      <text x="809" y="105" textAnchor="middle" className="hardware-svg-label">NB-IoT module</text>
      <text x="809" y="208" textAnchor="middle" className="hardware-svg-small">Small cellular packets</text>
      <path d="m921 203 34-100 34 100M936 162h38M943 142h24M921 203h68" fill="none" stroke="#8b4429" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="955" cy="92" r="6" fill="#a95130" />
      <path className="hardware-radio" d="M937 76q-17 16 0 32M973 76q17 16 0 32M923 65q-30 28 0 54M987 65q30 28 0 54" fill="none" stroke="#a95130" strokeWidth="2.5" />
      <text x="955" y="253" textAnchor="middle" className="hardware-svg-small">Mobile network</text>
    </g>
    <g className="hardware-scene hardware-scene-3">
      <path d="M1004 145H1110" className="hardware-data-line" fill="none" stroke="#c6b6a5" strokeWidth="2" />
      <path d="M1004 145H1110" className="hardware-packet" fill="none" stroke="#a95130" strokeWidth="5" strokeDasharray="9 45" />
      <rect x="1110" y="59" width="245" height="178" rx="14" fill="#eef1e4" stroke="#c3cdb7" strokeWidth="2" />
      <text x="1232" y="97" textAnchor="middle" className="hardware-svg-label">Meter platform</text>
      <path d="M1232 112v32m-6-6 6 6 6-6" fill="none" stroke="#4d6b3a" strokeWidth="2" />
      <text x="1232" y="174" textAnchor="middle" className="hardware-svg-brand">TemanMu</text>
      <text x="1232" y="208" textAnchor="middle" className="hardware-svg-small">Authorised data integration</text>
      <text x="1232" y="272" textAnchor="middle" className="hardware-svg-small">Proposed data path</text>
    </g>
  </svg>
}

export function HardwareAppendix({ kind }: { kind: 'ct' | 'water' }) {
  const root = useRef<HTMLElement>(null)
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [visible, setVisible] = useState(false)
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const started = useRef(false)
  const isCt = kind === 'ct'
  const appendix = isCt ? 'A9' : 'A10'
  const steps = isCt ? ctSteps : waterSteps

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { setReduced(media.matches); if (media.matches) setPlaying(false) }
    media.addEventListener('change', update)
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting)
      if (entry.isIntersecting && !started.current) {
        started.current = true
        if (!media.matches) setPlaying(true)
      }
    }, { threshold: .5 })
    if (root.current) observer.observe(root.current)
    return () => { observer.disconnect(); media.removeEventListener('change', update) }
  }, [])

  useEffect(() => {
    if (!playing || !visible || reduced) return
    const timer = window.setTimeout(() => {
      if (step === 3) setPlaying(false)
      else setStep(step + 1)
    }, 3200)
    return () => window.clearTimeout(timer)
  }, [playing, visible, reduced, step])

  return <section ref={root} className={`slides-page hardware-appendix hardware-${kind} ${playing && visible && !reduced ? 'hardware-playing' : ''}`} data-stage={step} aria-label={`Appendix ${appendix}: ${isCt ? 'CT electricity monitor' : 'NB-IoT water meter'}`}>
    <img className="slides-sdp-logo" src="/images/sdp-logo.png" alt="Sime Darby Property" />
    <div className="slides-section-top"><p className="final-mentor-note">How does the {isCt ? 'electricity monitor' : 'connected water meter'} work?</p><span>Appendix {appendix} · {isCt ? 'Electricity' : 'Water'}</span></div>
    <div className="hardware-heading">
      <h2>{isCt ? <>A clamp senses current.<br /><em>The monitor records usage.</em></> : <>The meter measures water.<br /><em>NB-IoT sends the readings.</em></>}</h2>
      <p>{isCt ? 'CT = Current Transformer. A split-core sensor clips around one insulated wire at the distribution board.' : 'NB-IoT = Narrowband Internet of Things. Illustrated here with an ultrasonic water meter.'}</p>
    </div>
    <div className="hardware-playback" aria-label={`${isCt ? 'Electricity' : 'Water'} explanation controls`}>
      {!reduced && <button type="button" onClick={() => { if (!playing && step === 3) setStep(0); setPlaying(!playing) }}>{playing ? 'Pause animation' : step === 3 ? 'Replay animation' : 'Play animation'}</button>}
      <button type="button" onClick={() => { setStep(0); setPlaying(!reduced) }}>{reduced ? 'Reset steps' : 'Restart'}</button>
      <span>{reduced ? 'Reduced motion · select a step below' : 'Step-by-step explanation · select any step below'}</span>
    </div>
    <figure className="hardware-figure">{isCt ? <CtDiagram /> : <WaterDiagram />}<figcaption>Schematic illustration · {isCt ? 'current alternation shown slowly; not an installation diagram' : 'sound travel and data transfer shown slowly; not to scale'}</figcaption></figure>
    <ol className="hardware-steps">{steps.map(([title, detail], index) => <li key={title} className={step === index ? 'hardware-step-active' : ''}>
      <button type="button" aria-pressed={step === index} onClick={() => { setStep(index); setPlaying(false) }}><span>0{index + 1}</span><strong>{title}</strong></button><p>{detail}</p>
    </li>)}</ol>
    <div className="hardware-boundary">
      <strong>{isCt ? 'For the pilot' : 'Measurement is not transmission'}</strong>
      <p>{isCt ? 'Qualified electrician installation. Whole-house readings show combined load, not proof of a person’s activity or automatic appliance identification. The proposed data connection still needs testing.' : 'Reporting frequency, battery life, network coverage and data access depend on the selected meter. Minute-level delivery is a pilot target. Survey tanks and pipe branches so readings reflect indoor use.'}</p>
    </div>
    <p className="hardware-sources">Sources: {isCt ? <><a href="https://docs.openenergymonitor.org/electricity-monitoring/ct-sensors/introduction.html" target="_blank" rel="noopener noreferrer">OpenEnergyMonitor: CT principle</a> · <a href="https://docs.openenergymonitor.org/electricity-monitoring/ct-sensors/installation.html" target="_blank" rel="noopener noreferrer">Installation</a></> : <><a href="https://en.huizhong.co/news_info?id=821" target="_blank" rel="noopener noreferrer">Huizhong SCL-61H: example meter / interfaces</a> · <a href="https://www.usbr.gov/tsc/techreferences/mands/wmm/chap11_01.html" target="_blank" rel="noopener noreferrer">USBR: ultrasonic principle</a> · <a href="https://process.honeywell.com/us/en/products/utilities/water/digital-metering/nb-iot/merlin-clip-on" target="_blank" rel="noopener noreferrer">Honeywell: NB-IoT module</a></>}</p>
    <div className="slides-page-bottom"><span>TemanMu · Township care</span><span>Appendix {appendix}</span></div>
  </section>
}
