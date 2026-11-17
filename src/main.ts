import { serialization, svgResize, Workspace } from 'blockly';
import { createEditor, loadWorkspace, readProgram } from './editor';
import { UNITS_PER_METRE, finished, reachedLimit, type BranchAppearance, type Plant, type Point } from './growth';
import { createVariants, type Variant } from './mutation';
import { connectLibrary } from './library';
import { presets } from './presets';
import { createRenderer, type View } from './render';
import { parseSession, readSession, writeSession, type Session } from './session';
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
const saveStatus = document.querySelector<HTMLElement>('#save-status')!;
const importStatus = document.querySelector<HTMLElement>('#import-status')!;
const openWorkspace = document.querySelector<HTMLButtonElement>('#open-workspace')!;
const workspaceFile = document.querySelector<HTMLInputElement>('#workspace-file')!;
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
let saved = readSession();
if (saved) {
  try {
    loadWorkspace(workspace, saved.workspace);
  } catch {
    saved = null;
    loadWorkspace(workspace, presets.oak.workspace);
  }
}
let history = new Timeline(presets.oak.wallX);
let program = readProgram(workspace);
let variants: Variant[] = [];
let running = false;
let timer: number | undefined;
let saveTimer: number | undefined;
let updateQueued = false;
let view: View | undefined;
let drawnPlant: Plant | undefined;
let drawnAppearance: BranchAppearance | null;
let sunDrag: { id: number; offset: Point } | undefined;

function clampToScene(value: number, size: number): number {
  return Math.max(30, Math.min(size - 30, value));
}

function paintRuler(view: View): void {
  const { origin, scale, rulerMetres, tickMetres } = view;
  const pixels = rulerMetres * UNITS_PER_METRE * scale;
  ruler.style.height = `${pixels}px`;
  ruler.style.top = `${origin.y - pixels}px`;
  const intervals = rulerMetres / tickMetres;
  const labelStride = Math.max(1, Math.ceil(20 * intervals / pixels));
  const signature = `${rulerMetres}/${tickMetres}/${labelStride}`;
  if (ruler.dataset.ticks === signature) return;
  ruler.dataset.ticks = signature;
  ruler.setAttribute('aria-label', `Height ruler, 0 to ${rulerMetres} metres`);
  ruler.style.setProperty('--minor-tick', `${100 / (intervals * 5)}%`);
  const marks: HTMLSpanElement[] = [];
  for (let i = intervals; i >= 0; i--) {
    if (i !== intervals && i % labelStride !== 0) continue;
    const label = document.createElement('span');
    label.textContent = `${i * tickMetres} m`;
    label.style.top = `${100 * (1 - i / intervals)}%`;
    marks.push(label);
  }
  ruler.replaceChildren(...marks);
}

function paintPreview(force = false): void {
  const { plant, sun } = history.current;
  if (force || plant !== drawnPlant || program.branches !== drawnAppearance) {
    view = draw(plant, program.branches, history.wallX);
    drawnPlant = plant;
    drawnAppearance = program.branches;
    if (view) {
      heightValue.value = `${view.plantMetres.toFixed(2)} m`;
      paintRuler(view);
    }
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
  ruleMessage.textContent = program.buds.length
    ? 'Add conditions from Logic to change when buds grow.'
    : 'Connect a growth action under “when a bud grows.”';
  paintPreview();
  queueSave();
}

function captureSession(): Session {
  return {
    version: 1,
    workspace: serialization.workspaces.save(workspace),
    timeline: history.save(),
    preset: preset.value,
    speed: Number(speed.value),
  };
}

function saveProgress(): void {
  window.clearTimeout(saveTimer);
  const success = writeSession(captureSession());
  const label = success ? 'Saved locally' : 'Browser saving unavailable';
  if (saveStatus.textContent !== label) saveStatus.textContent = label;
}

function queueSave(): void {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(saveProgress, 250);
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
preset.value = saved?.preset ?? 'oak';
preset.addEventListener('change', () => {
  const next = presets[preset.value];
  if (!next) return;
  hideVariants();
  importStatus.textContent = '';
  loadWorkspace(workspace, next.workspace);
  workspace.scroll(0, 0);
  program = readProgram(workspace);
  history = new Timeline(next.wallX);
  for (let i = 0; i < starterGeneration; i++) history.step(program.buds);
  setRunning(!reducedMotion.matches && !finished(history.current.plant));
  paint();
});

function openSession(imported: Session, name: string): void {
  const scratch = new Workspace();
  try {
    loadWorkspace(scratch, imported.workspace);
    const nextProgram = readProgram(scratch);
    const nextHistory = Timeline.restore(imported.timeline, nextProgram.buds);

    setRunning(false);
    hideVariants();
    loadWorkspace(workspace, imported.workspace);
    workspace.scroll(0, 0);
    program = readProgram(workspace);
    history = nextHistory;
    preset.value = imported.preset;
    speed.value = String(imported.speed);
    showSpeed();
    importStatus.textContent = `Opened ${name}`;
    paint();
  } finally {
    scratch.dispose();
  }
}

openWorkspace.addEventListener('click', () => workspaceFile.click());
workspaceFile.addEventListener('change', async () => {
  const file = workspaceFile.files?.[0];
  workspaceFile.value = '';
  if (!file) return;
  try {
    const imported = parseSession(await file.text());
    if (!imported) throw new Error('Unrecognized workspace format');
    openSession(imported, file.name);
  } catch {
    importStatus.textContent = 'Could not open that Canopy workspace.';
  }
});

connectLibrary(() => {
  setRunning(false);
  paint();
}, () => {
  const thumbnail = document.createElement('canvas');
  thumbnail.width = 256;
  thumbnail.height = 164;
  createRenderer(thumbnail, true)(history.current.plant, program.branches, history.wallX);
  return { thumbnail: thumbnail.toDataURL('image/webp', 0.82), session: captureSession() };
}, openSession);

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

function showSpeed(): void {
  speedValue.value = `${speed.value} gen/s`;
  speed.setAttribute('aria-valuetext', `${speed.value} generations per second`);
}

speed.addEventListener('input', () => {
  showSpeed();
  if (running) setRunning(true);
  queueSave();
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
  queueSave();
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
    paint();
  });
});

const workspaceObserver = new ResizeObserver(() => svgResize(workspace));
workspaceObserver.observe(workspaceHost);
const canvasObserver = new ResizeObserver(() => paintPreview(true));
canvasObserver.observe(canvas);
const thumbnailObserver = new ResizeObserver(drawThumbnails);
thumbnailObserver.observe(variantGrid);

window.addEventListener('pagehide', saveProgress);
if (saved) {
  speed.value = String(saved.speed);
  history = Timeline.restore(saved.timeline, program.buds);
} else {
  for (let i = 0; i < starterGeneration; i++) history.step(program.buds);
  setRunning(!reducedMotion.matches);
}
showSpeed();
paint();
