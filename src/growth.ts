export interface Point {
  x: number;
  y: number;
}

export type Condition =
  | { type: 'age'; minimum: number }
  | { type: 'chance'; percent: number; key: number }
  | { type: 'light'; lit: boolean }
  | { type: 'crowded'; radius: number }
  | { type: 'stem'; main: boolean }
  | { type: 'height'; minimum: number };

export type Action =
  | { type: 'extend'; distance: number }
  | { type: 'split'; angle: number }
  | { type: 'sprout'; angle: number }
  | { type: 'bend'; angle: number }
  | { type: 'climb' | 'stop' | 'leaf' | 'flower' }
  | { type: 'if'; condition: Condition; actions: Action[] };

export interface BranchAppearance {
  age: number;
  thickness: number;
  color: string | null;
  foliage: Foliage;
}

export type Foliage = 'oak' | 'fern' | 'ivy' | 'coral';

export interface Program {
  buds: Action[];
  branches: BranchAppearance | null;
}

export interface Bud extends Point {
  id: number;
  age: number;
  depth: number;
  heading: number;
  sideShoots: number;
  fork?: Point;
}

export interface Segment {
  from: Point;
  to: Point;
  depth: number;
  age: number;
  id: number;
  budId: number;
  born: number;
}

export interface Bloom extends Point {
  type: 'leaf' | 'flower';
  heading: number;
}

export interface Plant {
  generation: number;
  buds: Bud[];
  segments: Segment[];
  blooms: Bloom[];
  nextId: number;
  chanceSeed: number;
}

export const MAX_GENERATION = 35;
export const UNITS_PER_METRE = 25;
export const RULER_HEIGHT = 20;
export const DEFAULT_SUN: Point = { x: 155, y: -510 };
const MAX_BUDS = 256;
const MAX_SEGMENTS = 6_000;
const SEED = 2187;

export function sample(key: number, seed = SEED): number {
  let hash = Math.imul(key ^ seed, 0x45d9f3b);
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  return ((hash ^ (hash >>> 16)) >>> 0) / 0x1_0000_0000;
}

export function seedPlant(chanceSeed = Math.floor(Math.random() * 0x1_0000_0000)): Plant {
  return {
    generation: 0,
    buds: [{ id: 1, x: 0, y: 0, heading: 0, depth: 0, age: 0, sideShoots: 0 }],
    segments: [],
    blooms: [],
    nextId: 2,
    chanceSeed,
  };
}

export function reachedLimit(plant: Plant): boolean {
  return plant.generation >= MAX_GENERATION || plant.segments.length >= MAX_SEGMENTS;
}

export function finished(plant: Plant): boolean {
  return reachedLimit(plant) || plant.buds.length === 0;
}

function angleBetween(x: number, y: number): number {
  return Math.atan2(Math.sin(x - y), Math.cos(x - y));
}

function distanceSquared(a: Point, b: Point): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

function segmentDistanceSquared(point: Point, segment: Segment): number {
  const { from, to } = segment;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return distanceSquared(point, from);
  const fraction = ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared;
  const t = Math.min(1, Math.max(0, fraction));
  return distanceSquared(point, { x: from.x + t * dx, y: from.y + t * dy });
}

function blocksLight(bud: Bud, sun: Point, segment: Segment): boolean {
  if (segment.budId === bud.id) return false;
  const rayX = sun.x - bud.x;
  const rayY = sun.y - bud.y;
  const segmentX = segment.to.x - segment.from.x;
  const segmentY = segment.to.y - segment.from.y;
  const determinant = rayX * segmentY - rayY * segmentX;
  if (Math.abs(determinant) < 1e-6) return false;
  const offsetX = segment.from.x - bud.x;
  const offsetY = segment.from.y - bud.y;
  const rayT = (offsetX * segmentY - offsetY * segmentX) / determinant;
  const segmentT = (offsetX * rayY - offsetY * rayX) / determinant;
  return rayT < 1 && rayT > 0 && rayT ** 2 * (rayX ** 2 + rayY ** 2) > 12 ** 2
    && segmentT >= 0 && segmentT <= 1;
}

interface GrowthContext {
  next: Plant;
  existingSegments: Segment[];
  sun: Point;
  wallX: number | null;
  budSlots: number;
}

