import { RULER_HEIGHT, UNITS_PER_METRE, sample, type Bloom, type BranchAppearance, type Foliage, type Plant, type Point, type Segment } from './growth';

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
  const styleScale = { oak: 1, fern: 0.35, ivy: 0.42, coral: 0.82 };
  const width = Math.max(1.2, (15 - Math.min(age, 24) * 0.52) * 0.63 ** depth) * (appearance?.thickness ?? 1) * styleScale[appearance?.foliage ?? 'oak'];
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.strokeStyle = appearance?.color ?? (depth > 2 ? '#757552' : '#6d644f');
  ctx.lineWidth = width;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(from.x - width * 0.13, from.y);
  ctx.lineTo(to.x - width * 0.13, to.y);
  ctx.strokeStyle = appearance?.foliage === 'coral' ? '#e5a5ca' : depth > 2 ? '#968666' : '#9a7c59';
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

function drawFern(ctx: CanvasRenderingContext2D, segment: Segment): void {
  if (!segment.depth) return;
  const { from, to, age } = segment;
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const length = Math.max(5, 12 - age * 0.8);
  for (const side of [-1, 1]) {
    const tilt = angle + side * 0.85;
    ctx.beginPath();
    ctx.ellipse(to.x + Math.cos(tilt) * length * 0.72, to.y + Math.sin(tilt) * length * 0.72, length, 2.8, tilt, 0, Math.PI * 2);
    ctx.fillStyle = side === 1 ? '#88bd6d' : '#5f995d';
    ctx.fill();
  }
}

function drawIvy(ctx: CanvasRenderingContext2D, segment: Segment): void {
  const { from, to, id } = segment;
  if (segment.depth === 0 && segment.age % 2 === 0) return;
  ctx.save();
  ctx.translate(to.x, to.y);
  ctx.rotate(Math.atan2(to.x - from.x, from.y - to.y) + (sample(id) - 0.5) * 2.2);
  ctx.beginPath();
  ctx.moveTo(0, 1);
  ctx.bezierCurveTo(-13, -1, -16, -10, -10, -12);
  ctx.quadraticCurveTo(-4, -11, 0, -22);
  ctx.quadraticCurveTo(4, -11, 10, -12);
  ctx.bezierCurveTo(16, -10, 13, -1, 0, 1);
  ctx.fillStyle = sample(id + 1) > 0.5 ? '#719b55' : '#91b26c';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -1);
  ctx.lineTo(0, -15);
  ctx.strokeStyle = '#507548';
  ctx.lineWidth = 1.15;
  ctx.stroke();
  ctx.restore();
}

function drawCoral(ctx: CanvasRenderingContext2D, segment: Segment): void {
  if (!segment.depth) return;
  for (let i = 0; i < Math.min(segment.depth + 1, 6); i++) {
    const key = segment.id * 139 + i * 5;
    ctx.beginPath();
    ctx.arc(segment.to.x + (sample(key) - 0.5) * 10, segment.to.y + (sample(key + 1) - 0.5) * 9, 0.8 + sample(key + 2) * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = sample(key + 3) < 0.3 ? '#f4bbd1' : '#af80bb';
    ctx.fill();
  }
}

const drawLeaves = { oak: drawFoliage, fern: drawFern, ivy: drawIvy, coral: drawCoral };

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

function drawWall(ctx: CanvasRenderingContext2D, x: number): void {
  const height = RULER_HEIGHT * UNITS_PER_METRE;
  ctx.fillStyle = '#27322e';
  ctx.fillRect(x, -height, 34, height);
  ctx.fillStyle = '#38423b';
  ctx.fillRect(x + 24, -height, 10, height);
  ctx.strokeStyle = '#56625a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, -height);
  ctx.lineTo(x + 34, -height);
  for (let y = 0; y > -height; y -= 19) {
    ctx.moveTo(x + 1, y);
    ctx.lineTo(x + 34, y);
  }
  ctx.stroke();
}

export function createRenderer(canvas: HTMLCanvasElement, thumbnail = false) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser does not support Canvas 2D.');

  return (plant: Plant, branches: BranchAppearance | null, wallX: number | null): View | undefined => {
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

    const plotWidth = Math.max(1, width - (thumbnail ? 0 : 54));
    let halfSpan = 245;
    let above = RULER_HEIGHT * UNITS_PER_METRE;
    let below = 34;
    for (const segment of plant.segments) {
      halfSpan = Math.max(halfSpan, Math.abs(segment.to.x) + 38);
      above = Math.max(above, 38 - segment.to.y);
      below = Math.max(below, segment.to.y + 38);
    }
    const floorSpace = Math.max(below, above * 0.105);
    const scale = Math.min(plotWidth * 0.95 / (halfSpan * 2), height * 0.83 / above, height * 0.94 / (above + floorSpace));
    const origin = { x: plotWidth / 2, y: height - Math.max(height * 0.12, scale * floorSpace) };
    ctx.translate(origin.x, origin.y);
    ctx.scale(scale, scale);
    ctx.lineCap = 'round';
    if (wallX !== null) drawWall(ctx, wallX);
    drawGround(ctx);
    const appearanceAt = (segment: Segment) => branches && plant.generation - segment.born >= branches.age ? branches : null;
    for (const segment of plant.segments) {
      drawBranch(ctx, segment, appearanceAt(segment));
    }
    for (const segment of plant.segments) {
      const foliage: Foliage = appearanceAt(segment)?.foliage ?? 'oak';
      drawLeaves[foliage](ctx, segment);
    }
    for (const bloom of plant.blooms) drawBloom(ctx, bloom);
    ctx.fillStyle = '#d5e4a9';
    for (const bud of plant.buds) {
      if (bud.age === 0 && bud.depth === 0) continue;
      ctx.beginPath();
      ctx.arc(bud.x, bud.y, bud.depth < 2 ? 2.45 : 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
    return { origin, scale, width: plotWidth, height };
  };
}
