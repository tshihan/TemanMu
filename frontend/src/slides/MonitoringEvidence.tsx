import './monitoring-evidence.css'

function InnovationVisual({ kind }: { kind: 'signals' | 'routine' | 'privacy' | 'response' }) {
  return <svg className={`innovation-visual innovation-${kind}`} viewBox="0 0 300 140" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {kind === 'signals' && <>
      <path className="innovation-muted" d="M55 38H115M55 70H115M55 102H115" strokeDasharray="3 6" />
      <path d="M122 66l42-33 42 33v51h-84Z" /><path d="M152 117V86h24v31" />
      <path d="M35 25c-5 7-10 12-10 17a10 10 0 0 0 20 0c0-5-5-10-10-17Z" />
      <path d="M38 57l-12 16h11l-5 13 16-18H37l5-11" />
      <rect x="24" y="94" width="25" height="18" rx="3" /><path d="M25 100h23" />
      {[38, 70, 102].map((y, i) => <circle key={y} className={`innovation-signal innovation-signal-${i}`} cx="107" cy={y} r="4" />)}
      <path className="innovation-accent innovation-draw" d="M215 76l8 8 16-19" />
      <text x="164" y="136" textAnchor="middle">Everyday activity → clues</text>
    </>}
    {kind === 'routine' && <>
      <path className="innovation-muted" d="M22 20v85h256M22 63h256" />
      <path className="innovation-muted" d="M25 60h250" strokeDasharray="5 6" />
      <path className="innovation-routine-area" d="M25 89L65 79 100 83 137 35 173 38 210 78 245 84 275 57V104H25Z" stroke="none" />
      <path className="innovation-accent innovation-draw" d="M25 89L65 79 100 83 137 35 173 38 210 78 245 84 275 57" strokeWidth="3" />
      <path className="innovation-accent" d="M137 21h36" /><text x="155" y="14" textAnchor="middle">Usual nap</text>
      <text x="23" y="124">Morning</text><text x="275" y="124" textAnchor="end">Evening</text>
    </>}
    {kind === 'privacy' && <>
      <path d="M35 65l49-37 49 37v49H35Z" /><path d="M69 114V82h29v32" />
      <path className="innovation-muted" d="M141 75h38" strokeDasharray="3 6" />
      <circle className="innovation-signal" cx="171" cy="75" r="4" />
      <path d="M224 28l37 15v30c0 24-20 38-37 46-17-8-37-22-37-46V43Z" />
      <path className="innovation-accent innovation-draw" d="M208 73l11 11 23-27" strokeWidth="3" />
      <text x="84" y="136" textAnchor="middle">Activity clues</text><text x="224" y="136" textAnchor="middle">Limited sharing</text>
    </>}
    {kind === 'response' && <>
      <path className="innovation-muted" d="M33 61h234" strokeDasharray="3 6" />
      {[33, 111, 189, 267].map((x, i) => <circle key={x} className={`innovation-response-node innovation-response-${i}`} cx={x} cy="61" r="24" />)}
      <path d="M26 49l-4 4c1 10 9 18 19 19l4-4-7-6-4 3-6-6 3-4Z" />
      <circle cx="111" cy="54" r="5" /><path d="M101 70v-3a10 10 0 0 1 20 0v3" />
      <path d="M189 46l12 5v10c0 8-7 14-12 17-5-3-12-9-12-17V51Z" />
      <path d="M257 61l7 7 13-15" />
      <text x="33" y="109" textAnchor="middle">Call her</text><text x="111" y="109" textAnchor="middle">Alert help</text><text x="189" y="109" textAnchor="middle">Visit</text><text x="267" y="109" textAnchor="middle">Record</text>
      <text className="innovation-condition" x="150" y="132" textAnchor="middle">If unanswered →</text>
    </>}
  </svg>
}

export function MonitoringEvidence() {
  return <>
    <div className="monitoring-heading">
      <p className="slides-eyebrow">Camera and wearable limitations</p>
      <h2>Acceptance and everyday use<br /><em>can leave gaps in monitoring</em></h2>
    </div>
    <div className="monitoring-evidence-columns">
      <section aria-labelledby="monitoring-camera-title">
        <span className="monitoring-label">01 · Cameras / acceptance</span>
        <h3 id="monitoring-camera-title">Comfort matters at home</h3>
        <div className="monitoring-wear-stat"><strong>36.7<span>%</span></strong><p>accepted home cameras<br /><b>for detecting falls or pain</b></p></div>
        <p>Camera monitoring can face acceptance barriers in the home.</p>
        <small>Swiss adult survey · n = 1,211 · acceptance, not detection accuracy</small>
        <a className="monitoring-source" href="https://pmc.ncbi.nlm.nih.gov/articles/PMC12948381/">Wangmo et al., Gerontology, 2026 · Table 2 ↗</a>
      </section>
      <section aria-labelledby="monitoring-wearable-title">
        <span className="monitoring-label">02 · Wearables / consistent use</span>
        <h3 id="monitoring-wearable-title">A device has to be worn</h3>
        <div className="monitoring-wear-stat"><strong>32<span>%</span></strong><p>wore the device on<br /><b>fewer than 4 of 14 days</b></p></div>
        <p>Seven of 22 participants had low adherence during the initial monitoring period, despite generally high daily wear time.</p>
        <small>Small older-adult activity-monitoring pilot · not a fall-detector trial</small>
        <a className="monitoring-source" href="https://aging.jmir.org/2024/1/e60209/">Ding et al., JMIR Aging, 2024 ↗</a>
      </section>
    </div>
    <p className="monitoring-scope">These studies motivate TemanMu’s design. They do not establish that TemanMu detects emergencies better. Full evidence: Appendix A5.</p>
  </>
}

