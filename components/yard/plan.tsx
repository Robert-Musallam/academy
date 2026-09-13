'use client';
import { yard, observations, layerInfo, type Point } from '@/lib/yard/model';
import type { SceneProps } from './scene';
export function YardPlan(props: SceneProps) {
  const choose = (event: React.MouseEvent<SVGSVGElement>) => {
    const svg = event.currentTarget,
      p = svg.createSVGPoint();
    p.x = event.clientX;
    p.y = event.clientY;
    const matrix = svg.getScreenCTM();
    if (matrix) {
      const q = p.matrixTransform(matrix.inverse());
      if (q.x >= -24 && q.x <= 24 && q.y >= 0 && q.y <= 36)
        props.onPoint([Math.round(q.x * 2) / 2, Math.round(q.y * 2) / 2]);
    }
  };
  const pin = (p: Point, label: string, action: () => void) => (
    <g
      key={label}
      role="button"
      tabIndex={0}
      aria-label={`Map point ${label}`}
      onClick={(e) => {
        e.stopPropagation();
        action();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          action();
        }
      }}
    >
      <circle
        cx={p[0]}
        cy={p[1]}
        r={1.05}
        fill="#264f42"
        stroke="#fff7e5"
        strokeWidth={0.14}
      />
      <text
        x={p[0]}
        y={p[1] + 0.32}
        textAnchor="middle"
        fontSize=".9"
        fill="white"
        fontFamily="Arial"
      >
        {label}
      </text>
    </g>
  );
  if (props.tool === 'materials')
    return (
      <svg
        viewBox="0 0 100 100"
        className="yard-plan"
        aria-label="Accessible installation cutaway"
      >
        {[...layerInfo[props.material]].reverse().map((l, i) => (
          <g
            key={l.id}
            role="button"
            tabIndex={0}
            aria-label={`Inspect ${l.name}`}
            onClick={() => props.onLayer(l.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') props.onLayer(l.id);
            }}
          >
            <rect
              x={12}
              y={8 + i * 16}
              width={76}
              height={12}
              rx={2}
              fill={l.color}
              stroke={props.layer === l.id ? '#bd8537' : '#9ca08b'}
            />
            <text
              x={50}
              y={15 + i * 16}
              textAnchor="middle"
              fontSize={3.5}
              fill="#243c30"
            >
              {l.name}
            </text>
          </g>
        ))}
      </svg>
    );
  return (
    <svg
      viewBox="-27 -3 54 45"
      className="yard-plan"
      aria-label="Interactive overhead plan of training yard"
      onClick={choose}
    >
      <rect
        x={-24}
        y={0}
        width={48}
        height={36}
        fill="#d9ccae"
        stroke="#8c856b"
        strokeWidth={0.4}
      />
      <polygon
        points={yard.turf.map((p) => p.join(',')).join(' ')}
        fill={props.design.turf ? '#83a462' : '#b2a17e'}
        stroke="#6f8060"
        strokeWidth={0.2}
      />
      <rect x={6} y={4} width={10} height={8} fill="#8b795b" />
      <text x={11} y={8.5} textAnchor="middle" fontSize={0.9} fill="white">
        RETAIN BED
      </text>
      <rect
        x={8}
        y={28}
        width={12}
        height={8}
        fill={props.design.pavers ? '#c2a182' : '#b6b6aa'}
      />
      <text x={14} y={32} textAnchor="middle" fontSize={0.8}>
        PATIO
      </text>
      <rect x={-24} y={36} width={48} height={5} fill="#eee8db" />
      <text x={0} y={39.5} textAnchor="middle" fontSize={1.2} fill="#45574b">
        HOUSE
      </text>
      <rect x={-2} y={28} width={4} height={8} fill="#c9dcac" opacity={0.8} />
      <circle cx={-21} cy={30} r={2.5} fill="#779353" />
      <ellipse
        cx={-12}
        cy={28}
        rx={2.5}
        ry={1.5}
        fill="#6f979d"
        opacity={0.7}
      />
      <rect
        x={props.design.bench[0] - 3}
        y={props.design.bench[1] - 1}
        width={6}
        height={2}
        fill="#977047"
      />
      {props.tool === 'measure' && (
        <>
          <polyline
            points={(props.measureMode === 'boundary' && props.trace.length > 2
              ? [...props.trace, props.trace[0]]
              : props.measureMode === 'boundary'
                ? props.trace
                : props.tape
            )
              .map((p) => p.join(','))
              .join(' ')}
            fill="none"
            stroke="#d18c2c"
            strokeWidth={0.3}
          />
          {yard.turf.map((p, i) =>
            pin(p, String.fromCharCode(65 + i), () => props.onPoint(p)),
          )}
        </>
      )}
      {props.tool === 'slope' && (
        <>
          <path d="M -12 8 L -12 28" stroke="#408397" strokeWidth={0.3} />
          {yard.stations.map((s) =>
            pin(s.point, s.id, () => props.onStation(s.id)),
          )}
        </>
      )}
      {(props.tool === 'explore' || props.tool === 'customer') &&
        observations.map((o, i) =>
          pin(o.position, String(i + 1), () => props.onObserve(o.id)),
        )}
    </svg>
  );
}
