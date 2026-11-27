# Spatial catalogue acceptance — 26 November 2026

## Delivery

Fifty spatial sculptures, numbered 01–50, with 57–177 whole Plus-Plus pieces each. Each record includes its exact posed bricks, colours, material counts, parent joints and insertion order. Generated SVG previews show those same actual poses. All 270 previous mosaics, their 810 difficulty variants and their editable names are unchanged from main `1b3af144b748f442b70c2bb9356ccd029ff4b942`.

Solo instructions place one brick at a time. Shared-iPad and v3 live plans use small connected tasks, preserve the insertion order and alternate builders after attachment. Existing v1/v2 flat rooms keep their protocol and IDs. Pose-derived signatures protect saved progress and task caches; solo and cooperative plans have separate cache keys.

## Verification

`npm test`: **366 passed, 0 failed**. The standalone spatial UI recheck also passed 3/3 after the final cache-version update.

- Both Python and browser/server JavaScript validate all fifty complete scenes: nine occupied unit cubes per brick, no intersections, real tab/notch grips, connected coverage, unobstructed straight insertion and equal-mass nominal support-polygon balance. No accepted scene has omitted pieces. Design simplifications are explicit in each scene's `designAdjustedCells`.
- All fifty scenes were checked for every two/three-builder smaller-task setting: connected subassemblies, rigid-group insertion, complete materials, unique coverage, attachment edges and alternating ownership.
- The full catalogue was visually reviewed on a 50-model contact sheet generated from actual poses. Titanic keeps four separate orange funnels with black caps. The elephant has a broad green support plinth.
- Browser QA exercised solo preparation, actual rendered bricks, placement, camera controls, mobile Titanic, screen-size changes retaining the same step, and CR7 cooperative building on iPad. First shared task used four bricks, then correctly switched to Alfred after placement.
- In-memory two-device UI tests exercise the v3 scene exchange, names, simultaneous preparation, ordered attachment, undo and room closing. Network-failure tests preserve usable spatial setup and display the error.
- Both renderer and Worker bundles build. A direct baseline comparison confirms every pre-existing flat motif and name is unchanged.

## Live runtime acceptance — 27 November 2026

The user explicitly authorized public GitHub publication, deployment and the live runtime test on 27 November 2026. The earlier automatic approval blocks are resolved by that authorization.

`node scripts/test-spatial-live-service.cjs` passed against the existing app Worker for the 78-piece penguin and the largest, 177-piece pirate ship: exact scene transfer, v3 plan, ready, attach, undo and persisted revision. Both synthetic rooms were closed. No Worker changes, billing changes or changes to other services were required.

## Publication status

The accepted source is being published through the connected GitHub service because the local Git transport has no login credential. The uploaded Git tree must match the accepted local tree before merge. The contact sheet `docs/spatial-contact-sheet.png` shows all fifty actual posed models.

## Verification boundaries

These models are digitally checked, not physically built. Tests do not establish plastic tolerances, attachment force or grip strength. Intermediate assemblies may need hand support. The interface discloses the physical-testing boundary before building.
