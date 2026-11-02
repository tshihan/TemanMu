# TemanMu Product Context

**Purpose:** Foundational context for MiroFish simulations of stakeholder acceptance, market adoption, business models and commercial viability.

**Framing:** Treat TemanMu as a complete intended product and operating service. Explore how residents, families, township decision-makers and delivery partners would respond if the service described here were available. Do not limit the market simulation to the present prototype.

**Source review date:** 2 November 2026, Malaysia time.

## Reading and simulation assumptions

Sections A–I describe the **Target Product Scenario**: a complete TemanMu service, informed by the repository's product concept, implemented workflows and development plans. Within this scenario, assume that compatible sensors, secure data processing, routine assessment, real verification calls, caregiver notifications and contracted local response arrangements have been put into operation. Their reliability, cost, acceptance and effectiveness remain variables to investigate, not assumed successes.

This framing is an analytical assumption requested for the simulation. It does not assert that every capability has already been built, deployed or validated. Proposed extensions beyond the documented product are explicitly identified. Section J separately records implementation status and source inconsistencies; Section K lists unresolved business and operational questions.

| Evidence label | Meaning |
| --- | --- |
| **Implemented** | Behavior is present in the inspected code. This alone does not establish production deployment or field performance. |
| **Demo/Simulated** | Present behavior uses fictional people/data, staged scenes, compressed time or an action without real external delivery. |
| **Planned** | Supported by project requirements or plans, with implementation or operational work still required. |
| **Proposed Business Hypothesis** | A commercial model, stakeholder response or operating assumption to test, rather than an established company decision. |
| **Target Product Scenario** | The full service assumed for the main market simulation, combining existing foundations and intended capabilities. |

Repository paths support the origin of product features; they do not certify the complete service assumed here. No prices, partnerships, clinical benefits, market statistics, customer demand or financial forecasts are treated as validated. No credentials, real resident information or personal contact details are included.

## A. Product overview

### A1. What TemanMu is

TemanMu is a township-based elderly support service that helps older residents live independently while keeping family caregivers connected to their everyday wellbeing. It combines passive household activity monitoring, a verification-and-response workflow and community companionship.

Its operating principle is simple: **household signals notice a change, the service checks the concern, and people provide the response.**

Water use, electricity use and front-door or compatible access events provide indirect evidence of household activity. TemanMu learns what is usual for the participating home, notices meaningful departures from that pattern, attempts to contact the resident and brings the family and township response team into a shared workflow when a concern remains unresolved.

On ordinary days, the service provides a modest reassurance update, a readable history of household activity and ways for the family to help the resident participate in activities, meet a volunteer buddy or connect with a consenting neighbour.

The resident does not need to learn a monitoring app, wear a device or accept cameras inside the home. Families use the caregiver interface; township staff use an operational dashboard; the resident continues daily life and can answer a telephone check-in.

### A2. Objectives and value proposition

The full product has five objectives:

1. Make potentially concerning changes visible sooner than they might be through occasional contact alone.
2. Distinguish routine quiet periods, outings and known absences from concerns requiring attention.
3. Give families useful context without requiring them to watch a continuous stream of activity.
4. Connect a remote concern to a named local responder and a recorded outcome.
5. Support everyday social connection as well as exceptional safety incidents.

For residents, the intended value is independence with less daily device management and access to local support. For caregivers, it is reduced uncertainty and a clearer way to arrange help. For township operators, it is a coordinated resident-support service with visible incident ownership. For developers, it is a potential addition to an age-friendly housing proposition.

These are value propositions to test. Monitoring cannot guarantee that a person is safe, and a commercially complete service still depends on the quality of its sensors, communications and people.

### A3. Intended setting

The strongest initial fit is a managed residential community with participating households, an identifiable management organization and a local response arrangement. Apartments and townships can offer a practical route to installation, resident onboarding, shared infrastructure and nearby staff.

A direct-to-family version is also plausible, but it must solve local response coverage rather than assume a township guard is available everywhere.

The repository originates from a university hackathon project for the Sime Darby Property Township of Tomorrow 2026 challenge. That context explains the township emphasis; it is not evidence of a commercial partnership or committed customer.

**Product basis:** [README.md](README.md), [temanmu-prd.md](temanmu-prd.md), [appendix.md](appendix.md), [phase2.md](phase2.md).

## B. Problem statement

### B1. A quiet home is difficult to interpret

An older adult living alone may be asleep, visiting family, out for a walk or unable to ask for help. From a distance, these situations can look identical: no answer to a call and no recent contact.

Occasional visits and family calls provide valuable human contact but leave gaps between check-ins. A concern can remain unnoticed, especially when relatives live elsewhere or the resident has a small local support network.

TemanMu adds household activity context to this uncertainty. It does not observe an injury directly. Its contribution is to identify a change worth checking and organize that check.

### B2. Detection without response is incomplete

An alert alone does not establish who will act. Family members may assume someone else is responding; management may lack sufficient context; a guard may be occupied with another duty. Even when someone accepts the task, the family may not know what happened afterward.

TemanMu therefore treats detection, contact attempts, local response and recorded resolution as parts of one service. A notification, an acknowledgement, an arrival and a confirmed outcome must remain different events.

### B3. Caregiver anxiety and availability

Caregivers often balance work, travel, other dependants and their parent's wish for independence. Some want more reassurance; others worry that continuous updates will create another obligation to monitor.

A useful service must provide enough context to guide action without creating an expectation that the family watches an app all day. It also needs an agreed fallback when a caregiver is unavailable. Whether reassurance actually reduces anxiety is an empirical question.

### B4. Privacy and technology barriers

Some residents may find cameras intrusive or struggle with charging, wearing or operating a device. Others may prefer those approaches because of the capabilities they provide. Suitability depends on the individual and the service around the technology.

TemanMu offers a different interaction model: passive whole-home signals and no resident app. It still requires informed participation, installation permissions, understandable data sharing and accessible phone verification. Family enthusiasm must not be assumed to equal resident consent.

### B5. Social connection beyond emergencies

A safety service used only when something goes wrong may have limited everyday meaning to the resident. TemanMu includes community activities and introductions so the resident can benefit from the service during ordinary life.

A match on an app does not itself produce companionship. Coordinators, willing participants, suitable activities and safeguarding are part of delivering this benefit.

**Product basis:** the problem and user stories in [temanmu-prd.md](temanmu-prd.md). The magnitude of these problems and stakeholders' willingness to pay require independent research; no market prevalence estimates are assumed here.

## C. Core features and functionalities

The features below describe the **Target Product Scenario**. Section J identifies the current software foundations and remaining work.

### C1. Smart water and electricity monitoring

TemanMu receives timestamped whole-home water and electricity measurements through compatible meters or a retrofit monitoring kit. A gateway or network-capable device sends data to the service. Where an authorized utility integration supplies suitable data, it may be an alternative source; access to such data must be negotiated rather than presumed.

Water usage provides one indication of household activity. Electricity changes add context, such as activity above the home's ordinary standby load. The service interprets combined patterns rather than treating any single measurement as proof of wellbeing.

The full service distinguishes:

- A valid zero or low-use measurement.
- A valid activity measurement.
- Missing, delayed or unreliable data.
- A device or connection fault.

