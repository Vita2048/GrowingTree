import type { serialization } from 'blockly';

export const block = {
  bud: 'when_bud_grows', extend: 'extend_bud', checkAge: 'if_bud_age', split: 'split_bud',
  bend: 'bend_toward_light', chance: 'if_random_chance', light: 'if_light_here',
  crowded: 'if_crowded', height: 'if_above_height', stem: 'if_stem_type', sprout: 'sprout_side_bud',
  climb: 'climb_wall', stop: 'stop_bud', leaf: 'become_leaf', flower: 'grow_flower',
  branch: 'when_branch_ages', thickness: 'set_branch_thickness', color: 'set_branch_color',
  foliage: 'set_foliage_style',
};

type BlockState = serialization.blocks.State;
export interface WorkspaceState {
  blocks?: { languageVersion: number; blocks: BlockState[] };
}

function rule(type: string, fields?: BlockState['fields'], children?: BlockState[]): BlockState {
  const body = children?.reduceRight<BlockState | undefined>(
    (next, child) => next ? { ...child, next: { block: next } } : child,
    undefined,
  );
  return { type, fields, inputs: body ? { DO: { block: body } } : undefined };
}

function workspace(buds: BlockState[], branchY: number, age: number, appearance: BlockState[]): WorkspaceState {
  return { blocks: { languageVersion: 0, blocks: [
    { ...rule(block.bud, undefined, buds), x: 22, y: 22 },
    { ...rule(block.branch, { AGE: age }, appearance), x: 22, y: branchY },
  ] } };
}

export interface Preset {
  name: string;
  wallX: number | null;
  workspace: WorkspaceState;
}

export const presets: Record<string, Preset> = {
  oak: {
    name: 'Oak', wallX: null,
    workspace: workspace([
      rule(block.bend, { ANGLE: 1 }), rule(block.extend, { DISTANCE: 0.56 }),
      rule(block.checkAge, { AGE: 7 }, [rule(block.split, { ANGLE: 25 })]),
    ], 356, 20, [rule(block.thickness, { MULTIPLIER: 1.65 }), rule(block.color, { COLOR: '#956646' })]),
  },
  fern: {
    name: 'Fern', wallX: null,
    workspace: workspace([
      rule(block.extend, { DISTANCE: 0.44 }),
      rule(block.stem, { STEM: 'SIDE' }, [rule(block.checkAge, { AGE: 6 }, [rule(block.leaf)])]),
      rule(block.stem, { STEM: 'MAIN' }, [rule(block.checkAge, { AGE: 5 }, [rule(block.sprout, { ANGLE: 72 })])]),
    ], 695, 0, [rule(block.foliage, { STYLE: 'fern' }), rule(block.color, { COLOR: '#889052' })]),
  },
  vine: {
    name: 'Wall-climbing vine', wallX: 118,
    workspace: workspace([
      rule(block.stem, { STEM: 'MAIN' }, [rule(block.climb)]), rule(block.extend, { DISTANCE: 0.61 }),
      rule(block.stem, { STEM: 'SIDE' }, [rule(block.checkAge, { AGE: 4 }, [rule(block.leaf)])]),
      rule(block.stem, { STEM: 'MAIN' }, [rule(block.chance, { PERCENT: 43 }, [rule(block.sprout, { ANGLE: 69 })])]),
    ], 860, 0, [rule(block.foliage, { STYLE: 'ivy' }), rule(block.color, { COLOR: '#889052' })]),
  },
  coral: {
    name: 'Alien coral', wallX: null,
    workspace: workspace([
      rule(block.extend, { DISTANCE: 0.51 }),
      rule(block.height, { HEIGHT: 12.5 }, [rule(block.flower)]),
      rule(block.checkAge, { AGE: 4 }, [rule(block.chance, { PERCENT: 69 }, [rule(block.split, { ANGLE: 31 })])]),
    ], 640, 0, [rule(block.foliage, { STYLE: 'coral' }), rule(block.color, { COLOR: '#b27aaf' })]),
  },
};
