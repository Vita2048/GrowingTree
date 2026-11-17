import { MAX_GENERATION } from './growth';
import { presets, type WorkspaceState } from './presets';
import type { TimelineState } from './timeline';

const storageKey = 'growing-tree:session';

interface Session {
  version: 1;
  workspace: WorkspaceState;
  timeline: TimelineState;
  preset: string;
  speed: number;
}

export function readSession(): Session | null {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? parseSession(saved) : null;
  } catch {
    return null;
  }
}

export function parseSession(saved: string): Session | null {
  try {
    const state = JSON.parse(saved) as Partial<Session>;
    if (!state || state.version !== 1 || !state.workspace || typeof state.workspace !== 'object' || Array.isArray(state.workspace)) return null;
    const { timeline, preset, speed } = state;
    if (!timeline || !Array.isArray(timeline.suns) || !timeline.suns.length || timeline.suns.length > MAX_GENERATION + 1) return null;
    const { wallX, chanceSeed, generation, suns } = timeline;
    if (!suns.every((sun) => sun && Number.isFinite(sun.x) && Number.isFinite(sun.y))) return null;
    if (wallX !== null && (!Number.isFinite(wallX) || wallX <= 4)) return null;
    if (!Number.isInteger(chanceSeed) || chanceSeed < 0 || chanceSeed > 0xffff_ffff) return null;
    if (!Number.isInteger(generation) || generation < 0 || generation >= suns.length) return null;
    if (typeof preset !== 'string' || (preset !== '' && !Object.hasOwn(presets, preset))) return null;
    if (typeof speed !== 'number' || !Number.isInteger(speed) || speed < 1 || speed > 8) return null;
    return { version: 1, workspace: state.workspace, timeline, preset, speed };
  } catch {
    return null;
  }
}

export function writeSession(state: Omit<Session, 'version'>): boolean {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ version: 1, ...state }));
    return true;
  } catch {
    return false;
  }
}
