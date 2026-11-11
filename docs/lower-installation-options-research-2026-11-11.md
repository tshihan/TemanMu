# TemanMu: reducing installation work

Research date: 11 November 2026, Malaysia time.

## Current proposed pitch position: utility collaboration and an existing-smart-meter pilot

The proposed first pilot will target homes with existing smart electricity meters and **individual-unit smart water meters**. This refines the earlier electricity-first recommendation below: both sources are in scope for eligible pilot homes, while access and reporting capability remain proposed integration work. Household consent and utility/operator approval are part of the proposed arrangement. No TNB or water-operator agreement has been secured.

### Evidence supporting an approach to TNB

| Published evidence | What it supports | What it does not establish |
| --- | --- | --- |
| TNB's 20 December 2023 announcement describes collaboration with Sime Darby Property on rooftop solar, EV charging and township microgrids. | A relevant precedent for working together on township infrastructure. | A TemanMu partnership or access to resident electricity data. |
| Sime Darby Property's 26 September 2025 announcement identifies TNB subsidiary GSPARX as technical partner for the Elmina residential rooftop-solar pilot. | A more recent residential implementation relationship in the intended township context. | Meter-data sharing for elderly monitoring. |
| Trilliant announced extension of its TNB smart-meter partnership on 15 November 2023. | TNB works with an external technology company on metering and communications. | An open customer-data API or guaranteed acceptance of a new startup pilot. |
| TNB's Sustainable Procurement Code of Conduct, revision 2A dated 3 October 2024, section 13, encourages suppliers/contractors to support open innovation addressing business needs and new services. | Published encouragement of external innovation within its supplier/contractor context. | General permission to obtain or process household data. |

