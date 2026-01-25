/**
 * Autotile训练数据收集器
 * 记录用户的手动选择，用于分析和改进自动选择算法
 */

export interface AutotileTrainingData {
  timestamp: number;
  position: { x: number; y: number };
  autotileType: string;
  terrain1: string;
  terrain2: string;
  corners: {
    topLeft: string;
    topRight: string;
    bottomLeft: string;
    bottomRight: string;
  };
  neighbors: {
    top: string | null;
    right: string | null;
    bottom: string | null;
    left: string | null;
  };
  algorithmIndex: number; // 算法自动选择的index
  userIndex: number; // 用户手动选择的index
}

export class AutotileTrainer {
  private static STORAGE_KEY = 'autotile_training_data';
  
  /**
   * 记录一次用户选择
   */
  static recordChoice(data: AutotileTrainingData): void {
    const existing = this.loadAll();
    existing.push(data);
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existing));
      console.log(`✅ Recorded training data for (${data.position.x}, ${data.position.y})`);
    } catch (e) {
      console.error('Failed to save training data:', e);
    }
  }
  
  /**
   * 加载所有训练数据
   */
  static loadAll(): AutotileTrainingData[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to load training data:', e);
      return [];
    }
  }
  
  /**
   * 清空所有训练数据
   */
  static clear(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('🗑️ Cleared all training data');
  }
  
  /**
   * 导出为JSON文件
   */
  static exportJSON(): string {
    const data = this.loadAll();
    return JSON.stringify(data, null, 2);
  }
  
  /**
   * 分析训练数据，生成统计报告
   */
  static analyze(): {
    totalRecords: number;
    byAutotileType: { [key: string]: number };
    disagreements: number; // 算法和用户选择不同的次数
    cornerPatterns: { [pattern: string]: { [index: string]: number } };
  } {
    const data = this.loadAll();
    const analysis = {
      totalRecords: data.length,
      byAutotileType: {} as { [key: string]: number },
      disagreements: 0,
      cornerPatterns: {} as { [pattern: string]: { [index: string]: number } },
    };
    
    data.forEach(record => {
      // 统计类型
      if (!analysis.byAutotileType[record.autotileType]) {
        analysis.byAutotileType[record.autotileType] = 0;
      }
      analysis.byAutotileType[record.autotileType]++;
      
      // 统计不一致
      if (record.algorithmIndex !== record.userIndex) {
        analysis.disagreements++;
      }
      
      // 统计corner模式
      const pattern = this.getCornerPattern(record.corners, record.terrain1, record.terrain2);
      if (!analysis.cornerPatterns[pattern]) {
        analysis.cornerPatterns[pattern] = {};
      }
      const indexKey = record.userIndex.toString();
      if (!analysis.cornerPatterns[pattern][indexKey]) {
        analysis.cornerPatterns[pattern][indexKey] = 0;
      }
      analysis.cornerPatterns[pattern][indexKey]++;
    });
    
    return analysis;
  }
  
  /**
   * 生成corner模式的字符串表示
   * 例如: "T1T1T2T2" 表示 topLeft=T1, topRight=T1, bottomLeft=T2, bottomRight=T2
   */
  private static getCornerPattern(
    corners: { topLeft: string; topRight: string; bottomLeft: string; bottomRight: string },
    terrain1: string,
    terrain2: string
  ): string {
    const map = (t: string) => {
      if (t === terrain1) return 'T1';
      if (t === terrain2) return 'T2';
      return 'XX';
    };
    
    return `${map(corners.topLeft)}-${map(corners.topRight)}-${map(corners.bottomLeft)}-${map(corners.bottomRight)}`;
  }
  
  /**
   * 打印分析报告到控制台
   */
  static printAnalysis(): void {
    const analysis = this.analyze();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Autotile Training Data Analysis');
    console.log('='.repeat(60));
    
    console.log(`\n📈 Total Records: ${analysis.totalRecords}`);
    console.log(`⚠️  Disagreements: ${analysis.disagreements} (${((analysis.disagreements / analysis.totalRecords) * 100).toFixed(1)}%)`);
    
    console.log('\n📦 By Autotile Type:');
    Object.entries(analysis.byAutotileType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    console.log('\n🎯 Corner Pattern → User Index Mapping:');
    Object.entries(analysis.cornerPatterns).forEach(([pattern, indices]) => {
      console.log(`\n  Pattern: ${pattern}`);
      const sorted = Object.entries(indices).sort((a, b) => b[1] - a[1]);
      sorted.forEach(([index, count]) => {
        const percentage = ((count / Object.values(indices).reduce((a, b) => a + b, 0)) * 100).toFixed(1);
        console.log(`    Index ${index}: ${count} times (${percentage}%)`);
      });
    });
    
    console.log('\n' + '='.repeat(60));
  }
  
  /**
   * 根据训练数据生成优化的选择函数代码
   */
  static generateOptimizedCode(): string {
    const analysis = this.analyze();
    let code = '// Auto-generated from training data\n\n';
    code += 'function selectAutotileByTrainedPattern(\n';
    code += '  corners: { topLeft: string; topRight: string; bottomLeft: string; bottomRight: string },\n';
    code += '  terrain1: string,\n';
    code += '  terrain2: string\n';
    code += '): number {\n';
    code += '  const pattern = getCornerPattern(corners, terrain1, terrain2);\n\n';
    code += '  switch (pattern) {\n';
    
    Object.entries(analysis.cornerPatterns).forEach(([pattern, indices]) => {
      const mostCommon = Object.entries(indices).sort((a, b) => b[1] - a[1])[0];
      if (mostCommon) {
        code += `    case '${pattern}':\n`;
        code += `      return ${mostCommon[0]}; // Used ${mostCommon[1]} times\n`;
      }
    });
    
    code += '    default:\n';
    code += '      return 0; // Fallback\n';
    code += '  }\n';
    code += '}\n';
    
    return code;
  }
}

// 在window上暴露，方便浏览器控制台调用
if (typeof window !== 'undefined') {
  (window as any).AutotileTrainer = AutotileTrainer;
}
