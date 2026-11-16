import { svgResize } from 'blockly';
import { createEditor, readProgram } from './editor';
import { growOneGeneration, reachedLimit, seedPlant } from './growth';
import { createRenderer } from './render';
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
const generation = document.querySelector<HTMLOutputElement>('#generation')!;
const budCount = document.querySelector<HTMLOutputElement>('#bud-count')!;
const segmentCount = document.querySelector<HTMLOutputElement>('#segment-count')!;
const status = document.querySelector<HTMLElement>('#growth-status')!;
const ruleMessage = document.querySelector<HTMLElement>('#rule-message')!;

const workspace = createEditor(workspaceHost);
const draw = createRenderer(canvas);
let actions = readProgram(workspace);
let plant = seedPlant();
let running = false;
let timer: number | undefined;
let updateQueued = false;

function regrow(target: number): void {
  plant = seedPlant();
  if (!actions.length) return;
  while (plant.generation < target && !reachedLimit(plant)) growOneGeneration(plant, actions);
}

function paint(): void {
  const complete = reachedLimit(plant);
  const inactive = complete || !actions.length;
  playback.disabled = !actions.length;
  step.disabled = inactive;
  playbackLabel.textContent = running ? 'Pause' : complete ? 'Replay' : 'Play';
  pauseIcon.toggleAttribute('hidden', !running);
  playIcon.toggleAttribute('hidden', running);
  const label = complete ? 'Growth limit reached' : running ? 'Growing' : 'Paused';
  if (status.textContent !== label) status.textContent = label;
  status.dataset.state = running ? 'running' : 'resting';
  generation.value = String(plant.generation);
  budCount.value = String(plant.buds.length);
  segmentCount.value = String(plant.segments.length);
  draw(plant);
}

function setRunning(next: boolean): void {
  window.clearInterval(timer);
  timer = undefined;
  running = next;
  if (running) timer = window.setInterval(tick, 1000 / Number(speed.value));
}

function tick(): void {
  growOneGeneration(plant, actions);
  if (reachedLimit(plant)) setRunning(false);
  paint();
}

playback.addEventListener('click', () => {
  if (reachedLimit(plant)) plant = seedPlant();
  setRunning(!running);
  paint();
});

step.addEventListener('click', () => {
  setRunning(false);
  tick();
});

reset.addEventListener('click', () => {
  setRunning(false);
  plant = seedPlant();
  paint();
});

speed.addEventListener('input', () => {
  speedValue.value = `${speed.value} gen/s`;
  speed.setAttribute('aria-valuetext', `${speed.value} generations per second`);
  if (running) setRunning(true);
});

workspace.addChangeListener((event) => {
  if (event.isUiEvent || updateQueued) return;
  updateQueued = true;
  requestAnimationFrame(() => {
    updateQueued = false;
    const next = readProgram(workspace);
    if (JSON.stringify(next) === JSON.stringify(actions)) return;
    actions = next;
    regrow(plant.generation);
    if (running && (!actions.length || reachedLimit(plant))) setRunning(false);
    ruleMessage.textContent = actions.length
      ? 'Edit the angle to change how wide the oak grows.'
      : 'Connect a growth action under “when a bud grows.”';
    paint();
  });
});

const workspaceObserver = new ResizeObserver(() => svgResize(workspace));
workspaceObserver.observe(workspaceHost);
const canvasObserver = new ResizeObserver(() => draw(plant));
canvasObserver.observe(canvas);

speed.setAttribute('aria-valuetext', `${speed.value} generations per second`);
regrow(22);
setRunning(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
paint();
