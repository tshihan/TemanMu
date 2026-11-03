# TemanMu: Supporting Appendix

*Albert & Einstein · Universiti Malaya · Sime Darby Property Township of Tomorrow 2026*

---

## Appendix A: Prototype access and walkthrough

**Live prototype:** https://temanmu-nine.vercel.app/
**Pitch deck:** https://temanmu-nine.vercel.app/slides

| Page | Address | Who it stands for |
| --- | --- | --- |
| 3D simulator (demo only) | `/simulator` | Madam Lee's flat (Unit A-105), with clickable tap, shower, kettle, TV, lamp and door, and a lift-lobby card reader outside |
| Township dashboard | `/dashboard` | Guard Ali's view of Block A |
| Caregiver app | `/caregiver` | Her daughter Sarah's phone (installable PWA) |

All pages share one live state. Open the simulator side by side with the caregiver app or township dashboard to see each action appear in real time.

**Six one-click scenarios in the 3D simulator:**

1. **Normal Morning:** first water use of the day, and Sarah receives "Mum's day has started."
2. **Going Out:** she taps her access card out at the lift lobby, and the home goes quiet. Status becomes *Possible Away*, with no alert while she is within her usual outing time. She taps back in, and the kettle confirms she is home.
3. **Not Back Yet:** she taps out and does not come back. After her usual outing time, TemanMu calls her, and the family and guard are alerted that she is *not back yet*. The guard's steps point to searching outside.
4. **Tapped In, Home Quiet:** she taps back in but never reaches the flat. With no water or power used at home, TemanMu calls her and alerts the family and guard to check the way home.
5. **Unusual Inactivity:** no water use for longer than her usual quiet gap. TemanMu calls her, there is no answer, and the family and township guard are alerted together. The guard taps *I'll Check Now*, walks to the flat and records an outcome.
6. **False Alarm Recovery:** she is napping, answers the check-in call, and the concern resolves without anyone being sent.

> **About the 3D simulator.** The 3D simulator was created only for demo purposes and is not part of the TemanMu prototype. It shows how the sensors pick up Madam Lee's daily activities and how that information flows into our system. Each click in the simulator sends the same data a smart meter, door sensor or access-card reader would. Everything after that, including the rules, timers, alerts, township dashboard and caregiver app, is the TemanMu prototype.
>
> In a real home there is no screen and nothing for the resident to do. The sensors run quietly in the background while the resident goes about daily life as usual.

---

## Appendix B: How detection works

### B1. What each signal does

| Signal | Role |
| --- | --- |
| **Water** | Main sign of life. Silence longer than *her* usual quiet gap starts a concern. |
| **Electricity** | Tells an outing apart from inactivity. Standby after the door opens means she is probably out; usage means she is at home. Any electricity use during the check-in cancels the alert. |
| **Access card** (card homes) | Her taps at the lift lobby or gate mark an outing and a return. Card homes need no door sensor. A tap is never proof she is safe. |
| **Door** (door homes) | Where card taps aren't available, marks a possible outing, so an empty home is not mistaken for inactivity. |

**Activity** means water flow above zero, electricity above the household's standby level, or the front door opening. A meter repeating the same reading for an appliance that is still on does not count as new activity.

### B2. Status states

| Status | Enters when | Leaves when | What happens |
| --- | --- | --- | --- |
| **Routine** | Default. Also after any activity, after a caregiver confirms she is home and okay, or when an incident is closed | A rule below fires | The first activity of the day sends the family a morning reassurance |
| **Possible Away** | She taps out (card homes), or the door opens (door homes), while no water or electricity is in use | Any activity or another door event returns to Routine. Longer than her usual outing moves to Unusual Inactivity | Silent. The family can choose to call her |
| **Unusual Inactivity** | No water use for longer than her usual quiet gap, an outing ran longer than usual (*Not back yet* in card homes), or she tapped in but nothing was used at home soon after | Any activity resolves it | An incident opens, a grace period starts, and TemanMu calls the resident |
| **Unresolved Concern** | The grace period ends with no activity and no answer | Someone acknowledges and closes it, or activity resolves it | Family **and** township are notified together. Reminders repeat until someone taps *I'll Check Now* |

