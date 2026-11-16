import * as Blockly from 'blockly';
import { loadWorkspace, readProgram } from './editor';
import type { Program } from './growth';
import { block, type WorkspaceState } from './presets';
import type { Timeline } from './timeline';

interface TraitInfo {
  field: string;
  label: string;
  unit: string;
  spread: number;
}

const traits: Record<string, TraitInfo> = {
  [block.split]: { field: 'ANGLE', label: 'Split angle', unit: '°', spread: 26 },
  [block.extend]: { field: 'DISTANCE', label: 'Extension', unit: ' m', spread: 0.22 },
  [block.checkAge]: { field: 'AGE', label: 'Bud age', unit: '', spread: 4 },
  [block.sprout]: { field: 'ANGLE', label: 'Shoot angle', unit: '°', spread: 28 },
  [block.bend]: { field: 'ANGLE', label: 'Light bend', unit: '°', spread: 3 },
  [block.chance]: { field: 'PERCENT', label: 'Chance', unit: '%', spread: 30 },
  [block.height]: { field: 'HEIGHT', label: 'Height', unit: ' m', spread: 5 },
  [block.crowded]: { field: 'RADIUS', label: 'Spacing', unit: ' m', spread: 0.55 },
  [block.branch]: { field: 'AGE', label: 'Bark age', unit: '', spread: 8 },
  [block.thickness]: { field: 'MULTIPLIER', label: 'Thickness', unit: '×', spread: 0.7 },
};

interface Mutation {
  info: TraitInfo;
  blockId: string;
  value: number;
}

export interface Variant {
  label: string;
  state: WorkspaceState;
  program: Program;
  history: Timeline;
}

function choices(connected: Blockly.Block): Mutation[] {
  const info = traits[connected.type];
  if (!info || !connected.isEnabled() || connected.getInheritedDisabled()) return [];
  if (connected.type.startsWith('if_') && !connected.getInputTargetBlock('DO')) return [];
  const field = connected.getField(info.field);
  if (!(field instanceof Blockly.FieldNumber)) return [];
  const step = field.getPrecision();
  const current = Math.round(Number(field.getValue()) / step);
  const low = Math.max(Math.ceil(field.getMin() / step - 1e-9), current - Math.max(6, Math.round(info.spread / step)));
  const high = Math.min(Math.floor(field.getMax() / step + 1e-9), current + Math.max(6, Math.round(info.spread / step)));
  const options: Mutation[] = [];
  const nearby = Math.max(1, Math.round(info.spread / step * 0.2));
  for (let value = low; value <= high; value++) {
    if (value !== current) options.push({ info, blockId: connected.id, value: Number((value * step).toFixed(2)) });
  }
  // Prefer changes large enough to see in a thumbnail, while retaining enough choices at a boundary.
  const visible = options.filter(({ value }) => Math.abs(Math.round(value / step) - current) >= nearby);
  return visible.length >= 6 ? visible : options;
}

function chooseMutations(workspace: Blockly.Workspace): Mutation[] {
  const groups = workspace.getTopBlocks(true)
    .filter(({ type }) => type === block.bud || type === block.branch)
    .flatMap((event) => event.getDescendants(true).flatMap((child) => {
      const variants = choices(child);
      return variants.length ? [variants] : [];
    }));
  const selected: Mutation[] = [];
  while (selected.length < 6 && groups.length) {
    const options = groups.shift()!;
    const index = Math.floor(Math.random() * options.length);
    selected.push(options.splice(index, 1)[0]);
    if (options.length) groups.push(options);
  }
  return selected;
}

function setField(blocks: Blockly.serialization.blocks.State[], change: Mutation): boolean {
  return blocks.some((saved) => {
    if (saved.id === change.blockId && saved.fields) {
      saved.fields[change.info.field] = change.value;
      return true;
    }
    const nested = Object.values(saved.inputs ?? {}).flatMap(({ block }) => block ? [block] : []);
    if (saved.next?.block) nested.push(saved.next.block);
    return setField(nested, change);
  });
}

export function createVariants(workspace: Blockly.Workspace, source: Timeline, generation: number): Variant[] {
  const mutations = chooseMutations(workspace);
  if (!mutations.length) return [];
  const parent: WorkspaceState = Blockly.serialization.workspaces.save(workspace);
  const scratch = new Blockly.Workspace();
  try {
    return mutations.map((change) => {
      const state = structuredClone(parent);
      if (!setField(state.blocks?.blocks ?? [], change)) throw new Error('The selected block could not be found.');
      loadWorkspace(scratch, state);
      const program = readProgram(scratch);
      return {
        label: `${change.info.label} ${change.value}${change.info.unit}`,
        state,
        program,
        history: source.preview(program.buds, generation),
      };
    });
  } finally {
    scratch.dispose();
  }
}
