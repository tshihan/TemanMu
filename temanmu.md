# TemanMu

Project: Sime Darby Property Hackathon (https://app.notion.com/p/Sime-Darby-Property-Hackathon-3f5f74b614fc8167b3d5e2217dbbbdb5?pvs=21)

# TemanMu

### An Intelligent, Privacy-First Elderly Safety & Community Wellbeing Platform

**Tagline:** *Less Surveillance. More Assurance. Stronger Communities.*

**Hackathon:** Sime Darby Property — Township of Tomorrow 2026

**Challenge Theme:** PEOPLE — Safety & Security, Community Wellbeing, Digital Living

**Primary Objective:** Elderly Safety & Early Risk Identification

**Secondary Objective:** Family Reassurance & Community Engagement

**Target Users:** Elderly residents living independently, particularly those living alone, their families, and residential township management teams.

**Core Technology:** Smart Water Meter + Smart Electricity Meter + Door Contact Sensor + Adaptive Behavioural Analysis

**Proposed Innovation:** Infrastructure-Based, Privacy-Preserving Elderly Safety Monitoring

---

# Executive Summary

**TemanMu** is a privacy-first elderly safety and community wellbeing platform designed to support independent ageing within smart residential townships.

The name combines *Teman* (companion in Malay) and *Mu* (you/your), reflecting the platform's purpose of providing companionship, reassurance and safety support.

Unlike monitoring systems that rely on indoor cameras, motion detectors or wearable devices, TemanMu proposes an **infrastructure-based monitoring approach** that primarily utilises household water and electricity consumption data, supplemented by a simple door contact sensor.

Rather than continuously tracking residents' movements inside their homes, TemanMu analyses changes in everyday utility consumption patterns to identify possible deviations from their usual routines.

For example, an unexpected absence of water usage, combined with unusual electricity consumption patterns and no recorded door activity, may indicate a situation requiring further attention.

By integrating these signals with personalised behavioural baselines, the platform aims to distinguish routine household variations from potential safety concerns.

When an unusual pattern is detected, TemanMu initiates a structured welfare response, beginning with a technology-free resident confirmation (passive activity detection and an automated voice call) and, if there is no confirmation, notification of the caregiver/family and an opt-in neighbour or township guard, followed by repeated reminders until someone acknowledges.

Beyond safety monitoring, TemanMu also provides daily reassurance updates for family members and encourages community participation through personalised activity invitations and an optional Community Buddy Programme.

### Three Core Modules

| Module | Objective | Key Features |
| --- | --- | --- |
| **TemanMu Safety** | Identify potential safety concerns and coordinate assistance | Smart Utility Monitoring, Door Activity Context, Personalised Anomaly Detection, Welfare Escalation |
| **TemanMu Connect** | Strengthen family reassurance and communication | Daily Peace of Mind, Passive Confirmation & Voice Call, Caregiver Notifications |
| **TemanMu Community** | Encourage social participation | Behavioural Change Awareness, Community Activity Recommendations, Community Buddy Programme |

**TemanMu is fundamentally a safety platform.** Family communication and community engagement enhance the overall resident experience but do not replace its primary safety objective.

The long-term vision is to transform existing residential infrastructure into an intelligent, privacy-conscious safety network that helps elderly residents remain independent while staying connected to their families and communities.

---

# 1. Problem Statement & Underlying Gaps

## 1.1 Malaysia's Ageing Population

Malaysia is experiencing a demographic transition towards an ageing society.

As the elderly population grows, more residential communities will need to accommodate older adults who wish to maintain independent lifestyles.

However, independent living also introduces challenges related to personal safety, timely assistance and social connectedness.

### Supporting Statistics

| Indicator | Finding | Source |
| --- | --- | --- |
| **Ageing Population** | Malaysians aged 65 and above represented **8.4% of the population** in Q2 2026, compared with 8.0% in Q2 2025. | DOSM, 2026 |
| **Older Adults Living Alone** | **6.3%** of Malaysian adults aged 60 and above were living alone in the national survey. | NHMS 2018 |
| **Fall Incidence** | **14.1%** of surveyed older adults reported at least one fall during the preceding 12 months. | NHMS 2018 |
| **Functional Limitations** | **17.0%** of older adults reported limitations in basic activities of daily living. | NHMS 2018 |
| **Social Isolation** | Approximately **1 in 4 older adults globally** experience social isolation. | WHO |

**Sources:** Department of Statistics Malaysia, *Demographic Statistics, Q2 2026*; Institute for Public Health, *NHMS 2018: Elderly Health*; World Health Organization, *Reducing Social Isolation and Loneliness Among Older People*. [Department of Statistics Malaysia](https://www.dosm.gov.my/portal-main/release-content/demographic-statistic-malaysia-q22026?utm_source=chatgpt.com)

*The NHMS figures reflect the surveyed Malaysian population in 2018 and are not current 2026 prevalence estimates. The WHO figure is a global estimate.*

### Why Does This Matter?

Many elderly individuals prefer to remain in familiar homes rather than move into assisted living facilities.

However, unexpected medical emergencies or prolonged inactivity may go unnoticed, especially when family members live separately.

At the same time, conventional safety monitoring technologies may introduce additional hardware requirements or create privacy concerns.

**Future townships need solutions that support independent ageing without requiring elderly residents to sacrifice their privacy or autonomy.**

---

## 1.2 Underlying Gaps

### Gap 1: Privacy, Intrusiveness & Infrastructure Costs of Conventional Monitoring

Many elderly safety technologies use cameras, wearable devices or dedicated indoor sensors to monitor residents.

These technologies can provide valuable safety information, but each introduces practical limitations.

**Camera-Based Monitoring**

Indoor cameras can provide detailed visual information but may create discomfort when installed in private living spaces.

Depending on the system, video processing may also require additional computational, network and storage resources.

**Wearable Monitoring**

Wearable safety devices may require residents to remember to wear, charge and maintain them.

Their effectiveness can be reduced when devices are not worn.

**Dedicated Indoor Monitoring Sensors**

Motion sensors and radar devices avoid video recording but still require installation and maintenance.

Some approaches also monitor movement or occupancy continuously, which residents may regard as intrusive.

**Underlying Gap**

There is a need for a less intrusive monitoring approach that minimises additional equipment while still providing meaningful information about changes in everyday household activity.

**Opportunity for TemanMu**

Utilise existing or compatible household water and electricity metering infrastructure, supplemented by a door contact sensor.

Instead of tracking individual movements, TemanMu would primarily examine changes in aggregated utility consumption.

This approach has research support. A 2024 study investigated the use of low-resolution electricity meter readings at 15-minute intervals to assess lifestyle regularity among independently living older adults. [PubMed Central (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11175292/?utm_source=chatgpt.com)

**Proposed Value:** Lower-intrusion monitoring with potential infrastructure reuse and reduced deployment complexity.

Cost savings remain a hypothesis to validate, because access to existing utility data may require additional integration infrastructure or agreements.

---

### Gap 2: Existing Utility Monitoring May Lack Contextual Intelligence

Smart water and electricity meters are traditionally designed for utility management.

Their primary purposes include measuring consumption, supporting billing and assisting energy or water conservation.

However, changes in utility consumption may also provide indirect information about household activity.

For example:

A prolonged absence of water consumption could mean a resident has left home, is resting or requires assistance.

Similarly, electricity consumption may continue even when nobody is home because refrigerators, routers and other appliances operate automatically.

Therefore, neither water nor electricity consumption alone can reliably determine whether an elderly resident is safe.

**Underlying Gap**

Individual utility measurements may not provide enough information to distinguish normal household variations from concerning behavioural changes.

**Opportunity for TemanMu**

Integrate three complementary sources:

**Water Usage + Electricity Usage + Door Activity**

TemanMu would compare these signals with each resident's established daily routine to identify patterns that may warrant a confirmation step.

The door sensor supplies additional context for possible departures or returns, although opening a door does not conclusively establish that someone has left or entered the home.

---

### Gap 3: Inadequate Integration Between Detection and Human Response

Identifying a potential safety concern does not guarantee that assistance will arrive.

An alert may be overlooked, a family member may be unavailable, or responsibility for follow-up may be unclear.

Some existing elderly monitoring programmes already provide automated calls, community dispatch and welfare visits.

For example, Shanghai implemented smart water meter safety monitoring for 9,113 households under its 2024 programme, demonstrating that utility-based safety monitoring can be integrated with community assistance. [Shanghai Finance Bureau](https://czj.sh.gov.cn/zys_8908/xwzx_8909/czyw/20241225/xxfbinfo0000013351.html?utm_source=chatgpt.com)

However, a similar service within Malaysian residential townships would require its own operational arrangements.

**Underlying Gap**

A practical township-level framework is needed to connect household monitoring with residents, family members and authorised welfare responders.

**Opportunity for TemanMu**

Introduce a structured response mechanism:

**Unusual Inactivity → Passive Confirmation / Voice Call → Caregiver + Neighbour/Guard Notification → Repeated Reminders → Incident Resolution**

The system would document each stage to support accountability.

---

### Gap 4: Limited Integration Between Elderly Safety and Community Wellbeing

Elderly safety and social engagement are often approached as separate service needs.

However, physical safety and social connectedness both contribute to residents' long-term wellbeing.

A resident may maintain normal household routines while gradually reducing participation in community activities.

Such changes do not necessarily indicate loneliness, but they may create an opportunity to offer voluntary social support.

**Underlying Gap**

Safety technology does not always connect elderly residents with available community activities and companionship opportunities.

**Opportunity for TemanMu**

Extend the platform beyond risk detection through family communication, optional activity recommendations and community participation programmes.

Social engagement will remain secondary to the platform's primary safety function.

---

## 1.3 Problem Statement

> **How might we transform existing household utility infrastructure into a privacy-preserving elderly safety network that identifies unusual behavioural patterns, facilitates timely assistance and strengthens family and community connections within residential townships?**
> 

### Proposed Approach

**Existing Utility Infrastructure → Contextual Behaviour Analysis → Safety Assessment → Coordinated Response → Connected Community**

---

# 2. Our Proposed Solution

## 2.1 Solution Overview

TemanMu transforms household utility consumption data into a contextual elderly safety monitoring service.

Instead of installing cameras or multiple movement sensors around the home, the system uses three sources of information:

| Data Source | Role | Information Provided |
| --- | --- | --- |
| **Smart Water Meter** | Primary | Household water consumption patterns |
| **Smart Electricity Meter** | Primary | Household electricity consumption patterns |
| **Door Contact Sensor** | Supporting | Door opening and closing events |

The combination of these signals allows TemanMu to examine changes in everyday household activity without attempting to track the resident's precise location or movement within the home.

### Why Water and Electricity?

Both utilities are naturally associated with many daily household activities.

**Water consumption may be associated with:**

- Washing and personal hygiene.
- Preparing meals.
- Cleaning and other household activities.

**Electricity consumption may be associated with:**

- Cooking and electrical appliance use.
- Lighting and entertainment.
- Other household equipment.

However, TemanMu will not assume that every water or electricity event corresponds to a specific activity.

For example, a refrigerator may consume electricity when nobody is home, and a water leak can produce consumption without human activity.

The system must therefore interpret utility data cautiously and combine it with personal historical patterns.

### Overall System Architecture

```
                         TemanMu
               Elderly Safety Ecosystem
                            │
                 HOUSEHOLD DATA SOURCES
                            │
             ┌──────────────┼──────────────┐
             │              │              │
         SMART WATER    SMART ELECTRICITY   DOOR
           METER            METER           SENSOR
             │              │              │
             └──────────────┼──────────────┘
                            │
                            ▼
                 DATA PREPROCESSING
                            │
                ┌───────────┴───────────┐
                │                       │
          Historical Data          Current Data
                │                       │
                └───────────┬───────────┘
                            │
                            ▼
              ADAPTIVE BEHAVIOURAL ENGINE
                            │
             ┌──────────────┼──────────────┐
             │              │              │
        Daily Routine   Anomaly Score    Away Context
             │              │              │
             └──────────────┼──────────────┘
                            │
                            ▼
                   RISK ASSESSMENT
                            │
              ┌─────────────┴─────────────┐
              │                           │
          NORMAL                    POTENTIAL RISK
              │                           │
              ▼                           ▼
       TemanMu Connect              TemanMu Safety
              │                           │
       Daily Reassurance           Passive Confirmation
              │                     / Voice Call
       Caregiver Communication            │
              │                    Caregiver + Neighbour
              │                       / Guard Alert
       Community Activities               │
              │                           │
              └─────────────┬─────────────┘
                            │
                            ▼
                  CONNECTED TOWNSHIP
```

---

## 2.2 Module 1: TemanMu Safety

**Primary Objective: Identify potentially concerning changes in household activity and coordinate timely welfare follow-up.**

### Feature 1: Infrastructure-Based Smart Utility Monitoring

TemanMu proposes to reuse compatible smart utility metering infrastructure instead of deploying extensive indoor monitoring equipment.

#### A. Smart Water Meter Analysis

The system examines household water consumption across different periods of the day.

Examples of relevant information include:

- Time intervals with recorded water consumption.
- Duration of periods without consumption.
- Differences between current and usual consumption patterns.
- Unexpected increases or decreases in usage.

**Example**

A resident normally shows water consumption between 7:00 AM and 9:00 AM.

Today, the system detects no water consumption during that period.

This may represent a deviation from the usual routine, but it is not sufficient evidence of an emergency.

The observation is passed to the behavioural assessment engine for further evaluation.

#### B. Smart Electricity Meter Analysis

The system examines the household's aggregate electricity consumption.

Electricity consumption can provide additional context when water consumption remains unusually low.

Rather than simply checking whether electricity is being consumed, TemanMu considers:

**Baseline Consumption**

Electricity consumption from appliances that operate routinely, such as refrigerators and routers.

**Variations Above Baseline**

Changes in aggregate consumption that may be associated with appliance use or other household activities.

**Temporal Consumption Patterns**

Differences between current consumption and historical consumption during similar periods.

For example, a household may typically exhibit an increase in electricity consumption during its morning routine.

If the expected increase is absent, this becomes one additional signal for risk assessment.

The proposed approach draws on research into **Non-Intrusive Load Monitoring (NILM)** and smart meter-based activity analysis. These techniques investigate how aggregate power measurements can provide information about appliance use or daily routines, although their accuracy depends heavily on data resolution and household conditions. [PubMed Central (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8659513/?utm_source=chatgpt.com)

**Important limitation:** Aggregate electricity readings cannot reliably identify specific appliance activities without suitable data and validated algorithms. The first-round prototype will not claim to distinguish individual appliances.

#### C. Door Contact Sensor

A simple door sensor provides contextual information about door opening and closing events.

This can help TemanMu assess whether prolonged inactivity may be associated with a possible outing.

For example:

**Water Consumption:** No recent usage

**Electricity Pattern:** No unusual activity-related changes

**Door Sensor:** Opening recorded earlier

**System Interpretation:**

> Possible away.
> 

Possible Away is a silent status: nothing is sent to the resident, caregiver or responders.

A door opening is not proof that the resident has departed. Door events are supporting evidence rather than definitive occupancy measurements.

### Feature 2: Adaptive Behavioural Risk Assessment

Every resident has different daily routines.

TemanMu proposes to establish individual behavioural baselines using historical utility consumption patterns.

Instead of relying exclusively on fixed thresholds, the system evaluates how unusual the current readings are relative to the resident's historical behaviour.

#### Example: Two Different Residents

| Parameter | Resident A | Resident B |
| --- | --- | --- |
| Usual Morning Activity | 7:00–9:00 AM | 10:00 AM–12:00 PM |
| Current Time | 9:30 AM | 9:30 AM |
| Water Usage | No recent consumption | No recent consumption |
| Electricity | No expected morning increase | No expected morning increase |
| Door Event | None | None |
| Interpretation | Deviates from usual routine | Still within expected routine |

The system may assign different anomaly scores even when current readings are identical.

#### Proposed Analysis

The behavioural engine evaluates three factors:

| Factor | Description |
| --- | --- |
| **Water Anomaly** | Difference between current and expected water consumption. This is the primary trigger. |
| **Electricity Anomaly** | Difference between current and expected electricity consumption. This provides context and counts as activity during the grace period. |
| **Door Context** | Whether door activity provides evidence of a possible outing |

The system then assigns one of four statuses.

| Status | Rule | Response |
| --- | --- | --- |
| **Routine** | Activity (a water draw, or electricity above the household's standby baseline) occurs inside the resident's usual window. | Send the morning reassurance to the caregiver/family and continue monitoring. |
| **Possible Away** | The door has opened, with no water use, no electricity above baseline and no door re-opening afterwards. | Silent status only. It clears when the door re-opens or activity returns. |
| **Unusual Inactivity** | There is no door event, and water has been silent for longer than the resident's usual quiet gap for that time of day plus a margin. Sleeping hours get a longer allowance. A Possible Away that lasts longer than the resident's usual outing length also becomes Unusual Inactivity. | Start the confirmation grace period: passive activity detection plus an automated voice call. If nothing confirms the resident within 15 minutes, notify the caregiver/family and the opt-in neighbour/guard together. |
| **Unresolved Concern** | The caregiver/family and neighbour/guard have been notified, and nobody has acknowledged and the resident has not confirmed. | Remind the caregiver/family and neighbour/guard every 15 minutes until someone acknowledges or the resident confirms they are well. |

Water silence alone can trigger Unusual Inactivity. Electricity activity above baseline during the grace period counts as confirmation. Electricity and door data otherwise provide context to responders and help separate a possible outing from inactivity.

#### Adaptive Rules

Every threshold is relative to the resident's own baseline, learned from recent history (for example the last 14 days) and split by time of day and weekday/weekend:

- **Usual activity window:** when the resident's first water or electricity activity normally occurs.
- **Usual quiet gap:** the longest normal period without water use at each time of day, including sleeping hours.
- **Usual outing length:** how long the resident is normally away after the door opens.

A new resident has no baseline. For the first period, TemanMu would use conservative default windows before switching to the personalised ones.

All numbers in the first-round prototype (margin, 15-minute grace period, quiet-gap percentile) are simulation settings, not validated thresholds.

An anomaly score is not a medical diagnosis or direct measure of emergency probability.

**First-Round Technology:** Transparent rule-based anomaly scoring using historical simulated data.

**Future Development:** Personalised anomaly detection using statistical models or machine learning, following real-world validation.

### Feature 3: Adaptive, Privacy-Preserving Data Processing

TemanMu aims to minimise the amount of household information collected, retained and shared.

The proposed design has three principles.

**A. Use Existing Data Where Feasible**

Prioritise compatible smart water and electricity meters before introducing additional hardware.

**B. Analyse Aggregate Patterns**

Focus on time-binned consumption and deviations rather than detailed appliance identification or room-level movement tracking.

**C. Share Meaningful Status Updates**

Caregivers/family and neighbours receive appropriate wellbeing summaries and alerts rather than detailed records of everyday household behaviour.

Neighbours and guards who may be notified are opt-in volunteers who register and are screened in advance. The resident consents to who can be notified.

For example:

**Preferred Family Notification**

> Mum's household routine appears consistent with her usual morning pattern.
> 

**Not the Default**

> Mum used 0.8 litres of water at 7:12 AM and increased electricity consumption at 7:35 AM.
> 

Where technically possible, future deployments may use edge processing or secure intermediary systems to share only derived alerts and necessary status information.

The design remains subject to resident consent and applicable data protection requirements. [PDP](https://www.pdp.gov.my/ppdpv1/en/akta/personal-data-protection-amendment-act-2024/?utm_source=chatgpt.com)

**Monitoring is not eliminated:** Utility meters still record consumption over time. TemanMu reduces the need for continuous indoor movement surveillance, rather than claiming that no monitoring occurs.

### Feature 4: Automated Safety Escalation

When TemanMu identifies unusual household activity, it initiates a predefined safety response.

```
          Unusual Inactivity
                    │
                    ▼
     Grace Period (15 min, adaptive)
     Passive Confirmation + Voice Call
                    │
            ┌───────┴────────┐
            │                │
        Confirmed       No Confirmation
            │                │
            ▼                ▼
       Close Case      Notify Caregiver/Family
                       + Neighbour/Guard
                             │
                    ┌────────┴────────┐
                    │                 │
              Acknowledged       Unresolved Concern
                    │                 │
                    ▼                 ▼
              Follow-up and     Remind every 15 min
              Case Resolution   until acknowledged
```

The grace period closes automatically if the resident answers the voice call, or if the system detects new water use, electricity above baseline or a door event. The resident is told afterwards what happened and who was notified.

The response workflow records when an alert was generated, who acknowledged it and what action was taken.

**Critical limitation:** Water and electricity data are indirect indicators of activity. TemanMu cannot directly detect a fall, guarantee rapid medical emergency detection or substitute for an emergency response system. TemanMu does not contact emergency services automatically.

---

## 2.3 Module 2: TemanMu Connect

**Objective: Provide everyday reassurance and encourage regular family communication.**

### Feature 5: Daily Peace of Mind

Caregivers/family members receive simple status updates through the TemanMu mobile application each morning when routine activity is detected.

**Example Notification**

> **TemanMu — Good Morning!**
> 
> 
> Mum's morning household routine appears normal today.
> 
> No unusual utility activity patterns have been identified.
> 
> **[Call Mum] [View Summary]**
> 

This feature provides reassurance without requiring family members to review individual utility readings.

Where recent or sufficiently reliable data are unavailable, the app will indicate this rather than presenting the resident's status as normal.

### Feature 6: Technology-Free Resident Confirmation

Many elderly residents are not comfortable with apps, so TemanMu does not rely on the resident opening an application to confirm they are well.

**A. Passive Confirmation**

During the grace period, any new water use, electricity above baseline or door event counts as confirmation. The case closes silently and nobody is notified.

**B. Automated Voice Call (pitch concept, not in the first-round prototype)**

At the start of the grace period, TemanMu phones the resident with a short message, such as "TemanMu here, are you OK? Press 1 or say yes." This works on any phone, including a landline, with no app or setup.

If the resident confirms, the case closes. If there is no confirmation within the grace period, the caregiver/family and neighbour/guard are notified.

**C. Keeping the Resident Informed**

Afterwards the resident is told what happened and who was notified, so the escalation is never hidden from them.

An optional app interface for residents who prefer it may be considered in later development.

### Feature 7: Resident-Controlled Family Sharing

Residents may choose:

- Who receives safety notifications, including which neighbours or guards may be notified.
- Whether daily summaries are shared.
- Which contacts can respond to incidents.
- Whether they wish to participate in community engagement features.

The objective is to provide **reassurance without unnecessary surveillance**.

---

## 2.4 Module 3: TemanMu Community

**Secondary Objective: Strengthen social connectedness through optional community engagement.**

### Feature 8: Long-Term Behavioural Change Awareness

Over time, TemanMu may identify sustained changes in household utility patterns.

For example, water and electricity consumption may show reduced variation compared with a resident's usual routine.

However, TemanMu will not claim that these changes directly measure loneliness, social isolation or the number of times someone leaves home.

Reduced utility activity may have many explanations, including travel, changes in appliance use or personal preferences.

The system may instead offer a voluntary wellbeing check-in.

### Feature 9: Community Activity Recommendations

Residents can select their preferred interests through the TemanMu mobile application.

For example:

**Resident Interest:** Gardening

**Available Township Activity:** Weekend Community Gardening Session

**Mobile Notification**

> **TemanMu Community**
> 
> 
> Our neighbourhood gardening session is happening this Saturday at 9:00 AM.
> 
> Would you like to join?
> 
> **[Join Activity] [Maybe Later]**
> 

Recommendations will primarily use residents' stated interests, availability and preferences.

Utility consumption patterns should not be used to infer sensitive health or psychological conditions.

### Feature 10: Community Buddy Programme

Residents who would like companionship when attending community activities may request an approved Community Buddy.

The programme aims to encourage participation and neighbourly relationships.

Buddy participation must be voluntary and supported by appropriate screening, safeguarding and consent procedures.

---

# 3. Proposed User Scenarios

## Scenario 1: Camera-Free Monitoring Using Existing Household Infrastructure

**Situation:** An elderly resident wants safety monitoring without installing cameras or motion detectors.

An elderly resident lives independently within a Sime Darby Property township.

The resident's children are concerned about unexpected emergencies but want to respect their parent's privacy.

### Conventional Approach

One option would be to install cameras, motion sensors or dedicated fall-detection devices inside the home.

These may provide more direct information about movement or falls, but they also introduce additional equipment and privacy considerations.

### TemanMu Approach

The household enrols in TemanMu and authorises access to compatible smart water and electricity meter data.

A door contact sensor is installed at the main entrance.

No indoor camera, PIR motion sensor or wearable device is required.

### Simulated Normal Morning

| Time | Water Consumption | Electricity Pattern | Door Event |
| --- | --- | --- | --- |
| 7:00 AM | Low | Baseline consumption | None |
| 7:30 AM | Consumption recorded | Increase above baseline | None |
| 8:00 AM | Consumption recorded | Variable consumption | None |
| 9:00 AM | Low | Typical daytime pattern | None |

**TemanMu Assessment:**

> Household utility activity is consistent with the resident's usual morning routine.
> 

The family receives a daily reassurance update.

### Expected Outcome

TemanMu demonstrates the potential to provide indirect household activity monitoring without visual surveillance or room-level movement tracking.

**Value Demonstrated:** Privacy, independence and potential infrastructure reuse.

---

## Scenario 2: Context-Aware Monitoring to Reduce Unnecessary Alerts

**Situation:** An elderly resident leaves home to visit family.

The resident normally uses water during the morning but leaves home at approximately 8:00 AM.

During the following hours, water consumption remains low.

### Simulated Timeline

| Time | Water Usage | Electricity Pattern | Door Event |
| --- | --- | --- | --- |
| 7:00 AM | Normal | Typical morning variation | None |
| 8:00 AM | Normal | Variation above baseline | Opened |
| 9:00 AM | None | Baseline only | None |
| 12:00 PM | None | Baseline only | None |
| 4:00 PM | None | Baseline only | None |

### Water-Only Monitoring

The system detects prolonged water inactivity and may trigger an alert if the configured threshold is exceeded.

### TemanMu Monitoring

The system examines the same water readings alongside electricity and door activity.

The combined pattern is consistent with a **possible absence**.

However, the system does not automatically conclude that the resident has left home.

TemanMu shows the **Possible Away** status silently and sends nothing to the resident, caregiver or responders.

If the door re-opens or activity returns, the status returns to Routine. If the time away exceeds the resident's usual outing length, the status becomes Unusual Inactivity and the grace period begins.

### Expected Outcome

TemanMu avoids an unnecessary escalation without bothering the resident or anyone else.

**Value Demonstrated:** Multi-source contextual interpretation and more appropriate alert handling.

---

## Scenario 3: Unusual Utility Inactivity — Potential Safety Concern

**Situation:** An elderly resident unexpectedly stops exhibiting normal household activity during the morning.

The resident generally wakes up around 7:00 AM.

However, the system does not detect the usual water consumption or electricity variation.

No door opening has been recorded.

### Simulated Timeline

| Time | Water Usage | Electricity Pattern | Door Event | System Response |
| --- | --- | --- | --- | --- |
| 7:00 AM | None | Baseline | None | Continue monitoring |
| 8:00 AM | None | No usual morning variation | None | Possible deviation |
| 9:00 AM | None | No usual morning variation | None | Unusual Inactivity: grace period starts (voice call + passive detection) |
| 9:15 AM | None | Baseline | None | No confirmation: notify caregiver/family and neighbour/guard |
| 9:30 AM | None | Baseline | None | Unresolved Concern: reminders every 15 minutes until acknowledged |
| 10:00 AM | — | — | — | Record outcome |

*These times are illustrative simulation settings. In practice the usual activity window, quiet gap and grace period adapt to each resident's habits and depend on the freshness of utility readings.*

### Mobile App Alert (Caregiver/Family and Neighbour/Guard)

> **TemanMu Safety Alert**
> 
> 
> An unusual household activity pattern has been identified.
> 
> No expected morning utility activity has been observed in the available data.
> 
> The resident has not confirmed they are well.
> 
> **[Call Mum] [I'll Check Now]**
> 

### Neighbour/Guard Response

The alert goes to the caregiver/family and to the opt-in neighbour or township guard at the same time.

If nobody acknowledges, reminders repeat every 15 minutes. Whoever acknowledges can tap "I'll Check Now" and later records the outcome, which closes the incident.

### Expected Outcome

TemanMu demonstrates how indirect household activity signals may initiate a structured safety response.

**Value Demonstrated:** Risk identification, caregiver and neighbour/guard notification and accountable welfare coordination.

---

## Scenario 4: Daily Family Reassurance

**Situation:** A family member lives separately from an elderly parent.

The household's utility patterns remain consistent with its established daily routine.

TemanMu generates a morning status update.

**Notification:**

> Good Morning from TemanMu!
> 
> 
> Mum's household activity appears consistent with her usual routine.
> 
> **[Call Mum]**
> 

The family member may contact the resident directly.

### Expected Outcome

TemanMu provides convenient family reassurance without exposing detailed household activity records.

**Value Demonstrated:** Peace of mind and family connectedness.

---

## Scenario 5: Community Engagement & Social Participation

**Situation:** An elderly resident has not participated in township activities recently.

The resident receives an optional wellbeing check-in through TemanMu.

The resident indicates an interest in attending a gardening activity.

TemanMu recommends a nearby event.

**Mobile Notification:**

> **TemanMu Community**
> 
> 
> Community Gardening Session
> 
> Saturday | 9:00 AM
> 
> Would you like to join your neighbours?
> 
> **[Join Activity] [Maybe Later]**
> 

The resident accepts the invitation.

If desired, the resident may request a Community Buddy to accompany them.

### Expected Outcome

TemanMu creates opportunities for social connection without requiring residents to share detailed household behaviours.

**Value Demonstrated:** Social participation, inclusion and community connectedness.

---

# 4. Competitive Analysis, Differentiation & Unique Selling Points

## 4.1 Existing Solutions & Market Landscape

Elderly monitoring is an established market, and utility-based activity monitoring has also been investigated in previous research.

Therefore, TemanMu's innovation should not be positioned as the invention of smart meter monitoring.

Instead, its proposed differentiation lies in **combining household utility infrastructure, contextual risk assessment, family communication and township-level welfare services.**

### Competitor 1: Smart Water Meter Monitoring — Shanghai, China

Shanghai has deployed smart water meters to monitor vulnerable elderly residents living alone.

Its programme uses abnormal water consumption to trigger alerts, with family or community personnel involved in subsequent welfare checks.

The programme demonstrates that utility-based elderly monitoring can operate at a meaningful scale.

**Existing Strengths:** Established water-based monitoring, automated notifications and organised community follow-up.

**Opportunity for TemanMu:** Add electricity consumption as a second utility signal, incorporate door activity for context and develop a service model designed for Malaysian property-managed townships.

### Competitor 2: TauTak — Malaysia

[TauTak](https://tautak.my/?utm_source=chatgpt.com) provides elderly safety monitoring using smart sensors and caregiver notifications.

Its solution includes motion and fall-related sensing, daily activity monitoring and emergency support. [Tautak](https://tautak.my/?utm_source=chatgpt.com)

**Existing Strengths:** Dedicated safety monitoring and fall-related detection.

**Opportunity for TemanMu:** Offer an alternative based primarily on existing utility infrastructure, requiring fewer dedicated indoor monitoring devices where compatible meters are available.

TemanMu would not provide equivalent direct fall-detection functionality.

### Competitor 3: SilverGenz — Malaysia

SilverGenz offers non-intrusive elderly activity monitoring, individual activity profiles and anomaly detection.

Its application also supports caregiver notifications and incident responses. [App Store](https://apps.apple.com/ma/app/silvergenz/id6754834149?utm_source=chatgpt.com)

**Existing Strengths:** Personalised behavioural monitoring and caregiver support.

**Opportunity for TemanMu:** Differentiate through its utility-first architecture and integration with township management and voluntary community activities.

### Competitor 4: Existing Utility-Based Monitoring Research

Several studies have already investigated electricity consumption as a way to monitor independently living older adults.

For example, a 2023 study examined unsupervised anomaly detection using smart electricity meter data from single-occupant households. A 2024 study evaluated lifestyle monitoring using low-resolution electricity readings.

These studies establish the technical plausibility of TemanMu's approach while demonstrating that electricity-based monitoring is not new. [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0957417423010679?utm_source=chatgpt.com)

**Opportunity for TemanMu:** Translate research concepts into a practical township service that combines multiple utility signals, appropriate resident confirmation and structured welfare coordination.

---

## 4.2 Competitive Comparison

| Dimension | Camera / Indoor Sensor Systems | Existing Smart Water Monitoring | **TemanMu** |
| --- | --- | --- | --- |
| Primary Monitoring | Cameras, radar, motion or wearable sensors | Water consumption | Water + electricity consumption |
| Additional Context | Depends on installed sensors | Depends on programme | Door contact events |
| Indoor Surveillance | May require dedicated devices | Generally unnecessary | No indoor cameras or motion detectors |
| Behaviour Analysis | Product-dependent | Often threshold-based | Proposed personalised anomaly assessment |
| Direct Fall Detection | Available in some systems | No | No |
| Infrastructure Reuse | Varies | Smart water meter | Compatible water and electricity meters |
| Family Reassurance | Available in some systems | Programme-dependent | Daily summaries and check-ins |
| Welfare Coordination | Product-dependent | Available in some programmes | Township-specific response workflow |
| Community Engagement | Product-dependent | Not the primary function | Activity recommendations and buddy programme |

*The table describes representative approaches rather than making universal claims about every competing product.*

---

## 4.3 Unique Selling Points

### USP 1: Infrastructure-First Elderly Monitoring

**Transforming everyday utility data into meaningful safety insights.**

TemanMu proposes to use household water and electricity consumption data that may already be collected through smart utility infrastructure.

This could reduce the need for multiple additional indoor sensors.

The approach is particularly relevant to smart township developments where compatible metering infrastructure is available.

### USP 2: Privacy-Preserving Monitoring Without Indoor Movement Tracking

**Monitoring changes in household routines instead of tracking residents' movements.**

TemanMu does not require indoor cameras, PIR sensors or wearable trackers for its core monitoring configuration.

Instead, it assesses utility consumption patterns and limited door activity information.

This reduces the need for detailed visual or room-level activity tracking.

However, utility patterns remain personal information and can reveal aspects of household routines. Privacy protections and consent are therefore still essential.

### USP 3: Multi-Utility Contextual Intelligence

**Going beyond single-source inactivity detection.**

TemanMu combines water consumption, electricity consumption and door activity to provide additional context.

For example, prolonged low water usage accompanied by typical electricity consumption and a recent door event may warrant a different response from unusual inactivity across both utilities without a recorded door event.

These combinations help guide confirmation and escalation rather than establish occupancy or health status with certainty.

### USP 4: Township-Level Welfare Coordination

**Connecting household monitoring to an accountable response process.**

TemanMu links unusual activity detection with technology-free resident confirmation, caregiver communication and opt-in neighbour/guard responders.

This is an important part of its proposed value for property developers.

### USP 5: Safety and Community Connectedness

**Supporting everyday wellbeing beyond emergency concerns.**

TemanMu combines daily family reassurance with optional community activity recommendations.

This complements the primary safety function without turning household consumption data into a diagnostic tool for social isolation.

---

## 4.4 Core Differentiation Statement

> **TemanMu transforms existing household utility infrastructure into a privacy-preserving elderly safety network, combining adaptive behavioural monitoring, contextual risk assessment, family reassurance and township-level welfare coordination to support safer independent living.**
> 

**Key Positioning:**

TemanMu is not simply another elderly monitoring device.

It is a proposed **infrastructure-enabled community safety service** that connects household monitoring with human assistance and community support.

---

# 5. Expected Impact

## 5.1 Social Impact

### A. Improved Elderly Safety

TemanMu aims to identify unexpected changes in daily household activity that could warrant welfare follow-up.

By detecting unusual utility patterns and starting a confirmation and notification process, the system may help identify situations that would otherwise remain unnoticed.

**Expected Outcome:** Improved awareness of potential safety concerns and more structured response coordination.

### B. Greater Independence & Dignity

Elderly residents can maintain independent lifestyles without requiring continuous indoor video or movement surveillance.

**Expected Outcome:** A less intrusive monitoring option that respects personal autonomy.

### C. Stronger Family Reassurance

Daily status updates and communication features provide convenient ways for family members to remain connected.

**Expected Outcome:** Greater reassurance and opportunities for regular family interaction.

### D. Improved Community Connectedness

Activity recommendations and voluntary buddy arrangements may encourage residents to participate in township activities.

**Expected Outcome:** Increased opportunities for social engagement and neighbourhood interaction.

---

## 5.2 Impact on Sime Darby Property

TemanMu aligns with the PEOPLE theme of the Township of Tomorrow Hackathon, particularly Community Wellbeing, Safety & Security, Digital Living and Feeling Connected to Neighbours. [Sime Darby Property](https://www.simedarbyproperty.com/universityhackathon/?utm_source=chatgpt.com)

| Impact Area | Potential Value |
| --- | --- |
| **Resident Safety** | Additional welfare monitoring capabilities for independently living elderly residents |
| **Digital Infrastructure** | New potential uses for compatible smart utility infrastructure |
| **Property Management** | Structured incident coordination and response tracking |
| **Community Wellbeing** | Better access to community activities and optional support |
| **Age-Friendly Townships** | Additional services supporting independent ageing |
| **Scalability** | Potential deployment across multiple developments |
| **Sustainability** | Possible reuse of existing infrastructure, subject to cost and environmental assessment |

A secondary opportunity is to use appropriate utility analytics to identify unusual water or electricity consumption requiring further investigation.

However, conservation or energy-saving outcomes should not be claimed unless separately demonstrated.

---

## 5.3 Proposed Key Performance Indicators

| Category | KPI | Measurement |
| --- | --- | --- |
| **Risk Detection** | Sensitivity / Recall | Percentage of labelled risk scenarios detected |
| **Risk Detection** | False Positive Rate | Percentage of normal scenarios incorrectly flagged |
| **Risk Detection** | Detection Delay | Time between a simulated concerning event and system alert |
| **Data Reliability** | Data Availability | Percentage of expected meter readings received |
| **Response** | Alert Acknowledgement Time | Time from notification to acknowledgement |
| **Response** | Incident Resolution Rate | Percentage of incidents with documented outcomes |
| **Family Engagement** | Daily Reassurance Engagement | Percentage of summaries viewed |
| **Community Engagement** | Activity Participation | Number of accepted invitations and actual attendees |
| **User Experience** | Resident Satisfaction | User feedback on usability, privacy and acceptability |
| **Commercial Feasibility** | Cost per Household | Estimated installation and operating cost |

### Proposed First-Round Evaluation

The team can compare three approaches using the same labelled synthetic dataset.

| System | Input Data | Purpose |
| --- | --- | --- |
| **Baseline A** | Water only | Conventional inactivity monitoring |
| **Baseline B** | Water + electricity | Assess the additional value of electricity data |
| **TemanMu** | Water + electricity + door events | Evaluate the proposed contextual monitoring architecture |

The systems can be compared using false positive rate, recall, precision and detection delay.

This will allow the team to investigate whether adding electricity and door information improves decision-making.

No numerical improvement should be claimed before running the evaluation.

---

# 6. Implementation Strategy, Hackathon Prototype & Feasibility

## 6.1 First-Round Prototype Concept

### TemanMu: Interactive Smart Utility Monitoring Simulator

For the first round, the team will develop an interactive software prototype that simulates an elderly resident's household utility consumption patterns.

**No physical prototype is required for the initial demonstration.**

Instead of building a complex 3D environment, the platform will simulate water consumption, electricity consumption and door events.

The system will show how different combinations of these signals influence TemanMu's risk assessment and response workflow.

The primary objective is to demonstrate the proposed monitoring mechanism and its potential integration into township operations.

---

## 6.2 Proposed Demonstration Architecture

The prototype will consist of three integrated interfaces.

### Interface 1: Smart Home Utility Simulator

**Purpose:** Demonstrate household utility patterns and how the system interprets them.

The interface will display a simplified 2D home with three monitoring points.

| Monitoring Point | Visualisation |
| --- | --- |
| Water Meter | Water consumption timeline |
| Electricity Meter | Electricity consumption timeline |
| Main Door | Door opening and closing event log |

The virtual environment will not require an animated character continuously moving between rooms.

Instead, the focus will be on the relationship between household routines and utility consumption.

#### Example Simulation Dashboard

**TemanMu — Household Monitoring**

| Parameter | Simulated Reading |
| --- | --- |
| Current Time | 9:30 AM |
| Water Usage | 0 L during the recent monitoring window |
| Electricity | No expected variation above baseline |
| Last Door Event | Previous evening |
| Routine Assessment | Unusual Inactivity |
| Recommended Action | Grace period (passive confirmation), then notify caregiver and neighbour/guard |

The dashboard will include two time-series charts.

**Chart A: Water Consumption (L/interval)**

Displays consumption over time.

**Chart B: Electricity Consumption (kWh/interval)**

Displays total electricity consumption over time.

A third event timeline will indicate when the main door was opened or closed.

The charts will update as simulated time progresses.

### Interface 2: TemanMu Mobile App

**Purpose:** Demonstrate the caregiver/family and neighbour/guard experience.

The first-round prototype will offer a caregiver/family mode. Resident mode is not part of the first-round prototype.

| Caregiver / Family Mode |
| --- |
| Daily Reassurance |
| Safety Alerts and 15-Minute Reminders |
| Contact Resident |
| Acknowledge ("I'll Check Now") and Incident Updates |
| Notification Preferences |

The resident's confirmation is handled passively through utility and door activity. The automated voice call is presented in the pitch only.

The mobile interface can be built as a responsive web application rather than a native Android or iOS application.

### Interface 3: Township Management Dashboard

**Purpose:** Demonstrate coordinated welfare management.

Illustrative dashboard:

| Unit | Utility Activity | Status | Response |
| --- | --- | --- | --- |
| A-101 | Activity within usual window | Routine | Morning reassurance sent |
| A-102 | Door opened, no activity since | Possible Away | None (silent) |
| A-103 | Water silent beyond usual quiet gap | Unusual Inactivity | Grace period, then notify caregiver and neighbour/guard |
| A-104 | Notified, nobody has acknowledged | Unresolved Concern | Reminder every 15 minutes |
| A-105 | Activity within usual window | Routine | Morning reassurance sent |

This demonstrates the platform's potential use at township level rather than only within individual homes.

---

## 6.3 Interactive Scenario Simulator

The demonstration will allow judges to switch between predefined household activity scenarios.

### Scenario A: Normal Daily Routine

The simulation begins at 7:00 AM.

Water and electricity consumption show patterns consistent with the resident's historical morning routine.

TemanMu identifies no meaningful anomaly.

The family app displays a daily reassurance summary.

**Demonstrates:** Routine assessment and family communication.

### Scenario B: Possible Outing

The resident opens the main door at 8:00 AM.

Water usage subsequently remains low and electricity consumption returns to its usual baseline.

TemanMu shows the silent Possible Away status. Nothing is sent to anyone.

The status clears when the door re-opens or activity returns.

**Demonstrates:** Contextual analysis and avoidance of unnecessary escalation.

### Scenario C: Potential Safety Concern

The simulated household shows an unusual absence of water activity beyond the resident's usual quiet gap during their usual waking hours.

No door event has been recorded.

TemanMu identifies Unusual Inactivity and starts the grace period (passive confirmation).

No activity is detected, so the caregiver/family and neighbour/guard are notified together.

Nobody acknowledges, so the status becomes Unresolved Concern and reminders repeat every 15 minutes until someone acknowledges.

**Demonstrates:** Safety monitoring and coordinated response.

### Scenario D: Community Engagement

The simulation advances to a longer-term view.

TemanMu offers an optional wellbeing check-in and invites an interested resident to a nearby community activity.

The resident accepts the invitation.

**Demonstrates:** Community participation as a complementary feature.

---

## 6.4 Proposed Technology Stack

| Component | Recommended Technology | Purpose |
| --- | --- | --- |
| Frontend | React | Interactive web application |
| Interface Design | Tailwind CSS | Responsive layout |
| Virtual Home | React + SVG | Simplified smart home visualisation |
| Data Visualisation | Recharts | Water and electricity consumption charts |
| Sensor Simulation | JavaScript + JSON | Simulated utility and door events |
| Behavioural Analysis | JavaScript | Rule-based anomaly scoring |
| Mobile App Prototype | Responsive React interface | Resident and family experience |
| Township Dashboard | React | Incident tracking |
| Data Storage | Local JSON / Browser State | First-round simulation data |

**First-Round Architecture**

```
       Simulated Household
                │
       ┌────────┼────────┐
       │        │        │
     Water  Electricity  Door
      Data     Data      Events
       │        │        │
       └────────┼────────┘
                │
                ▼
      Data Processing Engine
                │
                ▼
      Behavioural Risk Engine
                │
                ▼
        Risk Interpretation
                │
        ┌───────┴────────┐
        │                │
   Routine Normal    Unusual Pattern
        │                │
        ▼                ▼
   Caregiver App     Grace Period
 (morning update)  (passive confirmation)
        │                │
        │                ▼
        │       Caregiver + Neighbour/
        │           Guard Alert
        │                │
        │                ▼
        │       Reminders every 15 min
        │                │
        └────────┬───────┘
                 │
                 ▼
         TemanMu Dashboard
```

The simulation will distinguish implemented rule-based functionality from proposed future AI capabilities.

---

## 6.5 Technical Feasibility: Smart Meter Data Availability

This is one of the most important considerations for TemanMu.

Although smart meters may already exist, access to their data is not necessarily straightforward.

### Electricity Data

Tenaga Nasional Berhad states that its smart meter system provides customers with half-hourly electricity consumption information through the myTNB portal. [TNB Better. Brighter.](https://www.tnb.com.my/residential/smartmeters/faq?utm_source=chatgpt.com)

This supports the potential use of electricity consumption data for routine monitoring.

However, **customer-facing data availability does not establish that TemanMu can access the readings automatically through an API**.

Actual integration would require confirmation of data access arrangements, permissions and technical interfaces.

### Water Data

Air Selangor has introduced Advanced Metering Infrastructure (AMI) smart water meters that enable remote consumption readings.

Its support documentation indicates that smart meter readings can be loaded automatically on an hourly basis. [Air Selangor](https://www.airselangor.com/about-us/innovation-and-technology?utm_source=chatgpt.com)

However, meter coverage, data latency and third-party access must be verified for the selected pilot township.

### Implications for TemanMu

| Consideration | Current Position | Required Next Step |
| --- | --- | --- |
| Electricity Smart Meter | Established in Malaysia | Confirm access to sufficiently frequent readings |
| Water Smart Meter | Available in selected deployments | Confirm household coverage and data accessibility |
| Door Contact Sensor | Additional hardware required | Determine device, connectivity and installation requirements |
| Data Integration | Not yet established | Engage utilities or approved technology partners |
| Real-Time Monitoring | Not guaranteed | Validate end-to-end reporting latency |
| Resident Consent | Required for proposed monitoring | Develop privacy and consent procedures |

**Critical distinction:** A meter may record consumption frequently without making those readings available to TemanMu immediately.

For example, even if readings are grouped into 30-minute intervals, they may be uploaded or released after a delay.

Therefore, TemanMu should not promise immediate emergency detection based on smart meter data.

The initial service should be positioned as **utility-based behavioural anomaly monitoring with welfare follow-up**, rather than real-time fall detection.

This limitation should be made explicit during the hackathon presentation.

---

## 6.6 Proposed Implementation Roadmap

| Phase | Scope | Expected Outcome |
| --- | --- | --- |
| **Phase 1: Hackathon MVP** | Utility data simulator, rule-based anomaly engine, mobile app and management dashboard | Functional software demonstration |
| **Phase 2: Algorithm Validation** | Evaluate labelled scenarios, false positives, false negatives and detection delays | Initial technical performance evidence |
| **Phase 3: Utility Data Integration** | Explore access to water and electricity data from compatible meters | Technical integration feasibility |
| **Phase 4: Small-Scale Pilot** | Deploy with consenting households and authorised welfare responders | Real-world usability and operational validation |
| **Phase 5: Township Expansion** | Refine service delivery, monitoring models and operating costs | Potential deployment across additional townships |

The first-round submission will focus on Phase 1, with preliminary evaluation work where feasible.

---

## 6.7 Proposed Business Model

TemanMu may adopt a **B2B2C model**, where the primary institutional customers are property developers, residential management bodies or approved community service organisations.

### Potential Revenue Streams

| Revenue Model | Description |
| --- | --- |
| Platform Subscription | Township management pays for monitoring and incident coordination services |
| Household Participation Package | Optional service fees based on monitoring and support requirements |
| Installation & Integration Services | Setup, connection and maintenance of compatible devices |
| Community Service Partnerships | Integration with approved community welfare programmes |

The financial model should consider data access fees, door sensor installation, connectivity, platform operation and staffing for welfare coordination.

It should not assume that using an existing smart meter makes the system free to deploy.

---

## 6.8 Key Challenges & Mitigation Strategies

| Challenge | Potential Risk | Proposed Mitigation |
| --- | --- | --- |
| **Indirect Safety Monitoring** | Sudden falls or medical emergencies may not change utility consumption immediately | Position the service as supplementary monitoring; provide active help requests and appropriate emergency contact pathways |
| **Delayed Meter Data** | Alerts may be generated hours after a concerning event | Verify data latency, display data freshness and set monitoring limitations clearly |
| **Utility Data Access** | Utilities may not provide third-party APIs | Explore formal partnerships and compatible approved data interfaces |
| **False Positives** | Residents may be away, resting or changing routines | Combine utility and door information with passive confirmation and a grace period before notifying anyone |
| **False Negatives** | Appliances may operate normally even when a resident requires assistance | Evaluate detection limitations and avoid interpreting electricity consumption as proof of wellbeing |
| **Privacy** | Utility consumption can reveal daily routines | Minimise data collection, restrict access and obtain informed consent |
| **Household Diversity** | Appliances and consumption patterns differ between homes | Use personalised baselines and validate performance across households |
| **Operational Responsibility** | Alerts may not result in timely follow-up | Establish authorised responders and written escalation procedures |
| **Community Adoption** | Residents may not want to share utility information | Voluntary enrolment, transparent data practices and simple user controls |
| **Deployment Cost** | Integration and service costs may exceed expectations | Pilot one township and perform a cost-benefit assessment before expansion |

---

## 6.9 First-Round Deliverables

| Priority | Deliverable | Description |
| --- | --- | --- |
| **P0** | Project Proposal | Problem, solution, differentiation, impact and feasibility |
| **P0** | Smart Utility Simulator | Interactive water and electricity consumption data |
| **P0** | Door Event Simulation | Simulated opening and closing events |
| **P0** | Behavioural Risk Engine | Rule-based contextual anomaly assessment |
| **P0** | Safety Escalation Workflow | Grace period, caregiver and neighbour/guard notification, reminders and incident management |
| **P1** | Family Mobile App | Daily reassurance and safety alerts |
| **P1** | Township Management Dashboard | Monitoring and incident tracking |
| **P1** | Community Engagement Demo | Activity invitations and participation |
| **P1** | Comparative Evaluation | Water-only versus water + electricity + door |
| **P2** | Real Smart Meter Integration | Future development |
| **P2** | Machine Learning Model | Future development following data collection |
| **P2** | Physical Deployment | Future pilot phase |

The official hackathon programme accepts mobile/web applications, interactive dashboards and digital experiences as prototype formats.

The published schedule sets **23 October 2026** as the proposal submission deadline and **24–28 October 2026** as the judging period. [Sime Darby Property](https://www.simedarbyproperty.com/universityhackathon/?utm_source=chatgpt.com)

---

# 7. Final Value Proposition

### TemanMu

**Less Surveillance. More Assurance. Stronger Communities.**

TemanMu proposes a new approach to elderly safety within residential townships by transforming household utility consumption data into meaningful behavioural insights.

Using water and electricity consumption patterns together with door activity, the platform aims to identify unusual changes in daily routines without requiring indoor cameras, movement trackers or wearable devices.

When potential safety concerns arise, TemanMu facilitates resident confirmation, family communication and structured welfare coordination.

Beyond its primary safety function, the platform provides daily reassurance and voluntary community engagement opportunities to support a more connected ageing experience.

Rather than developing another standalone elderly monitoring device, TemanMu seeks to establish an **infrastructure-enabled township safety and community wellbeing service**.

> **TemanMu — Turning Everyday Utility Data into Meaningful Care.**
> 

---

# Strategic Assessment: Is This Version Stronger?

我觉得这一版在**产品定位**上比之前 PIR + Water + Door 的方案更有特点，但我们需要清楚它的技术取舍。

| Evaluation | Previous TemanU | New TemanMu |
| --- | --- | --- |
| Main Technology | PIR + Water + Door | Water + Electricity + Door |
| Hardware Requirements | Multiple indoor sensors | Potential reuse of existing meters; one door sensor |
| Privacy Positioning | Camera-free | Camera-free, no indoor movement tracking |
| Intrusiveness | Indoor movement detection | Aggregate utility monitoring |
| Sudden Emergency Detection | Limited, but PIR may identify loss of movement | More limited; relies on indirect routine changes |
| Data Integration Complexity | Relatively straightforward with dedicated sensors | Potentially difficult due to utility data access |
| Differentiation | Conventional multi-sensor monitoring | Utility-infrastructure-based service |
| Hackathon Simulation | Easy | Easy |
| Real-World Deployment | Requires sensor installation | Requires compatible infrastructure and data-sharing arrangements |

### Three Issues We Should Validate Before Submission

**1. Is utility-based monitoring sufficient for our Safety objective?**

This is the most important question.

Water and electricity monitoring can potentially identify deviations from normal living patterns.

However, both are indirect indicators.

If a resident suddenly falls at 10:00 AM, TemanMu might not recognise an unusual pattern until several hours later—or might miss the event entirely.

Therefore, I recommend framing TemanMu as a **proactive welfare monitoring and early concern identification platform**, not an instantaneous emergency detection system.

**2. Can we actually access existing utility data?**

This could become the biggest barrier to implementation.

If we cannot access sufficiently frequent smart meter readings, using existing meters may not reduce development costs as much as anticipated.

The proposal should therefore clearly distinguish the first-round simulation from the future integration requirements.

**3. What is genuinely innovative about combining these utilities?**

Research has already explored electricity-based behavioural monitoring, water-based monitoring and combinations of household utility measurements.

A 2023 systematic review specifically examined using energy and water consumption patterns to monitor older adults' wellbeing. [JMIR Aging](https://aging.jmir.org/2023/1/e41187/?utm_source=chatgpt.com)

So our innovation should not be described as inventing utility-based elderly monitoring.

Instead, we should emphasise:

**Utility Infrastructure Reuse + Personalised Risk Assessment + Family Reassurance + Township Welfare Coordination + Community Engagement**

### Final Recommendation

For the first round, I recommend positioning TemanMu as:

**An Infrastructure-Enabled, Privacy-First Elderly Safety & Community Wellbeing Platform.**

And make the Interactive Demo focus on this central question:

> **Can everyday water and electricity consumption patterns, supported by door activity and resident confirmation, help a township identify potential welfare concerns without monitoring residents' every movement?**
> 

If the prototype demonstrates the logic clearly—and the proposal acknowledges the limitations honestly—TemanMu will have a more defensible technical direction and a clearer value proposition for Sime Darby Property.

### Selected References

1. Department of Statistics Malaysia. (2026). *Demographic statistics, Malaysia, second quarter 2026*. [https://www.dosm.gov.my/portal-main/release-content/demographic-statistic-malaysia-q22026](https://www.dosm.gov.my/portal-main/release-content/demographic-statistic-malaysia-q22026?utm_source=chatgpt.com)
2. Institute for Public Health. (2018). *National Health and Morbidity Survey 2018: Elderly health*. Ministry of Health Malaysia. [https://iku.nih.gov.my/images/IKU/Document/REPORT/NHMS2018/NHMS2018ElderlyHealthVolume1.pdf](https://iku.nih.gov.my/images/IKU/Document/REPORT/NHMS2018/NHMS2018ElderlyHealthVolume1.pdf?utm_source=chatgpt.com)
3. World Health Organization. (2025). *Reducing social isolation and loneliness among older people*. [https://www.who.int/activities/reducing-social-isolation-and-loneliness-among-older-people](https://www.who.int/activities/reducing-social-isolation-and-loneliness-among-older-people?utm_source=chatgpt.com)
4. *A lifestyle monitoring system for older adults living independently using low-resolution smart meter data*. (2024). [https://pmc.ncbi.nlm.nih.gov/articles/PMC11175292/](https://pmc.ncbi.nlm.nih.gov/articles/PMC11175292/?utm_source=chatgpt.com)
5. *Two unsupervised learning algorithms for detecting abnormal inactivity within a household based on smart meter data*. (2023). *Expert Systems with Applications, 230*, 120565. [https://doi.org/10.1016/j.eswa.2023.120565](https://doi.org/10.1016/j.eswa.2023.120565)
6. *Monitoring the well-being of older people by energy usage patterns: Systematic review of the literature and evidence synthesis*. (2023). *JMIR Aging*. [https://doi.org/10.2196/41187](https://doi.org/10.2196/41187)
7. Tenaga Nasional Berhad. (n.d.). *Smart meters: Frequently asked questions*. [https://www.tnb.com.my/residential/smartmeters/faq](https://www.tnb.com.my/residential/smartmeters/faq?utm_source=chatgpt.com)
8. Sime Darby Property. (2026). *Township of Tomorrow: University Hackathon*. [https://www.simedarbyproperty.com/universityhackathon/](https://www.simedarbyproperty.com/universityhackathon/?utm_source=chatgpt.com)