The prototype also raises a concern for **continuous water flow** or **sustained high electricity use** lasting far longer than expected, such as a tap left running after a fall.

### B3. Incident lifecycle

```
Detected → Grace period (resident called) → Notified (family + township) → Acknowledged → Closed with recorded outcome
                    └──────────── any activity at any step → Auto-resolved ────────────┘
```

**Recorded outcomes:** Resident OK · Assistance provided · Sent to hospital · Resident was away.

The township responder can start a 999 handoff with one tap. **TemanMu never contacts emergency services by itself; a person always decides.** A case where the resident's safety could not be verified cannot be closed by accident.

### B4. Every alert explains itself

Each status carries a plain-language reason generated by the rules engine, so caregivers and responders know *why* an alert was raised. Examples from the prototype:

- *"No water use for 4:12:05, longer than usual maximum of 4:00:00. Last door event at 08:14. Electricity at standby."*
- *"Door opened at 09:30, then no water use and electricity back to standby: probably out."*
- *"Resolved: electricity use (1.65 kW) detected during grace period."*

---

## Appendix C: System architecture

```
Smart water meter  ─┐
Electricity meter  ─┼─► IoT gateway ─► Readings API ─► FastAPI backend ─► Supabase (Postgres)
Door sensor / card ─┘   (3D simulator      │   • rules engine
                         for the demo)     │   • server-side timers
                                           └─► WebSocket ─► Township dashboard + Caregiver app
```

**Built with** established, open-source tools: React and TypeScript for the township dashboard and caregiver app (installable on any phone, no app store needed), Python FastAPI for the backend, and Supabase (Postgres) for the database. Alert timers run on the server, so alerts keep going even when every app is closed.

**Ready for real hardware.** The rules engine is pure logic: readings go in, decisions come out, with no database or network code inside it. The demo simulator sends the same reading format a real gateway would (unit, sensor, value, timestamp), so real meters can replace it without changing the backend.

**Tested.** 172 automated backend tests cover the status rules, timers, incident lifecycle, real-time updates and companion matching.

---

## Appendix D: Privacy and data protection

### D1. What TemanMu collects

| Data | Collected? |
| --- | --- |
| Household water flow, electricity use, front door open/closed | Yes |
| The resident's own access-card taps at the lift lobby or gate (card homes) | Yes. The guard sees where and when only while an alert is open; the family sees times only |
| Cameras, microphones, wearables | **No** |
| Room-by-room location or movement | **No** |

### D2. Who sees what

| Information | Caregiver | Township responder |
| --- | --- | --- |
| Daily routine, activity timeline, home/away status | ✅ | ❌ |
| Active alert for a unit | ✅ | ✅ |
| Incident record and outcome | ✅ | ✅ |

The township dashboard covers a whole block but never shows who is home, who is out, or anyone's daily routine. A home only comes forward when there is an alert.

### D3. Companion features

- **Neighbour matching** requires consent from both families. Only coarse labels are shared (for example, "both early walkers"), never exact times or unit numbers, because knowing when someone leaves home every day is a security risk. A community coordinator makes the introduction in person; the app never contacts the other family.
- **Community Buddies** are screened volunteers matched on shared interests.
- **How matching works:** neighbours are matched when their usual outing times overlap by at least 30 minutes, or both are early risers. Buddies are matched on a shared interest. The resident stays tech-free: anything that reaches her comes through a real person.

### D4. Before real deployment

- Opt-in, informed consent from residents and their families
- Role-based access control and restricted data access
- Encrypted, secure data storage and a defined retention policy
- Assessment against Malaysia's Personal Data Protection Act 2010 (PDPA)

---

## Appendix E: Pilot evaluation plan

