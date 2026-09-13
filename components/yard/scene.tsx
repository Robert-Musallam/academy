'use client';
import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  yard,
  groundHeight,
  observations,
  layerInfo,
  layoutChecks,
  type Point,
  type Design,
  type Material,
} from '@/lib/yard/model';
export type YardTool =
  | 'explore'
  | 'measure'
  | 'slope'
  | 'materials'
  | 'design'
  | 'customer'
  | 'review';
export type CameraView = 'orbit' | 'plan' | 'walk';
export type SceneProps = {
  tool: YardTool;
  view: CameraView;
  reset: number;
  trace: Point[];
  tape: Point[];
  measureMode: 'boundary' | 'tape';
  observed: string[];
  selected: string | null;
  onObserve: (id: string) => void;
  onPoint: (p: Point) => void;
  onStation: (id: string) => void;
  stations: string[];
  design: Design;
  placeBench: boolean;
  material: Material;
  explode: number;
  layer: string;
  onLayer: (id: string) => void;
  movement: { forward: number; turn: number };
  onReady: () => void;
};
function Box({
  position = [0, 0, 0],
  size,
  color,
  rotation = [0, 0, 0],
  ...rest
}: {
  position?: [number, number, number];
  size: [number, number, number];
  color: string;
  rotation?: [number, number, number];
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}) {
  return (
    <mesh
      position={position}
      rotation={rotation}
      castShadow
      receiveShadow
      {...rest}
    >
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}
function Surface({
  points,
  color,
  lift = 0,
  onClick,
}: {
  points: Point[];
  color: string;
  lift?: number;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        points.flatMap(([x, z]) => [x, groundHeight(z) + lift, z]),
        3,
      ),
    );
    g.setIndex(
      THREE.ShapeUtils.triangulateShape(
        points.map(([x, z]) => new THREE.Vector2(x, z)),
        [],
      ).flat(),
    );
    g.computeVertexNormals();
    return g;
  }, [points, lift]);
  return (
    <mesh geometry={geometry} onClick={onClick} receiveShadow>
      <meshStandardMaterial
        color={color}
        roughness={1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
function PathLine({
  points,
  color = '#edbd55',
  closed = false,
  yOffset = 0.16,
}: {
  points: Point[];
  color?: string;
  closed?: boolean;
  yOffset?: number;
}) {
  const line = useMemo(() => {
    const positions = (
      closed && points.length ? [...points, points[0]] : points
    ).map(([x, z]) => new THREE.Vector3(x, groundHeight(z) + yOffset, z));
    return new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(positions),
      new THREE.LineBasicMaterial({ color, depthTest: false }),
    );
  }, [points, color, closed, yOffset]);
  useEffect(
    () => () => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    },
    [line],
  );
  return <primitive object={line} renderOrder={4} />;
}
function Label({
  text,
  position,
  color = '#244f3e',
  onClick,
  scale = 2.3,
}: {
  text: string;
  position: [number, number, number];
  color?: string;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  scale?: number;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const c = canvas.getContext('2d')!;
    c.beginPath();
    c.arc(64, 64, 50, 0, Math.PI * 2);
    c.fillStyle = color;
    c.fill();
    c.lineWidth = 4;
    c.strokeStyle = '#fffaea';
    c.stroke();
    c.font = 'bold 42px Arial';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#fff9e9';
    c.fillText(text, 64, 66);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite
      position={position}
      scale={[scale, scale, 1]}
      onClick={onClick}
      renderOrder={5}
    >
      <spriteMaterial map={texture} depthTest={false} transparent />
    </sprite>
  );
}
function Tree({
  x,
  z,
  small = false,
}: {
  x: number;
  z: number;
  small?: boolean;
}) {
  const h = groundHeight(z);
  return (
    <group position={[x, h, z]} scale={small ? 0.38 : 1}>
      <mesh position={[0, 4, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.7, 8, 7]} />
        <meshStandardMaterial color="#775b3b" />
      </mesh>
      {[
        [-2, 8, 0],
        [2, 8, 1],
        [0, 10, 0],
        [-1, 8.8, 2],
        [1, 8, -2],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow>
          <icosahedronGeometry args={[3.4, 1]} />
          <meshStandardMaterial
            color={['#758c51', '#80975d', '#8d9e64', '#718846', '#a0aa70'][i]}
            roughness={1}
          />
        </mesh>
      ))}
    </group>
  );
}
function Plant({ x, z, size = 1 }: { x: number; z: number; size?: number }) {
  return (
    <group position={[x, groundHeight(z), z]}>
      {Array.from({ length: 5 }, (_, i) => (
        <mesh
          key={i}
          position={[Math.sin(i * 1.3) * 0.4, 0.55, Math.cos(i * 1.3) * 0.4]}
          rotation={[0.25 * Math.sin(i), i * 1.25, 0.35 * Math.cos(i)]}
          castShadow
        >
          <coneGeometry args={[0.32 * size, 1.9 * size, 5]} />
          <meshStandardMaterial color={i % 2 ? '#789878' : '#526f5d'} />
        </mesh>
      ))}
    </group>
  );
}
const inside = (p: Point) => {
  const [x, z] = p;
  return x >= -18 && x <= 16 && z >= 4 && z <= 28 && !(x > 6 && z < 12);
};
function Scatter({ grass }: { grass: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const count = grass ? 2600 : 400;
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    let n = 0;
    for (let i = 0; n < count && i < count * 20; i++) {
      const x = (((i * 137.508) % 1000) / 1000) * 46 - 23,
        z = (((i * 79.371 + 21) % 1000) / 1000) * 34 + 1;
      if (grass ? !inside([x, z]) : inside([x, z]) || z > 28) continue;
      const size = 0.08 + (i % 9) * 0.012;
      dummy.position.set(x, groundHeight(z) + (grass ? 0.16 : 0.02), z);
      dummy.rotation.set(
        grass ? 0 : (i % 7) * 0.2,
        (i % 19) * 0.5,
        grass ? ((i % 7) - 3) * 0.07 : 0,
      );
      dummy.scale.set(
        grass ? 0.08 : size,
        grass ? 0.3 : size * 0.6,
        grass ? 0.08 : size,
      );
      dummy.updateMatrix();
      ref.current.setMatrixAt(n, dummy.matrix);
      ref.current.setColorAt(
        n,
        new THREE.Color(
          grass
            ? ['#709b49', '#95ad65', '#557e36', '#7da151'][i % 4]
            : ['#c2b49a', '#afa285', '#dfd0b3'][i % 3],
        ),
      );
      n++;
    }
    ref.current.count = n;
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [grass, count]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} receiveShadow>
      {grass ? (
        <coneGeometry args={[1, 1, 3]} />
      ) : (
        <icosahedronGeometry args={[1, 0]} />
      )}
      <meshStandardMaterial roughness={1} />
    </instancedMesh>
  );
}
function Fence() {
  return (
    <group>
      {[-24, 24].map((x) => (
        <group key={x}>
          {Array.from({ length: 37 }, (_, i) => (
            <Box
              key={i}
              position={[x, groundHeight(i) + 3, i]}
              size={[0.28, 6, 0.87]}
              color={i % 3 ? '#a8997a' : '#b2a181'}
            />
          ))}
          {[1.6, 4.5].map((y) => (
            <Box
              key={y}
              position={[x, y, 18]}
              size={[0.4, 0.25, 36]}
              color="#897958"
            />
          ))}
        </group>
      ))}
      {Array.from({ length: 49 }, (_, i) => i - 24)
        .filter((x) => Math.abs(x) > 4)
        .map((x) => (
          <Box
            key={x}
            position={[x, 2.4, 0]}
            size={[0.87, 3, 0.28]}
            color={x % 3 ? '#a8997a' : '#b2a181'}
          />
        ))}
      <Box position={[0, 2.4, 0]} size={[8, 3, 0.25]} color="#8a8069" />
      {[-4, 4].map((x) => (
        <Box
          key={x}
          position={[x, 2.7, 0]}
          size={[0.5, 4, 0.5]}
          color="#756c54"
        />
      ))}
    </group>
  );
}
function House() {
  return (
    <group>
      <Box position={[0, 4.8, 42]} size={[54, 9.2, 12]} color="#eee6d5" />
      <Box position={[0, 0.35, 36]} size={[54, 0.55, 0.5]} color="#c8bda6" />
      {[-13.4, 13.4].map((x, i) => (
        <Box
          key={x}
          position={[x, 10.25, 42]}
          size={[27.4, 0.5, 15]}
          color="#63716c"
          rotation={[0, 0, i ? -0.13 : 0.13]}
        />
      ))}
      <Box position={[0, 3.9, 35.89]} size={[4, 7.4, 0.2]} color="#555e54" />
      <Box position={[0, 4.65, 35.7]} size={[3.4, 4.8, 0.12]} color="#91b4b4" />
      <Box
        position={[1.5, 3, 35.57]}
        size={[0.12, 0.4, 0.15]}
        color="#c8b086"
      />
      {[-13, 13].map((x) => (
        <group key={x}>
          <Box position={[x, 4.6, 35.8]} size={[8, 4.6, 0.3]} color="#6f817c" />
          <Box position={[x, 4.6, 35.6]} size={[7.4, 4, 0.1]} color="#a7c7c3" />
          <Box
            position={[x, 4.6, 35.4]}
            size={[0.14, 4, 0.2]}
            color="#e4dccc"
          />
          <Box
            position={[x, 4.6, 35.4]}
            size={[7.4, 0.14, 0.2]}
            color="#e4dccc"
          />
        </group>
      ))}
    </group>
  );
}
function Patio({ proposed }: { proposed: boolean }) {
  return (
    <group>
      <Box position={[14, 0.25, 32]} size={[12, 0.3, 8]} color="#c4bcae" />
      {proposed &&
        Array.from({ length: 6 }, (_, i) =>
          Array.from({ length: 8 }, (_, j) => (
            <Box
              key={`${i}-${j}`}
              position={[9 + i * 2, 0.44, 28.5 + j]}
              size={[1.94, 0.15, 0.94]}
              color={['#c3ad8e', '#b6a07e', '#d0bea2'][(i + j) % 3]}
            />
          )),
        )}
      {[8.4, 19.6].map((x) =>
        [28.4, 35.4].map((z) => (
          <Box
            key={`${x}-${z}`}
            position={[x, 4.3, z]}
            size={[0.35, 8, 0.35]}
            color="#a29375"
          />
        )),
      )}
      {[8.4, 19.6].map((x) => (
        <Box
          key={x}
          position={[x, 8.2, 32]}
          size={[0.4, 0.5, 8.6]}
          color="#ac9e80"
        />
      ))}
      {Array.from({ length: 9 }, (_, i) => (
        <Box
          key={i}
          position={[14, 8.6, 28 + i]}
          size={[12.7, 0.3, 0.18]}
          color="#b0a386"
        />
      ))}
      <mesh position={[14, 2.1, 32]} castShadow>
        <cylinderGeometry args={[1.4, 1.4, 0.25, 20]} />
        <meshStandardMaterial color="#f0e5cf" />
      </mesh>
      <Box position={[14, 1.15, 32]} size={[0.3, 2, 0.3]} color="#657164" />
      {[-2, 2].map((x) => (
        <group key={x}>
          <Box
            position={[14 + x, 1.4, 32]}
            size={[1.4, 0.2, 1.5]}
            color="#798777"
          />
          <Box
            position={[14 + x, 2.15, 32.7]}
            size={[1.4, 1.7, 0.15]}
            color="#798777"
          />
          {[-0.5, 0.5].map((dx) => (
            <Box
              key={dx}
              position={[14 + x + dx, 0.7, 32]}
              size={[0.1, 1.4, 1]}
              color="#596956"
            />
          ))}
        </group>
      ))}
    </group>
  );
}
function Bench({ design }: { design: Design }) {
  const [x, z] = design.bench,
    clear = layoutChecks(design).doorwayClear;
  return (
    <group position={[x, groundHeight(z), z]}>
      <Box
        position={[0, 1.8, 0]}
        size={[6, 0.25, 2]}
        color={clear ? '#ba9568' : '#bf735a'}
      />
      <Box
        position={[0, 2.8, 0.8]}
        size={[6, 1.7, 0.2]}
        color={clear ? '#b08b61' : '#bf735a'}
      />
      {[-2.4, 2.4].map((x) => (
        <Box
          key={x}
          position={[x, 0.9, 0]}
          size={[0.2, 1.8, 1.7]}
          color="#4b5b4a"
        />
      ))}
    </group>
  );
}
function Ground(props: SceneProps) {
  const ground: Point[] = [
    [-24, 0],
    [24, 0],
    [24, 36],
    [-24, 36],
  ];
  const point = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 5) return;
    e.stopPropagation();
    props.onPoint([
      Math.round(e.point.x * 2) / 2,
      Math.round(e.point.z * 2) / 2,
    ]);
  };
  return (
    <group>
      <Box position={[0, -1.2, 18]} size={[48, 1.8, 36]} color="#a78b65" />
      <Surface points={ground} color="#d6c8a6" onClick={point} />
      <Surface
        points={yard.turf}
        color={props.design.turf ? '#7c9c53' : '#ac9871'}
        lift={0.04}
        onClick={point}
      />
      <Surface
        points={[
          [6, 4],
          [16, 4],
          [16, 12],
          [6, 12],
        ]}
        color="#887553"
        lift={0.06}
        onClick={point}
      />
      <PathLine points={yard.turf} color="#d9cba4" closed />
      <Scatter grass={false} />
      {props.design.turf && <Scatter grass />}
      <House />
      <Fence />
      <Patio proposed={props.design.pavers} />
      <Bench design={props.design} />
      <Tree x={-21} z={30} />
      <mesh
        position={[-21, groundHeight(30) + 0.05, 30]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[2.5, 32]} />
        <meshStandardMaterial color="#9c8860" />
      </mesh>
      {[
        [-22, 5],
        [-22, 12],
        [-22, 19],
        [20, 8],
        [20, 15],
        [20, 23],
        [8, 6],
        [12, 7],
        [14, 10],
      ].map(([x, z], i) => (
        <Plant key={i} x={x} z={z} size={i % 3 === 0 ? 1.4 : 1} />
      ))}
      <mesh
        position={[-12, groundHeight(28) + 0.09, 28]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[1.8, 1, 1]}
        onClick={(e) => {
          e.stopPropagation();
          props.onObserve('drainage');
        }}
      >
        <circleGeometry args={[1.6, 32]} />
        <meshStandardMaterial
          color="#779595"
          roughness={0.3}
          transparent
          opacity={0.72}
        />
      </mesh>
      {(props.tool === 'explore' || props.tool === 'customer') &&
        observations.map((o, i) => (
          <Label
            key={o.id}
            text={props.observed.includes(o.id) ? '✓' : String(i + 1)}
            color={
              props.selected === o.id
                ? '#ca8c39'
                : props.observed.includes(o.id)
                  ? '#4f7655'
                  : '#21483e'
            }
            position={[
              o.position[0],
              groundHeight(o.position[1]) + 2.4,
              o.position[1],
            ]}
            onClick={(e) => {
              e.stopPropagation();
              props.onObserve(o.id);
            }}
          />
        ))}
      {props.tool === 'measure' &&
        yard.turf.map((p, i) => (
          <Label
            key={i}
            text={String.fromCharCode(65 + i)}
            position={[p[0], groundHeight(p[1]) + 1, p[1]]}
            color="#42635b"
            scale={1.7}
            onClick={(e) => {
              e.stopPropagation();
              props.onPoint(p);
            }}
          />
        ))}
      {props.tool === 'measure' && (
        <PathLine
          points={props.measureMode === 'boundary' ? props.trace : props.tape}
          closed={props.measureMode === 'boundary' && props.trace.length > 2}
        />
      )}
      {props.tool === 'slope' && (
        <>
          <PathLine
            points={yard.stations.map((s) => s.point)}
            color="#59a9c4"
          />
          {yard.stations.map((s) => (
            <Label
              key={s.id}
              text={s.id}
              position={[
                s.point[0],
                groundHeight(s.point[1]) + 1.4,
                s.point[1],
              ]}
              color={props.stations.includes(s.id) ? '#ca8c39' : '#287287'}
              onClick={(e) => {
                e.stopPropagation();
                props.onStation(s.id);
              }}
            />
          ))}
          {[12, 16, 20, 24].map((z) => (
            <mesh
              key={z}
              position={[-12, groundHeight(z) + 0.23, z]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <coneGeometry args={[0.4, 1.2, 3]} />
              <meshBasicMaterial color="#579da8" />
            </mesh>
          ))}
        </>
      )}
      {props.tool === 'design' && (
        <>
          <Surface
            points={[
              [-2, 28],
              [2, 28],
              [2, 36],
              [-2, 36],
            ]}
            color={
              layoutChecks(props.design).doorwayClear ? '#b5c996' : '#da9b77'
            }
            lift={0.16}
            onClick={point}
          />
          <PathLine
            points={[
              [-2, 28],
              [2, 28],
              [2, 36],
              [-2, 36],
            ]}
            closed
            color="#d8e3b7"
          />
          <Label
            text="↔"
            position={[props.design.bench[0], 4, props.design.bench[1]]}
            color={props.placeBench ? '#bc8847' : '#506b50'}
          />
        </>
      )}
    </group>
  );
}
function SampleGrass() {
  const ref = useRef<THREE.InstancedMesh>(null!);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    for (let i = 0; i < 576; i++) {
      o.position.set(
        -3.8 + (i % 24) * 0.33,
        0.55,
        -3.8 + Math.floor(i / 24) * 0.33,
      );
      o.updateMatrix();
      ref.current.setMatrixAt(i, o.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 576]}>
      <coneGeometry args={[0.1, 0.6, 3]} />
      <meshStandardMaterial color="#789e48" />
    </instancedMesh>
  );
}
function MaterialAssembly(props: SceneProps) {
  const layers = layerInfo[props.material];
  return (
    <group>
      {layers.map((l, i) => {
        const y = i * (0.55 + props.explode * 1.5);
        return (
          <group
            key={l.id}
            position={[0, y, 0]}
            onClick={(e) => {
              e.stopPropagation();
              props.onLayer(l.id);
            }}
          >
            <Box
              size={[8, 0.5, 8]}
              color={props.layer === l.id ? '#d9b865' : l.color}
            />
            {l.id === 'surface' &&
              props.material === 'pavers' &&
              Array.from({ length: 4 }, (_, col) =>
                Array.from({ length: 8 }, (_, row) => (
                  <Box
                    key={`${col}-${row}`}
                    size={[1.94, 0.24, 0.94]}
                    position={[-3 + col * 2, 0.37, -3.5 + row]}
                    color={(col + row) % 3 ? '#c2a889' : '#b09879'}
                  />
                )),
              )}
            {l.id === 'surface' && props.material === 'turf' && <SampleGrass />}
            <Label
              text={String(i + 1)}
              position={[5, 0.2, 0]}
              scale={1.2}
              color={props.layer === l.id ? '#bd8537' : '#365a4a'}
              onClick={(e) => {
                e.stopPropagation();
                props.onLayer(l.id);
              }}
            />
          </group>
        );
      })}
      <gridHelper
        args={[18, 18, '#c9c2b1', '#dcd6c7']}
        position={[0, -0.6, 0]}
      />
    </group>
  );
}
function CameraRig({
  view,
  tool,
  reset,
  movement,
  design,
}: {
  view: CameraView;
  tool: YardTool;
  reset: number;
  movement: SceneProps['movement'];
  design: Design;
}) {
  const { camera, gl, size, invalidate } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  const pressed = useRef(new Set<string>());
  const yaw = useRef(0);
  const pitch = useRef(-0.05);
  const drag = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement);
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.minDistance = 10;
    c.maxDistance = 110;
    c.maxPolarAngle = Math.PI * 0.48;
    controls.current = c;
    const changed = () => invalidate();
    c.addEventListener('change', changed);
    return () => {
      c.removeEventListener('change', changed);
      c.dispose();
    };
  }, [camera, gl, invalidate]);
  useEffect(() => {
    const c = controls.current!;
    c.enabled = view !== 'walk';
    c.enableRotate = true;
    const fit = Math.max(1.1, 1.25 / (size.width / size.height));
    camera.up.set(0, 1, 0);
    if (tool === 'materials') {
      camera.position.set(15 * fit, 3 + 11 * fit, 18 * fit);
      c.target.set(0, 3, 0);
      camera.lookAt(0, 3, 0);
      c.enabled = true;
      c.maxPolarAngle = Math.PI * 0.49;
      c.minDistance = 8;
    } else if (view === 'plan') {
      camera.position.set(
        0,
        Math.max(72, 68 / (size.width / size.height)),
        18.01,
      );
      c.target.set(0, 0, 18);
      camera.lookAt(0, 0, 18);
      c.enableRotate = false;
    } else if (view === 'walk') {
      camera.position.set(0, 6.2, 4);
      yaw.current = Math.PI;
      pitch.current = -0.06;
      camera.rotation.order = 'YXZ';
      camera.rotation.set(pitch.current, yaw.current, 0);
    } else {
      camera.position.set(53 * fit, 44 * fit, 19 - 54 * fit);
      c.target.set(0, 1, 19);
      camera.lookAt(0, 1, 19);
      c.enableRotate = true;
    }
    c.update();
  }, [camera, view, tool, reset, size.width, size.height]);
  useEffect(() => {
    const key = (e: KeyboardEvent, down: boolean) => {
      if ((e.target as HTMLElement)?.closest('input,textarea,select')) return;
      if (
        [
          'w',
          'a',
          's',
          'd',
          'arrowup',
          'arrowdown',
          'arrowleft',
          'arrowright',
        ].includes(e.key.toLowerCase())
      ) {
        if (view === 'walk') e.preventDefault();
        if (down) pressed.current.add(e.key.toLowerCase());
        else pressed.current.delete(e.key.toLowerCase());
        invalidate();
      }
    };
    const down = (e: KeyboardEvent) => key(e, true),
      up = (e: KeyboardEvent) => key(e, false),
      blur = () => pressed.current.clear();
    const pointerDown = (e: PointerEvent) => {
      if (view === 'walk') {
        drag.current = { x: e.clientX, y: e.clientY };
      }
    };
    const move = (e: PointerEvent) => {
      if (!drag.current || view !== 'walk') return;
      yaw.current -= (e.clientX - drag.current.x) * 0.004;
      pitch.current = THREE.MathUtils.clamp(
        pitch.current - (e.clientY - drag.current.y) * 0.003,
        -1.1,
        0.8,
      );
      drag.current = { x: e.clientX, y: e.clientY };
      invalidate();
    };
    const release = () => {
      drag.current = null;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    gl.domElement.addEventListener('pointerdown', pointerDown);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      gl.domElement.removeEventListener('pointerdown', pointerDown);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
    };
  }, [gl, view, invalidate]);
  useFrame((_, dt) => {
    if (view === 'walk' && tool !== 'materials') {
      const keys = pressed.current;
      const speed = Math.min(dt, 0.05) * 8;
      const forward =
        movement.forward +
        (keys.has('w') || keys.has('arrowup') ? 1 : 0) -
        (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
      const sideways = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0);
      yaw.current +=
        (movement.turn +
          (keys.has('arrowleft') ? 1 : 0) -
          (keys.has('arrowright') ? 1 : 0)) *
        Math.min(dt, 0.05) *
        1.4;
      const previous = camera.position.clone();
      camera.position.x = THREE.MathUtils.clamp(
        camera.position.x +
          (-Math.sin(yaw.current) * forward +
            Math.cos(yaw.current) * sideways) *
            speed,
        -22,
        22,
      );
      camera.position.z = THREE.MathUtils.clamp(
        camera.position.z +
          (-Math.cos(yaw.current) * forward -
            Math.sin(yaw.current) * sideways) *
            speed,
        2,
        34,
      );
      const x = camera.position.x,
        z = camera.position.z;
      const blocked =
        Math.hypot(x - yard.tree.x, z - yard.tree.z) < 3 ||
        (x > 5.6 && x < 16.4 && z > 3.6 && z < 12.4) ||
        (Math.abs(x - design.bench[0]) < 3.4 &&
          Math.abs(z - design.bench[1]) < 1.4);
      if (blocked) camera.position.copy(previous);
      camera.position.y = groundHeight(camera.position.z) + 5.5;
      camera.rotation.set(pitch.current, yaw.current, 0);
      if (
        pressed.current.size ||
        movement.forward ||
        movement.turn ||
        drag.current
      )
        invalidate();
    } else if (controls.current?.update()) invalidate();
  });
  return null;
}
function Ready({ onReady }: { onReady: () => void }) {
  const called = useRef(false);
  useFrame(() => {
    if (!called.current) {
      called.current = true;
      onReady();
    }
  });
  return null;
}
export default function YardScene(props: SceneProps) {
  return (
    <Canvas
      frameloop="demand"
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [53, 44, -35], fov: 43, near: 0.1, far: 250 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      }}
      onCreated={({ gl }) => {
        gl.setClearColor('#e4e9dd');
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.95;
      }}
      aria-label={
        props.tool === 'materials'
          ? 'Interactive installation cutaway'
          : 'Interactive 3D training yard'
      }
    >
      <color
        attach="background"
        args={[props.tool === 'materials' ? '#e9e7dd' : '#e4e9dd']}
      />
      <ambientLight intensity={0.5} />
      <hemisphereLight args={['#e2edf3', '#c5bca0', 1.15]} />
      <directionalLight
        position={[-25, 48, -18]}
        intensity={2.0}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={65}
        shadow-camera-bottom={-25}
        shadow-camera-far={150}
        shadow-bias={-0.0003}
        shadow-normalBias={0.08}
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -2.15, 18]}
        receiveShadow
      >
        <planeGeometry args={[240, 240]} />
        <meshStandardMaterial
          color={props.tool === 'materials' ? '#e9e7dd' : '#dde3d3'}
          roughness={1}
        />
      </mesh>
      {props.tool === 'materials' ? (
        <MaterialAssembly {...props} />
      ) : (
        <Ground {...props} />
      )}
      <CameraRig
        view={props.view}
        tool={props.tool}
        reset={props.reset}
        movement={props.movement}
        design={props.design}
      />
      <Ready onReady={props.onReady} />
    </Canvas>
  );
}
