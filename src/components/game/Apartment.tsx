import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { useGame } from '@/game/store';
import { ROOM_THEMES } from '@/game/catalog';
import { Model } from './Model';

function Floor() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const c = canvas.getContext('2d');
    if (c) { c.fillStyle = '#ae9882'; c.fillRect(0,0,256,256); for (let i=0;i<16;i++) { c.fillStyle = i % 2 ? '#a38c77' : '#b7a28c'; c.fillRect(0,i*16,256,15); c.strokeStyle='#8f7a66'; c.strokeRect((i%3)*50,i*16,130,16); } }
    const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4,4); return t;
  }, []);
  return <mesh rotation-x={-Math.PI/2} receiveShadow><planeGeometry args={[14,12]} /><meshStandardMaterial map={texture} roughness={.8} /></mesh>;
}
const furniture: { name: string; x: number; z: number; size: [number,number,number]; rotate?: number }[] = [
  { name:'bedDouble',x:-4.7,z:-3.6,size:[2.5,.85,3.8] },
  { name:'loungeSofa',x:-4.8,z:1.2,size:[1.8,1.1,3.2],rotate:Math.PI/2 },
  { name:'kitchenStove',x:.1,z:-5,size:[1.3,1.05,1.3] },
  { name:'kitchenSink',x:1.7,z:-5,size:[1.4,1.05,1.3] },
  { name:'kitchenFridge',x:3.6,z:-5,size:[1.2,2.2,1.3] },
  { name:'table',x:2.5,z:-.2,size:[2.1,.85,1.6] },
  { name:'desk',x:5.7,z:3,size:[1.3,.85,2.5],rotate:Math.PI/2 },
  { name:'laptop',x:5.7,z:3,size:[.65,.4,.5] },
  { name:'bookcaseClosedDoors',x:-1.7,z:-5.3,size:[1.7,2.4,.8] },
  { name:'toilet',x:-6,z:4.5,size:[1.1,1.1,1.2] },
];
export function Apartment() {
  const s=useGame(), theme=ROOM_THEMES.find(t=>t.id===s.roomTheme) ?? ROOM_THEMES[0];
  if (!theme) return null;
  return <group>
    <Floor />
    <mesh position={[0,1.6,-6]} receiveShadow><boxGeometry args={[14.3,3.2,.2]} /><meshStandardMaterial color={theme.wall} /></mesh>
    <mesh position={[-7,1.6,0]}><boxGeometry args={[.2,3.2,12]} /><meshStandardMaterial color={theme.wall} /></mesh>
    <mesh position={[7,.15,0]}><boxGeometry args={[.2,.3,12]} /><meshStandardMaterial color={theme.wall} /></mesh>
    <mesh position={[0,.12,6]}><boxGeometry args={[14,.24,.2]} /><meshStandardMaterial color={theme.wall} /></mesh>
    <mesh position={[0,.01,5.5]} rotation-x={-Math.PI/2}><planeGeometry args={[1.8,.8]} /><meshStandardMaterial color={theme.accent} /></mesh>
    <mesh position={[-4.5,.015,.9]} rotation-x={-Math.PI/2}><planeGeometry args={[3.9,4.5]} /><meshStandardMaterial color={theme.accent} roughness={1} /></mesh>
    <mesh position={[0,2,-5.87]}><boxGeometry args={[2.5,1.4,.05]} /><meshStandardMaterial color={theme.accent} metalness={.15} /></mesh>
    <pointLight position={[0,3.5,0]} intensity={15} distance={22} color="#fff0dd" />
    <Suspense fallback={null}>
      {furniture.map(f=><group key={f.name} position={[f.x,f.name==='laptop'?.86:0,f.z]} rotation-y={f.rotate ?? 0}><Model name={f.name} size={f.size} /></group>)}
      {s.decor.map(d=><group key={d.id} position={[d.x,0,d.z]} rotation-y={d.rotation}><Model name={d.kind==='plant'?'pottedPlant':d.kind==='lamp'?'lampRoundFloor':'bear'} size={d.kind==='lamp'?[.6,1.8,.6]:[.7,1,.7]} /></group>)}
    </Suspense>
  </group>;
}
