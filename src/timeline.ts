import { DEFAULT_SUN, growOneGeneration, seedPlant, type Action, type Plant, type Point } from './growth';

interface Frame {
  plant: Plant;
  sun: Point;
}

export class Timeline {
  private frames: Frame[] = [{ plant: seedPlant(), sun: DEFAULT_SUN }];
  private cursor = 0;

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
      const next = growOneGeneration(plant, actions, sun);
      if (next === plant) return;
      this.frames.push({ plant: next, sun });
    }
    this.cursor++;
  }

  applyRules(actions: Action[]): void {
    const saved = this.frames;
    const target = this.cursor;
    this.frames = [{ plant: seedPlant(), sun: saved[0].sun }];
    if (actions.length) {
      for (const frame of saved.slice(1)) {
        const previous = this.frames[this.frames.length - 1];
        const plant = growOneGeneration(previous.plant, actions, previous.sun);
        if (plant === previous.plant) break;
        this.frames.push({ plant, sun: frame.sun });
      }
    }
    this.seek(target);
  }
}
