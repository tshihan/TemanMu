# TemanMu Retrofit Deployment Plan

## Purpose

The simulator remains our demonstration tool. For real deployment, where existing utility data cannot be accessed or does not arrive frequently enough, TemanMu will use a standard monitoring kit to measure each participating home's usage independently of the utility billing system.

This is a proposed deployment design. Hardware selection, reporting intervals and installed costs require site assessment and pilot validation.

## What we install

| Component | Equipment and installation | How it works |
| --- | --- | --- |
| **Electricity monitor** | A current-transformer-based energy monitor at the home's distribution board, installed by a qualified electrician. Shelly Pro 3EM is a reference example, subject to local suitability checks. | Measures whole-home power and cumulative energy, then sends readings through the home network or gateway. It does not replace the TNB billing meter. |
| **Water monitor** | A pulse-output water submeter on the home's incoming pipe, downstream of the utility meter, installed by a qualified plumber, plus a connected pulse counter. An approved reader compatible with the existing meter may avoid the need for a submeter. | Each pulse represents a specified volume of water. The counter timestamps consumption and sends it to the gateway. Pulse resolution and low-flow sensitivity must suit household activity monitoring. |
| **Communications gateway** | A small gateway with Wi-Fi/Ethernet and a cellular option where home internet is unavailable. | Collects readings, uploads them securely, sends connection heartbeats and buffers data during temporary outages. Cellular coverage and ongoing data costs must be checked. |
| **Outing information** | Integrate township access-card records where available. Otherwise, use caregiver-entered away periods; a door sensor remains an optional alternative. | Water and electricity monitors do not supply access-card information. Without access records, automatic outing identification cannot be assumed. |

## Proposed data flow

```text
Electricity monitor ──────────┐
                             ├─ Gateway / secure connection ── TemanMu backend
Water meter + pulse counter ─┘                                  │
                                                               ├─ Data-quality checks
Access-card system, where available ────────────────────────────┤
                                                               ├─ Routine assessment
                                                               ├─ Activity history
                                                               └─ Caregiver and township views
```

Some network-capable monitors may connect directly to the backend. The final gateway arrangement depends on the selected devices and site connectivity.

## Proposed pilot targets

- **Electricity:** approximately one-minute summaries, including power and cumulative energy.
- **Water:** locally timestamped pulses, uploaded approximately every minute.
- **Device health:** regular heartbeats to distinguish no consumption from a disconnected device.
- **Outages:** local buffering, preserving both measurement time and backend receipt time. Delayed readings must not be presented as current activity.
- **Missing data:** display unavailable readings separately from zero consumption; do not silently substitute estimated activity.

These are engineering targets to test, not confirmed device performance or a guaranteed emergency-response time.

## Before installing in a home

1. Survey the electrical supply, distribution board, water-meter model, pipe layout and network coverage.
2. Confirm installation permissions and obtain resident consent for monitoring and data sharing.
3. Select locally suitable equipment and obtain electrician/plumber quotations.
4. For apartments, confirm that the water measurement covers the participating unit alone.
5. Validate small water uses, standby electricity, timestamps, communication delays and connection failures during the pilot.
6. Agree on maintenance ownership, connectivity charges and replacement procedures before expanding.

## Pitch wording

> Where utility integration is unavailable, we deploy a retrofit kit: a whole-home electricity monitor, a water submeter or compatible meter reader, and a connected gateway. This supplies TemanMu with household activity data without cameras, wearables or changes to the utility billing meters.

The simulator demonstrates the software workflow today. Real hardware integration and field performance remain to be validated in a consented pilot.

## Reference equipment and documentation

- [Shelly Pro 3EM — manufacturer documentation](https://kb.shelly.cloud/knowledge-base/shelly-pro-3em): example of whole-home energy monitoring with current transformers and network integration.
- [Diehl HYDRUS 2.0 — manufacturer datasheet](https://www.diehl.com/cms/files/HYDRUS-2-391.0.pdf?download=1): example of water-meter pulse outputs and communication interfaces. Reporting intervals vary by configuration; this is not a final hardware selection.
