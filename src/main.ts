import { svgResize } from 'blockly';
import { createEditor, readProgram } from './editor';
import { finished, reachedLimit, type BranchAppearance, type Plant, type Point } from './growth';
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

const workspace = createEditor(workspaceHost);
const draw = createRenderer(canvas);
const history = new Timeline();
let program = readProgram(workspace);
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
    view = draw(plant, program.branches);
    drawnPlant = plant;
    drawnAppearance = program.branches;
  }
  if (!view) return;
  const { origin, scale, width, height } = view;
  sunHandle.style.left = `${clampToScene(origin.x + sun.x * scale, width)}px`;
  sunHandle.style.top = `${clampToScene(origin.y + sun.y * scale, height)}px`;
}

function paint(): void {
  const { plant } = history.current;
  const historical = plant.generation < history.latest;
  const complete = !historical && finished(plant);
  playback.disabled = !program.buds.length;
  step.disabled = complete || !program.buds.length;
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

playback.addEventListener('click', () => {
  if (finished(history.current.plant)) history.reset();
  setRunning(!running);
  paint();
});

step.addEventListener('click', () => {
  setRunning(false);
  tick();
});

reset.addEventListener('click', () => {
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

speed.setAttribute('aria-valuetext', `${speed.value} generations per second`);
for (let i = 0; i < 22; i++) history.step(program.buds);
setRunning(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
paint();
