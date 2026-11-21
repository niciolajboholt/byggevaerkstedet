# Design QA — Byggeværkstedet family preview

final result: passed

## Scope and visual targets

Approved child combination: `/workspace/scratch/8dee175dd0b6/generated_images/exec-4a7bd9a5-2066-4640-8fc9-f64fb48aebbd.png`.
Approved parent concept: `/workspace/scratch/8dee175dd0b6/generated_images/exec-e1743945-e525-457d-9c11-dfbf07dc927c.png`.

Implementation: https://byggevaerkstedet-designproeve.nicolajbach12.chatgpt.site/

Browser: cloud Chrome. Content viewports: mobile 390 × 844 CSS px and iPad 834 × 1194 CSS px, supplied by the same-origin `preview.html` harness. These are viewport checks, not physical-device Safari/touch tests.

## Evidence and comparison

- `docs/design-qa/comparison.jpg`: child and parent source crops together with their browser-rendered discovery screens.
- `docs/design-qa/final-comparison.jpg`: approved guide source together with final cooperative guide and child discovery.
- Accepted original screenshots are saved under `/workspace/shared/bygge-qa/`: child-mobile.jpg, parent-mobile.jpg, coop-mobile.jpg and parent-ipad.jpg.
- Browser screenshots: mobile 390 × 844 px, iPad 834 × 1194 px, 1 pixel per CSS px. Source panels are presentation crops, not exact device captures; they were contained without warping in comparison boards. Comparison concerns hierarchy, typography, palette and controls, not a pixel-perfect match to generated model geometry.
- Focused checks: inspected mobile header/switch, guide tabs/progress, row pieces and bottom controls. The final guide image resolves the earlier excess whitespace; current builder row 3/4 reports 75%.

## Findings and fixes

No remaining actionable P0/P1/P2 findings in the reviewed scope.

1. [P1, resolved] Supported local preview route returned Site Unavailable. A separate owner-private Site was deployed; after user-assisted login it was rendered and tested in the cloud browser. GitHub Pages production is unchanged.
2. [P2, resolved] Mobile brand and appearance switch wrapped onto separate rows, creating excessive top whitespace. Reduced header sizing/gaps. Recaptured both themes.
3. [P2, resolved] Short cooperative parts occupied a square canvas with excessive whitespace. Added proportional compact height without changing piece geometry. Recaptured the final guide.
4. [P2, resolved] Progress bar reflected the whole team while the heading described one builder. It now follows the selected builder's rows; browser verified row 3/4 = 75%. Regression assertion added.
5. Independent code review fixed the skip-link route, the mobile back control's accessible name, and dedicated-builder selection for one-row own models. Targeted tests cover these changes.

## Required fidelity surfaces

- Fonts: rounded Nunito child headings, quieter Nunito Sans parent typography; readable wrapping and navigation checked in captures.
- Spacing/layout: mobile header tightened after comparison; fixed guide controls remain visible, parent featured motif adapts to iPad without distorted pieces. iPad first canvas measured 372.5 × 373 CSS px after resize settled.
- Colours/tokens: cobalt/yellow child theme and forest-green/ivory parent theme match the selected directions. Active controls use text plus visual state. No claim of a full WCAG audit.
- Assets: exact original Plus-Plus geometry and data take precedence over illustrative mock counts/shapes. Source logo retained, locally vendored Phosphor icons used. Real H/V orientations are preserved when assigned parts are cropped. No raster design screenshot replaces interactive UI.
- Copy/content: Danish labels and exact existing motifs retained. Generic builder-part text accurately describes arbitrary partitions instead of assuming the generated mock's star/handle split. Small plural wording corrected.

## Interaction verification

Browser-tested: theme switch, motif preparation, solo start, next row, completion of all 10 Stjernestav rows, back to preparation, cooperative start and row advancement, whole-model dialog, difficulty filter (27 easy motifs), filter reset, iPad resize.

Browser console inspected: no errors originating from the app's domain. Unrelated cloud-browser extension metadata errors were observed and excluded explicitly.

`npm test`: 95/95 pass. Existing 87 geometry/catalogue tests and eight jsdom experience tests. Canvas is stubbed in jsdom; browser captures supply visual evidence separately.

## Accepted differences and limits

This preserves the existing static web application, its exact diagrams, all 108 motifs, local likes and own models. Collection shortcuts remain visible; the parent view uses a featured model plus a grid instead of restricting the catalogue to the mock's two illustrative list rows. Generated previews are art direction, not exact engineering drawings or fixed counts. No new runtime shell or native-device bezel is introduced into the existing web app.

P3 follow-ups: optional closer theme-tile artwork styling and further copy refinement. Remaining test gaps: physical iOS Safari, real touch use, screen-reader testing and physical trial-building. No merge into production is included in this preview handoff.

## Builder controls follow-up

Added a single “Byt plads” control between builders 1 and 2, plus one smallest-part choice for every available builder. The selected recipient and dedicated-device selection follow the person when names swap. Whole-part assignment guarantees that the chosen recipient receives the actual minimum brick count; setup and assembly remain sorted by physical row position.

97/97 tests pass. New tests cover both recipients, swapping, persistence, dedicated-device identity and all catalogue motifs with two/three builders. Browser mobile check on Flyvende nøgle: Jens 14/Alfred 25, swap → Alfred 25/Jens 14, choose Alfred → Alfred 14/Jens 25. Starting the guide selects Alfred and shows his 14-piece materials list. No app-domain console errors observed. Both controls fit between/under the name fields at 390px. The private Site is updated; GitHub Pages remains unchanged.
