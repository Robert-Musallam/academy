'use client';
import dynamic from 'next/dynamic';
import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from 'react';
import Link from 'next/link';
import {
  yard,
  observations,
  layerInfo,
  initialDesign,
  polygonArea,
  distance,
  groundHeight,
  layoutChecks,
  type Point,
  type Material,
  type FieldEvidence,
  type FieldAnswers,
  type assessField,
} from '@/lib/yard/model';
import type { publicRun } from '@/lib/sim/engine';
import type { SceneProps, YardTool, CameraView } from './scene';
import { YardPlan } from './plan';
const Scene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => <div className="yard-loading">Preparing your property…</div>,
});
class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
const tools: { id: YardTool; name: string; icon: string }[] = [
  { id: 'explore', name: 'Explore', icon: '⌖' },
  { id: 'measure', name: 'Measure', icon: '↔' },
  { id: 'slope', name: 'Slope', icon: '∠' },
  { id: 'materials', name: 'Materials', icon: '▱' },
  { id: 'design', name: 'Design', icon: '▧' },
  { id: 'customer', name: 'Homeowner', icon: '◌' },
  { id: 'review', name: 'Debrief', icon: '✓' },
];
const initialEvidence: FieldEvidence = {
  observed: [],
  trace: [],
  stations: [],
  layers: [],
  design: initialDesign,
};
type Snapshot = {
  evidence: FieldEvidence;
  result?: ReturnType<typeof assessField>;
  answers?: FieldAnswers;
  run: ReturnType<typeof publicRun>;
};
export function YardLab() {
  const [tool, setTool] = useState<YardTool>('explore'),
    [view, setView] = useState<CameraView>('orbit'),
    [reset, setReset] = useState(0),
    [twoD, setTwoD] = useState(false),
    [ready, setReady] = useState(false);
  const [evidence, setEvidence] = useState<FieldEvidence>(initialEvidence),
    [selected, setSelected] = useState<string | null>(null),
    [measureMode, setMeasureMode] = useState<'boundary' | 'tape'>('boundary'),
    [tape, setTape] = useState<Point[]>([]),
    [material, setMaterial] = useState<Material>('turf'),
    [explode, setExplode] = useState(0.75),
    [layer, setLayer] = useState('base'),
    [placeBench, setPlaceBench] = useState(false),
    [movement, setMovement] = useState({ forward: 0, turn: 0 });
  const [run, setRun] = useState<Snapshot['run'] | null>(null),
    [result, setResult] = useState<Snapshot['result']>(),
    [text, setText] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [saved, setSaved] = useState(false),
    [showHint, setShowHint] = useState(false),
    [answers, setAnswers] = useState({
      area: '',
      order: '',
      slope: '',
      direction: 'unsure',
    });
  const logEnd = useRef<HTMLDivElement>(null);
  const onReady = useCallback(() => setReady(true), []);
  useEffect(() => {
    fetch('/review/yard/api')
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json() as Promise<Snapshot>;
      })
      .then((s) => {
        setEvidence(s.evidence);
        setRun(s.run);
        setResult(s.result);
        if (s.answers)
          setAnswers({
            area: String(s.answers.area),
            order: String(s.answers.order),
            slope: String(s.answers.slope),
            direction: s.answers.direction,
          });
      })
      .catch(() =>
        setError(
          'Could not load the local practice session. Reload to try again.',
        ),
      );
    const up = () => setMovement({ forward: 0, turn: 0 });
    window.addEventListener('pointerup', up);
    window.addEventListener('blur', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('blur', up);
    };
  }, []);
  useEffect(() => {
    logEnd.current?.scrollIntoView({ block: 'nearest' });
  }, [run?.messages.length]);
  const mutate = (fn: (value: FieldEvidence) => FieldEvidence) => {
    setEvidence(fn);
    setResult(undefined);
    setSaved(false);
  };
  const update = (change: Partial<FieldEvidence>) => {
    mutate((e) => ({ ...e, ...change }));
    setSaved(false);
  };
  const inspect = (id: string) => {
    setSelected(id);
    mutate((e) => ({ ...e, observed: [...new Set([...e.observed, id])] }));
    setSaved(false);
  };
  const inspectLayer = (id: string) => {
    setLayer(id);
    mutate((e) => ({
      ...e,
      layers: [...new Set([...e.layers, `${material}:${id}`])],
    }));
    setSaved(false);
  };
  const chooseTool = (next: YardTool) => {
    setTool(next);
    setPlaceBench(false);
    if (next === 'materials') inspectLayer(layer);
    if (next === 'measure' || next === 'slope') setView('plan');
    if (next === 'explore' || next === 'design' || next === 'customer')
      setView('orbit');
  };
  const choosePoint = (p: Point) => {
    if (tool === 'measure') {
      if (measureMode === 'tape')
        setTape((t) => (t.length >= 2 ? [p] : [...t, p]));
      else
        mutate((e) => ({
          ...e,
          trace:
            e.trace.length >= 12
              ? e.trace
              : e.trace.some((q) => distance(q, p) < 0.1)
                ? e.trace
                : [...e.trace, p],
        }));
    } else if (tool === 'design' && placeBench)
      update({ design: { ...evidence.design, bench: p } });
    setSaved(false);
  };
  const station = (id: string) => {
    mutate((e) => ({ ...e, stations: [...new Set([...e.stations, id])] }));
    setSaved(false);
  };
  async function post(body: object) {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/review/yard/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response
        .json()
        .catch(() => ({ error: 'Request failed. Try again.' }));
      if (!response.ok) throw new Error(data.error);
      setRun(data.run);
      setResult(data.result);
      setSaved(true);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed.');
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function chat(e: FormEvent) {
    e.preventDefault();
    if (await post({ action: 'chat', text, evidence })) setText('');
  }
  async function assess(e: FormEvent) {
    e.preventDefault();
    const values: FieldAnswers = {
      area: Number(answers.area),
      order: Number(answers.order),
      slope: Number(answers.slope),
      direction: answers.direction as FieldAnswers['direction'],
    };
    await post({ action: 'assess', answers: values, evidence });
  }
  const checks = layoutChecks(evidence.design),
    observation = observations.find((o) => o.id === selected),
    area = polygonArea(evidence.trace);
  const sceneProps: SceneProps = {
    tool,
    view,
    reset,
    trace: evidence.trace,
    tape,
    measureMode,
    observed: evidence.observed,
    selected,
    onObserve: inspect,
    onPoint: choosePoint,
    onStation: station,
    stations: evidence.stations,
    design: evidence.design,
    placeBench,
    material,
    explode,
    layer,
    onLayer: inspectLayer,
    movement,
    onReady,
  };
  const done = {
    explore: evidence.observed.length === 4,
    measure: evidence.trace.length === 6,
    slope: evidence.stations.length === 2,
    materials:
      evidence.layers.includes('turf:base') &&
      evidence.layers.includes('pavers:surface'),
    design: evidence.design.turf && checks.doorwayClear,
    customer: (run?.turns ?? 0) > 0,
    review: !!result?.complete,
  };
  const fallback = (
    <div className="yard-fallback">
      <p>Overhead practice view · 3D is unavailable on this browser.</p>
      <YardPlan {...sceneProps} />
    </div>
  );
  return (
    <div className="yard-app">
      <header className="yard-header">
        <Link href="/review" className="yard-brand">
          <b>A</b>
          <span>
            ACADEMY<small>ROCK N BLOCK</small>
          </span>
        </Link>
        <div className="yard-breadcrumb">
          FIELD LAB <span>/</span> PROPERTY 01
        </div>
        <div className="yard-header-right">
          <span className="yard-preview-dot" /> Playable preview{' '}
          <button
            onClick={() => post({ action: 'save', evidence })}
            disabled={busy || !run}
          >
            {saved ? 'Saved ✓' : 'Save practice'}
          </button>
        </div>
      </header>
      <div className="yard-body">
        <nav className="yard-toolrail" aria-label="Field tools">
          {tools.map((t, i) => (
            <button
              key={t.id}
              onClick={() => chooseTool(t.id)}
              aria-pressed={tool === t.id}
              className={done[t.id] ? 'complete' : ''}
            >
              <span className="yard-tool-icon" aria-hidden>
                {t.icon}
              </span>
              <span>{t.name}</span>
              <small>{done[t.id] ? '✓' : `0${i + 1}`}</small>
            </button>
          ))}
        </nav>
        <main
          className="yard-viewport"
          data-scene-ready={ready ? 'true' : 'false'}
        >
          <div
            className={
              twoD && tool !== 'materials' ? 'yard-scene plan' : 'yard-scene'
            }
          >
            {twoD && tool !== 'materials' ? (
              <YardPlan {...sceneProps} />
            ) : (
              <SceneBoundary fallback={fallback}>
                <Scene {...sceneProps} />
              </SceneBoundary>
            )}
          </div>
          <div className="yard-world-heading">
            <p>
              {tool === 'materials'
                ? 'MATERIAL EXPLORER / INSTALLATION SYSTEMS'
                : 'A FAMILY, TWO DOGS, A BETTER BACKYARD'}
            </p>
            <h1>
              {tool === 'materials'
                ? material === 'turf'
                  ? 'Under the surface.'
                  : 'Built layer by layer.'
                : 'The Willow Court backyard'}
            </h1>
            <span>
              {tool === 'materials'
                ? 'Rotate, separate, and inspect each layer.'
                : '48 × 36 ft property · Synthetic training scene'}
            </span>
          </div>
          <div className="yard-view-controls" aria-label="View controls">
            {tool !== 'materials' && (
              <>
                <button
                  aria-pressed={!twoD && view === 'orbit'}
                  onClick={() => {
                    setTwoD(false);
                    setView('orbit');
                  }}
                >
                  Orbit
                </button>
                <button
                  aria-pressed={!twoD && view === 'plan'}
                  onClick={() => {
                    setTwoD(false);
                    setView('plan');
                  }}
                >
                  Overhead
                </button>
                <button
                  aria-pressed={!twoD && view === 'walk'}
                  onClick={() => {
                    setTwoD(false);
                    setView('walk');
                  }}
                >
                  Walk
                </button>
              </>
            )}
            <button
              onClick={() => setReset((r) => r + 1)}
              aria-label="Reset camera"
            >
              ↺
            </button>
          </div>
          {tool === 'slope' && (
            <div className="yard-scene-legend">
              <i /> Elevation survey · arrows show the scene’s fall{' '}
              <small>
                Educational visualization; not a drainage simulation.
              </small>
            </div>
          )}
          {tool === 'materials' && (
            <div className="yard-explode-control">
              <div>
                <strong>Separate the layers</strong>
                <span>{Math.round(explode * 100)}%</span>
              </div>
              <input
                aria-label="Separate installation layers"
                type="range"
                min="0"
                max="1"
                step=".01"
                value={explode}
                onChange={(e) => setExplode(Number(e.target.value))}
              />
              <div>
                <small>Assembled</small>
                <small>Exploded view</small>
              </div>
              <p>Layer thicknesses exaggerated for visibility.</p>
            </div>
          )}
          {view === 'walk' && !twoD && tool !== 'materials' && (
            <div className="yard-walk-controls">
              <span>Drag to look · WASD to walk</span>
              <div>
                {[
                  {
                    label: 'Turn left',
                    symbol: '↶',
                    v: { forward: 0, turn: 1 },
                  },
                  {
                    label: 'Walk forward',
                    symbol: '↑',
                    v: { forward: 1, turn: 0 },
                  },
                  {
                    label: 'Walk backward',
                    symbol: '↓',
                    v: { forward: -1, turn: 0 },
                  },
                  {
                    label: 'Turn right',
                    symbol: '↷',
                    v: { forward: 0, turn: -1 },
                  },
                ].map((b) => (
                  <button
                    key={b.label}
                    aria-label={b.label}
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      setMovement(b.v);
                    }}
                    onPointerUp={() => setMovement({ forward: 0, turn: 0 })}
                    onPointerCancel={() => setMovement({ forward: 0, turn: 0 })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setMovement(b.v);
                    }}
                    onKeyUp={() => setMovement({ forward: 0, turn: 0 })}
                  >
                    {b.symbol}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="yard-world-footer">
            <span>
              {tool === 'measure'
                ? 'TAP CORNERS OR GROUND TO MEASURE'
                : tool === 'design' && placeBench
                  ? 'TAP THE GROUND TO PLACE THE BENCH'
                  : tool === 'materials'
                    ? 'TAP A LAYER TO INSPECT'
                    : view === 'walk'
                      ? 'EYE HEIGHT · 5.5 FT'
                      : 'DRAG TO ORBIT · SCROLL / PINCH TO ZOOM'}
            </span>
            {tool !== 'materials' && (
              <button onClick={() => setTwoD((d) => !d)}>
                {twoD ? 'Return to 3D' : '2D accessible plan'}
              </button>
            )}
          </div>
        </main>
        <aside className="yard-inspector" aria-label="Training notebook">
          <div className="yard-inspector-top">
            <span>YOUR FIELD NOTEBOOK</span>
            <span>{Object.values(done).filter(Boolean).length} / 7</span>
          </div>
          {error && (
            <p className="yard-error" role="alert">
              {error}
            </p>
          )}
          {tool === 'explore' && (
            <section>
              <p className="yard-kicker">01 / NOTICE BEFORE YOU PROPOSE</p>
              <h2>Get to know the yard.</h2>
              <p>
                Look beyond the empty space. Inspect the four markers and
                discover what your design needs to respect.
              </p>
              <div className="yard-observation-list">
                {observations.map((o, i) => (
                  <button
                    key={o.id}
                    aria-pressed={selected === o.id}
                    onClick={() => inspect(o.id)}
                  >
                    <b>{evidence.observed.includes(o.id) ? '✓' : i + 1}</b>
                    <span>{o.name}</span>
                    <span>↗</span>
                  </button>
                ))}
              </div>
              {observation ? (
                <article className="yard-note">
                  <span>{observation.kicker}</span>
                  <h3>{observation.name}</h3>
                  <p>{observation.description}</p>
                  <strong>{observation.question}</strong>
                </article>
              ) : (
                <article className="yard-note">
                  <span>THE CUSTOMER’S REQUEST</span>
                  <h3>“A yard we can actually use.”</h3>
                  <p>
                    Maya and Dan want less mud from the dogs and somewhere to
                    sit together. Your job is to connect the site, the materials
                    and their priorities.
                  </p>
                </article>
              )}
              <button
                className="yard-primary"
                onClick={() => chooseTool('measure')}
              >
                Take your measurements <span>→</span>
              </button>
            </section>
          )}
          {tool === 'measure' && (
            <section>
              <p className="yard-kicker">02 / MEASURE THE ACTUAL SHAPE</p>
              <h2>Every corner counts.</h2>
              <p>
                Trace the lawn around the retained bed. Scene measurements are
                in feet; area is measured in plan view.
              </p>
              <div className="yard-segment">
                <button
                  aria-pressed={measureMode === 'boundary'}
                  onClick={() => setMeasureMode('boundary')}
                >
                  Area trace
                </button>
                <button
                  aria-pressed={measureMode === 'tape'}
                  onClick={() => setMeasureMode('tape')}
                >
                  Tape measure
                </button>
              </div>
              <div className="yard-corner-buttons" aria-label="Survey corners">
                {yard.turf.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => choosePoint(p)}
                    aria-label={`Measure corner ${String.fromCharCode(65 + i)}`}
                    aria-pressed={evidence.trace.some(
                      (q) => distance(q, p) < 0.1,
                    )}
                  >
                    {String.fromCharCode(65 + i)}
                  </button>
                ))}
              </div>
              <p className="yard-small">
                Tap points in the scene or use the matching survey corner
                buttons.
              </p>
              {measureMode === 'boundary' ? (
                <>
                  <div className="yard-reading">
                    <small>YOUR TRACED PLAN AREA</small>
                    <strong>
                      {evidence.trace.length >= 3 ? area.toFixed(1) : '—'}
                      <em>sqft</em>
                    </strong>
                    <span>{evidence.trace.length} corners recorded</span>
                  </div>
                  <div className="yard-inline-actions">
                    <button
                      onClick={() =>
                        update({ trace: evidence.trace.slice(0, -1) })
                      }
                    >
                      Undo point
                    </button>
                    <button onClick={() => update({ trace: [] })}>
                      Clear trace
                    </button>
                  </div>
                  <p className="yard-small">
                    Trace order:{' '}
                    {evidence.trace.length
                      ? evidence.trace
                          .map((p) => {
                            const i = yard.turf.findIndex(
                              (q) => distance(q, p) < 0.1,
                            );
                            return i >= 0
                              ? String.fromCharCode(65 + i)
                              : `${p[0]},${p[1]}`;
                          })
                          .join(' → ')
                      : 'Start at any corner.'}
                  </p>
                </>
              ) : (
                <>
                  <div className="yard-reading">
                    <small>HORIZONTAL TAPE DISTANCE</small>
                    <strong>
                      {tape.length === 2
                        ? distance(tape[0], tape[1]).toFixed(2)
                        : '—'}
                      <em>ft</em>
                    </strong>
                    <span>
                      {tape.length === 0
                        ? 'Choose your first point.'
                        : tape.length === 1
                          ? 'Choose the second point.'
                          : 'Tap again to start another measurement.'}
                    </span>
                  </div>
                  <button
                    className="yard-text-button"
                    onClick={() => setTape([])}
                  >
                    Clear tape
                  </button>
                </>
              )}
              <article className="yard-note">
                <span>TAKEOFF CHALLENGE</span>
                <p>
                  How much turf would you order after allowing 10% waste? Enter
                  your answer in the debrief.
                </p>
                <button
                  className="yard-text-button"
                  onClick={() => setShowHint((v) => !v)}
                >
                  {showHint ? 'Hide hint' : 'Show a practice hint'}
                </button>
                {showHint && (
                  <p>
                    Split the L into rectangles, or subtract the planting notch
                    from the outer rectangle. Order quantity = plan area × 1.10.
                  </p>
                )}
              </article>
              <button
                className="yard-primary"
                onClick={() => chooseTool('slope')}
              >
                Read the ground <span>→</span>
              </button>
            </section>
          )}
          {tool === 'slope' && (
            <section>
              <p className="yard-kicker">03 / FOLLOW THE FALL</p>
              <h2>Where does water go?</h2>
              <p>
                Read both elevation stations. Calculate the fall over the
                horizontal distance, then consider what it means near the house.
              </p>
              <div className="yard-stations">
                {yard.stations.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => station(s.id)}
                    aria-label={`Read elevation ${s.id}`}
                  >
                    <span>{s.id}</span>
                    <strong>
                      {evidence.stations.includes(s.id)
                        ? `${groundHeight(s.point[1]).toFixed(2)} ft`
                        : 'Read station'}
                    </strong>
                    <small>
                      {s.id === 'S1'
                        ? 'Farther from the house'
                        : 'Closer to the house'}
                    </small>
                  </button>
                ))}
              </div>
              <div className="yard-reading">
                <small>HORIZONTAL RUN S1 → S2</small>
                <strong>
                  {evidence.stations.length === 2 ? '20.00' : '—'}
                  <em>ft</em>
                </strong>
              </div>
              <article className="yard-note">
                <span>THINK IN THREE DIMENSIONS</span>
                <p>
                  Slope (%) = elevation change ÷ horizontal run × 100.
                  Elevations use an arbitrary training datum.
                </p>
                <p>
                  Identify the concern and propose a field review before
                  promising a drainage solution.
                </p>
              </article>
              <button
                className="yard-primary"
                onClick={() => chooseTool('materials')}
              >
                Look under the surface <span>→</span>
              </button>
            </section>
          )}
          {tool === 'materials' && (
            <section>
              <p className="yard-kicker">04 / KNOW WHAT YOU ARE SELLING</p>
              <h2>Explore the assembly.</h2>
              <p>
                Separate the system and select a layer to learn its role. These
                are teaching models for your review.
              </p>
              <div className="yard-segment">
                {(['turf', 'pavers'] as Material[]).map((m) => (
                  <button
                    key={m}
                    aria-pressed={material === m}
                    onClick={() => {
                      setMaterial(m);
                      const id = m === 'turf' ? 'base' : 'surface';
                      setLayer(id);
                      mutate((e) => ({
                        ...e,
                        layers: [...new Set([...e.layers, `${m}:${id}`])],
                      }));
                    }}
                  >
                    {m === 'turf' ? 'Turf system' : 'Paver system'}
                  </button>
                ))}
              </div>
              <div className="yard-layer-list">
                {layerInfo[material].map((l, i) => (
                  <button
                    key={l.id}
                    aria-pressed={layer === l.id}
                    onClick={() => inspectLayer(l.id)}
                  >
                    <i style={{ background: l.color }} />
                    <span>{l.name}</span>
                    <small>{i + 1}</small>
                  </button>
                ))}
              </div>
              <article className="yard-note">
                <span>SELECTED LAYER</span>
                <h3>{layerInfo[material].find((l) => l.id === layer)?.name}</h3>
                <p>{layerInfo[material].find((l) => l.id === layer)?.detail}</p>
              </article>
              <label className="yard-label">
                Turf base for this training territory
                <select
                  value={evidence.design.base}
                  onChange={(e) =>
                    update({
                      design: {
                        ...evidence.design,
                        base: e.target.value as FieldEvidence['design']['base'],
                      },
                    })
                  }
                >
                  <option value="limestone-chat">Limestone chat</option>
                  <option value="granite-breeze">Crushed granite breeze</option>
                  <option value="washed-sand">Washed concrete sand</option>
                </select>
              </label>
              <p className="yard-small">
                This synthetic territory accepts chat or granite breeze. Actual
                area policies must be configured before rollout.
              </p>
              <button
                className="yard-primary"
                onClick={() => chooseTool('design')}
              >
                Shape the proposal <span>→</span>
              </button>
            </section>
          )}
          {tool === 'design' && (
            <section>
              <p className="yard-kicker">05 / DESIGN FOR THE WAY THEY LIVE</p>
              <h2>Make the space work.</h2>
              <p>
                Preview the lawn and patio finishes. Position the bench while
                protecting the tree and keeping the marked door route clear.
              </p>
              <label className="yard-toggle">
                <span>
                  <strong>Propose turf</strong>
                  <small>Replace the irregular bare lawn</small>
                </span>
                <input
                  type="checkbox"
                  checked={evidence.design.turf}
                  onChange={(e) =>
                    update({
                      design: { ...evidence.design, turf: e.target.checked },
                    })
                  }
                />
              </label>
              <label className="yard-toggle">
                <span>
                  <strong>Preview paver patio</strong>
                  <small>Existing 12 × 8 ft patio footprint</small>
                </span>
                <input
                  type="checkbox"
                  checked={evidence.design.pavers}
                  onChange={(e) =>
                    update({
                      design: { ...evidence.design, pavers: e.target.checked },
                    })
                  }
                />
              </label>
              <button
                className={'yard-place ' + (placeBench ? 'active' : '')}
                onClick={() => setPlaceBench((p) => !p)}
              >
                {placeBench
                  ? 'Tap the yard to place the bench'
                  : 'Move the bench in the yard'}{' '}
                ↔
              </button>
              <div
                className="yard-bench-controls"
                aria-label="Bench position controls"
              >
                {[
                  { label: 'Move bench left', dx: -2, dz: 0, s: '←' },
                  {
                    label: 'Move bench away from house',
                    dx: 0,
                    dz: -2,
                    s: '↑',
                  },
                  { label: 'Move bench toward house', dx: 0, dz: 2, s: '↓' },
                  { label: 'Move bench right', dx: 2, dz: 0, s: '→' },
                ].map((b) => (
                  <button
                    key={b.label}
                    aria-label={b.label}
                    onClick={() =>
                      update({
                        design: {
                          ...evidence.design,
                          bench: [
                            Math.max(
                              -21,
                              Math.min(21, evidence.design.bench[0] + b.dx),
                            ),
                            Math.max(
                              1,
                              Math.min(35, evidence.design.bench[1] + b.dz),
                            ),
                          ],
                        },
                      })
                    }
                  >
                    {b.s}
                  </button>
                ))}
              </div>
              <div
                className={
                  'yard-clearance ' + (checks.doorwayClear ? 'good' : 'bad')
                }
                role="status"
              >
                <strong>
                  {checks.doorwayClear
                    ? '✓ Door route is clear'
                    : '! Bench blocks the door route'}
                </strong>
                <p>
                  {checks.doorwayClear
                    ? 'The family can move between the house and yard.'
                    : 'Move the bench outside the marked 4-foot route.'}
                </p>
              </div>
              {(!checks.treeClear || !checks.insideYard) && (
                <p className="yard-error">
                  Keep the bench inside the property and outside the tree bed.
                </p>
              )}
              <div className="yard-inline-actions">
                <button
                  onClick={() =>
                    update({ design: { ...evidence.design, bench: [0, 33] } })
                  }
                >
                  Try a blocked layout
                </button>
                <button
                  onClick={() =>
                    update({ design: { ...evidence.design, bench: [-8, 32] } })
                  }
                >
                  Restore clear route
                </button>
              </div>
              <article className="yard-note">
                <span>EXPLAIN YOUR CHOICES</span>
                <p>
                  A good-looking plan still needs to serve the customer. Show
                  Maya why your materials and layout fit the dogs, the family,
                  and this property.
                </p>
              </article>
              <button
                className="yard-primary"
                onClick={() => chooseTool('customer')}
              >
                Talk with Maya <span>→</span>
              </button>
            </section>
          )}
          {tool === 'customer' && (
            <section className="yard-customer-section">
              <p className="yard-kicker">
                06 / CONNECT THE DESIGN TO THE CUSTOMER
              </p>
              <h2>Meet Maya.</h2>
              <div className="yard-mock-badge">
                SCRIPTED PREVIEW · NO LIVE AI
              </div>
              <p>
                Her replies respond to your inspections and proposed layout. Ask
                about priorities, the low spot, materials, budget, and next
                steps.
              </p>
              <div
                className="yard-chat-log"
                role="log"
                aria-label="Conversation with Maya"
              >
                {run?.messages.map((m, i) => (
                  <div className={'yard-chat-bubble ' + m.role} key={i}>
                    <small>{m.role === 'user' ? 'YOU' : 'MAYA'}</small>
                    <p>{m.content}</p>
                  </div>
                ))}
                <div ref={logEnd} />
              </div>
              <form onSubmit={chat}>
                <label className="sr-only" htmlFor="yard-reply">
                  Your message to Maya
                </label>
                <textarea
                  id="yard-reply"
                  rows={3}
                  placeholder="What matters most to you about this yard?"
                  maxLength={4000}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <div className="yard-chat-actions">
                  <small>{run?.turns ?? 0} / 40 turns</small>
                  <button
                    className="yard-primary"
                    disabled={
                      busy || !run || !text.trim() || (run?.turns ?? 0) >= 40
                    }
                  >
                    {busy ? 'Responding…' : 'Send ↑'}
                  </button>
                </div>
              </form>
              <p className="yard-small">
                This demonstrates scene-aware conversation. Sales-quality
                grading and natural dialogue will be validated after provider
                setup.
              </p>
              <button
                className="yard-text-button"
                onClick={() => chooseTool('review')}
              >
                Review your field work →
              </button>
            </section>
          )}
          {tool === 'review' && (
            <section>
              <p className="yard-kicker">07 / REVIEW THE DECISIONS</p>
              <h2>Your field debrief.</h2>
              <p>
                Submit your takeoff and slope interpretation. Checks use the
                property geometry and your recorded actions. This practice score
                does not count toward training completion.
              </p>
              <form onSubmit={assess} className="yard-answer-form">
                {[
                  {
                    id: 'area',
                    label: 'Lawn plan area (sqft)',
                    placeholder: 'Your measured area',
                  },
                  {
                    id: 'order',
                    label: 'Turf order with 10% waste (sqft)',
                    placeholder: 'Area plus waste',
                  },
                  {
                    id: 'slope',
                    label: 'Slope magnitude (%)',
                    placeholder: 'Fall ÷ run × 100',
                  },
                ].map((f) => (
                  <label className="yard-label" key={f.id}>
                    {f.label}
                    <input
                      required
                      type="number"
                      step="any"
                      min="0"
                      max={f.id === 'slope' ? 100 : 10000}
                      placeholder={f.placeholder}
                      value={answers[f.id as 'area' | 'order' | 'slope']}
                      onChange={(e) =>
                        setAnswers((a) => ({ ...a, [f.id]: e.target.value }))
                      }
                    />
                  </label>
                ))}
                <label className="yard-label">
                  Ground falls…
                  <select
                    value={answers.direction}
                    onChange={(e) =>
                      setAnswers((a) => ({ ...a, direction: e.target.value }))
                    }
                  >
                    <option value="unsure">Choose a direction</option>
                    <option value="toward-house">Toward the house</option>
                    <option value="away-house">Away from the house</option>
                  </select>
                </label>
                <button className="yard-primary" disabled={busy || !run}>
                  {busy ? 'Checking…' : 'Check my field work'} <span>→</span>
                </button>
              </form>
              {result && (
                <div className="yard-results" aria-label="Field assessment">
                  <div className="yard-field-score">
                    <span>
                      <small>GEOMETRY & SITE DECISIONS</small>
                      <strong>
                        {result.score}
                        <em>/100</em>
                      </strong>
                    </span>
                    <b>{result.complete ? 'Complete ✓' : 'Keep exploring'}</b>
                  </div>
                  {result.checks.map((c) => (
                    <details key={c.id} open={!c.passed}>
                      <summary>
                        <span>
                          {c.passed ? '✓' : '○'} {c.label}
                        </span>
                        <b>
                          {c.points}/{c.max}
                        </b>
                      </summary>
                      <p>{c.feedback}</p>
                      <button
                        onClick={() => {
                          chooseTool(c.focus);
                          if (c.focus === 'explore') setSelected('drainage');
                        }}
                      >
                        Revisit in the scene ↗
                      </button>
                    </details>
                  ))}
                </div>
              )}
            </section>
          )}
          <div className="yard-notebook-footer">
            <span>LEARN BY DOING</span>
            <small>Local practice · Save before reloading</small>
          </div>
        </aside>
      </div>
    </div>
  );
}
