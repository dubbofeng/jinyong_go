// 测试Perlin噪声生成
class PerlinNoise {
  private permutation: number[];

  constructor(seed: number = Date.now()) {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }

    // Shuffle using seeded random
    let currentSeed = seed;
    const seededRandom = () => {
      const x = Math.sin(currentSeed++) * 10000;
      return x - Math.floor(x);
    };

    for (let i = 255; i > 0; i--) {
      const j = Math.floor(seededRandom() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }

    this.permutation = [...p, ...p];
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);

    const u = this.fade(x);
    const v = this.fade(y);

    const a = this.permutation[X] + Y;
    const b = this.permutation[X + 1] + Y;

    return this.lerp(v,
      this.lerp(u, this.grad(this.permutation[a], x, y),
                   this.grad(this.permutation[b], x - 1, y)),
      this.lerp(u, this.grad(this.permutation[a + 1], x, y - 1),
                   this.grad(this.permutation[b + 1], x - 1, y - 1))
    );
  }
}

// 测试噪声值分布
const noise = new PerlinNoise(12345);
const samples: number[] = [];

console.log('📊 测试Perlin噪声值分布（种子：12345）\n');

// 采样32x32的噪声值
for (let y = 0; y < 32; y++) {
  for (let x = 0; x < 32; x++) {
    const n1 = noise.noise(x / 20, y / 20);
    const n2 = noise.noise(x / 10, y / 10);
    const n3 = noise.noise(x / 5, y / 5);
    const combined = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
    samples.push(combined);
  }
}

// 统计
const min = Math.min(...samples);
const max = Math.max(...samples);
const avg = samples.reduce((a, b) => a + b, 0) / samples.length;

console.log(`原始噪声值范围: [${min.toFixed(3)}, ${max.toFixed(3)}]`);
console.log(`平均值: ${avg.toFixed(3)}`);

// 归一化后的分布
const normalized = samples.map(v => (v + 1) / 2);
const normMin = Math.min(...normalized);
const normMax = Math.max(...normalized);
const normAvg = normalized.reduce((a, b) => a + b, 0) / normalized.length;

console.log(`\n归一化后范围: [${normMin.toFixed(3)}, ${normMax.toFixed(3)}]`);
console.log(`归一化平均值: ${normAvg.toFixed(3)}`);

// 按权重分布统计（hall主题: wood 70%, gold 15%, dirt 10%, fire 5%）
const distribution = { wood: 0, gold: 0, dirt: 0, fire: 0, water: 0 };
for (const n of normalized) {
  if (n <= 0.70) distribution.wood++;
  else if (n <= 0.85) distribution.gold++;
  else if (n <= 0.95) distribution.dirt++;
  else distribution.fire++;
}

console.log('\n按hall主题权重的理论分布：');
console.log(`  wood (0-0.70): ${distribution.wood} (${(distribution.wood / samples.length * 100).toFixed(1)}%)`);
console.log(`  gold (0.70-0.85): ${distribution.gold} (${(distribution.gold / samples.length * 100).toFixed(1)}%)`);
console.log(`  dirt (0.85-0.95): ${distribution.dirt} (${(distribution.dirt / samples.length * 100).toFixed(1)}%)`);
console.log(`  fire (0.95-1.00): ${distribution.fire} (${(distribution.fire / samples.length * 100).toFixed(1)}%)`);

// 显示前10个样本
console.log('\n前10个样本（原始 → 归一化 → 瓦片类型）：');
for (let i = 0; i < 10; i++) {
  const orig = samples[i];
  const norm = normalized[i];
  let type = 'wood';
  if (norm > 0.95) type = 'fire';
  else if (norm > 0.85) type = 'dirt';
  else if (norm > 0.70) type = 'gold';
  
  console.log(`  ${i}: ${orig.toFixed(3)} → ${norm.toFixed(3)} → ${type}`);
}