export function TemanMuAdvantages({ eyebrow = 'The TemanMu advantage' }: { eyebrow?: string }) {
  return <>
    <div className="monitoring-heading">
      <p className="slides-eyebrow">{eyebrow}</p>
      <h2>Fits her life.<br /><em>Connects her to help.</em></h2>
    </div>
    <ol className="monitoring-advantages" data-slide-reveal>
      <li>
        <span className="monitoring-label">01 · Seamless & passive</span>
        <InnovationVisual kind="signals" />
        <h3>No change to<br />her daily routine</h3>
        <strong>Nothing new to wear, charge or log each day.</strong>
      </li>
      <li>
        <span className="monitoring-label">02 · Learns her routine</span>
        <InnovationVisual kind="routine" />
        <h3>Knows her normal,<br />not a fixed timer</h3>
        <strong>Built to keep false alarms rare.</strong>
      </li>
      <li>
        <span className="monitoring-label">03 · Privacy</span>
        <InnovationVisual kind="privacy" />
        <h3>Reassurance without<br />indoor video</h3>
        <strong>Consent and limited data sharing guide the design.</strong>
      </li>
      <li>
        <span className="monitoring-label">04 · Human help</span>
        <InnovationVisual kind="response" />
        <h3>A set response,<br />step by step</h3>
        <strong>Call → alert → check → record.</strong>
      </li>
    </ol>
  </>
}

export function MonitoringResearchAppendix() {
  return <>
    <div className="monitoring-heading">
      <p className="slides-eyebrow">Research behind the design</p>
      <h2>What the studies show</h2>
    </div>
    <div className="monitoring-research-cards">
      <article>
        <span className="monitoring-label">01 · Camera acceptance</span>
        <div className="monitoring-card-stat"><strong>36.7<span>%</span></strong><h3>accepted cameras at home</h3></div>
        <p>For recognizing falls or pain. A Swiss survey of 1,211 adults highlights an acceptance barrier.</p>
        <small>Self-reported acceptance; not a measure of detection accuracy.</small>
        <a href="https://pubmed.ncbi.nlm.nih.gov/41543981/">Wangmo et al. · Gerontology · 2026 ↗</a>
      </article>
      <article>
        <span className="monitoring-label">02 · Sensor preferences</span>
        <div className="monitoring-card-stat"><strong>400</strong><h3>older adults surveyed</h3></div>
        <p>Cameras and microphones faced stronger resistance than water-flow and other environmental sensors.</p>
        <small>Japanese adults aged 65+; 400 is the sample size, not a rejection rate.</small>
        <a href="https://pubmed.ncbi.nlm.nih.gov/37420686/">Igarashi &amp; Nihei · Sensors · 2023 ↗</a>
      </article>
      <article>
        <span className="monitoring-label">03 · Wearable adherence</span>
        <div className="monitoring-card-stat"><strong>32<span>%</span></strong><h3>wore it on fewer than 4 of 14 days</h3></div>
        <p>Seven of 22 older participants had low adherence during the initial requested monitoring period.</p>
        <small>Small activity-monitoring pilot; not an estimate for all wearable users.</small>
        <a href="https://aging.jmir.org/2024/1/e60209/">Ding et al. · JMIR Aging · 2024 ↗</a>
      </article>
      <article>
        <span className="monitoring-label">04 · Real-world fall detection</span>
        <div className="monitoring-card-stat"><strong>81.9<span>%</span></strong><h3>pooled detection sensitivity</h3></div>
        <p>Wearable trackers did not detect every fall. The 2024 meta-analysis pooled two studies for this estimate.</p>
        <small>95% confidence interval: 75.1–88.2%. Limited evidence; not a rating for every smartwatch.</small>
        <a href="https://pubmed.ncbi.nlm.nih.gov/39213525/">Singh et al. · JMIR mHealth and uHealth · 2024 ↗</a>
      </article>
    </div>
    <p className="monitoring-scope">No study listed directly compares TemanMu with cameras or wearables. A pilot must establish coverage, missed events, false alerts, acceptance and response outcomes.</p>
  </>
}
