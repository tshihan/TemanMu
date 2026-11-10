# TemanMu: appendix slides and Q&A

Prepared 10 November 2026. Slide-ready content and speaker answers for the ten-slide pitch; these are backup slides opened when relevant questions arise. This document does not modify the presentation UI or create a PowerPoint.

The supplied PDFs are research drafts, not operating instructions or legal approval. Their source material informs the answers below; contradictions and outstanding decisions are recorded at the end.

## Appendix slide index

| Slide | Title | Context: points to include |
| --- | --- | --- |
| A1 | A township families can grow older in | Property appeal; wellness and multigenerational living; resident experience; targeted CSR access. |
| A2 | No app for Madam Lee | Normal household behaviour; no wearable or charging routine for monitoring; ordinary voice-call check-in; accessible onboarding. |
| A3 | Landed homes, supported by a township team | Retrofit household monitoring; proposed Auxiliary Police response; service coverage rather than title type; outside-coverage arrangement. |
| A4 | Clear roles when a concern remains | TemanMu detects and coordinates; resident verification; family and designated team notified; accepted checks and recorded outcomes. |
| A5 | Consent and safeguards before home entry | Existing opt-in; contact attempts and external check; two responders or one with an active body-worn camera; emergency handoff. |
| A6 | Installing TemanMu in an existing home | CT electricity monitor; NB-IoT water meter; access events or door sensor; measurement placement, connectivity and commissioning. |
| A7 | What our routine models learn | Quiet gaps and outing duration; time/day context; simulated training history; learned limits used by rules; real-home evaluation next. |
| A8 | Resting, going out, or a concern? | Personal limits, outing context, verification and caregiver away settings; false alarms and missed concerns measured separately. |
| A9 | When a meter or connection fails | Missing data is not inactivity; device-health requirements; outage and delayed-data handling; no guaranteed monitoring during a failure. |
| A10 | Privacy without an indoor camera | Household routines stay with the resident and authorised caregiver. Township receives incident-only information for follow-up, not routine water, electricity or outing history. Voluntary participation, withdrawal and defined retention. |
| A11 | Who pays, and what does the fee cover? | Installation plus recurring service; township pilot or caregiver subscription; response provision and maintenance included in costing; price not yet validated. |
| A12 | What is proven, and what comes next? | Working software vs simulated inputs; standalone landed UI; proposed hardware; supervised pilot and measurable outcomes. |

## A1. Business relevance

**Question:** Sime Darby Property sells properties. Why would it invest in TemanMu?

**Slide title:** A township families can grow older in

**On-slide copy:**

- **Property appeal:** another reason for families to consider an SDP township when planning for their parents' later years.
- **Wellness and multigenerational living:** practical support when an older resident spends time alone.
- **Resident experience:** connect household concerns, family contact and an agreed local response.
- **CSR access:** sponsor selected residents and measure participation, service reliability and family/resident experience.

**Suggested visual:** Three people connected around a home: older resident, adult child and township team. Below, map the proposal to property appeal, resident experience and community impact. Use one small official evidence excerpt, not a collage of corporate strategy screenshots.

**Suggested spoken answer:**

> “For Sime Darby Property, the opportunity is to make its townships more attractive to families planning for their parents' later years. It already describes Elmina homes around wellness and multigenerational living. TemanMu could make that more tangible: parents retain their independence, children have a clearer way to follow up, and the township offers an agreed support process. Sponsored access could also become a measurable community initiative. We would test whether families value it and are willing to pay through a pilot.”

**Evidence and limits:**

- `SDP Hack-3.pdf`, pages 3–4, supplies this business framing; pages 5–6 contain corporate strategy and development screenshots.
- SDP's 19 May 2025 announcement describes The Nine, Elmina Green as wellness-oriented homes intended for multigenerational living. [Official announcement](https://www.simedarbyproperty.com/press-releases/sime-darby-property-celebrates-100-overall-take-nine-elmina-green)
- SDP's live sustainability page includes positive community experiences and social/economic community well-being. Use that current wording when refreshing the slide rather than assuming the older screenshot remains the complete strategy. [Official sustainability page](https://www.simedarbyproperty.com/sustainability/)
- Buyer appeal, adoption, willingness to pay and any effect on property sales are hypotheses. Do not promise faster bookings or a property-price premium.
- Do not claim TemanMu is an existing SDP service or approved CSR programme.

