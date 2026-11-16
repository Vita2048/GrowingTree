import * as Blockly from 'blockly';
import type { Action, BranchAppearance, Condition, Foliage, Program } from './growth';

import { block, presets, type WorkspaceState } from './presets';

const budAction = 'BudAction';
const branchAction = 'BranchAction';

function numeric(name: string, value: number, min: number, max: number, precision = 1) {
  return { type: 'field_number', name, value, min, max, precision };
}

function conditionBlock(type: string, message: string, input: object, tooltip: string) {
  return {
    type, message0: message, args0: [input], message1: '%1',
    args1: [{ type: 'input_statement', name: 'DO', check: budAction }],
    previousStatement: budAction, nextStatement: budAction, style: 'logic_blocks', tooltip,
  };
}

function terminalBlock(type: string, message: string, tooltip: string) {
  return { type, message0: message, previousStatement: budAction, style: 'growth_blocks', tooltip };
}

export function createEditor(host: HTMLElement): Blockly.WorkspaceSvg {
  Blockly.common.defineBlocksWithJsonArray([
    {
      type: block.bud,
      message0: 'when a bud grows',
      message1: '%1',
      args1: [{ type: 'input_statement', name: 'DO', check: budAction }],
      style: 'event_blocks',
      tooltip: 'Run these actions once for each active bud per generation.',
    },
    {
      type: block.extend,
      message0: 'extend %1 m',
      args0: [numeric('DISTANCE', 0.56, 0.04, 1.28, 0.01)],
      previousStatement: budAction,
      nextStatement: budAction,
      style: 'growth_blocks',
      tooltip: 'Add a branch segment from this bud in its current growth direction.',
    },
    conditionBlock(block.checkAge, 'if bud age ≥ %1', numeric('AGE', 7, 1, 35), 'Check how many generations this bud has lived.'),
    conditionBlock(block.chance, 'if random chance %1 %%', numeric('PERCENT', 20, 0, 100), 'Each bud rolls when it reaches this block in a generation. Reset or Replay rerolls the run.'),
    conditionBlock(block.light, 'if this bud is in %1', {
      type: 'field_dropdown', name: 'LIGHT', options: [['light', 'LIT'], ['shade', 'SHADE']],
    }, 'Check whether another branch casts a shadow on this bud.'),
    conditionBlock(block.crowded, 'if crowded within %1 m', numeric('RADIUS', 0.60, 0.04, 3.20, 0.01), 'Check for another branch nearby after the bud clears its fork.'),
    conditionBlock(block.height, 'if height ≥ %1 m', numeric('HEIGHT', 13.2, 0, 40, 0.01), 'Measure this bud’s height in metres above the seed.'),
    conditionBlock(block.stem, 'if this bud is on %1', {
      type: 'field_dropdown', name: 'STEM', options: [['the main stem', 'MAIN'], ['a side branch', 'SIDE']],
    }, 'Choose whether the rule applies to the original stem or an offshoot.'),
    {
      type: block.split,
      message0: 'split into 2 buds at ± %1 °',
      args0: [numeric('ANGLE', 25, 0, 90)],
      previousStatement: budAction,
      style: 'growth_blocks',
      tooltip: 'Replace this bud with two fresh buds that start growing next generation.',
    },
    {
      type: block.bend, message0: 'bend toward light by %1 °', args0: [numeric('ANGLE', 1, 0, 45, 0.5)],
      previousStatement: budAction, nextStatement: budAction, style: 'growth_blocks',
      tooltip: 'Turn up to this many degrees toward the sun. Place this above Extend to steer the new segment.',
    },
    {
      type: block.sprout, message0: 'sprout side bud at %1 °', args0: [numeric('ANGLE', 65, 0, 90)],
      previousStatement: budAction, nextStatement: budAction, style: 'growth_blocks',
      tooltip: 'Keep this bud growing and add an offshoot. Successive shoots alternate sides.',
    },
    {
      type: block.climb, message0: 'climb the wall', previousStatement: budAction, nextStatement: budAction, style: 'growth_blocks',
      tooltip: 'Aim toward the wall and then follow it upward. Place this before Extend.',
    },
    terminalBlock(block.stop, 'stop growing', 'End this bud’s growth. Its existing branch remains.'),
    terminalBlock(block.leaf, 'become a leaf', 'End growth and leave a leaf at this tip.'),
    terminalBlock(block.flower, 'grow a flower', 'End growth and bloom at this tip.'),
    {
      type: block.branch, message0: 'when branch age ≥ %1', args0: [numeric('AGE', 20, 0, 35)],
      message1: '%1', args1: [{ type: 'input_statement', name: 'DO', check: branchAction }],
      style: 'event_blocks', tooltip: 'Style existing segments once they reach this age in generations.',
    },
    {
      type: block.thickness, message0: 'thicken to %1 ×', args0: [numeric('MULTIPLIER', 1.65, 1, 4, 0.05)],
      previousStatement: branchAction, nextStatement: branchAction, style: 'appearance_blocks',
      tooltip: 'Set the width as a multiple of the branch’s original width.',
    },
    {
      type: block.color, message0: 'change color to %1', args0: [{
        type: 'field_dropdown', name: 'COLOR', options: [['brown', '#956646'], ['amber', '#be8a55'], ['olive', '#889052'], ['mauve', '#b27aaf']],
      }],
      previousStatement: branchAction, nextStatement: branchAction, style: 'appearance_blocks',
      tooltip: 'Set the bark color of mature segments.',
    },
    {
      type: block.foliage, message0: 'foliage style %1', args0: [{
        type: 'field_dropdown', name: 'STYLE', options: [['oak leaves', 'oak'], ['fern fronds', 'fern'], ['ivy leaves', 'ivy'], ['coral tips', 'coral']],
      }],
      previousStatement: branchAction, nextStatement: branchAction, style: 'appearance_blocks',
      tooltip: 'Choose how foliage is drawn on these branches.',
    },
  ]);

  const theme = Blockly.Theme.defineTheme('canopy', {
    name: 'canopy',
    base: Blockly.Themes.Classic,
    blockStyles: {
      event_blocks: { colourPrimary: '#405e76', colourSecondary: '#344f66', colourTertiary: '#7894aa', hat: 'cap' },
      growth_blocks: { colourPrimary: '#33694d', colourSecondary: '#29583e', colourTertiary: '#6ba686', hat: '' },
      logic_blocks: { colourPrimary: '#604e78', colourSecondary: '#504164', colourTertiary: '#9a80b0', hat: '' },
      appearance_blocks: { colourPrimary: '#794f35', colourSecondary: '#663f29', colourTertiary: '#b18160', hat: '' },
    },
    componentStyles: {
      workspaceBackgroundColour: '#141d19',
      toolboxBackgroundColour: '#1a2520',
      toolboxForegroundColour: '#e1eae3',
      flyoutBackgroundColour: '#25332b',
      flyoutForegroundColour: '#e1eae3',
      flyoutOpacity: 1,
      scrollbarColour: '#597064',
      scrollbarOpacity: 0.45,
      insertionMarkerColour: '#c0e8ad',
      selectedGlowColour: '#b9e5a5',
    },
    fontStyle: { family: 'DM Sans, system-ui, sans-serif', weight: '600', size: 12 },
  });

  const workspace = Blockly.inject(host, {
    renderer: 'zelos',
    theme,
    media: import.meta.env.BASE_URL,
    sounds: false,
    trashcan: true,
    maxBlocks: 80,
    maxInstances: { [block.bud]: 1, [block.branch]: 1 },
    grid: { spacing: 22, length: 2, colour: '#33443b', snap: false },
    move: { scrollbars: true, drag: true, wheel: true },
    zoom: { controls: true, wheel: false, startScale: host.clientWidth < 360 ? 0.67 : host.clientWidth < 440 ? 0.78 : 0.84, minScale: 0.5, maxScale: 1.6 },
    toolbox: {
      kind: 'categoryToolbox',
      contents: [
        category('Events', '#7894aa', [block.bud, block.branch]),
        category('Growth', '#6ba686', [block.extend, block.split, block.sprout, block.bend, block.climb, block.stop, block.leaf, block.flower]),
        category('Logic', '#9a80b0', [block.checkAge, block.chance, block.light, block.crowded, block.height, block.stem]),
        category('Looks', '#b18160', [block.thickness, block.color, block.foliage]),
      ],
    },
  });

  loadWorkspace(workspace, presets.oak.workspace);
  return workspace;
}

