import * as Blockly from 'blockly';
import type { Action } from './growth';

const block = {
  bud: 'when_bud_grows',
  extend: 'extend_bud',
  checkAge: 'if_bud_age',
  split: 'split_bud',
};

const starterWorkspace = {
  blocks: {
    languageVersion: 0,
    blocks: [{
      type: block.bud, x: 28, y: 38,
      inputs: {
        DO: {
          block: {
            type: block.extend,
            fields: { DISTANCE: 14 },
            next: {
              block: {
                type: block.checkAge,
                fields: { AGE: 7 },
                inputs: { DO: { block: { type: block.split, fields: { ANGLE: 25 } } } },
              },
            },
          },
        },
      },
    }],
  },
};

export function createEditor(host: HTMLElement): Blockly.WorkspaceSvg {
  Blockly.common.defineBlocksWithJsonArray([
    {
      type: block.bud,
      message0: 'when a bud grows',
      message1: '%1',
      args1: [{ type: 'input_statement', name: 'DO' }],
      style: 'event_blocks',
      tooltip: 'Run these actions once for each active bud per generation.',
    },
    {
      type: block.extend,
      message0: 'extend %1 px',
      args0: [{ type: 'field_number', name: 'DISTANCE', value: 14, min: 1, max: 32, precision: 1 }],
      previousStatement: null,
      nextStatement: null,
      style: 'growth_blocks',
      tooltip: 'Add a branch segment from this bud in its current growth direction.',
    },
    {
      type: block.checkAge,
      message0: 'if bud age ≥ %1',
      args0: [{ type: 'field_number', name: 'AGE', value: 7, min: 1, max: 25, precision: 1 }],
      message1: '%1',
      args1: [{ type: 'input_statement', name: 'DO' }],
      previousStatement: null,
      nextStatement: null,
      style: 'logic_blocks',
      tooltip: 'Run the enclosed actions after this bud has grown for the given number of generations.',
    },
    {
      type: block.split,
      message0: 'split into 2 buds at ± %1 °',
      args0: [{ type: 'field_number', name: 'ANGLE', value: 25, min: 0, max: 90, precision: 1 }],
      previousStatement: null,
      style: 'growth_blocks',
      tooltip: 'Replace this bud with two fresh buds that start growing next generation.',
    },
  ]);

  const theme = Blockly.Theme.defineTheme('canopy', {
    name: 'canopy',
    base: Blockly.Themes.Classic,
    blockStyles: {
      event_blocks: { colourPrimary: '#405e76', colourSecondary: '#344f66', colourTertiary: '#7894aa', hat: 'cap' },
      growth_blocks: { colourPrimary: '#33694d', colourSecondary: '#29583e', colourTertiary: '#6ba686', hat: '' },
      logic_blocks: { colourPrimary: '#604e78', colourSecondary: '#504164', colourTertiary: '#9a80b0', hat: '' },
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
    maxInstances: { [block.bud]: 1 },
    grid: { spacing: 22, length: 2, colour: '#33443b', snap: false },
    move: { scrollbars: true, drag: true, wheel: true },
    zoom: { controls: true, wheel: false, startScale: host.clientWidth < 360 ? 0.67 : host.clientWidth < 440 ? 0.78 : 0.92, minScale: 0.5, maxScale: 1.6 },
    toolbox: {
      kind: 'categoryToolbox',
      contents: [
        { kind: 'category', name: 'Events', colour: '#7894aa', contents: [{ kind: 'block', type: block.bud }] },
        { kind: 'category', name: 'Growth', colour: '#6ba686', contents: [{ kind: 'block', type: block.extend }, { kind: 'block', type: block.split }] },
        { kind: 'category', name: 'Logic', colour: '#9a80b0', contents: [{ kind: 'block', type: block.checkAge }] },
      ],
    },
  });

  Blockly.serialization.workspaces.load(starterWorkspace, workspace, { recordUndo: false });
  return workspace;
}

function readActions(first: Blockly.Block | null): Action[] {
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
      case block.checkAge: {
        const children = readActions(current.getInputTargetBlock('DO'));
        if (children.length) actions.push({ type: 'ifAge', minimum: Number(current.getFieldValue('AGE')), actions: children });
        break;
      }
    }
  }
  return actions;
}

export function readProgram(workspace: Blockly.WorkspaceSvg): Action[] {
  const event = workspace.getTopBlocks(false).find((top) => top.type === block.bud && top.isEnabled());
  return readActions(event?.getInputTargetBlock('DO') ?? null);
}