## A2. Elderly usability and feasibility

**Question:** What if the resident is not tech-savvy?

**Slide title:** No app for Madam Lee

**On-slide copy:**

- Continue ordinary activities: use the tap, switch on appliances, leave and return home.
- No resident app, wearable or new monitoring-device charging routine.
- A phone capable of receiving ordinary voice calls provides the check-in channel.
- Family and township teams use the interfaces; the resident does not manage the monitoring system.

**Suggested visual:** Madam Lee at home with three familiar objects: a tap, kettle and basic phone. Show the apps beside Sarah and the township operator, not beside Madam Lee.

**Humour line for delivery:**

> “She doesn't need the latest smartphone. Think Nokia 3310: answering a call is the skill we need, not downloading another app.”

Use Nokia 3310 as an illustrative joke, not a claim that a particular legacy handset has been tested or remains compatible with a particular network. The pilot needs a working voice-call connection, not a specific brand.

**Suggested spoken answer:**

> “We designed the resident experience around habits she already has. Madam Lee uses water and electricity as usual; she doesn't need an app or a wearable. For a check-in, she needs a working phone and a way to answer and confirm she is okay. Think Nokia 3310, rather than the latest smartphone. Her family and the operator handle the apps and setup.”

**Implementation notes for Q&A:**

- Automated calls are currently simulated. Real voice delivery and the confirmation method still need implementation and testing.
- Answering a call alone must not be treated as verified well-being: voicemail, another person answering or an unintelligible response need defined handling.
- Test language, hearing, speech, cognition, phone reachability and ease of confirmation during onboarding. Residents who cannot use voice check-ins need an agreed alternative.
- The phone still needs charge and network service. “No charging” refers to an additional wearable, not every household device.
- Household installation, connectivity and maintenance are managed service requirements even though the resident does not operate an app.

## A3. Landed homes without a dedicated guardhouse

**Question:** How can this work in an individual landed home with no guard?

**Slide title:** Landed homes, supported by a township team

**On-slide copy:**

- The home uses the same monitoring and verification approach.
- A dedicated guardhouse at each development is not essential where an agreed township response service covers the home.
- SDP already has an Auxiliary Police unit providing security checks, patrols and guarding services across its premises and townships.
- Proposed TemanMu role: receive a welfare concern, accept a check, record the outcome and coordinate further help.
- Confirm participating-home coverage, availability and duties before enrolment.

**Suggested visual:** An apartment and a landed home connect to one designated township response desk, which assigns a responder. Mark the response arrangement as proposed. Use an official Auxiliary Police photo with attribution if permission allows; do not imply a partnership through a logo strip.

**Suggested spoken answer:**

> “For landed homes, we propose connecting the home to an agreed township response team. Sime Darby Property already has an Auxiliary Police unit, so we would explore building on that infrastructure rather than requiring a guardhouse at every residence. The key is confirming that the participating home is covered and that the team has agreed to the welfare-check role. Outside that coverage, we would need a separate arrangement with family, a trusted nearby contact or a response partner.”

**Evidence update:**