Device-health monitoring and outage handling prevent a disconnected meter from being silently interpreted as a resident doing nothing. Delayed readings retain their measurement time and are not presented as fresh activity merely because they arrived recently.

Water flow and electricity power are different from consumption totals. Historical litres and kilowatt-hours require suitable cumulative measurements or integration over valid intervals. The system should not imply precise consumption from incomplete records.

**Value:** passive activity context with little daily effort from the resident. **Limit:** whole-home signals do not identify the person, room or appliance responsible.

**Source basis:** [backend/app/models.py](backend/app/models.py), [backend/app/db/readings.py](backend/app/db/readings.py), [frontend/src/home/integration/sensorGateway.ts](frontend/src/home/integration/sensorGateway.ts), [TEMANMU_RETROFIT_DEPLOYMENT_PLAN.md](TEMANMU_RETROFIT_DEPLOYMENT_PLAN.md).

### C2. Front-door monitoring and access-card context

A front-door sensor records opening and closing events. A door opening followed by a quiet household can suggest that the resident may be out. Subsequent household activity provides additional context, and an absence lasting longer than expected can prompt a check.

Where compatible township access systems are available, separate entry and exit records can strengthen outing context. Access-card information is an additional data source, not a renamed door reading. Its usefulness depends on permissions, direction information, card ownership and the location of the access point.

A door event or card swipe cannot establish who is inside the home. Shared cards, missed swipes, visitors, helpers and multiple occupants remain important limitations. The service uses language such as “possibly away” or “likely away” rather than presenting these events as confirmed resident location.

**Value:** fewer unnecessary checks during explainable outings and clearer context for caregivers. **Limit:** outing inference is probabilistic and cannot certify safety outside the home.

**Source basis:** [backend/app/rules/engine.py](backend/app/rules/engine.py), [phase2.md](phase2.md), [TEMANMU_RETROFIT_DEPLOYMENT_PLAN.md](TEMANMU_RETROFIT_DEPLOYMENT_PLAN.md).

### C3. Daily routine learning and explainable inactivity detection

In the complete product, TemanMu builds a personal household baseline from prior valid activity. The baseline reflects time of day, typical quiet periods, usual outings, standby electricity and changes across days. Known absences and missing-data periods are excluded from ordinary comparisons.

The service begins with an explicit insufficient-history state or a supervised starting policy. It should not claim to know a resident's routine before adequate observations exist. As habits change, the baseline can be reviewed and updated without treating every deviation as deterioration in health.

When today's pattern differs enough from the applicable baseline, the service explains the concern in ordinary language: for example, water activity has not appeared for longer than the home's usual quiet interval, with no clear outing context.

The repository's proposed personal routine model combines time-of-day baselines with an Isolation Forest candidate. In a completed deployment, a model would need evaluation against explicit rules before influencing alerts. The commercial simulation should allow different detection performance; it must not assume that machine learning is automatically superior.

**Value:** a personal reference can be more meaningful than a single fixed threshold for all residents. **Limit:** the system assesses household behavior, not a fall, diagnosis or verified individual condition.

**Source basis:** [backend/app/rules/engine.py](backend/app/rules/engine.py), [backend/app/rules/reasons.py](backend/app/rules/reasons.py), [phase2.md](phase2.md).

### C4. Continuous water and sustained high-power concerns

Quietness is not the only potentially concerning pattern. A tap left flowing or an unusually high electrical load can continue while someone needs help, or can indicate a property problem unrelated to the resident.

TemanMu therefore also assesses sustained loads. These concerns use their own explanation and response requirements. Turning off the load does not establish what happened or prove the resident is safe; a human may still need to investigate and record an outcome.

Monitoring continues to distinguish household safety concerns from resident inactivity during a declared absence or hospital stay. The resident being away does not make a leak irrelevant.

**Value:** avoids interpreting continuous consumption as unlimited reassurance and can identify a need for a household check. **Limit:** the meter cannot establish the appliance, cause or resident's condition.

**Source basis:** `_sustained_load_checks` and incident protections in [backend/app/services/monitoring.py](backend/app/services/monitoring.py), [backend/tests/test_sustained_loads.py](backend/tests/test_sustained_loads.py).

### C5. Automated phone-call verification

For a concern that remains after contextual checks, TemanMu attempts a telephone check-in with the resident before unnecessary escalation. In the target service, this is a real call with a defined answer and confirmation process, supported languages and a policy for no answer, unclear answers and failed delivery.

The service must distinguish a call being attempted, connected, answered by someone and explicitly confirmed by the intended person. A connected call alone is insufficient evidence of wellbeing. Phone accessibility, hearing difficulties, unfamiliar callers and shared phones can affect verification.

An explicit resident response or fresh household activity can change the next step, depending on the incident type and policy. A sustained-load concern, an unverified emergency or a property check may still require human handling even when activity resumes.

**Value:** provides a low-burden opportunity to explain a benign quiet period before involving others. **Limit:** non-response can mean many things, and successful contact does not replace professional assessment when needed.

**Source basis:** the verification sequence in [temanmu-prd.md](temanmu-prd.md), [backend/app/services/monitoring.py](backend/app/services/monitoring.py), [frontend/src/home/scenarios/definitions.ts](frontend/src/home/scenarios/definitions.ts). Real calling and its operating details are assumptions of the complete-product scenario, not current delivery evidence.

### C6. Caregiver notifications and remote intervention

If the concern remains unresolved, TemanMu informs the authorized caregiver and township response team with the same incident context. The caregiver can see the reason, relevant activity context, contact attempts and current ownership.

The complete service uses dependable notification delivery appropriate to the agreed service, including background mobile alerts and delivery/failure handling. Alternative channels and retries need to be selected and costed; no particular messaging provider is assumed.

Caregivers can:

- Try to contact the resident and record that a remote check-in is underway.
- Request a township welfare visit.
- Report direct contact and an explicit confirmation that no help is needed, where the workflow permits closure.
- See that a township responder has accepted the case and review the recorded outcome.

Remote caregiver actions do not claim an in-person visit. Reminders continue while a concern lacks the required response, according to the operating policy. The service needs an escalation fallback when neither party responds; its staffing and coverage belong in the service contract.

**Value:** converts uncertainty into a shared action path. **Limit:** sending or reading an alert is not evidence that assistance has arrived.

**Source basis:** [backend/app/services/notifications.py](backend/app/services/notifications.py), `caregiver_response`, `acknowledge` and reminder handling in [backend/app/services/monitoring.py](backend/app/services/monitoring.py), [frontend/src/caregiver/IncidentView.tsx](frontend/src/caregiver/IncidentView.tsx).

### C7. Township security guard escalation and human response

Township responders receive incidents they are authorized and contracted to handle. A responder accepts a task, reviews its context, follows access and escalation procedures and records what was found and what action was taken.

The product's current core response flow is acceptance, outcome, optional note and submission. Acceptance establishes responsibility; it does not prove arrival. A complete operating service must verify actual follow-through through its procedures, supervision and records. A separate arrival-tracking interface is an optional future extension, not required by the current Phase 2 plan.

When safety cannot be verified, the concern remains open for urgent follow-up. A human decides whether to contact emergency services and records the handoff. TemanMu does not autonomously call emergency services. A responder-reported call is different from confirmed dispatch, arrival or treatment.

