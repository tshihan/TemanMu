# Hardware appendix explanations

The final deck adds A6 (CT electricity monitor) and A7 (NB-IoT water meter), after A5. Appendix A1 stays disabled.

## Presentation behaviour

- Each explanation plays once when its slide enters view, progressing through four stages.
- Pause, restart and numbered step buttons let the presenter control the explanation.
- Offscreen playback pauses; reduced-motion preferences disable automatic playback.
- All labels and explanations stay visible. PDF printing and the existing PPTX exporter freeze motion and hide playback controls. PPTX slides are still images, matching the existing exporter.

## Technical scope and sources

CT means Current Transformer. The illustration shows a split-core sensor around one insulated AC conductor, magnetic induction into the secondary coil, a monitor with a voltage reference for real power, and a proposed data connection to TemanMu. It does not imply appliance identification or evidence that a resident is safe. Installation requires a qualified electrician.

- [OpenEnergyMonitor: CT principle](https://docs.openenergymonitor.org/electricity-monitoring/ct-sensors/introduction.html)
- [OpenEnergyMonitor: installation and real-power measurement](https://docs.openenergymonitor.org/electricity-monitoring/ct-sensors/installation.html)

The water illustration uses an ultrasonic transit-time example: different upstream/downstream travel times give flow rate, accumulated over time to obtain volume. NB-IoT is the cellular communication method, separate from the measurement principle. Other water meters can use other sensing methods. A meter platform and authorised integration are shown explicitly; no live TemanMu connection or selected hardware is claimed.

- [US Bureau of Reclamation: transit-time acoustic measurement](https://www.usbr.gov/tsc/techreferences/mands/wmm/chap11_01.html)
- [Huizhong SCL-61H: example meter and communication options](https://en.huizhong.co/news_info?id=821)
- [Honeywell: example NB-IoT module](https://process.honeywell.com/us/en/products/utilities/water/digital-metering/nb-iot/merlin-clip-on)

One-minute delivery remains a pilot target. Selected SKU, local coverage, reporting settings, battery requirements, API access and measurement placement must be verified. Tanks and branching pipes can decouple meter readings from indoor water use.

## Design choices

- Retain the deck’s warm background, rust accent and serif titles so the new appendices belong to the existing presentation.
- Use a wide schematic with four explanations below it to connect the physical measurement to the proposed data path.
- Keep text visible throughout, and animate only the relevant current, sound or data signal, so motion explains the mechanism and exported stills retain the meaning.
- Use selectable steps and a finite sequence to let the presenter match the explanation to their speaking pace.
- Design dials: energy 1, rhythm 2, motion 2. Motion is instructional rather than decorative.

## Verification

- Production build, scoped Oxlint and `git diff --check` passed.
- Browser checks covered automatic stage progression, pause, replay, manual step selection, and reduced-motion selection without autoplay.
- Both slides fit 1600 × 900. At a 390 px viewport, the deck had no horizontal page overflow.
- Print styles and export mode hide playback controls and retain all four diagram stages. A1 remains absent from the rendered deck.
- Exported these two slides through the existing PPTX exporter, extracted both embedded images and visually checked them. SVG connection lines use explicit attributes so the exporter retains them.
- The existing image exporter logs cross-origin Google Fonts stylesheet warnings and falls back for some SVG text; diagrams and descriptions remain readable. The web presentation retains its normal typography.
