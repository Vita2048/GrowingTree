import { DEFAULT_SUN, finished, growOneGeneration, seedPlant, type Action, type Plant, type Point } from './growth';

interface Frame {
  plant: Plant;
  sun: Point;
}

export class Timeline {
  private frames: Frame[];
  private cursor = 0;

  constructor(readonly wallX: number | null = null, sun: Point = DEFAULT_SUN, chanceSeed?: number) {
    this.frames = [{ plant: seedPlant(chanceSeed), sun }];
  }

  get current(): Frame {
    return this.frames[this.cursor];
  }

  get latest(): number {
    return this.frames.length - 1;
  }

  seek(generation: number): void {
    this.cursor = Math.max(0, Math.min(generation, this.latest));
  }

  reset(): void {
    this.frames = [{ plant: seedPlant(), sun: this.current.sun }];
    this.cursor = 0;
  }

  moveSun(sun: Point): void {
    const { plant } = this.current;
    this.frames.length = this.cursor + 1;
    this.frames[this.cursor] = { plant, sun };
  }

  step(actions: Action[]): void {
    if (this.cursor === this.latest) {
      const { plant, sun } = this.current;
      const next = growOneGeneration(plant, actions, sun, this.wallX);
      if (next === plant) return;
      this.frames.push({ plant: next, sun });
    }
    this.cursor++;
  }

  applyRules(actions: Action[]): void {
    const saved = this.frames;
    const target = this.cursor;
    this.frames = [{ plant: seedPlant(saved[0].plant.chanceSeed), sun: saved[0].sun }];
    if (actions.length) {
      for (const frame of saved.slice(1)) {
        const previous = this.frames[this.frames.length - 1];
        const plant = growOneGeneration(previous.plant, actions, previous.sun, this.wallX);
        if (plant === previous.plant) break;
        this.frames.push({ plant, sun: frame.sun });
      }
    }
    this.seek(target);
  }

  preview(actions: Action[], generation: number): Timeline {
    const { plant, sun } = this.frames[0];
    const variant = new Timeline(this.wallX, sun, plant.chanceSeed);
    while (variant.latest < generation && !finished(variant.current.plant)) {
      variant.moveSun(this.frames[Math.min(variant.latest, this.cursor)].sun);
      variant.step(actions);
    }
    variant.moveSun(this.frames[Math.min(variant.latest, this.cursor)].sun);
    return variant;
  }
}
