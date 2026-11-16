export type Action =
  | { type: 'extend'; distance: number }
  | { type: 'split'; angle: number }
  | { type: 'ifAge'; minimum: number; actions: Action[] };

interface Point {
  x: number;
  y: number;
}

export interface Bud extends Point {
  id: number;
  age: number;
  depth: number;
  heading: number;
}

export interface Segment {
  from: Point;
  to: Point;
  depth: number;
  age: number;
  id: number;
}

export interface Plant {
  generation: number;
  buds: Bud[];
  segments: Segment[];
  nextId: number;
}

export const MAX_GENERATION = 35;
const MAX_BUDS = 256;
const MAX_SEGMENTS = 6_000;
const SEED = 2187;

export function sample(key: number): number {
  let hash = Math.imul(key ^ SEED, 0x45d9f3b);
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  return ((hash ^ (hash >>> 16)) >>> 0) / 0x1_0000_0000;
}

export function seedPlant(): Plant {
  return {
    generation: 0,
    buds: [{ id: 1, x: 0, y: 0, heading: 0, depth: 0, age: 0 }],
    segments: [],
    nextId: 2,
  };
}

export function reachedLimit(plant: Plant): boolean {
  return plant.generation >= MAX_GENERATION || plant.segments.length >= MAX_SEGMENTS;
}

function runActions(bud: Bud, actions: Action[], plant: Plant, canSplit: boolean): boolean {
  for (const action of actions) {
    switch (action.type) {
      case 'extend': {
        if (plant.segments.length >= MAX_SEGMENTS) return false;
        const id = plant.nextId++;
        const from = { x: bud.x, y: bud.y };
        const sway = (sample(id * 3) - 0.5) * (bud.depth === 0 ? 0.08 : 0.22);
        // A slight upward bias keeps successive forks from curling back toward the seed.
        const heading = Math.atan2(Math.sin(bud.heading), Math.cos(bud.heading));
        bud.heading = heading * 0.94 + sway;
        bud.x += Math.sin(bud.heading) * action.distance;
        bud.y -= Math.cos(bud.heading) * action.distance;
        plant.segments.push({ from, to: { x: bud.x, y: bud.y }, id, depth: bud.depth, age: bud.age });
        break;
      }
      case 'split': {
        if (!canSplit) break;
        const radians = action.angle * Math.PI / 180;
        for (const direction of [-1, 1]) {
          const id = plant.nextId++;
          plant.buds.push({
            ...bud,
            id,
            age: 0,
            depth: bud.depth + 1,
            heading: bud.heading + radians * direction,
          });
        }
        return false;
      }
      case 'ifAge':
        if (bud.age >= action.minimum && !runActions(bud, action.actions, plant, canSplit)) return false;
        break;
    }
  }
  return true;
}

export function growOneGeneration(plant: Plant, actions: Action[]): void {
  if (reachedLimit(plant)) return;
  const previousBuds = plant.buds;
  plant.buds = [];
  plant.generation++;
  for (const [index, bud] of previousBuds.entries()) {
    bud.age++;
    // Reserve one slot for each remaining bud before deciding whether this bud can split.
    const reserved = previousBuds.length - index - 1;
    const canSplit = plant.buds.length + reserved + 2 <= MAX_BUDS;
    if (runActions(bud, actions, plant, canSplit)) plant.buds.push(bud);
  }
}
