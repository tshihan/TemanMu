# Landed township UI demo

Open `/township-landed`, or choose **Landed demo** in the dashboard header.

This is a local, UI-only illustration for Ilham Residence 3. It does not connect to the monitoring store, send notifications, place calls, dispatch responders or save records to the backend. Refreshing or resetting clears its session records.

## Apartment pattern

- Reuses the app header, `TownshipShell`, Live monitoring / Incident log tabs, `CheckDialog`, shared status text and township CSS.
- Reuses `IncidentHistory`, including 7-day / 30-day / All periods, its table and read-only detail drawer. The optional source label identifies these as demo records. Existing callers retain their original source labels.
- Uses the same alert banner, unresolved-concern / unusual-inactivity chips, Needs attention list, response progress and accept / outcome / optional note / record-and-close pattern.
- All other houses have neutral roofs and no markers. There is no household inspector, utility chart or individual water/electricity reading.
- Initial sample cases: IR3-018 needs a responder, IR3-007 is already being checked, IR3-003 is at resident-call verification. Accepted checks can be completed locally. Verification cases do not expose an operator outcome form.

## Sources and design decisions

- Reference workflow: [SimeGuardian TownshipExplorer](https://github.com/johnnytan5/SimeGuardian/blob/main/web/src/TownshipExplorer.tsx).
- Site context and plan: [Sime Darby Property's Ilham Residence 3 brochure](https://simedarbyproperty.com/city-of-elmina/ilham-residence-3/brochure/Main%20Brochure.pdf?v2=), PDF page 8. The Official plan tab shows the entire rendered page, unchanged.
- The 3D model takes broad residential-row, courtyard and entrance cues from the brochure. Geometry, addresses and case locations are illustrative; it is not a surveyed or address-accurate model.
- Final direction follows the user's apartment reference. Energy 1 / rhythm 1 / motion 2: the existing operator layout and short response transitions are retained. The demo alert ring stops after three repetitions and reduced-motion preferences are respected.
- Typography and parchment/terracotta colours come from `theme.css`, so the new view belongs to TemanMu. Amber identifies the calling stage; terracotta identifies unresolved follow-up. Roofs and map labels carry the same meaning as the attention list.
- The original 3D neighbourhood stays between the township navigation and the attention/response panel. The street overview was removed at the user's request; search sits above the map. Label leader lines preserve the home anchor when nearby labels need separation on a narrow screen.
- The 3D scene loads lazily and renders on demand. Marker shadows lift labels above geometry. No generated people, photos, logos, testimonials or partner claims are used.

## Verification, 9 November 2026

- `npm run build`: passed. Vite still reports a large Three.js chunk warning.
- Oxlint on the new township files, App and IncidentHistory: passed without warnings. Full lint exits successfully with existing warnings in other components and unchanged TownshipView code.
- `node --test src/dashboard/incidentHistory.test.mjs`: 5 passed.
- Browser flow: passed with no runtime errors. The Three.js dependency emits a Clock deprecation warning.
- Responsive widths: 320, 390, 768, 1024 and 1512 px. Document scroll width equalled client width at each size.
- Desktop, mobile map and mobile response screenshots were visually inspected after entrance transitions settled. Mobile attention-label rectangles do not overlap.
- The earlier street-overview revision was superseded by the user's request to remove that column. The 3D scene and attention/response panel remain.
- Not deployed. No live multi-home monitoring or hardware integration was tested.

Browser interactions checked individually:

- Unresolved concern chip filters to two markers; unusual inactivity filters to one; Show all and toggling restore all three.
- 3D, Top view and Official plan switch correctly. Returning from the plan restores 3D without a false context-loss error.
- Zoom in, zoom out and Reset map view change the view.
- Search handles unmatched input, a routine home with no open case, and an active case.
- Selecting the map marker or Needs attention row changes the response panel.
- I'll Check Now accepts IR3-018 and opens the shared native modal.
- All four outcome options select; hospital fields appear for a transfer; a note can be added.
- Record and close removes a case from the map and attention list and adds it to the shared incident log.
- The second accepted case can record a hospital transfer with name and time.
- The incident log's three periods work. View details shows the saved note; its close control and Escape work.
- Reset restores the original cases and clears the log.
- English and Bahasa Melayu switch the shared labels and landed copy.
- Keyboard Space selects a native outcome radio. Escape closes the modal. Arrow keys operate the shared workspace tabs.
- Simulated WebGL context loss shows the fallback, the official plan remains usable, and Reset recovers the scene.

Screenshots: `frontend/output/playwright/landed-desktop-final.png`, `landed-mobile-map.png`, and `landed-mobile-response.png` (ignored local verification artifacts).

## Delivery gate

Scope: the new landed UI and the small shared-component changes needed to reuse the apartment pattern.

- R-02 PASS: new source and copy contain no em dash.
- R-03 PASS: zero document overflow at all five tested widths; mobile map and modal inspected; new map controls and markers have 44 px or larger targets.
- R-17 PASS: the household count is calculated from 24 labelled fixtures; no adoption, accuracy or response-time claims appear.
- R-18 PASS: no testimonials, people photos or customer identities were created.
- R-23 PASS: the existing brand and requested apartment navigation are reused; model and case data are labelled illustrative.
- R-24 PASS: the added route opens locally; existing navigation keeps its implemented destinations; the brochure link targets the source PDF.
- R-25 PASS: calculated text contrast is 5.72:1 for terracotta on warm wash, 6.03:1 for amber text on its label, 7.56:1 for muted text on parchment, 9.44:1 for map landmarks, and 13.47:1 for main text.
- R-26 PASS: new buttons have tested actions, including filters, map controls, response, history, reset and fallback.
- R-27 PASS: lazy loading text, search empty/routine messages, empty incident log and recoverable 3D error state are implemented; empty and error states exercised.
- R-28 PASS: no FAQ was added.
- R-32 PASS: native radios, shared keyboard tabs, visible focus and Escape-to-close checked in the browser.
- R-33 PASS: source was edited directly with patches; no source-rewriting scripts were introduced.
- R-34 PASS: the demo uses the existing fixed parchment theme; no theme toggle was added.
- R-35 PASS: build, lint, shared history tests and the recorded browser click-through above completed.
- R-36 PASS: no security, medical detection, service coverage, partnership or performance claims were fabricated.
- R-37 PASS: final visual direction is the user's explicit instruction to follow the apartment dashboard.
- R-38 PASS: sample home IDs, addresses, residents and cases are visibly labelled demo data; the source plan is attributed.
- R-39 PASS: native controls, labelled icons and focus styles are used; native modal contains focus; motion respects reduced motion and the alert ring is bounded.
- R-40 PASS: the source image has dimensions; the heavy scene is lazy loaded; no external blocking script or unmeasured performance score was added.
- R-01 PASS: the warm palette comes from TemanMu; colour is reserved for response state.
- R-04 PASS: alert, phone, timer, search and zoom icons describe their actual controls and states.
- R-06 PASS: existing editorial headings and dashboard body type are reused for product consistency.
- R-07 PASS: no decorative background grid or dots were added.
- R-08 PASS: the shared attention-row chevron indicates selection; no decorative CTA arrows were added.
- R-09 PASS: chips and case labels communicate real local demo state.
- R-10 PASS: no glass or blur surfaces were added.
- R-12 PASS: marker shadows distinguish annotations from the model; shared response elevation is retained.
- R-13 PASS: no glow treatment was added.
- R-14 PASS: there is no feature-card grid; the layout follows the operator's response task.
- R-19 PASS: scene rendering is on demand; finite transitions identify response changes; reduced motion disables them.
- Liveliness PASS: explicit dials, the neighbourhood map as focal point, structural spacing, attention-only accents and the existing TemanMu typography are visible in the inspected screenshots.
- C-1 to C-5 PASS: choices are documented, new controls are exercised, sections serve the operator workflow, responsive/error/empty states are checked, and sample/source boundaries are explicit.
- R-05 PASS: the app follows the requested monitoring / attention / response structure.
- R-11 PASS: existing chip/card/button radii are retained; map and control radii follow their distinct roles.
- R-15 PASS: actions use specific names: I'll Check Now, Record and close, Official plan, Reset demo.
- R-16 PASS: no generic AI marketing claims were added.
- R-20 PASS: the existing TemanMu shell and an Ilham-inspired neighbourhood provide the visual identity.
- R-21 PASS: the fixed parchment theme follows the existing product and the user's reference.
- R-29 PASS: the warm base, terracotta follow-up and amber calling stage form the UI palette; model greenery represents landscape.
- R-30 PASS: the user's own apartment view is the requested reference; no third-party product skin was copied.
- R-31 PASS: layout, type, colour, motion, geometry and annotation reasons are recorded above.
