/** Synthetic training property. One scene unit = one foot; areas use plan view. */
export type Point = [number, number]; // x, z
export const yard = {
  id: 'willow-court-v1',
  name: 'The Willow Court backyard',
  version: 1,
  width: 48,
  depth: 36,
  turf: [
    [-18, 4],
    [6, 4],
    [6, 12],
    [16, 12],
    [16, 28],
    [-18, 28],
  ] as Point[],
  stations: [
    { id: 'S1', point: [-12, 8] as Point },
    { id: 'S2', point: [-12, 28] as Point },
  ],
  patio: { x: 14, z: 32, width: 12, depth: 8 },
  doorway: { x: 0, z: 36, width: 4 },
  tree: { x: -21, z: 30, radius: 2.5 },
} as const;
export function groundHeight(z: number) {
  return 0.9 - 0.03 * z;
}
export function distance(a: Point, b: Point) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}
export function polygonArea(points: Point[]) {
  return (
    Math.abs(
      points.reduce((s, p, i) => {
        const next = points[(i + 1) % points.length];
        return s + p[0] * next[1] - next[0] * p[1];
      }, 0),
    ) / 2
  );
}
export function signedSlope(a: Point, b: Point) {
  const run = distance(a, b);
  return run === 0
    ? null
    : (100 * (groundHeight(b[1]) - groundHeight(a[1]))) / run;
}
export function isTurfBoundary(points: Point[]) {
  if (points.length !== yard.turf.length) return false;
  return [points, [...points].reverse()].some((order) =>
    yard.turf.some((_, offset) =>
      order.every(
        (p, i) =>
          distance(p, yard.turf[(i + offset) % yard.turf.length]) <= 0.75,
      ),
    ),
  );
}
export const observations = [
  {
    id: 'drainage',
    name: 'The low spot',
    position: [-12, 28] as Point,
    kicker: 'READ THE GROUND',
    description:
      'Water staining and a shallow depression sit toward the house. Compare S1 and S2 before proposing a solution. A field drainage review is needed; this scene does not size drains.',
    question: 'Which way is this ground falling?',
  },
  {
    id: 'access',
    name: 'The back door',
    position: [0, 33] as Point,
    kicker: 'DESIGN FOR DAILY LIFE',
    description:
      'The family uses this door throughout the day. Keep the 4-foot-wide route from the door into the yard open. Furniture should not block it.',
    question: 'Can the family and dogs move through your layout?',
  },
  {
    id: 'tree',
    name: 'The established tree',
    position: [-21, 30] as Point,
    kicker: 'WORK WITH WHAT IS HERE',
    description:
      'Retain the tree and the marked planting area. Protect roots and preserve access for maintenance. This marker is a training exclusion zone, not an arborist’s root-zone calculation.',
    question: 'What needs to stay protected?',
  },
  {
    id: 'bed',
    name: 'The planted corner',
    position: [11, 8] as Point,
    kicker: 'MEASURE THE ACTUAL SHAPE',
    description:
      'The planting bed stays. It creates a notch in the lawn boundary. Trace around it instead of pricing a simple bounding rectangle.',
    question: 'Did you exclude the planting bed from your turf takeoff?',
  },
] as const;
export const layerInfo = {
  turf: [
    {
      id: 'subgrade',
      name: 'Prepared ground',
      color: '#8d6647',
      detail:
        'Grade 2–4 inches to meet existing surfaces. Review drainage and protect retained features before installing the base.',
    },
    {
      id: 'base',
      name: 'Compacted base',
      color: '#c6b790',
      detail:
        'Use 2–3 inches of the territory-approved base: limestone chat or crushed granite breeze. Compact and level it; do not assume one material is used everywhere.',
    },
    {
      id: 'backing',
      name: 'Hydroflow backing',
      color: '#e9e5d4',
      detail:
        'The white proprietary backing is micro-perforated for drainage and breathability. Compare the actual sample when explaining the product.',
    },
    {
      id: 'infill',
      name: 'Premium infill',
      color: '#b3b987',
      detail:
        'Power-broomed premium infill supports appearance and pet odor control. Explain the approved product rather than promising a maintenance-free yard.',
    },
    {
      id: 'surface',
      name: 'Turf blades',
      color: '#639544',
      detail:
        'Natural colors and blade structure create the finished surface. Turf carries a lifetime warranty; installation labor remains 3 years.',
    },
  ],
  pavers: [
    {
      id: 'subgrade',
      name: 'Prepared ground',
      color: '#8d6647',
      detail:
        'Inspect existing conditions and drainage. This cutaway illustrates the assembly; territory-approved installation specifications determine preparation.',
    },
    {
      id: 'base',
      name: 'Compacted support base',
      color: '#b6ad96',
      detail:
        'A prepared, compacted support layer helps the system perform. Base specification and depth require the approved local detail; they are not inferred from this model.',
    },
    {
      id: 'bedding',
      name: 'Bedding layer',
      color: '#dcd0b1',
      detail:
        'The bedding layer supports consistent paver placement. Confirm its material and thickness in the local installation specification.',
    },
    {
      id: 'surface',
      name: 'Paver surface & joints',
      color: '#b99c7d',
      detail:
        '45 mm pavers are taught for patios and foot traffic; 60 mm for driveways and heavy vehicle traffic. Sailor-style edger is included in the square footage. Materials and labor each carry a 3-year warranty.',
    },
  ],
} as const;
export type Material = keyof typeof layerInfo;
export type Design = {
  turf: boolean;
  pavers: boolean;
  bench: Point;
  base: 'limestone-chat' | 'granite-breeze' | 'washed-sand';
};
export const initialDesign: Design = {
  turf: false,
  pavers: false,
  bench: [-8, 32],
  base: 'limestone-chat',
};
export function layoutChecks(design: Design) {
  const [x, z] = design.bench; // bench footprint 6ft × 2ft
  return {
    doorwayClear: !(x + 3 > -2 && x - 3 < 2 && z + 1 > 28 && z - 1 < 36),
    insideYard: x - 3 >= -24 && x + 3 <= 24 && z - 1 >= 0 && z + 1 <= 36,
    treeClear:
      Math.hypot(
        Math.max(Math.abs(x - yard.tree.x) - 3, 0),
        Math.max(Math.abs(z - yard.tree.z) - 1, 0),
      ) >= yard.tree.radius,
  };
}
export type FieldAnswers = {
  area: number;
  order: number;
  slope: number;
  direction: 'toward-house' | 'away-house' | 'unsure';
};
export type FieldEvidence = {
  observed: string[];
  trace: Point[];
  stations: string[];
  layers: string[];
  design: Design;
};
export type FieldCheck = {
  id: string;
  label: string;
  points: number;
  max: number;
  passed: boolean;
  feedback: string;
  focus: 'measure' | 'slope' | 'explore' | 'materials' | 'design';
};
export function assessField(e: FieldEvidence, a: FieldAnswers) {
  const area = polygonArea(yard.turf),
    order = area * 1.1;
  const tolerance = (value: number, target: number) =>
    Number.isFinite(value) && Math.abs(value - target) <= target * 0.05 + 1e-9;
  const layout = layoutChecks(e.design);
  const entries: [
    string,
    string,
    number,
    boolean,
    string,
    FieldCheck['focus'],
  ][] = [
    [
      'trace',
      'Trace the irregular boundary',
      15,
      isTurfBoundary(e.trace),
      'Trace all six corners, including the notch around the retained planting bed.',
      'measure',
    ],
    [
      'area',
      'Calculate plan area',
      10,
      tolerance(a.area, area),
      `The L-shaped plan area is ${area} sqft: 34 × 24 minus 10 × 8. Surface slope does not change this plan-area exercise.`,
      'measure',
    ],
    [
      'order',
      'Allow 10% turf waste',
      10,
      tolerance(a.order, order),
      `Add 10% waste: ${area} × 1.10 = ${order.toFixed(1)} sqft for ordering.`,
      'measure',
    ],
    [
      'slope',
      'Measure and interpret the fall',
      15,
      e.stations.includes('S1') &&
        e.stations.includes('S2') &&
        tolerance(a.slope, 3) &&
        a.direction === 'toward-house',
      'S1 is 0.66 ft; S2 is 0.06 ft. A 0.60 ft fall over 20 horizontal feet = 3% toward the house.',
      'slope',
    ],
    [
      'observe',
      'Inspect drainage, access and tree',
      15,
      ['drainage', 'access', 'tree'].every((id) => e.observed.includes(id)),
      'Inspect the low spot, back door and established tree. Carry their constraints into your proposal.',
      'explore',
    ],
    [
      'base',
      'Select the approved turf base',
      10,
      e.design.base !== 'washed-sand',
      'Limestone chat and crushed granite breeze are accepted in this synthetic territory. Confirm the actual territory rule on a real job.',
      'materials',
    ],
    [
      'layers',
      'Explore both installation systems',
      10,
      e.layers.includes('turf:base') && e.layers.includes('pavers:surface'),
      'Inspect the turf base and the paver surface to compare methods, use and warranty.',
      'materials',
    ],
    [
      'layout',
      'Propose a usable layout',
      15,
      e.design.turf &&
        layout.doorwayClear &&
        layout.insideYard &&
        layout.treeClear,
      'Include the dog lawn, keep the marked doorway route clear, and place the bench within the yard and outside the tree bed.',
      'design',
    ],
  ];
  const checks: FieldCheck[] = entries.map(
    ([id, label, max, passed, feedback, focus]) => ({
      id,
      label,
      max,
      passed,
      points: passed ? max : 0,
      feedback,
      focus,
    }),
  );
  return {
    score: checks.reduce((s, c) => s + c.points, 0),
    checks,
    complete: checks.every((c) => c.passed),
  };
}
