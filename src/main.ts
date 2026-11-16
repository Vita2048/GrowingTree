import { svgResize } from 'blockly';
import { createEditor, loadWorkspace, readProgram } from './editor';
import { RULER_HEIGHT, UNITS_PER_METRE, finished, reachedLimit, type BranchAppearance, type Plant, type Point } from './growth';
import { createVariants, type Variant } from './mutation';
import { presets } from './presets';
import { createRenderer, type View } from './render';
import { Timeline } from './timeline';
import './style.css';

const workspaceHost = document.querySelector<HTMLElement>('#workspace')!;
const canvas = document.querySelector<HTMLCanvasElement>('#plant')!;
const playback = document.querySelector<HTMLButtonElement>('#playback')!;
const playbackLabel = document.querySelector<HTMLElement>('#playback-label')!;
const playIcon = document.querySelector<SVGElement>('#play-icon')!;
const pauseIcon = document.querySelector<SVGElement>('#pause-icon')!;
const step = document.querySelector<HTMLButtonElement>('#step')!;
const reset = document.querySelector<HTMLButtonElement>('#reset')!;
const speed = document.querySelector<HTMLInputElement>('#speed')!;
const speedValue = document.querySelector<HTMLOutputElement>('#speed-value')!;
const scrubber = document.querySelector<HTMLInputElement>('#timeline')!;
const generation = document.querySelector<HTMLOutputElement>('#generation')!;
const budCount = document.querySelector<HTMLOutputElement>('#bud-count')!;
const segmentCount = document.querySelector<HTMLOutputElement>('#segment-count')!;
const status = document.querySelector<HTMLElement>('#growth-status')!;
const ruleMessage = document.querySelector<HTMLElement>('#rule-message')!;
const sunHandle = document.querySelector<HTMLButtonElement>('#sun')!;
const preset = document.querySelector<HTMLSelectElement>('#preset')!;
const ruler = document.querySelector<HTMLElement>('#height-ruler')!;
const heightValue = document.querySelector<HTMLOutputElement>('#height-value')!;
const mutate = document.querySelector<HTMLButtonElement>('#mutate')!;
const mutations = document.querySelector<HTMLElement>('#mutations')!;
const variantGrid = document.querySelector<HTMLElement>('#variant-grid')!;
const mutationCaption = document.querySelector<HTMLElement>('#mutation-caption')!;
const closeMutations = document.querySelector<HTMLButtonElement>('#close-mutations')!;

const workspace = createEditor(workspaceHost);
const draw = createRenderer(canvas);
const starterGeneration = 22;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let history = new Timeline(presets.oak.wallX);
let program = readProgram(workspace);
let variants: Variant[] = [];
let running = false;
let timer: number | undefined;
let updateQueued = false;
let view: View | undefined;
let drawnPlant: Plant | undefined;
let drawnAppearance: BranchAppearance | null;
let sunDrag: { id: number; offset: Point } | undefined;

function clampToScene(value: number, size: number): number {
  return Math.max(30, Math.min(size - 30, value));
}

function paintPreview(force = false): void {
  const { plant, sun } = history.current;
  if (force || plant !== drawnPlant || program.branches !== drawnAppearance) {
    view = draw(plant, program.branches, history.wallX);
    drawnPlant = plant;
    drawnAppearance = program.branches;
    const height = plant.segments.reduce((tallest, segment) => Math.max(tallest, -segment.to.y), 0);
    heightValue.value = `${(height / UNITS_PER_METRE).toFixed(2)} m`;
  }
  if (!view) return;
  const { origin, scale, width, height } = view;
  sunHandle.style.left = `${clampToScene(origin.x + sun.x * scale, width)}px`;
  sunHandle.style.top = `${clampToScene(origin.y + sun.y * scale, height)}px`;
  const rulerPixels = RULER_HEIGHT * UNITS_PER_METRE * scale;
  ruler.style.height = `${rulerPixels}px`;
  ruler.style.top = `${origin.y - rulerPixels}px`;
}

function paint(): void {
  const { plant } = history.current;
  const historical = plant.generation < history.latest;
  const complete = !historical && finished(plant);
  playback.disabled = !program.buds.length;
  step.disabled = complete || !program.buds.length;
  mutate.disabled = !program.buds.length;
  playbackLabel.textContent = running ? 'Pause' : complete ? 'Replay' : 'Play';
  pauseIcon.toggleAttribute('hidden', !running);
  playIcon.toggleAttribute('hidden', running);
  let label = running ? 'Growing' : 'Paused';
  if (historical && !running) label = 'Viewing history';
  if (complete) label = reachedLimit(plant) ? 'Growth limit reached' : 'Growth complete';
  if (status.textContent !== label) status.textContent = label;
  status.dataset.state = running ? 'running' : 'resting';
  generation.value = String(plant.generation);
  scrubber.max = String(history.latest);
  scrubber.value = String(plant.generation);
  scrubber.disabled = history.latest === 0;
  scrubber.setAttribute('aria-valuetext', `Generation ${plant.generation} of ${history.latest}`);
  budCount.value = String(plant.buds.length);
  segmentCount.value = String(plant.segments.length);
  paintPreview();
}

function setRunning(next: boolean): void {
  window.clearInterval(timer);
  timer = undefined;
  running = next;
  if (running) timer = window.setInterval(tick, 1000 / Number(speed.value));
}

function tick(): void {
  history.step(program.buds);
  if (finished(history.current.plant) && history.current.plant.generation === history.latest) setRunning(false);
  paint();
}

function hideVariants(): void {
  if (mutations.hidden) return;
  if (mutations.contains(document.activeElement)) mutate.focus();
  mutations.hidden = true;
  mutate.setAttribute('aria-expanded', 'false');
  variants = [];
  variantGrid.replaceChildren();
}

