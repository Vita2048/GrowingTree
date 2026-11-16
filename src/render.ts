import { sample, type Bloom, type BranchAppearance, type Plant, type Point, type Segment } from './growth';

const leafColors = ['#426848', '#578358', '#6a975d', '#81ab6c', '#a0bd75', '#b3c780'];

function drawGround(ctx: CanvasRenderingContext2D): void {
  for (const [radius, color] of [[104, '#75937724'], [70, '#75937738'], [29, '#a4bf8740']] as const) {
    ctx.beginPath();
    ctx.ellipse(0, 3, radius, radius * 0.138, 0, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(0, 0, 4, 3, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#ad916a';
  ctx.fill();
}

function drawBranch(ctx: CanvasRenderingContext2D, segment: Segment, appearance: BranchAppearance | null): void {
  const { from, to, depth, age } = segment;
  const width = Math.max(1.2, (15 - Math.min(age, 24) * 0.52) * 0.63 ** depth) * (appearance?.thickness ?? 1);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.strokeStyle = appearance?.color ?? (depth > 2 ? '#757552' : '#6d644f');
  ctx.lineWidth = width;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(from.x - width * 0.13, from.y);
  ctx.lineTo(to.x - width * 0.13, to.y);
  ctx.strokeStyle = depth > 2 ? '#968666' : '#9a7c59';
  ctx.lineWidth = width * 0.36;
  ctx.stroke();
}

function drawFoliage(ctx: CanvasRenderingContext2D, segment: Segment): void {
  const { to, id, depth, age } = segment;
  if (depth === 0 || (depth === 1 && age < 6)) return;
  const size = depth === 1 ? 18 : 32;
  for (let i = 0; i < 17; i++) {
    const key = id * 173 + i * 7;
    const angle = sample(key) * Math.PI * 2;
    const distance = Math.sqrt(sample(key + 1)) * size;
    const length = 2.4 + sample(key + 2) * 4.3;
    ctx.beginPath();
    ctx.ellipse(
      to.x + Math.cos(angle) * distance,
      to.y + Math.sin(angle) * distance * 0.76,
      length, length * 0.49, angle + 0.65, 0, Math.PI * 2,
    );
    ctx.fillStyle = leafColors[Math.floor(sample(key + 3) * leafColors.length)];
    ctx.globalAlpha = 0.44 + sample(key + 4) * 0.43;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawBloom(ctx: CanvasRenderingContext2D, bloom: Bloom): void {
  ctx.save();
  ctx.translate(bloom.x, bloom.y);
  ctx.rotate(bloom.heading);
  if (bloom.type === 'leaf') {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-12, -5, -11, -18, 0, -24);
    ctx.bezierCurveTo(11, -18, 12, -5, 0, 0);
    ctx.fillStyle = '#a2c77e';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(0, -19);
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = '#4a7545';
    ctx.stroke();
  } else {
    ctx.fillStyle = '#f5d8a2';
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      ctx.beginPath();
      ctx.ellipse(Math.cos(angle) * 8, Math.sin(angle) * 8, 7, 4, angle, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#b67a39';
    ctx.fill();
  }
  ctx.restore();
}

export interface View {
  origin: Point;
  scale: number;
  width: number;
  height: number;
}

export function createRenderer(canvas: HTMLCanvasElement): (plant: Plant, branches: BranchAppearance | null) => View | undefined {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser does not support Canvas 2D.');

  return (plant, branches) => {
    const { clientWidth: width, clientHeight: height } = canvas;
    if (!width || !height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * ratio);
    const pixelHeight = Math.round(height * ratio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    let halfSpan = 265;
    let above = 441;
    let below = 34;
    for (const segment of plant.segments) {
      halfSpan = Math.max(halfSpan, Math.abs(segment.to.x) + 38);
      above = Math.max(above, 38 - segment.to.y);
      below = Math.max(below, segment.to.y + 38);
    }
    const floorSpace = Math.max(below, above * 0.105);
    const scale = Math.min(width * 0.95 / (halfSpan * 2), height * 0.83 / above, height * 0.94 / (above + floorSpace));
    const origin = { x: width / 2, y: height - Math.max(height * 0.12, scale * floorSpace) };
    ctx.translate(origin.x, origin.y);
    ctx.scale(scale, scale);
    ctx.lineCap = 'round';
    drawGround(ctx);
    for (const segment of plant.segments) {
      const appearance = branches && plant.generation - segment.born >= branches.age ? branches : null;
      drawBranch(ctx, segment, appearance);
    }
    for (const segment of plant.segments) drawFoliage(ctx, segment);
    for (const bloom of plant.blooms) drawBloom(ctx, bloom);
    ctx.fillStyle = '#d5e4a9';
    for (const bud of plant.buds) {
      if (bud.age === 0 && bud.depth === 0) continue;
      ctx.beginPath();
      ctx.arc(bud.x, bud.y, bud.depth < 2 ? 2.45 : 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
    return { origin, scale, width, height };
  };
}