export function loadWorkspace(workspace: Blockly.Workspace, state: WorkspaceState): void {
  Blockly.serialization.workspaces.load(state, workspace, { recordUndo: false });
  workspace.clearUndo();
}

function category(name: string, colour: string, types: string[]) {
  return { kind: 'category', name, colour, contents: types.map((type) => ({ kind: 'block', type })) };
}

function readCondition(current: Blockly.Block, chanceKeys: { next: number }): Condition | null {
  switch (current.type) {
    case block.checkAge: return { type: 'age', minimum: Number(current.getFieldValue('AGE')) };
    case block.chance: return { type: 'chance', percent: Number(current.getFieldValue('PERCENT')), key: chanceKeys.next++ };
    case block.light: return { type: 'light', lit: current.getFieldValue('LIGHT') === 'LIT' };
    case block.crowded: return { type: 'crowded', radius: Number(current.getFieldValue('RADIUS')) };
    case block.height: return { type: 'height', minimum: Number(current.getFieldValue('HEIGHT')) };
    case block.stem: return { type: 'stem', main: current.getFieldValue('STEM') === 'MAIN' };
    default: return null;
  }
}

function readActions(first: Blockly.Block | null, chanceKeys: { next: number }): Action[] {
  const actions: Action[] = [];
  for (let current = first; current; current = current.getNextBlock()) {
    if (!current.isEnabled()) continue;
    switch (current.type) {
      case block.extend:
        actions.push({ type: 'extend', distance: Number(current.getFieldValue('DISTANCE')) });
        break;
      case block.split:
        actions.push({ type: 'split', angle: Number(current.getFieldValue('ANGLE')) });
        break;
      case block.sprout:
        actions.push({ type: 'sprout', angle: Number(current.getFieldValue('ANGLE')) });
        break;
      case block.bend:
        actions.push({ type: 'bend', angle: Number(current.getFieldValue('ANGLE')) });
        break;
      case block.stop: actions.push({ type: 'stop' }); break;
      case block.climb: actions.push({ type: 'climb' }); break;
      case block.leaf: actions.push({ type: 'leaf' }); break;
      case block.flower: actions.push({ type: 'flower' }); break;
      default: {
        const body = current.getInputTargetBlock('DO');
        if (!body) break;
        const condition = readCondition(current, chanceKeys);
        if (!condition) break;
        const children = readActions(body, chanceKeys);
        if (children.length) actions.push({ type: 'if', condition, actions: children });
        break;
      }
    }
  }
  return actions;
}

function readAppearance(event: Blockly.Block | undefined): BranchAppearance | null {
  if (!event) return null;
  const appearance: BranchAppearance = { age: Number(event.getFieldValue('AGE')), thickness: 1, color: null, foliage: 'oak' };
  for (let current = event.getInputTargetBlock('DO'); current; current = current.getNextBlock()) {
    if (!current.isEnabled()) continue;
    if (current.type === block.thickness) appearance.thickness = Number(current.getFieldValue('MULTIPLIER'));
    if (current.type === block.color) appearance.color = current.getFieldValue('COLOR');
    if (current.type === block.foliage) appearance.foliage = current.getFieldValue('STYLE') as Foliage;
  }
  return appearance;
}

export function readProgram(workspace: Blockly.Workspace): Program {
  const events = workspace.getTopBlocks(false).filter((top) => top.isEnabled());
  const bud = events.find((top) => top.type === block.bud);
  return {
    buds: readActions(bud?.getInputTargetBlock('DO') ?? null, { next: 0 }),
    branches: readAppearance(events.find((top) => top.type === block.branch)),
  };
}