Ordinary outcomes include resident okay, assistance provided, resident away and hospital transfer. A home check during an absence uses property-related outcomes such as home secure, known person present, resident returned or security concern. These should not be confused with a verified assessment of an absent resident.

**Value:** a local response route and accountable incident record. **Limit:** guards are not automatically clinical staff, emergency dispatchers or unlimited care capacity.

**Source basis:** [frontend/src/dashboard/IncidentPanel.tsx](frontend/src/dashboard/IncidentPanel.tsx), [backend/app/api/incidents.py](backend/app/api/incidents.py), [backend/app/services/monitoring.py](backend/app/services/monitoring.py), [phase2.md](phase2.md).

### C8. Caregiver mobile interface

The caregiver interface is a mobile-oriented web app that can be installed as a PWA. Its full-product experience builds on four existing areas:

| Area | Full-product experience | Intended value |
| --- | --- | --- |
| Home | Plain-language status, latest valid activity, connection/data-quality context, call action, response controls and monitoring-pause status. | A short actionable view instead of continuous observation. |
| Updates | Reassurance messages, concerns, reminders, caregiver/responder actions and outcomes, with unread state. | A reviewable sequence of what changed and what happened next. |
| Together | Nearby activities, buddy requests and consent-based neighbour introductions with human fulfilment. | Everyday social value and a reason to engage beyond incidents. |
| Settings | Authorized household information, responders, absence periods, preferences and understandable privacy controls. | Clear responsibility and control over participation. |

The interface should communicate uncertainty honestly. “Activity resumed,” “caregiver confirmed” and “responder recorded an outcome” mean different things. A stale screen must not appear current when the connection is lost.

The resident does not need this app. Caregivers and staff still need accessible interfaces, training and appropriate language support. English is the current implementation language; broader localization is a service-design decision rather than an established feature.

**Source basis:** [frontend/src/caregiver/CaregiverApp.tsx](frontend/src/caregiver/CaregiverApp.tsx), [frontend/src/caregiver/HomeTab.tsx](frontend/src/caregiver/HomeTab.tsx), [frontend/src/caregiver/UpdatesTab.tsx](frontend/src/caregiver/UpdatesTab.tsx), [frontend/vite.config.ts](frontend/vite.config.ts).

### C9. Township management dashboard

The dashboard gives an authorized operator an overview of participating homes, with concerns prioritized for attention. It supports finding a unit, reviewing its incident, accepting responsibility and recording an outcome. Ordinary activity should remain visually calm rather than encouraging unnecessary observation.

The full service separates household data by township and staff responsibility. Management needs oversight of unresolved cases, response ownership, capacity and operational problems. It does not need unrestricted visibility into every family's private notes or exact routine.

Operational absence and hospital context may be necessary to avoid an inappropriate check. Access to those details should be justified and limited; the product cannot simultaneously promise to hide all absence information and use it operationally on the dashboard.

**Value:** shared situational awareness and a practical incident workflow. **Limit:** a large display is not evidence that the operating team can respond to all simultaneous concerns.

**Source basis:** [frontend/src/dashboard/TownshipView.tsx](frontend/src/dashboard/TownshipView.tsx), [frontend/src/dashboard/IncidentPanel.tsx](frontend/src/dashboard/IncidentPanel.tsx), [phase2.md](phase2.md).

### C10. Away management, unexpected activity and hospital stays

Caregivers can declare that the resident will be away until an expected return time. The reason is optional and private to the caregiver; operational users receive only the information necessary to manage monitoring and response.

During an absence, ordinary inactivity checks pause. Household load/device-health concerns remain relevant. The full service sends an approaching-return reminder, supports an extension and resumes ordinary checks from the end of the absence rather than counting the entire trip as inactivity.

If activity occurs during an absence, the caregiver is asked whether the resident has returned or someone else is expected. The service does not automatically infer identity. The caregiver can end the absence, record a known visitor or request a home check.

A hospital transfer is separate care context. Expiry of a scheduled absence or new utility activity does not silently clear it. The caregiver confirms return home before ordinary resident inactivity monitoring resumes.

Existing unresolved incidents must receive an appropriate outcome; declaring an absence must not be a way to hide them.

**Value:** fewer inappropriate checks and a clearer interpretation of known changes in occupancy. **Limit:** caregiver-entered information can be outdated or mistaken, so return and follow-up policies matter.

**Source basis:** [frontend/src/caregiver/TrackingControl.tsx](frontend/src/caregiver/TrackingControl.tsx), [frontend/src/caregiver/AwayPeriods.tsx](frontend/src/caregiver/AwayPeriods.tsx), [backend/app/db/away_periods.py](backend/app/db/away_periods.py), [docs/away-periods-implementation.md](docs/away-periods-implementation.md), [phase2.md](phase2.md).

### C11. Activity history and ordinary-day reassurance

TemanMu provides a factual summary of recent household activity and an eligible daily reassurance message when activity begins. This should mean that activity has been recorded, not that a medical condition has been assessed.

The complete history experience includes 7-day and 30-day views, daily activity rows and selected-day detail. Water and electricity use appear in separate aligned charts because their units differ. Access events, away intervals, missing data and welfare-check markers explain unusual periods.

A useful summary might say: “First water activity recorded this morning; an access exit was recorded later; inactivity monitoring is paused until the expected return.” It should not state that the resident slept well, is healthy or personally performed the recorded actions.

**Value:** context for a family conversation, an incident review or a changing routine. **Limit:** more data can also feel intrusive, and precise history requires valid continuous measurements.

**Source basis:** [frontend/src/caregiver/HomeTab.tsx](frontend/src/caregiver/HomeTab.tsx), [backend/app/db/readings.py](backend/app/db/readings.py), [phase2.md](phase2.md).

### C12. Incident logging and resolution

Every concern retains its original reason, timestamps, notification/contact stages, responses, acceptance and final disposition. A later home-state change should not overwrite the explanation for opening the case.

Resolution records distinguish:

| Resolution evidence | Meaning |
| --- | --- |
| Household activity resumed | An eligible ordinary concern ended after a qualifying activity transition. Identity and personal safety are not established. |
| Resident directly confirmed | The verification process obtained an explicit response under the service's identity/confirmation policy. |
| Caregiver confirmed contact | The caregiver reports direct contact and the relevant outcome. |
| Responder recorded an outcome | A named person accepts responsibility for the factual report. Acceptance alone is insufficient. |
| Emergency handoff recorded | A human reports escalation; dispatch and arrival remain separate unless independently confirmed. |

Sustained-load, home-check and emergency-escalated incidents may require human closure even if the meter changes. Automatically resolved episodes remain in history rather than disappearing from performance analysis.

**Value:** accountability, continuity and evidence for improving the service. **Limit:** a complete record can still contain an incorrect human report, so review and dispute procedures are necessary.

**Source basis:** [backend/app/db/incidents.py](backend/app/db/incidents.py), [backend/app/models.py](backend/app/models.py), [backend/app/db/migrations/013_incident_trigger_reason.sql](backend/app/db/migrations/013_incident_trigger_reason.sql), [phase2.md](phase2.md).

### C13. Community activities, buddies and neighbour connections

The complete product includes human-delivered companionship services around the existing interface concepts:

