import { apartmentBlocked, inRect, moveSwept } from './apartment';
import { cityBlocked } from '../world';
import type { OwnedVehicle } from './mobility';

export interface SolidVehicle { x: number; z: number; heading: number; kind: 'car' | 'bike'; id?: string }
export function vehicleBlocked(x: number, z: number, v: SolidVehicle, radius = 0.4) {
  const dx = x - v.x, dz = z - v.z, c = Math.cos(v.heading), s = Math.sin(v.heading);
  return inRect(dx * c - dz * s, dx * s + dz * c, { x: 0, z: 0, hx: v.kind === 'car' ? 0.95 : 0.3, hz: v.kind === 'car' ? 2.1 : 0.95 }, radius);
}
export function movementBlocked(x: number, z: number, inside: boolean, decor: { x: number; z: number }[], vehicles: SolidVehicle[], radius = 0.4, ignore?: string) {
  if (inside) return apartmentBlocked(x, z, radius, decor.map(d => ({ ...d, hx: 0.35, hz: 0.35 })));
  return cityBlocked(x, z, radius) || vehicles.some(v => v.id !== ignore && vehicleBlocked(x, z, v, radius));
}
export function movePlayer(p: { x: number; z: number }, dx: number, dz: number, inside: boolean, decor: { x: number; z: number }[], vehicles: SolidVehicle[], radius = 0.4, ignore?: string) {
  return moveSwept(p, dx, dz, (x, z) => movementBlocked(x, z, inside, decor, vehicles, radius, ignore));
}
export function trafficSolids(cars: { x: number; z: number; dir: number }[], owned: OwnedVehicle[]): SolidVehicle[] {
  return [...owned, ...cars.map((c, i) => ({ x: c.x, z: c.z, kind: 'car' as const, heading: [0, Math.PI, Math.PI / 2, -Math.PI / 2][c.dir] ?? 0, id: `traffic-${i}` }))];
}