/**
 * 测试octaveNoise2D的输出范围
 */

// 复制PerlinNoise类（重命名避免与全局类型冲突）
class TestPerlinNoise {
  private permutation: number[];

  constructor(seed?: number) {
    this.permutation = [];
    for (let i = 0; i < 256; i++) {
      this.permutation[i] = i;
    }

    // 使用种子打乱
    const random = seed ? this.seededRandom(seed) : Math.random;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [this.permutation[i], this.permutation[j]] = [this.permutation[j], this.permutation[i]];
    }

    // 复制以避免溢出
    this.permutation = [...this.permutation, ...this.permutation];
  }

  private seededRandom(seed: number) {
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
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

  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);

    const u = this.fade(x);
    const v = this.fade(y);

    const a = this.permutation[X] + Y;
    const b = this.permutation[X + 1] + Y;

    return this.lerp(
      v,
      this.lerp(u, this.grad(this.permutation[a], x, y), this.grad(this.permutation[b], x - 1, y)),
      this.lerp(
        u,
        this.grad(this.permutation[a + 1], x, y - 1),
        this.grad(this.permutation[b + 1], x - 1, y - 1)
      )
    );
  }

  /**
   * 多octave噪声，产生更大的值域和更丰富的细节
   */
  octaveNoise2D(x: number, y: number, octaves: number = 4, persistence: number = 0.5): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }

    return total / maxValue; // 归一化到 [-1, 1]
  }
}

// 测试
const noise = new TestPerlinNoise(12345);
const samples = 1024;
const scale = 0.15;
const octaves = 3;
const persistence = 0.5;

let min = Infinity;
let max = -Infinity;
const values: number[] = [];

console.log(
  `测试 ${samples} 个样本 (scale=${scale}, octaves=${octaves}, persistence=${persistence})...\n`
);

for (let i = 0; i < samples; i++) {
  const x = (i % 32) * scale;
  const y = Math.floor(i / 32) * scale;
  const value = noise.octaveNoise2D(x, y, octaves, persistence);
  values.push(value);
  min = Math.min(min, value);
  max = Math.max(max, value);
}

console.log(`噪声值范围: [${min.toFixed(3)}, ${max.toFixed(3)}]`);

// 归一化到 [0, 1]
const normalized = values.map((v) => (v + 1) / 2);
const normalizedMin = Math.min(...normalized);
const normalizedMax = Math.max(...normalized);
console.log(`归一化范围: [${normalizedMin.toFixed(3)}, ${normalizedMax.toFixed(3)}]`);

// 统计分布（模拟hall主题的权重）
const weights = { wood: 70, gold: 15, dirt: 10, fire: 5 };
const distribution: Record<string, number> = { wood: 0, gold: 0, dirt: 0, fire: 0 };

for (const v of normalized) {
  if (v <= 0.7) distribution.wood++;
  else if (v <= 0.85) distribution.gold++;
  else if (v <= 0.95) distribution.dirt++;
  else distribution.fire++;
}

console.log('\n地形分布 (hall主题):');
console.log(
  `  wood: ${distribution.wood} (${((distribution.wood / samples) * 100).toFixed(1)}%) - 期望 70%`
);
console.log(
  `  gold: ${distribution.gold} (${((distribution.gold / samples) * 100).toFixed(1)}%) - 期望 15%`
);
console.log(
  `  dirt: ${distribution.dirt} (${((distribution.dirt / samples) * 100).toFixed(1)}%) - 期望 10%`
);
console.log(
  `  fire: ${distribution.fire} (${((distribution.fire / samples) * 100).toFixed(1)}%) - 期望 5%`
);

// 显示归一化值的分布直方图
console.log('\n归一化值分布直方图:');
const bins = 10;
const binCounts = new Array(bins).fill(0);
for (const v of normalized) {
  const binIndex = Math.min(bins - 1, Math.floor(v * bins));
  binCounts[binIndex]++;
}

for (let i = 0; i < bins; i++) {
  const rangeStart = (i / bins).toFixed(2);
  const rangeEnd = ((i + 1) / bins).toFixed(2);
  const bar = '█'.repeat(Math.round((binCounts[i] / samples) * 50));
  console.log(`  [${rangeStart}, ${rangeEnd}): ${bar} ${binCounts[i]}`);
}