- **Community activities:** families can help residents choose activities and join them. A complete programme connects interest to an actual invitation or arrangement and makes fulfilment clear.
- **Community Buddy:** a suitable volunteer is matched on interests, with screening, availability and coordination handled by the programme operator.
- **Same-hour neighbours:** consenting residents can be introduced when their ordinary schedules overlap. Suggestions share coarse labels rather than exact outing times or unit identifiers.
- **Human introductions:** a coordinator arranges a first meeting in an appropriate setting; the resident can decline or withdraw.

Safety monitoring and social participation need separate, understandable consent. Neighbours and volunteer buddies are not automatically emergency responders. A friendship should not create an undisclosed duty to monitor another resident.

**Value:** a wider local support network and everyday reasons to value the service. **Limit:** programme quality depends on people, not just matching algorithms, and no health or loneliness outcome is assumed.

**Source basis:** [frontend/src/caregiver/TogetherTab.tsx](frontend/src/caregiver/TogetherTab.tsx), [backend/app/services/companion.py](backend/app/services/companion.py), [backend/app/services/neighbours.py](backend/app/services/neighbours.py), [appendix.md](appendix.md).

### C14. AI-supported coordination and bounded agent roles

The complete product can combine deterministic safety policies with learned routine assessment and readable explanations. Its core value does not require unrestricted autonomous AI.

**Proposed target architecture, beyond the implemented runtime:** if MiroFish explores a multi-agent version, model bounded cooperating roles as follows. These roles are an explicit design assumption, not evidence of existing product agents.

| Bounded role | Responsibility | Boundary |
| --- | --- | --- |
| Data-quality agent/service | Check feed freshness, coverage and device health. | Missing data cannot be converted into resident inactivity or reassurance. |
| Routine-assessment agent/service | Compare activity with valid personal history and explain departures. | No diagnosis, identity proof or unsupported certainty. |
| Verification coordinator | Organize contact attempts and interpret explicit responses under a fixed policy. | A connected call is not automatically a safe resident. |
| Response coordinator | Notify authorized people, track ownership and highlight unresolved cases. | Cannot fabricate acceptance, arrival or emergency dispatch. |
| Companion coordinator | Suggest suitable activities/buddies and support a human coordinator. | Consent, screening and actual human participation are required. |

Explicit policies control escalation and case closure. Humans make emergency-service decisions and provide care. An explanation model must not invent sensor evidence, resident statements or response events.

The documented near-term AI directions are a personal routine model and a possible alert explainer. A complete multi-agent implementation is an optional simulation variant, not a confirmed development commitment or a necessary assumption for adoption.

**Source basis:** AI open item in [temanmu-prd.md](temanmu-prd.md), model evaluation requirements in [phase2.md](phase2.md), deterministic policy foundations in [backend/app/rules/engine.py](backend/app/rules/engine.py).

## D. End-to-end user journey

### D1. Enrolment and commissioning

In the full-service scenario, a resident and authorized caregiver receive a clear explanation of what is monitored, who sees it and what happens during an alert. Participation, social matching and data sharing are agreed at the appropriate level.

An installer surveys the home, confirms unit-level measurement, installs or connects suitable devices and tests connectivity. The service registers the household, caregiver, response coverage and access arrangements. Initial monitoring establishes data quality and enough history for a useful baseline, with uncertainty shown during the starting period.

A complete service also defines maintenance ownership, contact information, withdrawal, equipment removal and what happens when a resident moves.

### D2. Normal daily monitoring

Valid readings update household context. A caregiver receives a modest activity update and can review recent history. A short expected outing does not automatically become an emergency. The resident continues ordinary life without operating a monitoring app.

### D3. Concern, verification and response

```text
Valid household data + personal routine + known absence context
                              |
                 Meaningful change or load concern
                              |
                 Explain concern and verify context
                              |
               Contact resident where appropriate
                  /                           \
      Adequate resolution evidence       Concern remains / no answer
                  |                           |
       Record the right disposition     Inform caregiver + local team
                                              |
                                  Remote contact / accepted local check
                                              |
                           Human outcome or emergency handoff as needed
                                              |
                               Record resolution and review the episode
```

Data faults take a separate support path rather than masquerading as resident activity. Case-specific policies determine whether new activity is sufficient to end the concern. Declared absences change inactivity handling but do not erase open cases or property risks.

### D4. Hypothetical scenarios

All examples below are **hypothetical full-product situations**, not prototype results or real resident cases.

| Situation | Full-product journey | Stakeholder issue to explore |
| --- | --- | --- |
| Ordinary morning | Water and power activity fit the household's usual pattern; family receives a factual update. | Does the caregiver feel reassured, and does the resident accept the visibility? |
| Routine outing | Door/access context and quiet usage suggest a familiar outing. No unnecessary alarm occurs within the relevant policy. | How much inferred location information should family or staff see? |
| Longer nap | A quiet period prompts a check-in. The resident answers and explains they were sleeping; the concern receives the appropriate disposition. | Does verification feel reassuring or intrusive? How are hearing/language needs handled? |
| Possible emergency, no answer | A concerning pattern persists, the resident cannot be reached and both family and local responders receive the incident. A responder accepts and investigates. | What happens if the guard is busy, entry is difficult or family expects a faster response than contracted? |
| Visitor masks the resident's inactivity | A helper uses water/power while the resident is unwell. Household activity appears ordinary. | How do stakeholders react to an acknowledged detection limit? What supplementary human contact is expected? |
| Activity resumes during an ordinary alert | A qualifying activity returns; policy may close the ordinary concern as activity detected. | Does family want a planned visit to continue? Who decides when activity is insufficient evidence? |
| Leak during a holiday | Inactivity is paused, but sustained water flow raises a household concern. Caregiver requests a local check. | Is this a resident-support or property-service cost, and who authorizes entry? |
| Hospital return | Hospital context remains until the caregiver confirms return. Normal inactivity monitoring restarts with suitable context. | Who is responsible if return information is delayed or incorrect? |
| Device connection fails | The home shows unavailable data; support is alerted and the family is told the monitoring limitation. | Does transparency preserve trust, or does downtime make the subscription unacceptable? |
| Neighbour introduction | Two residents consent to a suggestion; a coordinator arranges a meeting without sharing exact routines. | Do both residents find the match useful, and can either withdraw without pressure? |

## E. Key stakeholders

The monitored resident, the paying customer and the responder may be different people or organizations. Payment does not automatically grant unrestricted access to the resident's information.

