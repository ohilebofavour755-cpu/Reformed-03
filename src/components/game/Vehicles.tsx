import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '@/game/store';
import { rt } from '@/game/runtime';
import { Model } from './Model';
function Vehicle({ id, kind }: { id: string; kind: 'car'|'bike' }) {
  const ref=useRef<THREE.Group>(null);
  useFrame(()=>{ const v=useGame.getState().vehicles.find(v=>v.id===id); if (ref.current && v) { ref.current.position.set(v.x,0,v.z); ref.current.rotation.y=v.heading; } });
  return <group ref={ref}><Model name={kind==='car'?'car':'bicycle'} size={kind==='car'?[1.9,1.5,4.2]:[.6,1.2,1.9]} /></group>;
}
function Smoke() {
  const ref=useRef<THREE.Group>(null);
  useFrame(()=>{ if (!ref.current) return; const left=rt.smoke.until-Date.now(); ref.current.visible=left>0; ref.current.position.set(rt.smoke.x,.8,rt.smoke.z); ref.current.children.forEach((c,i)=>{c.position.y=(4-left/1000)*.4+i*.2;c.scale.setScalar(.5+(4-left/1000)*.35);}); });
  return <group ref={ref}>{Array.from({length:7},(_,i)=><mesh key={i} position={[Math.sin(i*4)*.5,0,Math.cos(i*4)*.5]}><sphereGeometry args={[.4,8,6]} /><meshStandardMaterial color="#8b8e8c" transparent opacity={.4} depthWrite={false} /></mesh>)}</group>;
}
export function Vehicles() { const vehicles=useGame(s=>s.vehicles); return <><Suspense fallback={null}>{vehicles.map(v=><Vehicle key={v.id} id={v.id} kind={v.kind} />)}</Suspense><Smoke /></>; }
