import * as Blockly from 'blockly';
import type { Action, BranchAppearance, Condition, Program } from './growth';

const block = {
  bud: 'when_bud_grows',
  extend: 'extend_bud',
  checkAge: 'if_bud_age',
  split: 'split_bud',
  bend: 'bend_toward_light',
  chance: 'if_random_chance',
  light: 'if_light_here',
  crowded: 'if_crowded',
  height: 'if_above_height',
  stop: 'stop_bud',
  leaf: 'become_leaf',
  flower: 'grow_flower',
  branch: 'when_branch_ages',
  thickness: 'set_branch_thickness',
  color: 'set_branch_color',
};

const starterWorkspace = {
  blocks: {
    languageVersion: 0,
    blocks: [{
      type: block.bud, x: 28, y: 22,
      inputs: {
        DO: {
          block: {
            type: block.bend,
            fields: { ANGLE: 1 },
            next: {
              block: {
                type: block.extend,
                fields: { DISTANCE: 14 },
                next: { block: {
                  type: block.checkAge,
                  fields: { AGE: 7 },
                  inputs: { DO: { block: { type: block.split, fields: { ANGLE: 25 } } } },
                } },
              },
            },
          },
        },
      },
    }, {
      type: block.branch, x: 28, y: 351,
      fields: { AGE: 20 },
      inputs: { DO: { block: {
        type: block.thickness,
        fields: { MULTIPLIER: 1.65 },
        next: { block: { type: block.color, fields: { COLOR: '#956646' } } },
      } } },
    }],
  },
};

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
      message0: 'extend %1 px',
      args0: [numeric('DISTANCE', 14, 1, 32)],
      previousStatement: budAction,
      nextStatement: budAction,
      style: 'growth_blocks',
      tooltip: 'Add a branch segment from this bud in its current growth direction.',
    },
    conditionBlock(block.checkAge, 'if bud age ≥ %1', numeric('AGE', 7, 1, 35), 'Check how many generations this bud has lived.'),
    conditionBlock(block.chance, 'if random chance %1 %%', numeric('PERCENT', 20, 0, 100), 'Roll a chance for each bud each generation.'),
    conditionBlock(block.light, 'if this bud is in %1', {
      type: 'field_dropdown', name: 'LIGHT', options: [['light', 'LIT'], ['shade', 'SHADE']],
    }, 'Check whether another branch casts a shadow on this bud.'),
    conditionBlock(block.crowded, 'if crowded within %1 px', numeric('RADIUS', 15, 1, 80), 'Check for another branch nearby after the bud clears its fork.'),
    conditionBlock(block.height, 'if height ≥ %1 px', numeric('HEIGHT', 330, 0, 1000), 'Measure this bud’s height above the seed.'),
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
    terminalBlock(block.stop, 'stop growing', 'End this bud’s growth. Its existing branch remains.'),
    terminalBlock(block.leaf, 'become a leaf', 'End growth and leave a leaf at this tip.'),
    terminalBlock(block.flower, 'grow a flower', 'End growth and bloom at this tip.'),
    {
      type: block.branch, message0: 'when branch age ≥ %1', args0: [numeric('AGE', 20, 1, 35)],
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
        type: 'field_dropdown', name: 'COLOR', options: [['brown', '#956646'], ['amber', '#be8a55'], ['olive', '#889052']],
      }],
      previousStatement: branchAction, nextStatement: branchAction, style: 'appearance_blocks',
      tooltip: 'Set the bark color of mature segments.',
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
        category('Growth', '#6ba686', [block.extend, block.split, block.bend, block.stop, block.leaf, block.flower]),
        category('Logic', '#9a80b0', [block.checkAge, block.chance, block.light, block.crowded, block.height]),
        category('Looks', '#b18160', [block.thickness, block.color]),
      ],
    },
  });

  Blockly.serialization.workspaces.load(starterWorkspace, workspace, { recordUndo: false });
  return workspace;
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
      case block.bend:
        actions.push({ type: 'bend', angle: Number(current.getFieldValue('ANGLE')) });
        break;
      case block.stop: actions.push({ type: 'stop' }); break;
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
  const appearance: BranchAppearance = { age: Number(event.getFieldValue('AGE')), thickness: 1, color: null };
  for (let current = event.getInputTargetBlock('DO'); current; current = current.getNextBlock()) {
    if (!current.isEnabled()) continue;
    if (current.type === block.thickness) appearance.thickness = Number(current.getFieldValue('MULTIPLIER'));
    if (current.type === block.color) appearance.color = current.getFieldValue('COLOR');
  }
  return appearance;
}

export function readProgram(workspace: Blockly.WorkspaceSvg): Program {
  const events = workspace.getTopBlocks(false).filter((top) => top.isEnabled());
  const bud = events.find((top) => top.type === block.bud);
  return {
    buds: readActions(bud?.getInputTargetBlock('DO') ?? null, { next: 0 }),
    branches: readAppearance(events.find((top) => top.type === block.branch)),
  };
}