| Stakeholder | Responsibilities | Incentives and potential benefits | Concerns and possible resistance |
| --- | --- | --- | --- |
| Elderly resident | Decide whether to participate; express sharing/contact preferences; provide understandable confirmation where able. | Independence, less device management, nearby support and social connection. | Being watched through inferred routines, unwanted visits, nuisance calls, family pressure and difficulty withdrawing. |
| Adult child / family caregiver | Maintain relevant absence/contact information, respond when available, report contact honestly and coordinate help. | Reassurance, clearer context and a local response route when distant. | Subscription cost, missed alerts, alarm fatigue, false reassurance and pressure to be constantly available. |
| Township developer | Potentially fund infrastructure, choose a service offering and arrange handover. | An age-friendly proposition and possible buyer/resident appeal. | Procurement, reputation, unproven buyer value and recurring obligations after property sales. |
| Township management / owners' body | Manage budgets, access policies, service oversight, contractor responsibilities and resident complaints. | Coordinated welfare checks and consistent incident records. | Liability allocation, consent disputes, cross-subsidy, support burden and expectations exceeding the contract. |
| Security company and guards | Accept authorized checks, follow access/escalation procedures and record factual outcomes. | Clearer tasks, shared context and accountable handover. | Extra workload, limited training, competing duties, unsafe entry, blame for delay and unpaid expansion of role. |
| Community coordinator | Arrange activities and introductions; manage consent, volunteer availability and safeguarding. | Better participation and a practical route to social support. | Unfulfilled requests, interpersonal disputes, staffing and inappropriate data sharing. |
| Volunteer buddies / neighbours | Participate voluntarily within clear boundaries. | Shared interests, connection and community contribution. | Time commitments, screening, safety, unwanted responsibility and being treated as emergency staff. |
| Hardware vendors and installers | Supply, commission, maintain and replace suitable equipment. | Repeatable installation and service work. | Site variation, network faults, calibration, warranties and costly support visits. |
| Utility/access-system partners | Where agreed, authorize suitable data feeds and integration conditions. | A potential additional resident service or integration business. | Security, permissions, reporting frequency, support responsibilities and failure attribution. |
| Connectivity, cloud and communications providers | Deliver agreed technical services. | Contract revenue and recurring usage. | Coverage, uptime, delivery failure and support boundaries. No supplier commitment is assumed. |
| TemanMu service operator | Run software, support households, manage partners/data and maintain a coherent service. | Contract/subscription revenue and long-term customer relationships. | Cost of people, reliability, acquisition, renewals, maintenance, insurance and trust. |

Emergency responders remain external professionals reached by humans when appropriate. They are not assumed to provide routine TemanMu monitoring or a confirmed system integration.

### Stakeholder conflicts for simulation

- A caregiver wants detailed routine history while the resident wants minimal sharing.
- A developer wants a compelling launch feature while management inherits ongoing costs.
- Guards prioritize security duties while families expect immediate welfare attendance.
- Non-participating residents object to a shared management fee for an optional service.
- A family wants fewer false alarms but also wants every possible emergency detected immediately.
- A coordinator values social participation while residents prefer not to be matched using routine data.
- A payer wants proof of results, but residents do not want more data collection to measure them.

These are **Proposed Business Hypotheses**, not findings from completed interviews. Simulations should allow disagreement within each stakeholder group rather than a single uniform attitude.

## F. Privacy, accessibility and competitive differentiation

### F1. Privacy approach

TemanMu's defining product choice is whole-home activity context without cameras, continuous audio, wearables or a resident monitoring app. It avoids collecting room-by-room movement as a necessary input.

This reduces some forms of intrusion but does not eliminate privacy risk. Usage times, absence dates, hospital context, home identifiers and incident notes can expose sensitive information. “Camera-free” must not be interpreted as “no personal data.”

In the complete-product scenario, participation is opt-in, access is authenticated and limited by role/household/township, and retention and withdrawal policies are understandable. Caregiver-private absence reasons remain separate from operational dates. Neighbour matching reveals coarse compatibility rather than precise schedules, with separate consent and an accessible withdrawal path.

These are operating requirements assumed for the full service; Section J records the weaker controls in the present prototype. No legal-compliance certification is claimed.

### F2. Accessibility approach

A resident can benefit without owning a smartphone, learning an app or remembering a wearable. That can reduce some adoption barriers. It shifts work toward installers, caregivers, responders and telephone interaction.

A usable service must accommodate hearing, language, cognition, vision and confidence with unfamiliar calls. Caregiver and staff interfaces also need readable status, clear actions and accessible support. “No resident app” does not mean “no onboarding” or “no technology burden anywhere in the household.”

### F3. Potential differentiation

| Characteristic | Potential reason to choose TemanMu | Tradeoff or validation need |
| --- | --- | --- |
| Passive utility monitoring | Less daily effort for residents who prefer this approach. | Lower direct visibility into individual emergencies than some other sensor approaches may provide. |
| Camera-free / wearable-free | May fit privacy and usability preferences. | Household routine inference can still be sensitive; preferences vary. |
| Personal context across signals | More meaningful interpretation of quiet periods and outings. | Improved accuracy must be measured, not assumed. |
| Family plus township response | Connects distant family concern to a nearby person. | Valuable only where reliable response capacity is actually contracted. |
| Incident ownership and outcome record | More continuity than an isolated alert. | Records must correspond to real actions and honest reports. |
| Safety plus companionship | Everyday resident value beyond rare incidents. | Requires a funded human programme and willing participants. |

No competitor audit, superiority study, exclusive agreement or proven cost advantage was established. MiroFish should allow substitution by ordinary family contact, home-care services, monitored alarms, wearables, cameras or other arrangements, based on stakeholder preferences rather than unsupported blanket claims.

**Source basis:** privacy design in [temanmu-prd.md](temanmu-prd.md), [backend/app/models.py](backend/app/models.py), [backend/app/services/neighbours.py](backend/app/services/neighbours.py), [appendix.md](appendix.md); deployment needs in [TEMANMU_RETROFIT_DEPLOYMENT_PLAN.md](TEMANMU_RETROFIT_DEPLOYMENT_PLAN.md).

## G. Technical architecture

### G1. Full-product architecture in plain language

```text
Participating home                         Township infrastructure
Water + electricity + door                 Access events, where authorized
              |                                         |
        Gateway / secure device connection              |
              +--------------------+--------------------+
                                   |
                    Feed-quality and device-health checks
                                   |
                   Personal routine + explicit safety policy
                                   |
                       Verification and incident service
                      /              |                 \
             Resident call     Caregiver interface     Township dashboard
                                      |                        |
                              Remote coordination      Local human response
                                      +-----------+------------+
                                                  |
                                     Outcome record and review

Separate consented community programme: activities, buddies and introductions
```

Sensors produce observations. Data-quality processing determines whether those observations are usable. Routine assessment and policy decide whether to seek verification. The incident service organizes contact and human response. Interfaces show appropriate information to authorized people. Records support continuity and evaluation.

The complete product includes secure device identity, reliable event delivery, appropriate scheduling, scoped access, service monitoring and recovery. These are prerequisites of the assumed operating service rather than claims about the current deployment.

### G2. Repository foundations

| Layer | Existing foundation | Role in the complete product |
| --- | --- | --- |
| Interfaces | React, TypeScript and Vite; one application with separate caregiver, township and presentation routes. | User experience and action surfaces. |
| Caregiver installation | PWA manifest/service-worker configuration. | Home-screen access; background notification delivery needs its own implemented service. |
| Demonstration environment | Three.js, React Three Fiber and Drei. | Training, testing and explaining scenarios; not a sensor of resident movements. |
| Backend | Python FastAPI, Pydantic validation and explicit service modules. | Event ingestion, action validation and workflow orchestration. |
| Decision logic | Pure deterministic rules and explanation text. | A transparent policy baseline and safety constraints around learned assessment. |
| Persistence | PostgreSQL, documented through Supabase; migrations and data-access functions. | Readings, profiles, incidents/events, notifications, absences and community records. |
| Realtime | REST plus WebSocket snapshots/events. | Connected user interfaces; external alert delivery is a separate concern. |
| Learning | Personal routine-model plan. | Evaluated anomaly assessment, without assuming that AI improves every outcome. |