- The official 1 August 2023 release describes security checks, patrolling and guarding services across SDP premises and townships. It reports 126 active personnel at that time and discusses community safety across its then 25 townships/developments. These are dated figures, not a 2026 staffing or coverage audit. [2023 Auxiliary Police update](https://www.simedarbyproperty.com/press-releases/sime-darby-propertys-auxiliary-police-unit-celebrates-seven-years-service-honourary)
- This is the source behind the screenshot in `SDP Hack.pdf`, page 5, and provides newer support than the 2016 launch alone.
- The 2016 announcement documents basic Auxiliary Police training and selected initial deployment, including Elmina East. This establishes a trained security unit, not welfare-check or clinical competence. [2016 launch announcement](https://www.simedarbyproperty.com/press-releases/sime-darby-property-launches-auxiliary-police-unit-enhance-security-across-townships)
- Neither announcement establishes TemanMu participation, a guaranteed response time, current coverage at every home, or unrestricted jurisdiction over all public roads. Prefer “existing township Auxiliary Police infrastructure” to “most homes are already covered”.
- `SDP Hack-3.pdf`, pages 1–2, already makes the coverage/agreement distinction.

## A4. Response responsibility

**Question:** When an alert appears, who is responsible for doing what?

**Slide title:** Clear roles when a concern remains

**On-slide copy:**

| Role | Proposed task |
| --- | --- |
| TemanMu | Identify unusual activity patterns, initiate verification, notify the agreed recipients and track the case. |
| Resident | Respond to the check-in where able; participation and access preferences are agreed beforehand. |
| Caregiver | Check context, attempt contact and coordinate with the designated team. |
| Designated guard/Auxiliary Police team | Accept an authorised welfare check, follow the agreed procedure and record factual findings. |
| Emergency services | Provide emergency assistance when contacted by a person. |

**Suggested visual:** Unusual inactivity → resident verification → unresolved concern → family + designated team notified → responder accepts → outcome recorded. Show a separate emergency-services branch when concern requires it. People can seek urgent help at any stage; the diagram is not a reason to wait through every step in an obvious emergency.

**Suggested spoken answer:**

> “TemanMu identifies a concern and coordinates follow-up. When the resident check-in is unresolved, the family and designated team receive it together. The assigned responder accepts the check and follows an agreed procedure; the family provides context and can also seek help. A person decides when emergency services are needed. Before a real pilot, we need a named service operator and an agreement defining coverage, responsibilities and escalation.”

**Consistency with current prototype:**

- The prototype notifies caregiver and township together after the unresolved verification stage. Do not describe the caregiver as a mandatory dispatch gate, or suggest the township only receives a case after “Ask township to visit”.
- An acknowledgement records acceptance. A notification alone does not prove attendance.
- The response process is a proposal; the demo does not establish a staffed service, signed agreement or legal allocation of liability.

## A5. Home entry and emergency safeguards

**Question:** Can responders enter a home? What protects the resident and response team?

**Slide title:** Consent and safeguards before home entry

**On-slide copy:**

- Obtain resident opt-in and document access arrangements during onboarding.
- Attempt resident contact and an external wellness check before considering entry under the proposed procedure.
- Proposed entry safeguard: **at least two guards/Auxiliary Police officers together, or one with a body-worn camera activated before entry and recording throughout the check**.
- If the team finds the resident injured, unwell or unresponsive, **call 999 immediately and coordinate emergency help**.
- Where access is unavailable or an urgent concern exists, contact the appropriate emergency services; no improvised forced entry.

**Suggested visual:** Contact attempt → external check → authorised entry decision with safeguard → recorded findings / emergency handoff. Put the two-responders-or-camera condition beside the entry decision, not at the end.

**Suggested spoken answer:**

> “Our demo uses a prior opt-in arrangement. After contact attempts and an external check receive no response, the appointed team may enter under that proposed arrangement, with two responders or one wearing an active body-worn camera. If they find the resident injured, unwell or unresponsive, they call 999 immediately. For a real deployment, access authority, keys, emergency procedures, insurance and responsibilities must be agreed and reviewed before this can operate.”

**Basis and unresolved points:**

- This follows the current sample in `frontend/src/caregiver/emergency-access.ts`; it is a fictional demo agreement, not legal approval or evidence of actual consent.
- `SDP Hack.pdf`, pages 3–4, contains both a doorstep-only model and an optional consent-based entry model. It also suggests a caregiver video call as an alternative. For consistency with the existing demo, this appendix uses the two-responders-or-body-camera condition; a video call alone is not added as an equivalent safeguard.
- This is an operating proposal, not a finding that consent permits every form of entry or removes legal liability. Do not use the draft's “completely shielding” wording or present an indemnity waiver as guaranteed protection.
- Do not imply police training itself establishes authority to enter any participating house or medical competence.

## A6. Hardware and retrofit feasibility

**Question:** How do you install this in homes that already exist?

**Slide title:** Installing TemanMu in an existing home

**On-slide copy:**

- **Electricity:** CT monitor at a suitable distribution-board measurement point, installed by a registered electrical contractor.
- **Water:** proposed NB-IoT residential water meter at a surveyed household supply point, installed by a plumber.
- **Entry/exit:** supported resident-linked access-card events, or a door sensor where integration is unavailable.
- Confirm measurement coverage, connectivity, device identity and timestamped data delivery.
- Target one-minute measurements/reporting for the pilot; validate actual capability and delay.

**Suggested visual:** Show separate electricity and water data paths converging on TemanMu. Water over NB-IoT does not require the electricity monitor to use the same gateway.

**Short answer:**

> “Our preferred retrofit is a CT electricity monitor and an NB-IoT water meter, with entry/exit context from an access system or a door sensor. We would survey and professionally install the equipment, then test whether ordinary household uses are captured and delivered reliably. Existing utility feeds can be reused where suitable, but smart billing meters do not automatically provide activity-level data.”

**Details in reserve:**

- Survey tanks and split water branches: upstream tank refilling can differ from indoor usage timing.
- Potential TNB and Air Selangor discussions concern deployment and authorised data integration; no partnership or minute-level utility API is confirmed.
- Exact equipment, local network compatibility, interval settings, battery impact and installed costs remain pilot/procurement checks.
- Source: [hardware feasibility memo](hardware-iot-feasibility-2026-11-06.md), dated 6 November 2026. Specifications are carried forward from that research, not freshly confirmed with suppliers here.

## A7. ML and personalisation

**Question:** What does the AI actually learn?

**Slide title:** What our routine models learn

**On-slide copy:**

- **Quiet Gap Model:** usual gaps between water uses, conditioned on time/day.
- **Outing Model:** usual outing duration after a card tap-out, conditioned on time/day.
- Gradient-boosting quantile regression produces personal timing limits.
- The runtime rules use exported limits to decide when to begin verification.
- Current training uses eight weeks of simulated history: six for training and two for testing.

**Suggested visual:** History timeline → two learned timing limits → unusual duration → check-in. Use only actual exported examples if adding numbers; illustrative values must be labelled.

**Short answer:**

> “The model learns routine timing: how long she normally goes between water uses and how long she is normally out. The time of day and day of week influence those limits. The demo uses limits learned from simulated history. It does not diagnose a fall or continuously retrain while the demo runs.”

**Follow-up:** A real pilot needs a cold-start approach, trustworthy history, handling of visitors and changing routines, and comparison against fixed rules. Do not claim validated accuracy, reduced false alarms or proven superiority from simulated testing alone.

**Sources:** [ML README](../backend/ml/README.md), [quiet-gap training](../backend/ml/train_quiet_gap.py), [outing training](../backend/ml/train_outing.py), [runtime learned limits](../backend/app/learned_baseline.py). These are the current implemented models; the earlier Isolation Forest proposal is not the implementation being presented.

## A8. False alarms and normal outings

**Question:** What if Madam Lee is sleeping, shopping, or simply having a different day?

**Slide title:** Resting, going out, or a concern?

**On-slide copy:**

- Personal timing limits provide context for ordinary quiet periods.
- Entry/exit events support possible-outing context; a card swipe does not prove location or well-being.
- Caregiver away/hospital settings provide explicit context where configured.
- A verification step gives the resident a way to confirm she is okay.
- Measure false alerts and missed concerns; do not promise either is eliminated.

**Suggested visual:** Three branches: resting and confirms okay; outing within expected duration; unresolved quiet period requiring follow-up.

**Short answer:**

> “Quiet does not automatically mean an emergency. We combine routine limits with outing context and a resident check-in. The false-alarm recovery demo shows a resident confirming that she is okay. Real-life routines vary, so the pilot must measure nuisance alerts and missed concerns rather than assume personalisation solves both.”

**Additional limits:** Water may be used by a visitor or an automatic system. An unchanged fan, refrigerator or air-conditioner load is not fresh resident activity. Multiple occupants weaken person-specific inference. Begin with appropriate consenting households and record who lives there and what automatic loads exist.

## A9. Missing data and outages

**Question:** What happens during a power cut, poor signal or meter failure?

**Slide title:** When a meter or connection fails

**On-slide copy:**

- Separate “no activity observed” from “no data received”.
- Monitor device and connection health; make degraded coverage visible.
- Preserve measurement timestamps; delayed uploads must not become fresh activity.
- Agree an outage fallback and contact procedure with participating families.
- Test power, network and sensor failures before welfare alerts are activated.

**Short answer:**

> “A disconnected meter cannot tell us whether the resident is inactive. We need device-health monitoring and an explicit degraded-service state. The pilot will test missing readings, delayed uploads and power or network loss, and agree what families should do when monitoring is unavailable.”

**Readiness note:** These are real-deployment requirements, not a claim of a completed resilient device fleet. Gateway backup does not power every mains-powered household monitor. Do not promise uninterrupted protection.

## A10. Privacy and consent

Implemented as **Appendix A5 · Privacy** in `/final-slides` (A10 is the Q&A topic number).

**Question:** Is this surveillance, and who sees the resident's information?

**Slide title:** Privacy without an indoor camera

**On-slide copy:**

**Her daily routine stays private. Help is shared when needed.**

| Resident and authorised caregiver | Township response team |
| --- | --- |
| Water-use activity, electricity usage and outing history | An unusual event requiring follow-up |
| Personal routine insights and household activity timeline | Only the necessary incident details: home/location, concern, check-in result and response status |
| Control over participation and authorised caregiver access | No routine usage charts, outing history or continuous home/away tracking |

- No indoor camera for household activity monitoring.
- Participation is voluntary; explain permissions and provide a withdrawal route.
- Set retention and deletion periods; log and review access.

**Design principle:** Township visibility should begin when an unusual event needs its attention, with only the context needed to act. Do not expose the underlying household timeline or live meter readings. After closure, retain only an agreed, minimal incident record for accountability, under a defined retention policy.

**Short answer:**

> “Madam Lee’s daily routine is for her and her authorised caregiver. The township does not need to know when she showers, how much electricity she uses or where her outings fit into her day. When an unusual event needs follow-up, the response team receives the home location, the concern and the check-in outcome so someone can act. We share the need for help, rather than her everyday life.”

**Implementation requirement:** This is the intended access policy, not a claim that every prototype view already enforces it. Enforce permissions in the backend/API as well as the interface; hiding a chart alone is insufficient. Review township lists, maps, home/away labels, incident payloads and exports against this boundary. Service processing of sensor data still requires clear consent and security controls even when township staff cannot view it.

**Important distinction:** A body-worn camera under the proposed entry safeguard creates a separate recording and privacy issue; it does not make the ambient home-monitoring design camera-based. Define activation, access and retention for that footage. Do not claim compliance certification or say the current township UI never shows any home/away information without checking the exact view.

## A11. Commercial model

**Question:** Who pays, especially for individual-title homes?

**Slide title:** Who pays, and what does the fee cover?

**On-slide copy:**

- **Preferred proposal for participating managed developments:** buyer pays the one-off installation; ongoing service is budgeted within the agreed maintenance package.
- **One-off:** equipment, professional installation, commissioning and onboarding.
- **Recurring:** management pays TemanMu under a service contract covering connectivity, voice check-ins, platform operation, upkeep, replacement allowance and agreed response provision.
- **Approval and affordability:** confirm eligible funding, budget and management/resident approvals; existing fees may need adjustment or a subsidy. Bundling removes a separate TemanMu bill, not the underlying cost.
- **Individual-title homes without shared maintenance:** an agreed estate-service package or an opt-in household plan is needed.
- **Pilot support:** township/developer or CSR sponsorship remains a possible subsidy route.

**Suggested visual:** Two payment columns: buyer-funded installation and management-funded ongoing service. This model is presented as Appendix A1 after the main slides in `/final-slides`; it is separate from the slide 9 market-opportunity argument.

**Short answer:**

> “Our proposed model is a one-off installation paid by the buyer, with the ongoing service included in an agreed maintenance package for participating managed developments. Management would pay TemanMu through a service contract. We still need to confirm the eligible funding route, approvals and cost, so this does not promise unchanged maintenance fees. Homes without a shared arrangement would need an estate-service package or an opt-in household plan.”

**Pricing note:** RM39/month in `SDP Hack.pdf`, page 4, is an illustrative proposal, not a validated price or quotation. Do not present it as covering hardware and staffed response until the cost model supports that. A resident's income or an area-average household income does not establish willingness to pay.

**Simple viability check:** enrolled homes × monthly fee, less connectivity, platform/support, maintenance allowance and response costs. Model installation separately or explicitly amortise it. Test uptake, renewal and workload; do not assume existing patrol teams supply free capacity.

**Funding check:** distinguish TemanMu's contract price from the way a managing body may collect charges. Do not assume a per-enrolled-home service cost can automatically be passed on as an identical statutory per-unit maintenance charge. Obtain qualified review of the funding route, cost allocation and approvals. Official context: [Seremban City Council's management-body guidance](https://www.mbs.gov.my/en/citizens/services/municipality-services/joint-management-body) and [MBIP's strata-management guidance](https://mbip.gov.my/en/perkhidmatan/strata-management). Neither establishes that TemanMu is automatically an eligible maintenance expense.

## A12. Proof and next steps

**Question:** What have you built, and what would you validate in a real pilot?

**Slide title:** What is proven, and what comes next?

**On-slide copy:**

| Current evidence | Pilot work |
| --- | --- |
| Prototype detection and incident workflow, caregiver interface and township dashboard. | Real hardware ingestion, authenticated device/household mapping and field reliability. |
| Simulated household events and resident calls. | Live voice delivery and accessible confirmation. |
| Learned timing limits from simulated history. | Real-home baselines, cold start and prospective evaluation. |
| Separate landed township UI illustration. | Connected landed incident handling and agreed response coverage. |

**Short answer:**

> “We can demonstrate the software journey from household events to an accepted check and recorded outcome. Inputs and phone calls are simulated, and the landed map is a separate UI illustration. Next, we propose a small supervised pilot to connect actual meters, test call delivery and assess whether residents, caregivers and responders can use the service reliably.”

**Proposed pilot measures:**

- Data completeness, event capture, delivery delay and fault visibility.
- Nuisance alerts per home over time and missed labelled scenarios, with clear definitions.
- Verification success, alert acknowledgement, attendance and recorded closure as separate stages.
- Resident acceptance, autonomy and caregiver experience.
- Responder workload, coverage gaps, installed cost and willingness to continue paying.

Do not describe a successful scripted demonstration as proof of emergency detection, medical benefit or guaranteed response speed.

## Open decisions in the response model

These are the material items the supplied documents do not settle. They belong in the team's preparation notes; the short answers above can be used without pretending these are already resolved.

| Item | What needs deciding or confirming |
| --- | --- |
| Contracting operator | Who signs and runs the service at the pilot site: SDP entity, management body, security contractor or another operator? Who supervises cases? |
| Coverage and capacity | Which homes are covered, during what hours, by which team, with what acknowledgement/attendance target and backup when all responders are occupied? |
| Notification order | Confirm the current simultaneous family/team notification after unresolved verification, replacing the PDF's family-first dispatch dependency if retaining the prototype flow. |
| Entry policy | Approve one policy: doorstep-only or the current proposed opt-in entry model. Do not leave both as interchangeable promises. |
| Authority and access | Who can consent, how the resident's wishes are established, how consent is withdrawn, how keys/locks are managed, and what happens without authorised access? |
| Emergency escalation | Specify urgent signs, when to call 999, who calls, no-answer fallback and when not to wait through ordinary verification. |
| Safeguard availability | Can the team actually supply two responders or an active body-worn camera? Define supervision, footage access/retention and incident review. |
| Legal responsibility and insurance | Obtain qualified review of contracts, duty allocation, liability, insurance and relevant entry/privacy requirements. Neither a waiver nor an SOP establishes immunity. |
| Real phone workflow | Select the voice provider, confirmation method, language and accessible alternatives; define voicemail and unreachable-phone behaviour. |
| Payment and resourcing | Who funds installation, response staffing/time, maintenance, communications and replacement equipment? |

## Appendix A4: No app for Madam Lee

Implemented after A3 in `/final-slides`. Mentor question: **What if the elderly resident is not tech-savvy?**

- Three large crossed-out mockups: phone app, indoor CCTV and wristwatch.
- Three emphasis blocks: **No apps**, **No cameras**, **No wearables**.
- Madam Lee continues her ordinary routine; household signals support monitoring.
- She only needs to answer an ordinary phone call for a check-in. A basic mobile phone is sufficient, with the light-hearted line: “Yes, even a Nokia 3310.” A working phone and supported network coverage are required.
- The caregiver app and township dashboard are used by caregivers and operators. Proposed voice check-ins still require integration and pilot testing.

## Appendix A3: Machine learning details

Implemented after A2 in `/final-slides`. Mentor question: **How does the system learn a resident’s routine?**

| Detail | Quiet Gap Model | Outing Model |
| --- | --- | --- |
| Training examples | Water-use gaps at home; exclude gaps crossing outings, planned absences or meter outages | Completed card tap-out / return pairs |
| Inputs | Time of last water use; day of week | Departure time; day of week |
| Method | Gradient-boosting quantile regression, 95th percentile | Gradient-boosting quantile regression, median |
| Adjustment | Maximum predicted limit over the next 60 minutes, then a multiplier tuned on validation weeks | Extra minutes tuned on validation weeks |
| Bounds | 45 minutes to 9 hours | 30 minutes to 6 hours |

Both models use eight weeks of simulated Madam Lee history: six weeks for training and past-only validation, followed by two held-out test weeks. Tests compare nuisance alerts and simulated alert timing against fixed-time rules. The 95th percentile is a training target, **not 95% accuracy**.

Training exports day/time lookup tables in 15-minute slots. At demo reset, the backend reads a scene-specific limit and converts it into compressed demo seconds; it does not retrain online. Exceeding a limit feeds the existing check-in and escalation rules, rather than diagnosing an emergency. Electricity provides separate rule-based context, not a feature for these two duration models. Real-home validation remains necessary.

Implementation sources: `backend/ml/README.md`, `backend/ml/common.py`, `backend/ml/train_quiet_gap.py`, `backend/ml/train_outing.py`, and `backend/app/learned_baseline.py`. These current models supersede the earlier Isolation Forest pitch description.

## Source reconciliation

| Source statement | Treatment in this appendix |
| --- | --- |
| `SDP Hack-3.pdf`, page 3: “SDP is not selling property, not doing elderly care.” | Apparent drafting error. The user question concerns a property developer whose core business is property. Answer that intended question. |
| `SDP Hack.pdf`, pages 1–2: precise buyer ages, income tier, “huge market”, accelerated sales and assumed emotional motivations. | Do not turn demographic or area-average figures into validated buyer personas, affordability, demand or sales outcomes. Use the supported business-fit argument; obtain customer research for commercial claims. |
| `SDP Hack.pdf`, page 4: “completely shielding” SDP from liability. | Exclude. The draft does not establish that conclusion. Flag legal review and specific operating agreements. |
| `SDP Hack.pdf`, pages 3–4: doorstep-only procedure and an alternative entry procedure. | Distinguish them explicitly; use the existing demo's opt-in proposal as the working version, pending approval for a real service. |
| `SDP Hack.pdf`, pages 3 and 6: caregiver as mandatory primary dispatch gate. | Preserve the current prototype's simultaneous family and township notification after unresolved verification. |
| `SDP Hack.pdf`, pages 4–5: broad township/public-road jurisdiction and coverage assertions. | Use the stronger 2023 official evidence for an existing township unit, while confirming scope at the participating address. |
| `SDP Hack.pdf`, page 5: caps unattended time to hours. | Treat earlier awareness as a goal; do not promise a hard bound without measured sensing, verification, communications and response performance. |
| `SDP Hack.pdf`, page 6: bathroom risk ranking and water as a universally consistent indicator. | Avoid unsupported rankings and universal claims. Utility activity is indirect context, with placement, automatic-use and multiple-occupant limitations. |
| `SDP Hack.pdf`, page 2: Japanese i-Pot subscription case. | Optional comparative research for a later slide; not used as verified commercial proof for TemanMu. Independently check current first-party product/service facts before including it. |
| `SDP Hack-3.pdf`, page 6: image-only official business-positioning evidence. | Visually inspected and supplemented with the live official property announcement and sustainability page linked above. |

## Local source files

- [SDP Hack.pdf](/Users/hjkhor/Downloads/SDP%20Hack.pdf): six pages, including an image-only Auxiliary Police update within page 5.
- [SDP Hack-3.pdf](/Users/hjkhor/Downloads/SDP%20Hack-3.pdf): seven pages; pages 5–6 contain visual evidence, page 7 is blank.
- [Existing pitch planning document](pitch-structure-and-mentor-feedback-2026-11-10.md).
- [Proposed demo entry safeguards](../frontend/src/caregiver/emergency-access.ts).
- [Current detection rules](detection-rules.md).
- [Landed UI scope](landed-township-ui-demo.md).

The external company statements above were checked against official pages on 10 November 2026. Dated releases establish historical background, not an operational coverage commitment for TemanMu.