Sources: [TNB–Sime Darby Property announcement](https://www.tnb.com.my/assets/press_releases/ENG_20231220_68.pdf), [Elmina residential project](https://www.simedarbyproperty.com/press-releases/sime-darby-property-launches-nations-first-residential-solar-project-under-netr), [Trilliant partnership extension](https://trilliant.com/press-releases/trilliant-and-tenaga-nasional-berhad-collaborate-to-drive-accelerated-smart-meter-deployment/), [TNB supplier innovation provisions](https://www.tnb.com.my/assets/files/Sustainable_Procurement_Code_of_Conduct_ENG.pdf.pdf).

### More frequent electricity readings: a specific pilot request

It is reasonable to request a technical collaboration to assess finer-resolution records and lower delivery delay. The public 30-minute customer view does not by itself establish the fastest measurement or reporting capability of each installed meter. Conversely, the existence of smart-meter communications does not prove that changing a setting will deliver one-minute records to TemanMu.

Propose **1–5-minute timestamped measurement records as an exploratory pilot target**, asking TNB to determine the shortest supported interval, end-to-end delivery delay and integration path for the selected homes. This target is an engineering proposal, not a verified requirement for detection accuracy or an available TNB service. Measurement interval, meter-to-utility transmission and utility-to-TemanMu publication must be assessed separately. Sending a half-hour aggregate more often does not produce finer observations.

Request a consented feed for the limited pilot cohort, household/meter mapping, data-quality indicators and access to historical records for baseline evaluation. Ask whether the existing equipment supports the target without changes; do not promise zero additional equipment until this is established. With rooftop solar or batteries, also confirm that the supplied quantity represents household demand rather than only net grid exchange.

### Water pilot scope

Target locations already equipped with individual-unit smart water meters and seek an authorised feed from the water operator or metering platform. For useful activity timing, prefer a unit meter downstream of shared storage, with no further storage between it and the monitored fixtures. Individual-unit ownership alone does not establish that placement. Measurement resolution and reporting delay remain validation items; smart metering alone does not establish rapid delivery.

### Suggested spoken explanation

> Our deployment plan is to reuse existing smart electricity and individual-unit smart water meters, rather than install replacement meters in every home. We plan to engage TNB for a consent-based pilot data feed and assess whether participating meters can provide more frequent readings, targeting one-to-five-minute records where technically supported. TNB already has township collaborations with Sime Darby Property and external smart-meter technology partnerships, giving us a credible precedent for this discussion. For water, the first pilot will focus on locations already equipped with individual-unit smart meters, preferably downstream of shared storage tanks, and seek integration with the existing operator platform. The pilot will validate data availability, delivery timing and monitoring performance before expansion.

## Malaysian household infrastructure: findings added after the initial comparison

The following findings describe published Malaysian infrastructure and plumbing arrangements. They do not imply a physical inspection of a particular development. The strongest location-specific evidence here concerns TNB-served Peninsular Malaysia and Air Selangor's service area; these should not be presented as one nationwide meter configuration.

### Electricity: substantial existing smart-meter infrastructure

TNB reports **5,760,463 smart meters deployed as of March 2026**. This is a dated deployment figure, not a November 2026 count or a count exclusively of elderly households. Its customer documentation describes half-hourly energy measurement and remote reporting. This establishes an existing infrastructure base for electricity-routine analysis, but does not establish third-party access or a guaranteed data delivery delay. [TNB deployment update](https://www.tnb.com.my/sustainability/esg-stories-demand-side-management-journey), [customer smart-meter description](https://www.tnb.com.my/residential/smartmeters)

TNB's technical handbook distinguishes single-phase and three-phase domestic supplies and group metering for apartments. It states that TNB provides and maintains its import/export meters. An existing smart meter therefore need not be replaced merely to analyse its available interval records; attaching a local reader is a separate interface and authorisation question. [TNB metering guidelines](https://www.tnb.com.my/esah/metering-guidelines)

### Water: mixed infrastructure rather than universal smart-meter access

Air Selangor's 2022 report described a smart-meter pilot involving 2,393 premises. Its 2024 report records 51,514 ultrasonic smart meters with leak detection installed. These are dated programme results, not proof that every household currently has a smart water meter or that TemanMu can receive its data. The earlier impact report explicitly compares ultrasonic technology with conventional mechanical meters. [2022 report](https://content.airselangor.com/cmi-prod-blobstorageanon-001-sea/media/caga44z1/air-selangor-sr2022_full-draft_120723_lowres.pdf), [2024 report, printed page 40](https://content.airselangor.com/cmi-prod-blobstorageanon-001-sea/media/yb0kgn4o/air-selangor-sustainability-report-2024-full-compressed.pdf), [2022–2023 impact report](https://content.airselangor.com/cmi-prod-blobstorageanon-001-sea/media/4j2jpzpy/final-air-selangor_ir2023_050224_mid.pdf)

A mechanical meter's cumulative register supplies billing information; it does not by itself provide TemanMu with an electronic event stream. A communicating meter is a stronger integration candidate, but its actual interface, data permissions and reporting schedule remain distinct from its ability to measure water.

### Landed-home plumbing: storage tanks matter

The published 2014 Water Reticulation and Plumbing Rules describe a storage cistern between a meter and taps, with a kitchen draw-off exception (rule 46); rule 42 separately addresses direct kitchen supply. Rule 47 describes float-controlled tank inflow. This is evidence for a recognised plumbing arrangement, not a prevalence estimate or confirmation that every existing house follows it. [Published rules, printed pages 151–153](https://pba.com.my/pdf/legislation/pua_20140130_P.U.%20%28A%29%2036-kaedah-kaedah%20industri%20perkhidmatan%20air%20%28retikulasi%20dan%20pemasangan%20paip%29%202014.pdf)

Simplified engineering interpretation:

```text
Utility main → household meter ┬→ direct kitchen branch
                               └→ storage tank → bathrooms / other fixtures
```

The upstream meter sees direct-branch use and tank inflow. Tank-fed tap use can be delayed or spread out in that inflow signal, depending on valve behaviour and supply conditions. A faster reader cannot remove that hydraulic effect. Accordingly, no inlet flow is not sufficient evidence that no indoor water was used during that period.

### Apartments: meter position can change the conclusion

Air Selangor's August 2025 migration FAQ describes an internal distribution system containing the pump house, storage tank and pipes up to individual meters, operated by building management. This documents an important alternative arrangement: the parcel meter may be downstream of shared storage. [Official migration FAQ, page 3](https://content.airselangor.com/cmi-prod-blobstorageanon-001-sea/media/kkmps55b/120825-faq-2025-migration_english.pdf)

```text
Bulk supply → shared tanks / pumps → individual unit meter → unit fixtures
```

If there is no additional storage downstream of the individual meter, its flow can correspond more directly to unit water demand. A bulk building meter cannot identify one resident's household use. These are engineering implications of the documented layout, not a guarantee about every apartment.

### What the Malaysian evidence changes for TemanMu

The defensible existing-infrastructure strategy is **electricity-first, with water added where a usable household-level feed exists**. The published evidence does not support promising universally available, rapid electricity-and-water tracking with no new equipment. For landed homes, retain water as consumption context where tank refill obscures event timing. For apartments with downstream individual meters, water activity timing may be more useful. Neither signal identifies the person responsible for consumption.

For the pitch, state that Malaysia already has a substantial smart-electricity-meter base and an expanding, uneven smart-water-meter base. Describe the exact monitoring scope supported by those sources. Do not claim the research established the installed meter model or approved data access at a specific Sime Darby Property development.

## Recommendation

The mentor's clarified objection is the installation of new household appliances/equipment. The strongest fit is **an electricity-only routine-monitoring version using an already installed smart meter**, with an existing-phone check-in as a complementary contact channel. This preserves TemanMu's household-pattern monitoring and caregiver/township coordination, while removing the proposed water submeter, electrical-board monitor and household gateway from eligible homes.

There is an important dependency: **TemanMu does not currently have a verified authorised TNB feed.** This is the best direction for reducing installation, but it cannot yet be described as the easiest complete live deployment. If a real independent demonstration is needed before utility access is available, a compatible energy-monitoring smart plug is the simpler hardware compromise. It still adds equipment, but avoids plumbing and electrical-board work.

No route established in this research simultaneously provides zero additional equipment in every home, independence from data providers, and reliable rapid detection of a resident's emergency. Choosing the lower-installation route changes the scope and evidence of the monitoring service.

## 1. What was investigated

Question: How can TemanMu reduce household installation while reusing its existing product and software?

This is a targeted engineering research brief, not a systematic review. The investigation combined current repository inspection, official utility and manufacturer documentation, maintained integration documentation, PubMed searches, full-text examination of a directly relevant study, and a commercial service precedent. Search themes included existing smart-meter monitoring of older adults, Malaysian meter-data availability, local smart-plug integration, and passive motion/contact sensors.

Evidence distinctions used throughout:

- **Verified implementation:** behavior inspected in this repository.
- **Published capability:** a manufacturer, utility or service provider documents it; TemanMu has not tested it.
- **Research evidence:** a published study supports a specific method or feasibility finding.
- **Proposal:** a recommended design or pilot task, requiring implementation and evaluation.

No devices were purchased or tested, no utility accounts were accessed, and no partner was contacted. Existing application and slide files were left unchanged.

## 2. The actual starting point

The existing feasibility proposal recommends a current-transformer electricity monitor at the distribution board and an NB-IoT water meter. The retrofit plan also describes a communications gateway and optional outing information. They are proposals rather than commissioned equipment:

- [Hardware and IoT feasibility](hardware-iot-feasibility-2026-11-06.md)
- [Retrofit deployment plan](../TEMANMU_RETROFIT_DEPLOYMENT_PLAN.md)

The current code offers substantial workflow reuse, but changing the data source is not only a hardware substitution:

| Inspected code | Current behavior | Implication |
| --- | --- | --- |
| `backend/app/models.py`, `Sensor` and `ReadingIn` | Supports water, electricity and door values with a reading timestamp | No interval-energy or motion-event contract currently exists here |
| `backend/app/api/readings.py` | Ingests readings for the controllable demo unit | Broader real household/device ingestion requires enrollment and access checks |
| `backend/app/rules/engine.py`, `_quiet_anchor()` | Uses the latest water activity or caregiver confirmation as the quiet-period anchor | Removing water requires an electricity-specific assessment mode |
| `backend/app/rules/engine.py`, `is_activity()` | Electricity above the standby threshold is classified as activity | An ongoing load is not proof of fresh resident action |
| `backend/app/rules/engine.py`, `on_tick()` | Explanations explicitly describe lack of water use | User-facing explanations must change with monitoring mode |
| Existing caregiver/township interfaces and incident flow | Present in the prototype | Can be adapted; their existence does not establish production authentication, notification delivery or real responder availability |

The practical goal is to replace the input and assessment layer while retaining the main household, contact and incident workflow. A percentage of reusable code would require a more detailed implementation estimate; none is asserted here.

## 3. Compare the options

These effort ratings are engineering judgments, not measured installation times or supplier quotations.

| Option | Additional household equipment | Installation burden | Software change | Main dependency | Best use |
| --- | --- | --- | --- | --- | --- |
| Existing utility smart-meter data | None where a suitable meter is already installed | Lowest physical burden | Moderate: interval ingestion and routine scoring | Authorised data access and actual delay | Preferred direction if no new equipment is the priority |
| Existing smart-home/alarm sensors | None if suitable equipment already exists | Low, but integration setup remains | Vendor adapter and activity semantics | Exact device, API, permissions and coverage | Selected homes with compatible existing systems |
| Energy-monitoring smart plug | One or more plugs | Low; pair with Wi-Fi and an existing suitable appliance | Adapter, appliance-event detection and electricity-only rules | Model/firmware compatibility and home connectivity | Practical independent hardware demonstration |
| Stick-on motion/contact sensors | Sensors plus hub/coordinator, often a local host | Low physical work; pairing and placement required | New event contract and motion-based rules | Coverage, batteries and hub connectivity | Passive monitoring where small additions are acceptable |
| Existing-phone check-in | None if an appropriate phone already exists | No sensor installation; onboarding remains | Schedule, response capture and escalation | Resident participation and notification/call delivery | Immediate service-workflow pilot or complement |
| Whole-home electricity monitor only | Electricity monitor and appropriate installation | Still needs electrical-board work | Electricity-only assessment | Contractor and network | Preserves broad electricity measurement but only partly answers the mentor |

## 4. Existing smart meters: the closest fit

### Commercial precedent

Japan's **Terashite**, offered by Chubu Electric Power Miraiz Connect, uses existing smart-meter data without new monitoring equipment or household Wi-Fi. Its site says activity is reflected at least two hours later, explicitly excludes emergency/safety reporting, and describes a next-morning notification when no activity was detected in the previous day's monitored window. This establishes a commercial precedent for low-installation routine monitoring, not proof of effectiveness in TemanMu homes. [Terashite service and limitations](https://www.terashite.jp/)

### Research support and its limits

Mathunjwa and colleagues (2024) collected 15-minute utility data from 125 households, used background-consumption thresholds, and compared usage patterns with a 28-day baseline. Appliance-usage classification validation involved 10 households over 10 evaluation days, reporting 94.8% average accuracy. That figure concerns appliance-usage classification, not falls, emergency detection or individual safety. The study supports routine-analysis feasibility; its 15-minute results cannot be assumed to hold for TNB's 30-minute data. [Full paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC11175292/)

### Malaysian feasibility

TNB publicly documents half-hourly consumption analysis through myTNB. This supports investigating existing electricity data, but does not establish a TemanMu-accessible API, the delivery delay at a pilot home, or minute-level information. Direct page access was intermittently blocked during research; the official indexed description was retrievable. [TNB data analytics](https://www.tnb.com.my/smart-grid/data-analytics)

**Proposed TemanMu flow:** existing meter → authorised interval-data import/feed → household routine assessment → caregiver check → existing incident coordination if further action is needed.

For the first version, omit water as a required signal and assess morning/day/evening electricity patterns against the household's own history. Describe the result as an unusual usage pattern requiring contact. Distinguish data unavailable from low usage.

For an offline proof, use consented historical interval records if a participant can obtain them in a usable format, or a properly licensed research dataset. The current myTNB export format and export availability were not verified through an account. A research dataset demonstrates the analysis pipeline, not Malaysian live integration. Manual historical import is not a continuous monitoring service.

Before promising a live pilot, establish:

1. Which participating homes already have suitable meters and records.
2. How the account holder can authorise access and how TemanMu receives the data.
3. Measurement interval, timestamp meaning, delivery-delay distribution and outages.
4. Whether readings represent household consumption or net import/export where solar/batteries exist.
5. Whether the available data supports the proposed routine checks.

If these cannot be established, keep this as the deployment direction and use a different route for the live pilot.

## 5. Smart plug: simplest independent hardware compromise

Use an energy-monitoring smart plug with an existing, regularly used, suitable appliance. No replacement appliance is required. The physical change is inserting and configuring the plug, rather than opening a distribution board or cutting a pipe.

TP-Link Malaysia documents the Tapo P110 with energy monitoring, 2.4 GHz Wi-Fi and a maximum 13 A/2990 W rating. Select the correct local version and check the connected appliance against its supported load requirements. This is a candidate, not a procurement approval. [Malaysia P110 specification](https://www.tp-link.com/my/home-networking/smart-plug/tapo-p110/)

Home Assistant's maintained TP-Link integration lists P110 support and describes local polling every five seconds. Newer models can require TP-Link account credentials for local authentication; some firmware requires enabling third-party compatibility. This establishes a plausible integration path, not a TemanMu-tested combination. A local integration also needs a reachable local host; remote-cloud access to the home LAN must not be assumed. [Integration documentation](https://www.home-assistant.io/integrations/tplink/)

**Example proposed flow:** existing television/lamp or another suitable user-operated appliance → smart plug → local adapter → TemanMu. A kettle requires particular attention to exact load support. Observe power only; appliance switching is unnecessary for this monitoring use case.

The useful event is a new, validated usage episode, not every sample above a threshold. A refrigerator's automatic cycles or an appliance left on can continue while a resident is unwell. Conversely, not using the selected appliance does not establish inactivity. Prefer a household with a confirmed regular use pattern, then measure event coverage and false prompts before widening deployment.

Home Assistant can reduce custom device-driver work, but adds host setup and maintenance. For a one-device demonstration, a small local adapter may be simpler. Do not label either arrangement zero-installation.

## 6. Stick-on sensors and existing devices

Battery motion and contact sensors avoid plumbing and electrical-board installation, but still add equipment. For example, Zigbee2MQTT documents Aqara P1 occupancy events and Aqara door-contact events, along with model-specific configuration and connection caveats. The system requires a compatible coordinator and running software. [P1 integration](https://www.zigbee2mqtt.io/devices/RTCGQ14LM.html), [door-contact integration](https://www.zigbee2mqtt.io/devices/MCCGQ11LM.html)

A same-ecosystem alternative is a Tapo H100 hub with T100/T110 sensors. Home Assistant lists these models, but compatibility, regional radio variants and the required local host remain things to verify. Do not assume Tapo's sensor radio is Zigbee or mix coordinators indiscriminately. [Supported devices](https://www.home-assistant.io/integrations/tplink/)

For TemanMu, genuine motion events need a new activity representation. Do not send fabricated water readings to preserve the old rule. A door opening alone does not identify who passed through or prove an outing. PIR detects movement in its field of view; quiet sitting, sleep, pets and visitors require appropriate interpretation. Existing in-home sensors can be reused where access and coverage permit, but township gate records alone cannot observe activity inside a landed home.

This is a useful fallback if the mentor accepts a small removable kit. It is less aligned with a strict requirement for no new household equipment.

## 7. Existing-phone check-in

The least hardware-dependent service prototype uses an existing phone: an agreed check-in time, a response deadline, a reminder, and a caregiver contact task for a missed response. Existing TemanMu household and incident screens can support the workflow, with added response capture and scheduling.

This is a design recommendation rather than a field-validated intervention. A manual call pilot can start without building automated telephony; an automated version requires actual delivery and response integration. A phone must be accessible and suitable for the resident. A scheduled response introduces daily effort and does not preserve fully passive monitoring.

Avoid treating a delivered message, device online status or an unanswered call as evidence of a person's condition. A missed response should prompt human contact. The current prototype's simulated voice-call events do not establish a live calling service.

## 8. Focused software changes for the preferred route

Keep the existing simulator as a demonstration environment and add a separately configured electricity-routine mode.

1. **Add interval ingestion.** Store household identity, interval start/end, energy in kWh, source, quality and receipt time. Authenticate the feed and scope it to enrolled households. Make import idempotent and preserve measurement times.
2. **Add an electricity-routine assessment.** Compare completed, sufficiently covered windows with valid household history. An initial 14–28-day history is a pilot design choice, not an established minimum. Separate weekday/weekend and absence context where data permits. Start with explainable comparisons before adding a model.
3. **Adapt explanations and status.** Show the last completed measurement window and data age. Replace water-specific wording with the actual electricity observation. Remove unavailable channels from the pilot's activity claims.
4. **Reuse contact and case handling.** A current unusual-pattern assessment can create a contact task; a caregiver records the outcome. Historical imports must not replay old urgent alerts. Household electricity activity must not automatically close a case requiring human follow-up.

Do not feed interval energy straight into the current instantaneous power field. For example, 0.1 kWh over 30 minutes equals 0.2 kW average power over that interval; it does not reveal when activity occurred inside it. Polling a provider more frequently cannot recover missing measurement resolution or remove publication delay.

For a smart-plug variant, instantaneous watts can be converted to kW for display, but the assessment still needs a selected-appliance meaning and usage-event handling. The water-based quiet timer remains inappropriate until deliberately adapted.

## 9. What to demonstrate first

The smallest honest next demonstration is an electricity-only routine screen fed by a timestamped historical interval import, paired with a current caregiver check-in workflow. Label it retrospective analysis. Show ordinary routine, changed routine, declared absence and unavailable data. Keep a separate simulated concern scenario to demonstrate coordination.

If live sensing is a requirement, substitute one locally validated smart plug in one consenting household. This gives a real end-to-end input before committing to a rollout. Expand to 3–5 households only after the feed and assessment work; this is a proposed engineering pilot, not a sample sufficient to establish clinical effectiveness.

Measure data completeness and delay, installation/onboarding time, support effort, prompts per household-week, the recorded reason for each prompt, and whether a nominated contact actually received and acknowledged it. Ordinary-life diaries can help evaluate activity coverage. A small pilot cannot establish emergency-detection sensitivity without appropriate event data.

No installed-price estimate or delivery date is asserted. Avoided contractor work reduces one cost category, while provider integration, host maintenance and response staffing can create others.

## 10. Decision for the mentor discussion

- **If no additional household equipment is the requirement:** propose existing-meter electricity routine monitoring, subject to proving data access. Use existing-phone contact to test the service while that dependency is resolved.
- **If the objection is disruptive installation:** propose a smart-plug pilot, optionally supplemented later by removable sensors. Be explicit that this narrows monitoring coverage.
- **If rapid passive concern detection remains essential:** do not claim the zero-install route already meets it. First measure the available feed delay and signal coverage; otherwise a suitable sensing addition may still be required.

Suggested wording:

> We can simplify TemanMu by using electricity data from smart meters that are already installed, rather than requiring a new water meter and electrical-board monitor in every home. We would begin with routine-change monitoring and caregiver follow-up, while validating authorised data access and delivery delay. If a live independent pilot is needed first, we can use an energy-monitoring plug with an existing appliance to avoid plumbing and electrical-board work.

The recommendation preserves TemanMu's purpose and much of its coordination workflow. It deliberately reduces the first deployment's sensing scope, rather than claiming the same detection capability with less evidence.