**Sources:** [frontend/package.json](frontend/package.json), [backend/requirements.txt](backend/requirements.txt), [backend/app/main.py](backend/app/main.py), [backend/app/rules/engine.py](backend/app/rules/engine.py), [backend/app/realtime](backend/app/realtime), [backend/app/db](backend/app/db), [phase2.md](phase2.md).

### G3. Installation and external integrations

The proposed retrofit route uses a whole-home electricity monitor, a suitable water submeter or compatible reader and a connected gateway. Access integration or caregiver absences provide outing context where available. Final equipment selection depends on the home and local installation requirements.

The full service needs agreement on measurement resolution, reporting frequency, local buffering, power/network failures, support ownership and replacement. Existing utility billing meters are not automatically a usable near-real-time source.

External call, mobile notification, access and utility providers remain partner categories to select and contract. Reference devices in repository materials are examples, not confirmed suppliers. No particular provider or negotiated data right is assumed in the market model.

**Source basis:** [TEMANMU_RETROFIT_DEPLOYMENT_PLAN.md](TEMANMU_RETROFIT_DEPLOYMENT_PLAN.md).

## H. Potential business models

Every model in this section is a **Proposed Business Hypothesis**. The simulation assumes a complete service is available, then asks who would buy it, why, under what conditions and at what sustainable cost. No validated price or demand is supplied.

| Model | Potential paying customer and beneficiaries | Value proposition / revenue mechanism | Operational responsibilities | Adoption barriers |
| --- | --- | --- | --- | --- |
| **B2B: township-funded service** | Developer, management company or owners' body pays; enrolled residents and families benefit. | Resident-support package, funded per enrolled home or site; installation, platform and support contracts. | TemanMu/partners deliver technology and support; township contracts response capacity, access procedures and supervision. | Procurement cycles, budget fairness, participation levels, responsibility after handover and renewal. |
| **B2B2C: township infrastructure plus family subscriptions** | Township funds common infrastructure/response; families pay for an opted-in household service. | Local coverage combined with family-facing value; platform fee plus subscription or revenue share. | Clear division of installation, billing, support, consent, alert delivery and response ownership. | Split accountability, low enrolment density, disputes over what each fee covers and family expectations. |
| **B2C: family subscription** | Adult child/family pays; resident participates with consent. | Reassurance, contextual monitoring and an agreed response option; equipment sale/lease plus recurring service. | Operator must arrange installation, communications, support and local response rather than assume guard access. | Acquisition and installation costs, fragmented coverage, willingness to pay and service availability outside managed sites. |
| **Bundle with new homes** | Developer initially funds installation, with later service funding agreed separately. | Monitoring-ready homes; installation revenue and an optional continuing contract. | Commissioning and long-term handover to a service operator/management organization. | A launch benefit may not fund recurring service; future occupants can decline and hardware needs replacement. |
| **Provider-led managed service** | A care/security provider or institutional client purchases the platform; families may pay the provider. | Technology and incident coordination within a staffed service; wholesale licensing/service fees. | Provider supplies trained people and coverage; TemanMu supplies technology/support under defined boundaries. | Insurance, training, integration, data responsibilities, margins and partner dependence. |
| **Sponsored pilot / community programme** | Grant, innovation budget or sponsor funds a limited deployment. | Evaluation and implementation funding, potentially leading to another model. | Named delivery and evaluation teams, clear limits and a transition/exit plan. | Subsidies can hide true cost and weak willingness to pay; pilot interest is not subscription demand. |

### H1. Revenue does not settle cost allocation

A subscription must fund the service around the software. Relevant costs include hardware, survey/installation, connectivity, hosting, call and alert usage, support, maintenance visits, replacement, training, guard time, supervision, community coordination and appropriate governance/risk arrangements.

Using existing guards may reduce the need to recruit a separate workforce, but it does not make response capacity free. Costs can rise when several homes alert together, a device fault affects a whole block or one incident requires a prolonged visit.

Companionship can improve everyday value while adding coordinator and safeguarding costs. A model that prices only cloud usage will miss much of the actual delivery burden.

### H2. Model-dependent questions

- Does the developer pay only at installation, or fund ongoing service after sales?
- Can management charge a shared fee when only some households want to participate?
- Will families pay for monitoring without an attendance commitment?
- Is companionship included, optional or delivered by a separate programme?
- Who pays for false-alarm visits, connectivity failures and equipment replacement?
- Who owns the customer relationship when township and family both pay?

The repository contains indicative commercial estimates, but they are not used here as validated prices or financial inputs. MiroFish may test explicitly supplied pricing scenarios; it should not invent observed willingness to pay.

**Source basis:** commercial concepts in [README.md](README.md) and [appendix.md](appendix.md); delivery dependencies in [TEMANMU_RETROFIT_DEPLOYMENT_PLAN.md](TEMANMU_RETROFIT_DEPLOYMENT_PLAN.md).

## I. Market adoption challenges

The following risks still matter even when TemanMu is treated as a complete product. Completion of software does not resolve social acceptance, economics or operational disagreement.

| Challenge | Why it can affect a complete service | What to test |
| --- | --- | --- |
| Elderly acceptance | A resident may value independence but reject routine sharing or family control. | Resident-led consent, preferences, withdrawal and perceived intrusiveness. |
| Caregiver trust | House-level signals are useful but uncertain; a missed concern can damage confidence. | Understanding of limits, reactions to ambiguity and trust after failures. |
| False alarms | Benign routine changes can create nuisance calls and visits. | False alerts per home over time, burden, annoyance and response deterioration. |
| Missed concerns | Visitors or continuing loads can mask a resident's problem. | Detection limits, transparent communication and acceptable supplementary contact. |
| Privacy | Absence/hospital/history data can expose sensitive circumstances even without cameras. | Minimum necessary access, acceptable sharing and breach response expectations. |
| Willingness to pay | The family, resident and township receive different value and may disagree on who pays. | Buyer authority, paid uptake, renewal and price sensitivity after real use. |
| Installation/infrastructure | Plumbing, electrical layout, unit-level metering and connectivity vary. | Site-specific costs, permissions, support visits and installation refusal. |
| Guard workload | Welfare checks compete with existing duties and can arrive in clusters. | Capacity, shift cover, compensation, training and realistic attendance commitments. |
| Emergency responsibility | A family may assume a stronger safety promise than the contract provides. | Shared understanding of monitoring, contact, visits, entry and escalation. |
| Accessibility | Phone verification and app use may not suit every resident or caregiver. | Hearing/language needs, support channels and alternative workflows. |
| Community fulfilment | Volunteers and coordinators may be scarce or unreliable. | Screening, availability, actual participation and safe withdrawal. |
| Long-term scale | More homes and sites multiply support and coordination as well as data volume. | Unit economics, tenant separation, maintenance organization and simultaneous-incident handling. |

**Observed repository constraints** are documented separately in J. **Anticipated adoption risks** above are not completed market findings. No interview cohort, paying customer base, renewal study or field adoption result was established in the reviewed sources.

