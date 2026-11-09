# TemanMu: Hardware and IoT Feasibility

Research date: 6 November 2026, Malaysia time.

This is an engineering feasibility proposal for a Sime Darby Property pilot. Manufacturer specifications and documented deployments are identified through linked sources. Proposed combinations, polling rates, partnerships and installation arrangements have not been field-validated by TemanMu. No supplier has been engaged and no installed price has been confirmed.

## 1. Recommended direction

**The preferred proposal is a CT electricity monitor paired with an NB-IoT smart water meter, with potential TNB and Air Selangor partnerships to support deployment and minute-level data integration.**

| Component | Proposed installation | Data path |
| --- | --- | --- |
| CT electricity monitor | Correctly rated CTs and monitor at the household distribution board, installed by a registered electrical contractor | Monitor → LAN/Wi-Fi or managed gateway → TemanMu |
| NB-IoT smart water meter | Suitable residential water meter at a surveyed measurement point, installed by a plumber | Meter → mobile operator's NB-IoT network → agreed ingestion platform → TemanMu |

The target is **timestamped measurements at one-minute resolution, uploaded approximately every minute with a measured and agreed delivery delay**. “Minute-level” describes the proposed measurement and reporting arrangement; it is not a claim of exact event timing or guaranteed delivery within 60 seconds. Water measurement resolution, meter configuration, battery endurance and network coverage must support this target.

Explore a **Sime Darby Property–TNB–Air Selangor pilot** to coordinate installation requirements, suitable metering equipment and authorised data integration. The CT monitor can provide an independent electricity data path while utility-feed access is being investigated. Existing utility meters can be reused where their data resolution, delivery delay, reliability and measurement location meet the same requirements.

A customer-side retrofit pilot can therefore proceed alongside partnership discussions. Pulse-output water meters and LoRaWAN remain alternatives where the preferred NB-IoT arrangement is unsuitable.

For Elmina, approach Air Selangor for water. PBAPP is a potential partner for a Penang expansion. Air Selangor identifies Selangor, Kuala Lumpur and Putrajaya as its service area; PBAPP identifies its role as Penang's water supplier. [Air Selangor](https://hydrohub.airselangor.com/), [PBAPP](https://pba.com.my/)

**A smart billing meter is not automatically a suitable activity sensor.** Measurement resolution, upload frequency, delivery delay, local access, physical placement and data permissions are separate questions.

## 2. The three implementation routes

| Route | Hardware used | Installation and data access | Best fit |
| --- | --- | --- | --- |
| Existing utility smart meters | TNB-approved AMI electricity meter; water operator's approved smart water meter and communications equipment | Utility or its authorised contractor handles billing equipment. TemanMu receives an agreed data feed with household consent. | Scaling where suitable data already exists |
| Compatible reader added to an existing meter | Manufacturer-specific pulse, inductive or optical reader, plus a counter/transmitter | Verify exact meter make, model, reader interface and operator permission. A reader cannot be assumed to fit an arbitrary mechanical meter. | Minimising plumbing changes where the meter is compatible |
| Independent retrofit monitoring | CT electricity monitor; additional water submeter; counter or serial interface; gateway/backhaul | Electrical contractor installs at the distribution board. Plumber installs the water meter at the selected customer-side pipe. Integrator connects the devices. | A controlled first pilot and houses without accessible utility data |