function matches(condition: Condition, bud: Bud, context: GrowthContext): boolean {
  switch (condition.type) {
    case 'age': return bud.age >= condition.minimum;
    case 'chance': {
      const key = Math.imul(bud.id, 0x9e3779b1) ^ Math.imul(context.next.generation, 0x85ebca6b) ^ condition.key;
      return sample(key, context.next.chanceSeed) * 100 < condition.percent;
    }
    case 'height': return -bud.y >= condition.minimum * UNITS_PER_METRE;
    case 'stem': return condition.main === (bud.depth === 0);
    case 'light': return condition.lit !== context.existingSegments.some((segment) => blocksLight(bud, context.sun, segment));
    case 'crowded': {
      const threshold = (condition.radius * UNITS_PER_METRE) ** 2;
      if (bud.fork && distanceSquared(bud, bud.fork) <= threshold) return false;
      return context.existingSegments.some((segment) => segment.budId !== bud.id && segmentDistanceSquared(bud, segment) < threshold);
    }
  }
}

function addSideBud(bud: Bud, next: Plant, angle: number): void {
  next.buds.push({
    ...bud,
    fork: { x: bud.x, y: bud.y }, id: next.nextId++, age: 0, depth: bud.depth + 1,
    heading: bud.heading + angle, sideShoots: 0,
  });
}

function runActions(bud: Bud, actions: Action[], context: GrowthContext): boolean {
  const { next, sun, wallX } = context;
  for (const action of actions) {
    switch (action.type) {
      case 'extend': {
        if (next.segments.length >= MAX_SEGMENTS) return false;
        const id = next.nextId++;
        const from = { x: bud.x, y: bud.y };
        const sway = (sample(id * 3) - 0.5) * (bud.depth === 0 ? 0.08 : 0.22);
        bud.heading = angleBetween(bud.heading, 0) * 0.94 + sway;
        const distance = action.distance * UNITS_PER_METRE;
        bud.x += Math.sin(bud.heading) * distance;
        bud.y -= Math.cos(bud.heading) * distance;
        if (wallX !== null) bud.x = Math.min(bud.x, wallX - 4);
        next.segments.push({ from, to: { x: bud.x, y: bud.y }, id, depth: bud.depth, age: bud.age, budId: bud.id, born: next.generation });
        break;
      }
      case 'bend': {
        if (distanceSquared(bud, sun) < 1) break;
        const target = Math.atan2(sun.x - bud.x, bud.y - sun.y);
        const turn = angleBetween(target, bud.heading);
        const maximum = action.angle * Math.PI / 180;
        bud.heading += Math.max(-maximum, Math.min(maximum, turn));
        break;
      }
      case 'climb': {
        if (wallX === null) break;
        const gap = wallX - 4 - bud.x;
        bud.heading = gap <= 8 ? 0 : Math.atan2(gap, 55);
        break;
      }
      case 'sprout': {
        if (context.budSlots < 2) break;
        const direction = bud.sideShoots++ % 2 === 0 ? -1 : 1;
        addSideBud(bud, next, action.angle * Math.PI / 180 * direction);
        context.budSlots--;
        break;
      }
      case 'split': {
        if (context.budSlots < 2) break;
        const radians = action.angle * Math.PI / 180;
        addSideBud(bud, next, -radians);
        addSideBud(bud, next, radians);
        return false;
      }
      case 'leaf':
      case 'flower':
        next.blooms.push({ type: action.type, x: bud.x, y: bud.y, heading: bud.heading });
        return false;
      case 'stop': return false;
      case 'if':
        if (matches(action.condition, bud, context) && !runActions(bud, action.actions, context)) return false;
        break;
    }
  }
  return true;
}

export function growOneGeneration(plant: Plant, actions: Action[], sun: Point, wallX: number | null = null): Plant {
  if (finished(plant)) return plant;
  const next: Plant = {
    ...plant,
    generation: plant.generation + 1,
    buds: [],
    segments: [...plant.segments],
    blooms: [...plant.blooms],
  };
  for (const [index, previous] of plant.buds.entries()) {
    const bud = { ...previous, age: previous.age + 1 };
    // Reserve a slot for each bud that still needs its turn.
    const reserved = plant.buds.length - index - 1;
    const budSlots = MAX_BUDS - next.buds.length - reserved;
    if (runActions(bud, actions, { next, existingSegments: plant.segments, sun, wallX, budSlots })) next.buds.push(bud);
  }
  return next;
}