A simulation should allow a complete product to be technically functional yet commercially unattractive in one segment, attractive only under township subsidy in another, or accepted by caregivers while rejected by residents.

## J. Current development status and roadmap

This section preserves factual provenance. It should not replace the full-product assumption used in the main business simulation.

### J1. Status of the inspected implementation

| Capability | Current evidence status | Full-product assumption / remaining work |
| --- | --- | --- |
| Caregiver and township interfaces | **Implemented** web/PWA configuration and incident actions. | Secure enrolled-household access, operating support and broader service readiness. |
| Reading ingestion and deterministic assessment | **Implemented** backend rules, storage, timers and explanations. | Continuous authenticated device feeds and operational monitoring. |
| Sensors and resident/responder scenes | **Demo/Simulated** 3D inputs and animations. | Installed and commissioned equipment; physical attendance by real staff. |
| Personal routine learning | **Planned**; current profiles/rhythms are seeded. | Valid historical baselines, evaluated model and controlled adaptation. |
| Product AI agents | No implemented agent runtime found. **Planned** model/possible explainer; bounded multi-agent design here is an optional proposed variant. | Do not assume autonomous agents are essential or already validated. |
| Automated verification and caregiver calls | **Demo/Simulated**; no telephone provider delivery. | Real calling with accessible confirmation and failure semantics. |
| Notifications | **Implemented** records, WebSocket updates, in-app banners and sounds. | Dependable background/external delivery, retries and delivery evidence. |
| Away/hospital management | **Implemented** substantial foundation. | Return reminders, extension handling, fuller activity prompts and remaining edge-case verification. |
| Sustained-load concerns | **Implemented** backend-only logic; absent from browser mock. | Real-device calibration and field validation. |
| Incident records | **Implemented** database paths; pre-existing uncommitted work adds original-trigger storage. | Apply current migration and verify complete persistence/close-out. |
| 7/30-day history | **Planned**; today's lanes and raw readings exist. | Valid consumption aggregation, daily rows and selected-day charts. |
| Activities, buddies, neighbours | **Implemented** deterministic matching/recording with **Demo/Simulated** participants. | Real invitations, coordinators, screened volunteers and consented fulfilment. |
| Device health, privacy and fleet operations | **Planned** deployment requirements; no production assurance established. | Heartbeats, fault handling, authenticated authorization, tenant isolation and resilient scheduling. |

The frontend defaults to a shared browser mock unless `VITE_USE_MOCK=false`. Compatible tabs share one fictional browser session; separate devices do not automatically share it. Backend-connected mode uses REST/WebSocket and PostgreSQL.

The backend currently evaluates one controllable home. Watching for new incidents is demonstration-controlled and off after reset/restart; active incident deadlines have separate restoration logic. Timers and WebSocket clients live in a single process. These are prototype boundaries, not the assumed continuous full service.

The dashboard's 24-floor, 144-unit display is largely illustrative: six seed homes appear on floor one, with one controllable home; other floors and sample alerts are frontend-generated. None of these counts represents customers or a demonstrated operating fleet.

**Evidence:** [frontend/src/api/index.ts](frontend/src/api/index.ts), [frontend/src/mocks/shared-client.ts](frontend/src/mocks/shared-client.ts), [backend/app/services/monitoring.py](backend/app/services/monitoring.py), [backend/app/timers/__init__.py](backend/app/timers/__init__.py), [frontend/src/dashboard/TownshipView.tsx](frontend/src/dashboard/TownshipView.tsx), [shared/seed.json](shared/seed.json).

### J2. Development plan and proposed rollout

The current `phase2.md` gives five P0 software work areas: access-card context, improved caregiver away management, a personal routine model, simple township incident records and 7/30-day activity history. P0 means priority; it does not certify completion or a delivery date.

The pitch separately describes a **proposed**, conditional field rollout: 10–20 homes in Q1 2027, validation in Q2, 50–100 homes in Q3 if criteria are met, a community programme in Q4 and a repeatable multi-township package from 2028. The appendix separately budgets a 20-home pilot over Q1–Q2 2027. No committed site, funding, participants or partner agreement was established.

The field rollout's “Phase 2” means validation, while `phase2.md` describes software features. These are different planning labels.

Pilot measures in the repository include resident confidence, caregiver reassurance, false alerts, acknowledgement time, missed-event review and sensor reliability. They are targets, not achieved results. Acknowledgement time is not arrival time, and a target of no missed critical events is not a universal guarantee.

**Evidence:** [phase2.md](phase2.md), [frontend/src/slides/Slides.tsx](frontend/src/slides/Slides.tsx), [appendix.md](appendix.md), [TEMANMU_RETROFIT_DEPLOYMENT_PLAN.md](TEMANMU_RETROFIT_DEPLOYMENT_PLAN.md).

### J3. Important source inconsistencies and implementation gaps

| Issue | Reconciliation used in this document |
| --- | --- |
| README/landing/slides describe adaptive routine learning, but code uses seeded thresholds. | Treat learning as part of the intended complete product, not completed prototype evidence. |
| “Only sensors are simulated; everything downstream runs live” overstates current delivery. | Distinguish updating interfaces from real calls, external alerts, community fulfilment and an operating service. |
| General wording says any activity cancels an alert. | Preserve exceptions for sustained-load, home-check and emergency-escalated cases; activity is not verified personal safety. |
| Home-check outcome options exist in UI/service/SQL but not in the backend close-request schema. | Current live contract rejects `home_secure`, `known_person_home`, `resident_returned` and `security_concern`; the complete-product scenario assumes this defect is resolved. |
| Appendix says township never sees home/away information. | Current dashboard shows away/hospital context; full-product access must be deliberately scoped rather than claiming total concealment. |
| Appendix marks away/hospital support as future work. | Substantial foundations are now implemented; reminders/extensions and verification gaps remain. |
| Older PRD excludes appliance-left-on detection. | Backend now detects generic sustained water/high power, without identifying an appliance or fall; mock lacks it. |
| “Morning” reassurance implies first water/electricity use. | Current code allows first eligible activity, including door opening, without a morning-only window. Target wording should remain factual. |
| Claims say delayed readings cannot trigger false alerts. | Current code lacks demonstrated lateness/coverage handling; the full service needs explicit data-quality behavior. |
| Privacy/screening language can sound complete. | Current API lacks login/authenticated household authorization; volunteer screening and community operations are not implemented. |
| Neighbour matching and consent are simplified in descriptions. | Actual matching requires outing overlap; early waking alone is insufficient. Current withdrawal control is difficult to reach after a match. |

The pre-existing working-tree change adds `trigger_reason` and migration `013` to retain original incident explanations. Existing records may remain null rather than receive invented historical reasons. The live database was not migrated during this assessment.

### J4. Review and verification boundaries

The assessment inspected source, documentation, configuration, mock state, fixtures, migrations and existing tests at commit `d34e8c0c0837d0d14d5a051a60817261a462fc56`, including pre-existing uncommitted changes.

The existing backend suite returned **149 passed, 102 skipped**, with database tests disabled and no live database reset. A separate local request-model check confirmed the four rejected home-check outcomes. These establish local code evidence, not field performance.