| Measure | Method | Target |
| --- | --- | --- |
| Resident confidence living independently | Pre- and post-pilot survey | 70% report greater confidence |
| Caregiver reassurance | Pre- and post-pilot survey | 80% report greater reassurance |
| Prospective buyer perception | Survey of prospective buyers | 70% view the township more positively |
| False alert rate | Alerts sent to family and township that are closed as "Resident OK" or "Resident was away", divided by all such alerts | Below 20% |
| Response time | Time from alert to *I'll Check Now* | Median under 15 minutes |
| Missed events | Annotated test scenarios and incident review | No missed critical events |
| Sensor data reliability | Share of expected meter readings received on time | At least 95% |

These are proposed pilot targets, not results already achieved.

**Expansion rule:** TemanMu expands beyond the pilot (Phase 3, 50–100 homes) only if the safety and reliability criteria above are met.

---

## Appendix F: Cost and business model

*All figures are indicative estimates for planning, based on public retail prices of off-the-shelf devices and cloud services, converted to ringgit. Actual costs would be confirmed through supplier quotes before the pilot.*

### F1. One-time cost per home

| Item | Example | Estimated cost (RM) |
| --- | --- | --- |
| Door sensor (door homes only) | Zigbee door/window contact sensor. Not needed where township access cards are used | 40 – 70 |
| Electricity monitor | Clamp-on energy monitor at the distribution board (e.g. Shelly EM class) | 200 – 320 |
| Water monitor | Pulse-output water sub-meter with wireless reader | 300 – 600 |
| Home gateway | Zigbee/Wi-Fi hub with battery backup | 100 – 250 |
| Installation and setup | Licensed electrician and plumber visit, pairing and testing | 200 – 400 |
| **Total per home** | | **≈ RM 840 – 1,640** |

No custom hardware is needed. Every device is an existing, widely available product.

**Lower cost over time:** TNB has installed over 5 million smart electricity meters in Peninsular Malaysia and plans to cover most homes in the coming years. With a data partnership, TemanMu could read electricity use from these meters directly instead of installing a separate monitor, saving about RM 200 – 320 per home. Smart water meters could offer the same saving as they roll out.

### F2. Monthly running cost per home