The reader route is model-dependent: for example, B METERS documents the IWM-PL3 as compatible with specified pre-equipped meter families, including GMDM-I. It is not a universal clip-on reader. [B METERS IWM-PL3](https://www.bmeters.com/en/products/iwm-pl3/)

## 3. Electricity: hardware shortlist and installation

**Preferred electricity approach: CT monitoring at the household distribution board, targeting one-minute summaries for TemanMu.** TNB collaboration would be explored for deployment guidance and authorised integration; minute-level access through TNB's existing meter systems remains subject to agreement and validation.

### Candidate hardware

| Candidate | Published capability | Procurement decision |
| --- | --- | --- |
| Shelly Pro 3EM with matching CTs | Single- or three-phase configurations; LAN/Wi-Fi; MQTT/HTTP; instantaneous power and accumulated energy; at least 45 days of one-minute records | Useful pilot candidate; select CT ratings and enclosure conditions against the surveyed installation. The referenced version uses 120 A CTs. |
| Shelly Pro EM-50 | Single-phase, two-channel CT monitor with network interfaces | Candidate only where its 50 A measurement range fits the monitored circuit; do not specify it as a universal whole-house kit. |
| Eastron SDM120CT-MV | Single-phase CT-input DIN-rail meter with RS-485 remote reading | China-manufactured wired alternative; order the exact meter and matched CT variant, and obtain its register map. A serial gateway is required. |

Sources: [Shelly Pro 3EM](https://kb.shelly.cloud/knowledge-base/shelly-pro-3em), [Shelly Pro EM-50](https://kb.shelly.cloud/knowledge-base/shelly-pro-em-50), [Eastron SDM120CT-MV manual](https://www.eastrongroup.com/eastrongroup/2024/08/21/eastronsdm120ct-mvusermanualv1.6.pdf).

### Installation sequence

This describes the contractor's work scope rather than a DIY wiring procedure.

1. Survey the household distribution board, phase arrangement, service rating, available space, environment and solar/battery connections.
2. Select a suitable monitor, correctly matched CTs, protection and enclosure. Arrange isolation for the work.
3. Install CT sensing on the relevant customer-side conductors and the manufacturer's required voltage-reference/power connections. The monitor is additional equipment; TNB's billing meter stays in place.
4. Measure the household load at a point that represents consumption. Where solar or batteries are present, grid import/export alone must not be labelled total household consumption; the contractor may need additional measurement points.
5. Connect the monitor to the gateway/network and verify readings against known ordinary appliance changes.
6. Commission a low-load baseline and confirm that the data path preserves timestamps and identifies disconnection.

Use an Energy Commission-registered electrical contractor. The Energy Commission specifically directs consumers to registered contractors for internal house wiring work. [Energy Commission guidance](https://www.st.gov.my/i-intend-carry-out-new-wiring-modification-wiring-upgrade-rewiring-additional-wiring-my-residence)

For the first pilot, propose reading instantaneous power every 5–10 seconds locally, retaining changes and one-minute summaries. These are integration targets, not guaranteed end-to-end device performance. Keep cumulative energy as a separate quantity. A continuously running fan, refrigerator or air-conditioner must not continually restart the resident-activity clock.

## 4. Water: hardware shortlist and installation

### Preferred candidate: NB-IoT ultrasonic residential water meter

**Huizhong SCL-61H, ordered in an NB-IoT configuration**, is a specific Chinese candidate for the proposed water-monitoring route. Its manufacturer lists DN15–DN25 sizes and interface options including NB-IoT, RS-485, M-Bus and pulse output. These are ordering options, not a guarantee that every unit includes every interface. The advertised DN15 starting flow is 0.0015 m³/h, equivalent to 1.5 L/h; starting flow is not the same as guaranteed accuracy at that flow or transmitted volume resolution. [Huizhong SCL-61H](https://en.huizhong.co/project_info?id=821)

**Proposed path:** water meter → mobile operator's NB-IoT network → agreed ingestion platform → TemanMu. This device does not require a local LoRaWAN gateway.

Request Malaysian network compatibility, local provisioning, payload documentation, timestamped one-minute measurement records and approximately one-minute reporting. Confirm whether the supplied meter can meet these requirements, including its battery life at that configuration. NB-IoT is the communications technology; it does not itself establish the meter's measurement or upload interval.

Air Selangor would be approached to assess suitable equipment, installation arrangements and authorised data access. Its existing smart-water infrastructure is a potential integration route, subject to confirming the exact meter, reporting configuration and measurement location at each home.

For a wired alternative, request an explicitly supported protocol, register map, current flow rate, cumulative volume, timestamp behaviour and allowed polling rate. RS-485 is an electrical interface; it does not by itself guarantee Modbus compatibility.

### Alternative: pulse-output submeter plus wireless counter

A concrete candidate chain is:

**B METERS GMDM-I cold-water meter → IWM-PL3 pulse module → Milesight EM300-DI → compatible LoRaWAN gateway.**

The GMDM-I accepts the manufacturer's inductive reading modules. The IWM-PL3 datasheet specifies a minimum pulse weight of one litre and a polarised open-collector output. The EM300-DI manufacturer page states support for dry-contact, reed-switch and open-collector pulse types. The installer must still confirm electrical compatibility, pulse width, polarity, configuration and the exact supplied revisions before connecting them. [GMDM-I](https://www.bmeters.com/en/products/gmdm-i/), [IWM-PL3 datasheet](https://www.bmeters.com/wp-content/uploads/2023/07/v3.4_IWM-PL3_DS_EN.pdf), [EM300-DI](https://www.milesight.com/iot/product/lorawan-sensor/em300-di)

Propose a one-minute reporting trial initially. The counter's guide documents a configurable range starting at one minute; its published multi-year battery estimate uses a ten-minute interval. Battery endurance and wireless capacity must be reassessed for the pilot's faster configuration. A counter report provides interval consumption; do not assume it supplies the exact timestamp of every pulse. [EM300-DI user guide](https://resource.milesight.com/milesight/iot/document/em300-di-user-guide-en.pdf)

**Resolution limit:** with one litre per pulse, a short 200 mL use might produce no new pulse. Faster uploads cannot recover a water event the pulse output did not resolve. Evaluate whether interval-level water activity is sufficient for TemanMu; use a finer-resolution output or suitable flow-rate interface if required.

Use this as an alternative to the preferred NB-IoT meter. Do not purchase both complete meter assemblies for each house unless the pilot deliberately compares them.

### Installation sequence

1. Survey pipe diameter, pressure, existing meter, storage tanks, pumps, supply branches and access for maintenance.
2. Select a locally acceptable potable-water meter of the right size and hydraulic characteristics. DN15/DN20 are candidate sizes to assess, not a sizing decision for all houses.
3. Arrange a short water shutdown. A plumber inserts the additional meter into the selected customer-side pipe, with the required fittings, service access and manufacturer-specified installation arrangement.
4. Preserve the utility billing meter and its seals. Any change to utility-owned equipment or a reader attached to it requires the operator's agreement.
5. Mount the transmitter and protect its cable and connections against the actual outdoor/wet environment. Verify the complete assembly, not just the meter body's ingress rating.
6. Test measured volumes and small uses, then check the data at the TemanMu server.

## 5. Placement: the storage-tank issue

This is an engineering implication of plumbing layout, rather than a verified claim about every Elmina house.

If a house has a storage tank, an upstream meter observes water entering the tank. Float-valve refill behaviour can delay or spread out the relationship between tap use and measured incoming water.

```text
Utility main → billing meter → storage tank → proposed activity meter → indoor fixtures
                                             ↑
                                  Measures tank-fed household draw
```

That example only covers the fixtures downstream of the activity meter. If the kitchen receives direct mains water while bathrooms use tank water, one meter on the tank outlet misses kitchen use. A shared outlet feeding several homes cannot identify the participating household.

The survey must therefore identify all relevant indoor supply branches. Choose one measurement point covering the intended household use, or multiple points where necessary. Separate garden irrigation or other automatic consumption where practical. Record the resulting coverage explicitly so the algorithm does not infer a resident's inactivity from an unmonitored branch.

This can make internal retrofit sensing more useful for activity timing than the utility billing meter, even when that billing meter is already smart.

## 6. Connectivity and the gateway

| Arrangement | Specific hardware example | Data path and qualification |
| --- | --- | --- |
| Wireless pulse meters around a township | Milesight EM300-DI devices and UG65 gateway | Pulse counter → LoRaWAN → gateway/network server → MQTT(S)/HTTP(S). Survey actual coverage and size the gateway deployment against airtime and reporting load. |
| Wired serial meters in an individual home | Teltonika RUT956 | Compatible RS-485/Modbus meter → router → secure server connection over Ethernet/cellular. Obtain matching protocol configuration first. |
| Network electricity monitor | Shelly monitor plus home network or managed router | Meter → LAN/Wi-Fi → TemanMu integration service. This route does not pass through a LoRaWAN gateway. |
| Integrated cellular water meter | NB-IoT version of the selected water meter | Meter → mobile operator network → agreed ingestion platform. A local LoRaWAN gateway is unnecessary for this device. |

The UG65 guide documents Ethernet, Wi-Fi and cellular backhaul options and MQTT(S)/HTTP(S) integration. Cellular hardware depends on the ordered variant. The RUT956 provides RS-485, Modbus and server-upload functions. [UG65 user guide](https://resource.milesight.com/milesight/iot/document/ug65-user-guide-en.pdf), [RUT956](https://teltonika-networks.com/product/rut956/)

For an apartment block, survey common meter rooms and available shared backhaul. For landed houses, survey outdoor meter positions, distance to Wi-Fi and street-by-street wireless propagation. Do not assume one gateway covers all of Elmina.

Use Malaysia-suitable radio variants and confirm local acceptance through the supplier/installer; a China-market CN470 or Europe-market EU868 SKU is not an automatic procurement match. A potential telecom partner would need to validate NB-IoT/LTE service, meter-location coverage, SIM provisioning, tariffs and platform access for the selected device.

Add a suitable backup power supply where continuity is required, and define device-health reporting. Gateway backup power does not keep a mains-powered electricity monitor alive during a household power outage.

## 7. What to request from TNB

TNB documents AMI meters and half-hourly consumption analysis through myTNB. Its public description does not establish a TemanMu-accessible, seconds-level data feed. [TNB data analytics](https://www.tnb.com.my/smart-grid/data-analytics)

Propose a consented **Sime Darby Property–TNB pilot** and request:

- Inventory of participating meters and the available approved data interfaces.
- Measurement interval, publication schedule and measured delivery delays, including outage behaviour.
- Feasibility of timestamped one-minute electricity records and approximately one-minute delivery updates, either through an agreed utility interface or an independent CT-monitor integration.
- An authorised API/event feed, or a formally supported local interface if available.
- Account-to-household mapping, access scope, retention and withdrawal arrangements.
- Power-interruption/restoration indicators and the distinction between no electricity use and missing communications.

If participating homes need new billing meters, TNB selects and arranges the approved replacement. TemanMu should not specify an unverified meter brand as TNB's installed model or attach an unauthorised optical reader.

**Decision rule:** use half-hourly data for coarse routine/history analysis where suitable. Retain the independent monitor if short appliance events and faster activity context are required and the utility feed cannot provide them. A special collaboration might enable more useful data, but that is a negotiation outcome to test.

## 8. What to request from Air Selangor, PBAPP and meter suppliers

Air Selangor already documents smart-water infrastructure. Its 2022–2023 impact report describes ultrasonic meters grouped near solar-powered data concentrators with battery backup. Cubiq Meters separately documents an Air Selangor deployment using Kamstrup ultrasonic smart meters in 2023; that supplier announcement does not identify the exact model installed at a prospective TemanMu home. [Air Selangor impact report](https://www.airselangor.com/wp-content/uploads/2024/02/FINAL-Air-Selangor_IR2023_050224_Mid.pdf), [Cubiq installation announcement](https://cubiqmeters.com/2023/03/04/we-are-proud-to-make-our-first-ultrasonic-smart-meter-installation-at-the-site-o-2/)

Ask Air Selangor and its relevant metering/integration partner to:

1. Confirm which pilot households have suitable meters and identify exact models and interfaces.
2. Assess whether utility meter location captures activity timing, especially with storage tanks.
3. Assess an authorised per-household feed targeting one-minute measurement resolution and approximately one-minute reporting, with explicit delivery latency and battery/network requirements for NB-IoT equipment.
4. Confirm whether approved reader attachments or additional customer-side meters are acceptable.
5. Provide maintenance, leak/device-fault information and installation quotations.

For Penang, PBAPP's tender listing includes a 2026 procurement for smart meters over 36 months. That supports opening a technical discussion, but it does not establish an available public activity API or existing coverage at a chosen home. [PBAPP tender listing](https://pba.com.my/pdf/tenders/tender.html)

Potential roles are distinct: the developer coordinates sites and household onboarding; the utility controls its billing assets/data; the metering supplier supplies supported interfaces; contractors install equipment; the telecom provider supplies connectivity; TemanMu integrates readings and manages the response workflow. All partnerships remain proposed.

## 9. China: implementation examples and their limits

### Shanghai: water data connected to human follow-up

Changning District's August 2025 report describes 2,358 participating elderly households. Its documented rule checks a 24-hour consumption window, with the previous day's usage uploaded at 08:00. An alarm triggers an automated family call; unsuccessful contact leads to assignment to neighbourhood staff for a visit and recorded closure. Reported thresholds are below 0.01 m³ (10 L) or above 2 m³ (2,000 L). [Changning District government](https://www.shcn.gov.cn/col7343/20250828/1297118.html)

This demonstrates a deployed meter-to-care workflow. Its daily reporting arrangement is not evidence of minute-level activity detection or medical-event detection. The article does not identify a meter model, so the hardware shortlist in this memo must not be presented as the hardware used in that programme.

### Guangzhou: NB-IoT water metering for elderly support

Guangdong's urban water-supply association reports Guangzhou Water Supply installing NB-IoT smart meters to monitor water-use anomalies for older residents living alone. The transferable architecture is a cellular meter, remote analysis and a human follow-up arrangement. Its description is not a measured latency or detection-accuracy guarantee for TemanMu. [Guangdong Urban Water Supply Association](https://www.gdwsa.com/Item/13844.aspx)

### Shanghai: an electricity retrofit in the meter box

A December 2020 Hongkou government page reports a pilot using an intelligent circuit breaker in an elderly resident's meter box, with electricity data transmitted to a platform and anomalies sent to family/community staff for verification. This is a retrofit-device example; it should not be described as direct access to the utility's billing-meter API. The cited page hosts a news report, rather than an independent performance evaluation. [Hongkou District government](https://www.shhk.gov.cn/xwzx/002006/20201222/a1e94687-043d-4a64-b446-25a65abcbcca.html)

For TemanMu, start with monitoring equipment and human-response coordination. The Chinese example's switching functions are not needed to demonstrate household activity monitoring.

## 10. Connecting hardware to the existing TemanMu software

The repository currently accepts water in L/min and electricity in kW through `POST /api/readings`. Its API also restricts ingestion to the controllable demo unit. This provides an integration starting point, not a production multi-home device interface.

Work required for a real pilot includes:

- Device identity, household mapping, authentication and controlled provisioning.
- MQTT/HTTP/serial adapters and vendor-payload decoding.
- Separate measurement time, gateway receipt time, cloud receipt time and sequence identifiers.
- Cumulative water volume, interval duration, instantaneous/average power, cumulative energy and quality flags.
- Deduplication, counter resets/rollover, buffer recovery, clock checks and device-health handling.
- Real multi-home ingestion beyond the current controllable-unit restriction.

For a pulse counter, litres consumed during a minute can be converted into an average L/min over that minute, but that must not be labelled instantaneous tap flow. Do not replay a delayed historical batch as fresh resident activity.

## 11. Proposed first pilot and purchasing checklist

Start with a small supervised group, for example 5–10 consenting households, including at least one tank-fed landed house and a representative apartment if both markets are in scope.

**Candidate package per household:**

| Item | Quantity / selection rule |
| --- | --- |
| CT electricity monitor and matched CTs | Preferred electricity route; one appropriately rated meter, with CTs according to phase arrangement and measurement points |
| NB-IoT ultrasonic water meter | Preferred water route; one per required measurement branch, with reporting settings validated against the minute-level target |
| Connectivity | LAN/Wi-Fi or managed gateway for electricity; provisioned NB-IoT service and agreed ingestion access for the water meter |
| Alternative pulse reading hardware | GMDM-I with IWM-PL3 plus EM300-DI if the NB-IoT water route is unsuitable |
| Alternative shared LoRaWAN gateway | UG65 or equivalent only where the pulse-counter route is used; quantity determined by survey/load testing |
| Installation materials | Enclosure, protection, cables, pipe fittings, mounts and suitable power supplies |
| Backup and maintenance | Appropriate backup power, battery/service plan and replacement ownership |

Before activating welfare alerts, verify ordinary short tap uses, toilet/shower use, tank refilling, automatic irrigation, appliance changes, continuous background loads, normal outings, disconnected devices, internet loss and delayed uploads. Measure the missed small uses and arrival delay for each configuration; do not infer reliable emergency detection from successful data transmission.

Ask suppliers for itemised hardware, labour, plumbing modifications, network/gateway allocation, SIM/data, backend/network-server fees, commissioning and maintenance quotations. An online device price is not an installed per-home cost. The existing concept budget should not be reused as a validated quotation.

## 12. Appendix slide suggestion

**Question:** How can TemanMu obtain minute-level household activity data in real homes?

**Answer:** We propose a CT electricity monitor at the household distribution board and an NB-IoT smart water meter at a suitable household water-supply point. Through potential partnerships with TNB and Air Selangor, we aim to coordinate installation and authorised data integration, targeting timestamped one-minute measurements and approximately one-minute reporting. The pilot would validate device capability, measurement coverage and delivery delay before these are presented as service commitments.

**Title:** CT electricity + NB-IoT water monitoring

**Left:** two hardware illustrations: a CT electricity monitor at the distribution board and an NB-IoT water meter on the surveyed household pipe.

**Centre:** two separate data paths converging on TemanMu: electricity through LAN/Wi-Fi or a managed gateway; water through the mobile operator's NB-IoT network and agreed ingestion platform.

**Partnership strip:** “Potential deployment and data-integration partners: TNB + Air Selangor.” Label the mobile operator separately as the NB-IoT connectivity provider.

**Right:** TemanMu → resident verification → family and authorised township responder → recorded outcome.

**Bottom strip:** “Target: one-minute measurements and approximately one-minute reporting.”

**Footnote:** “Proposed configuration and partnerships. Reporting performance depends on the selected devices, battery configuration, network and agreed interfaces; to be validated in the pilot.”