No new frontend build, browser walkthrough, production inspection, hardware experiment, real call or external notification test was performed for this document. Existing application files were not modified. The current repository's engineering task split is work allocation, not a multi-agent product runtime.

## K. Open questions and unvalidated assumptions

These remain open even under the complete-product scenario.

### K1. Business viability and pricing

- Who has purchasing authority and an enduring budget: developer, management, owners' body, provider or family?
- What will each payer purchase after experiencing real incidents, nuisance calls and maintenance rather than a curated demonstration?
- What is the actual cost per household by building type, enrolment density and coverage promise?
- Can the service fund installation, replacements, support and human response at an acceptable price?
- Who funds operations after developer handover, a contractor change or a family move?
- Does companionship improve renewal enough to cover coordination and safeguarding costs?

**Evidence needed:** buyer interviews, budget/procurement mapping, installation quotations, measured service workload, paid trials and renewal behavior. Pitch estimates are starting hypotheses, not unit economics.

### K2. Resident and caregiver adoption

- Will residents choose the service independently of family pressure?
- Which information do they accept sharing with family, staff or neighbours?
- Do routine updates reduce anxiety or increase compulsive checking?
- Can people accurately explain the difference between household activity and confirmed safety?
- How should multiple caregivers share responsibility and handle disagreements?
- Are phone verification, support and withdrawal accessible to residents with different needs?

**Evidence needed:** resident-led interviews, usable consent testing, caregiver research, language/accessibility studies and longitudinal feedback.

### K3. Technical and service performance

- Which concerning situations produce detectable signals, and which remain invisible?
- How much valid history is needed before personal assessment is useful?
- What happens during missing, late, contradictory or building-wide interrupted data?
- Does a candidate model improve on explicit rules on held-out data?
- Which case types may end on activity, and which require continued human follow-up?
- Can real call/notification delivery be verified separately from an application record?
- Can the platform maintain reliable scheduling, isolation and support under realistic fleet conditions?

**Evidence needed:** consented timestamped data, reproducible evaluation, annotated scenarios, controlled failures and supervised field trials. Do not infer clinical effectiveness from household anomaly detection.

### K4. Operating requirements and emergency responsibility

- Does the service promise monitoring, contact attempts, staffed review, a visit or some combination?
- What are the actual coverage hours and fallback when family or guards cannot act?
- Who may enter a home, under what authorization and with what safety procedures?
- How is an accepted case supervised if the responder is diverted or changes shift?
- Who distinguishes acknowledgement, arrival, contact, emergency call and confirmed dispatch?
- How are disputed outcomes, complaints and adverse events reviewed?
- Who screens volunteers and fulfils community requests?

**Evidence needed:** agreed operating procedures, capacity/shift exercises, access arrangements, service contracts and qualified review of responsibility and risk allocation. A log is not a substitute for a staffed service.

### K5. Privacy, governance and legal considerations

- Who controls each data category and for what purpose?
- Which roles need raw history, absence dates, hospital context or narrative notes?
- How are identity, household assignment and township boundaries enforced?
- What are retention, deletion, export and consent-withdrawal rules, including training data?
- How are inappropriate access, a breach, family disputes and operator changes handled?
- Can social-matching consent be withdrawn as easily after a match as before it?

**Evidence needed:** data inventory, access design, security testing, usable privacy controls and qualified legal/privacy assessment. The repository's reference to Malaysian data-protection review is not a compliance finding.

## MiroFish simulation brief

### Primary scenario

Assume TemanMu is available as the complete service described in A–I, with functioning installation, monitoring, real verification calls, notifications, incident handling and a defined local response arrangement. Do not have every stakeholder reject it simply because the development repository is currently a prototype.

Then vary reliability, false alarms, missed concerns, cost, response coverage, privacy preferences and programme quality. Functional completeness does not imply perfect performance, universal acceptance, free guard capacity or profitable economics.

### Suggested simulation dimensions

| Dimension | Conditions to vary without inventing market frequencies |
| --- | --- |
| Funding | Developer-funded, management-funded, family-funded or split funding. |
| Response arrangement | Dedicated capacity, shared guards, limited hours or a separately contracted provider. |
| Household | Alone most days, regular helper/visitors, frequent travel or changing routine. |
| Resident attitude | Welcoming, cautious with narrow sharing, opposed or willing only under specific conditions. |
| Caregiver situation | Nearby, distant, busy, multiple relatives or limited digital access. |
| Data/service reliability | Consistent delivery, intermittent faults, delayed recovery or a significant failure. |
| Alert experience | Helpful early concern, repeated false alarms, missed episode or disputed automatic resolution. |
| Commercial offer | Different service inclusions, equipment ownership, cancellation terms and explicitly supplied price scenarios. |
| Community programme | Strong coordinator/volunteer capacity, limited fulfilment or low resident interest. |
| AI design | Rules/personal-model service versus the optional bounded multi-agent variant in C14. |

### Decision events and outcomes

Useful simulation events include an installation refusal, a privacy complaint, a budget renewal, a guard diverted by another incident, an unverified phone answer, a gateway outage, a hospital return, an unwanted neighbour match and cancellation after repeated nuisance alerts.

Track adoption, trust, willingness to pay, resident autonomy, workload, retention and service reliability separately. A family can like the product but decline its price. A resident can welcome companionship but reject routine sharing. Management can support the concept while rejecting emergency-response responsibility.

Report persona reactions and commercial outcomes as **simulation findings**, not observed facts, survey results or forecasts. The purpose is to identify decisions and evidence worth testing in the real world.

## Repository evidence index

| Evidence group | Main sources |
| --- | --- |
| Product concept and historical scope | `README.md`, `temanmu-prd.md`, `appendix.md`. |
| Development and deployment intent | `phase2.md`, `docs/away-periods-implementation.md`, `TEMANMU_RETROFIT_DEPLOYMENT_PLAN.md`. |
| Rules, explanations and lifecycle | `backend/app/rules/`, `backend/app/services/monitoring.py`, `backend/app/settings.py`. |
| Contracts and persistence | `backend/app/models.py`, `backend/app/api/`, `backend/app/db/`, migrations through `013`. |
| Notifications and scheduling | `backend/app/services/notifications.py`, `backend/app/services/snapshot.py`, `backend/app/realtime/`, `backend/app/timers/`. |
| User-facing workflows | `frontend/src/caregiver/`, `frontend/src/dashboard/`, `frontend/src/api/`, `frontend/src/App.tsx`. |
| Demonstration and fictional data | `frontend/src/home/`, `frontend/src/mocks/`, `shared/seed.json`. |
| Companion logic | `backend/app/services/companion.py`, `backend/app/services/neighbours.py`, `frontend/src/caregiver/TogetherTab.tsx`. |
| Build, hosting and pitch | `frontend/package.json`, `backend/requirements.txt`, `frontend/vite.config.ts`, `frontend/vercel.json`, `frontend/PWA.md`, `frontend/src/landing/`, `frontend/src/slides/`. |
| Existing verification | `backend/tests/`, `backend/tests/conftest.py`, frontend home/scenario test files. Execution boundaries are stated in J4. |

The parent workspace also contains a separate `temanmu-ending/` video project and a slide PDF. They are presentation assets; the web-product implementation and source plans reviewed here are in this repository.
