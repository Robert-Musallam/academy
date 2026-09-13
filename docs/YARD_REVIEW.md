# Human review — first playable landscape yard

Open http://127.0.0.1:3000/review/yard with the local dev server running. This replaces the text-only simulator checkpoint following Robert’s approval of the immersive prototype recommendation.

## Try the learning loop

1. **Explore:** orbit the property or use Walk. Inspect the low spot, doorway, tree and planted corner. Walk uses WASD, arrow keys, drag-to-look and hold-to-move screen controls. The camera remains inside the property and avoids the tree bed, retained planting bed and bench.
2. **Measure:** trace the lawn’s six corners in sequence. Click the 3D markers, click points on the ground, or use the matching A–F buttons. The tape tool reports horizontal distance. Area uses the plan footprint, not sloped surface area. Undo and clear are available.
3. **Slope:** read S1 and S2 and calculate the fall/run percentage. Arrows illustrate the defined terrain’s fall; no hydrology or drain sizing is simulated.
4. **Materials:** separate turf and paver assemblies, rotate the view and inspect layers. Try limestone chat and crushed granite breeze. Layer heights are exaggerated for readability; paver base/bedding specifications remain subject to approved local details.
5. **Design:** preview turf and pavers, move the bench by tapping the yard or using arrow controls, and test an intentionally blocked doorway. Restore a clear route.
6. **Homeowner:** ask Maya about the layout while the bench blocks the door, then change the layout and ask again. Ask about drainage before/after inspection. Replies use current scene context. This is explicitly scripted; natural dialogue, voice, avatars and sales-quality grading are not claimed.
7. **Debrief:** submit the area, order quantity and slope interpretation. The server checks calculations and submitted practice evidence against the fixed property. Feedback links back to the relevant scene tool. Save practice before leaving; chat and assessment also save. Session state and submitted answers restore after a page reload, but disappear when the preview server restarts or the session expires.

Review the spatial interaction, visual style, teaching accuracy, measurement tools, installation explanations and usefulness of feedback. Approval of this playable property is required before expanding the yard/material library and completing the remaining trainee interface.

## Reviewer reference

Synthetic 48 × 36 ft property, one scene unit per foot. Lawn plan: 34 × 24 ft outer rectangle minus a 10 × 8 ft notch = **736 sqft**. Turf with 10% waste: **809.6 sqft**. S1 elevation 0.66 ft; S2 0.06 ft; horizontal run 20 ft; fall **3% toward the house**. Numerical checks use inclusive ±5% tolerance; boundary traces also require the correct six corners in cyclic order, with 0.75 ft snapping tolerance. The existing patio footprint is 12 × 8 ft. The doorway exercise protects a 4-foot corridor. The tree marker is a synthetic exclusion zone, not a real root-protection prescription.

Both chat and granite breeze are intentionally accepted for this synthetic territory. Real territory settings require business review. The run inherits the configured default drop cap and snapshots it at start. Previously approved lifetime turf and 3-year other-material/labor guidance remains in force.

## Scope and validation

This is one property and one household from the six-persona roster. The 18 written scenarios are not yet 18 spatial environments. No gate completion or real trainee score is written. Submitted inspection flags are practice evidence; secure production assessment needs authenticated, persisted activity and the full Node 12 implementation.

The viewer supports desktop and phone layouts, plus an interactive 2D plan and a material diagram fallback. Desktop and phone viewport tests do not establish performance on every physical device. Actual headset VR, voice, photorealistic avatars, complete CAD editing, real-world engineering simulation and a full materials catalog are not part of this first review milestone.

All visible geometry is generated in code; no third-party model or image assets are bundled. Rendering uses Three.js 0.186.0 and React Three Fiber 9.7.0. React/ReactDOM are pinned to 19.2.8 to satisfy the renderer’s declared peer range; matching React types are pinned. Peer checks pass. Rendering runs on demand, with continuous updates while navigating; grass and small rocks use instanced geometry, and pixel ratio is capped at 1.5.

Implementation references: [React Three Fiber](https://github.com/pmndrs/react-three-fiber), [Three.js Raycaster](https://threejs.org/docs/pages/Raycaster.html), [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html).
