# Design QA — Byggeværkstedet family preview

final result: blocked

## Visual target

- Child: `/workspace/scratch/8dee175dd0b6/generated_images/exec-4a7bd9a5-2066-4640-8fc9-f64fb48aebbd.png` (combined approved concept, two mobile screens).
- Parent: `/workspace/scratch/8dee175dd0b6/generated_images/exec-e1743945-e525-457d-9c11-dfbf07dc927c.png` (approved calm parent concept, two mobile screens).
- Targets: mobile 390 × 844 CSS pixels, iPad 834 × 1194, desktop 1100 × 844. The local preview wrapper supplies these viewports through a same-origin iframe.
- States required: child discovery, parent discovery, model preparation, solo guide, cooperative guide, filters, own-model editor.

## Blocking finding

[P1] Browser preview infrastructure did not expose the implementation.

`sites-preview start` and `sites-preview status` report a running preview. Opening `http://terminal.local:4173/` in the cloud browser returned **Site Unavailable — Unable to access this site** (HTTP 403 in browser issue report). One supported stop/start recovery followed by browser reload produced the same result. This is not evidence of a site-side bot block. No alternative browser or sandbox/network changes were used.

Implementation screenshot: unavailable. Full-view and focused comparisons: not performed. Source/implementation pixel density cannot be normalized without a rendered implementation. Browser console errors and visual mobile/iPad behaviour: unverified.

## Required fidelity surfaces

- Typography: Nunito for children, Nunito Sans for the quieter parent appearance. Actual font loading and wrapping require browser verification.
- Spacing/layout: responsive discovery grid, preparation screen, fixed building controls and separate builder tabs implemented. Overflow, visible control positions and touch-target sizes require browser verification.
- Colours/tokens: cobalt/yellow child theme, forest-green/ivory parent theme, shared semantic tokens. Actual rendered contrast requires browser verification.
- Image quality: uses the app's original exact piece renderer and original motif data; the model drawings must remain precise building instructions. No generated illustration is substituted for exact brick geometry. Existing source logo retained, locally vendored Phosphor icons used for standard UI controls. Visual sharpness and alignment require browser verification.
- Copy/content: Danish controls and existing motif descriptions. No model patterns, names, counts or collection membership changed. Some conceptual mock imagery cannot serve as exact build geometry; real source geometry intentionally takes precedence.

## Functional checks completed

95 automated Node tests pass: 87 existing catalogue/geometry checks and eight experience tests. Experience tests execute the complete application in jsdom with a stubbed Canvas API; they do not claim browser rendering verification.

Tested: preparation before start, solo completion and previous row, overview dialog, two-builder progress isolation and assembly availability, three builders and dedicated-device assignment, theme persistence without resetting a guide, search/favourites/filter composition, and saving/reopening/editing an own model.

## Intentional implementation choice

This is an incremental redesign of the existing GitHub Pages application. Its existing static runtime and precise canvas renderer are retained, instead of replacing it with a separate mobile-native prototype template. `preview.html` is a local review harness only. Production publication and merging are deliberately pending the user's review.

## Follow-up checklist

1. Restore access to the supported cloud-browser local preview.
2. Capture each required state at the target CSS sizes.
3. Normalize and combine the source and implementation screenshots.
4. Review all five fidelity surfaces and browser console output.
5. Fix actionable findings and repeat comparison; change `final result` only when justified by rendered evidence.

## Private review copy

A separate owner-private Site was deployed successfully at https://byggevaerkstedet-designproeve.nicolajbach12.chatgpt.site. The browser reached its ChatGPT sign-in gate. Login requires user assistance; rendered-app visual QA remains blocked. No production GitHub Pages update was performed.

Independent code review identified and fixed the skip-link route, the mobile back button accessible name, and a one-row own-model/dedicated-builder crash. Two targeted regression tests cover these fixes.