function drawThumbnails(): void {
  const canvases = variantGrid.querySelectorAll('canvas');
  for (const [index, variant] of variants.entries()) {
    createRenderer(canvases[index], true)(variant.history.current.plant, variant.program.branches, variant.history.wallX);
  }
}

function adopt(variant: Variant): void {
  loadWorkspace(workspace, variant.state);
  program = readProgram(workspace);
  history = variant.history;
  preset.value = '';
  hideVariants();
  paint();
}

mutate.addEventListener('click', () => {
  setRunning(false);
  const target = Math.max(history.current.plant.generation, starterGeneration);
  variants = createVariants(workspace, history, target);
  mutationCaption.textContent = variants.length ? `Up to generation ${target}` : 'Add a numeric growth rule to mutate.';
  variantGrid.replaceChildren(...variants.map((variant) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'variant';
    const thumbnail = document.createElement('canvas');
    thumbnail.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.textContent = variant.label;
    card.append(thumbnail, label);
    card.addEventListener('click', () => adopt(variant));
    return card;
  }));
  mutations.hidden = false;
  mutate.setAttribute('aria-expanded', 'true');
  drawThumbnails();
  paint();
});

closeMutations.addEventListener('click', hideVariants);

for (const [key, item] of Object.entries(presets)) preset.add(new Option(item.name, key));
preset.value = 'oak';
preset.addEventListener('change', () => {
  const next = presets[preset.value];
  if (!next) return;
  hideVariants();
  loadWorkspace(workspace, next.workspace);
  workspace.scroll(0, 0);
  program = readProgram(workspace);
  history = new Timeline(next.wallX);
  for (let i = 0; i < starterGeneration; i++) history.step(program.buds);
  setRunning(!reducedMotion.matches && !finished(history.current.plant));
  ruleMessage.textContent = 'Add conditions from Logic to change when buds grow.';
  paint();
});

playback.addEventListener('click', () => {
  hideVariants();
  if (finished(history.current.plant)) history.reset();
  setRunning(!running);
  paint();
});

step.addEventListener('click', () => {
  hideVariants();
  setRunning(false);
  tick();
});

reset.addEventListener('click', () => {
  hideVariants();
  setRunning(false);
  history.reset();
  paint();
});

speed.addEventListener('input', () => {
  speedValue.value = `${speed.value} gen/s`;
  speed.setAttribute('aria-valuetext', `${speed.value} generations per second`);
  if (running) setRunning(true);
});

scrubber.addEventListener('input', () => {
  hideVariants();
  setRunning(false);
  history.seek(Number(scrubber.value));
  paint();
});

function moveSunTo(screen: Point): void {
  if (!view) return;
  const { origin, scale, width, height } = view;
  const x = clampToScene(screen.x, width);
  const y = clampToScene(screen.y, height);
  if (Math.abs(x - Number.parseFloat(sunHandle.style.left)) < 0.25
    && Math.abs(y - Number.parseFloat(sunHandle.style.top)) < 0.25) return;
  hideVariants();
  history.moveSun({ x: (x - origin.x) / scale, y: (y - origin.y) / scale });
  paint();
}

sunHandle.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || sunDrag) return;
  const box = sunHandle.getBoundingClientRect();
  sunHandle.setPointerCapture(event.pointerId);
  sunDrag = { id: event.pointerId, offset: { x: event.clientX - box.left - box.width / 2, y: event.clientY - box.top - box.height / 2 } };
});

sunHandle.addEventListener('pointermove', (event) => {
  if (!sunDrag || event.pointerId !== sunDrag.id) return;
  const box = canvas.getBoundingClientRect();
  moveSunTo({ x: event.clientX - box.left - sunDrag.offset.x, y: event.clientY - box.top - sunDrag.offset.y });
});

sunHandle.addEventListener('lostpointercapture', (event) => {
  if (sunDrag?.id === event.pointerId) sunDrag = undefined;
});

const sunDirections: Record<string, Point> = {
  ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
};
sunHandle.addEventListener('keydown', (event) => {
  const direction = sunDirections[event.key];
  if (!direction) return;
  event.preventDefault();
  const distance = event.shiftKey ? 28 : 8;
  moveSunTo({
    x: Number.parseFloat(sunHandle.style.left) + direction.x * distance,
    y: Number.parseFloat(sunHandle.style.top) + direction.y * distance,
  });
});

workspace.addChangeListener((event) => {
  if (event.isUiEvent || updateQueued) return;
  updateQueued = true;
  requestAnimationFrame(() => {
    updateQueued = false;
    const next = readProgram(workspace);
    const updatedGrowth = JSON.stringify(next.buds) !== JSON.stringify(program.buds);
    if (!updatedGrowth && JSON.stringify(next.branches) === JSON.stringify(program.branches)) return;
    hideVariants();
    preset.value = '';
    program = next;
    if (updatedGrowth) history.applyRules(program.buds);
    if (running && (!program.buds.length || finished(history.current.plant))) setRunning(false);
    ruleMessage.textContent = program.buds.length
      ? 'Add conditions from Logic to change when buds grow.'
      : 'Connect a growth action under “when a bud grows.”';
    paint();
  });
});

const workspaceObserver = new ResizeObserver(() => svgResize(workspace));
workspaceObserver.observe(workspaceHost);
const canvasObserver = new ResizeObserver(() => paintPreview(true));
canvasObserver.observe(canvas);
const thumbnailObserver = new ResizeObserver(drawThumbnails);
thumbnailObserver.observe(variantGrid);

speed.setAttribute('aria-valuetext', `${speed.value} generations per second`);
for (let i = 0; i < starterGeneration; i++) history.step(program.buds);
setRunning(!reducedMotion.matches);
paint();