| Item | Estimated cost (RM / month) |
| --- | --- |
| Connectivity (resident's home Wi-Fi, or a 4G data SIM if none) | 0 – 15 |
| Cloud hosting and database (shared across all homes) | 5 – 10 |
| Automated check-in calls | 1 – 3 |
| Maintenance and support (battery swaps, device faults) | 10 – 15 |
| **Total per home** | **≈ RM 16 – 43** |

Township response uses existing security and management staff, so TemanMu does not need a new response team.

### F3. Pilot budget (Q1–Q2 2027, 20 homes)

| Item | Estimated cost (RM) |
| --- | --- |
| Hardware and installation (20 homes) | 16,800 – 32,800 |
| Running costs (20 homes × 6 months) | 1,920 – 5,160 |
| Responder and volunteer training | 2,000 – 4,000 |
| Surveys and evaluation | 1,000 – 3,000 |
| Contingency (10%) | 2,200 – 4,500 |
| **Total pilot budget** | **≈ RM 24,000 – 49,500** |

### F4. Who pays

| Model | How it works | Best fit |
| --- | --- | --- |
| **Bundled with new homes** | Sime Darby Property includes TemanMu-ready sensors in selected new launches. The hardware cost is a very small fraction of a home's price and becomes a selling point for buyers planning for ageing parents | New township launches |
| **Family subscription** | Families of existing residents pay a monthly fee (indicatively RM 39 – 59) covering monitoring, alerts and companion features. Hardware is installed at a one-time fee or spread over the contract | Existing townships |
| **Township service** | Offered as a value-added service through township management, with the response side delivered by existing security teams | Townships with active management |

---

## Appendix G: Risks and how TemanMu handles them

*Status: ✅ handled in the current prototype · 🔜 planned before or during the pilot*

### G1. Technical risks

| Risk | What could happen | How TemanMu handles it | Status |
| --- | --- | --- | --- |
| A sensor stops sending data | A silent sensor could look like a quiet home, or hide a real concern | Each device sends a regular heartbeat. A missing heartbeat is flagged to the support team as a device fault, separate from resident alerts | 🔜 |
| Home internet goes down | Readings cannot reach TemanMu | The gateway stores readings and sends them when the connection returns. A 4G backup SIM is used for homes without reliable Wi-Fi | 🔜 |
| Power cut | Electricity reads zero and the gateway may switch off | The gateway has battery backup. Water and door signals keep working, and a building-wide outage is recognised as an outage, not resident inactivity | 🔜 |

### G2. Resident and household risks

| Risk | What could happen | How TemanMu handles it | Status |
| --- | --- | --- | --- |
| Resident travels or is in hospital | Days of silence would raise repeated alerts | The caregiver can pause monitoring with an "away" period, and it resumes automatically | 🔜 |
| Visitor or helper is in the home | Their activity could hide a problem with the resident | Known limitation: TemanMu monitors the household, not the individual. Caregivers can mark regular helpers' visits, and companion check-ins add a human touchpoint | 🔜 |
| Routine changes (illness, new habits) | Old patterns could cause false alarms or missed concerns | Usual patterns keep updating from recent activity, and caregiver feedback on each alert helps tune them | 🔜 |

### G3. Response risks

| Risk | What could happen | How TemanMu handles it | Status |
| --- | --- | --- | --- |
| Nobody responds to an alert | A concern goes unanswered | Family and township are alerted at the same time, and reminders repeat until someone taps *I'll Check Now* | ✅ |
| Responder cannot confirm she is safe | A case could be closed too early | A case where safety could not be verified cannot be closed by accident. The responder records the result, and a 999 handoff is one tap away | ✅ |
| Too many false alarms | Families and guards start ignoring alerts | Personal patterns, three-signal cross-checking and the check-in call filter most false alarms before anyone is notified. The pilot tracks the false alert rate (target below 20%) | ✅ / 🔜 |

### G4. Privacy, consent and community risks

| Risk | What could happen | How TemanMu handles it | Status |
| --- | --- | --- | --- |
| Data breach | Personal data exposed | Only the backend accesses the database. Production adds role-based access, encryption and a PDPA-aligned retention policy | ✅ / 🔜 |
| Volunteer safety | Risk to residents from unvetted volunteers | Community Buddies are screened before activation, and introductions are made by a community coordinator | 🔜 |

---

## Appendix H: References

- Institute for Public Health. *National Health and Morbidity Survey 2018: Elderly Health Factsheet.* https://iku.nih.gov.my/images/IKU/Document/REPORT/NHMS2018/FactsheetElderlyAged60yearsorMorefinal.pdf
- Institute for Public Health. *National Health and Morbidity Survey 2025: Key Findings.* https://iku.nih.gov.my/images/nhms-2025/infographic-eng.pdf
- Institute for Public Health. *National Health and Morbidity Survey 2025: Volume II.* https://iku.nih.gov.my/images/nhms-2025/nhms-2025-volume-2.pdf
- *Fall detection devices and their use with older adults: a systematic review.* https://pmc.ncbi.nlm.nih.gov/articles/PMC4087103/
- Tenaga Nasional Berhad. *Advanced Metering Infrastructure.* https://www.tnb.com.my/sustainability/esg-stories-tnb-advanced-metering-infrastructure
- Bernama. *Smart meter rollout to Peninsular Malaysia homes* (2025). https://www.bernama.com/en/news.php?id=2455042
- Device price references: SONOFF Zigbee Door/Window Sensor (https://sonoff.tech/en-us/products/sonoff-zigbee-door-window-sensor-snzb-04p), Shelly EM Gen3 (https://www.shelly.com/products/shelly-em-gen3), pulse-output water meters (https://www.ekmmetering.com/collections/water-meters)
- Microsoft Rocketbox avatar library (MIT licence). https://github.com/microsoft/Microsoft-Rocketbox

*All residents, families, volunteers and units shown in the prototype are fictional.*
