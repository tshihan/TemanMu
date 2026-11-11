import './monitoring-evidence.css'

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
    <p className="monitoring-scope">These studies motivate TemanMu’s design. They do not establish that TemanMu detects emergencies better. Full evidence: Appendix A10.</p>
  </>
}

export function TemanMuAdvantages() {
  return <>
    <div className="monitoring-heading">
      <p className="slides-eyebrow">The TemanMu advantage</p>
      <h2>Fits her life.<br /><em>Connects her to help.</em></h2>
    </div>
    <ol className="monitoring-advantages">
      <li>
        <span className="monitoring-label">01 · Seamless & passive</span>
        <h3>No change to<br />her daily routine</h3>
        <p>Uses everyday water and electricity activity, plus existing access-card taps where available.</p>
        <strong>Nothing new to wear, charge or log each day.</strong>
      </li>
      <li>
        <span className="monitoring-label">02 · Privacy</span>
        <h3>Reassurance without<br />indoor video</h3>
        <p>Looks for changes in household activity without recording her image or private conversations.</p>
        <strong>Consent and limited data sharing guide the design.</strong>
      </li>
      <li>
        <span className="monitoring-label">03 · Human help</span>
        <h3>A clear path<br />to a person</h3>
        <p>An unusual quiet period prompts a check-in, then caregiver or designated responder escalation if unanswered.</p>
        <strong>Notice → check in → connect to help.</strong>
      </li>
    </ol>
    <p className="monitoring-scope">Designed advantages. Alert reliability, privacy controls and responder arrangements require pilot validation. Utility activity is an indirect clue, not confirmation of safety.</p>
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
