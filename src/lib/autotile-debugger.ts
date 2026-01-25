/**
 * Autotile调试工具
 */

export class AutotileDebugger {
  private static enabled = false;
  
  static enable() {
    this.enabled = true;
    console.log('🔍 Autotile Debug Mode Enabled');
  }
  
  static disable() {
    this.enabled = false;
  }
  
  static logTileSelection(
    x: number,
    y: number,
    autotileType: string,
    terrain1: string,
    terrain2: string,
    corners: {
      topLeft: string;
      topRight: string;
      bottomLeft: string;
      bottomRight: string;
    },
    selectedIndex: number
  ) {
    if (!this.enabled) return;
    
    console.log(`\n📍 Autotile @ (${x}, ${y})`);
    console.log(`   Type: ${autotileType}`);
    console.log(`   Terrains: ${terrain1} ↔ ${terrain2}`);
    console.log(`   Corners:`, corners);
    console.log(`   → Index: ${selectedIndex} (Row ${Math.floor(selectedIndex / 4)}, Col ${selectedIndex % 4})`);
  }
  
  static logTileClick(
    x: number,
    y: number,
    tile: any,
    neighbors: { [key: string]: any }
  ) {
    console.log('\n' + '='.repeat(60));
    console.log(`🖱️  Clicked Tile @ (${x}, ${y})`);
    
    if (tile) {
      console.log(`   Type: ${tile.tileType}`);
      console.log(`   Walkable: ${tile.walkable}`);
      
      if (tile.autotileIndex !== undefined) {
        const row = Math.floor(tile.autotileIndex / 4);
        const col = tile.autotileIndex % 4;
        console.log(`   Autotile Index: ${tile.autotileIndex} (Row ${row}, Col ${col})`);
      }
      
      console.log(`\n   🧭 Neighbors:`);
      console.log(`      ↑  Top:    ${neighbors.top || 'null'}`);
      console.log(`      →  Right:  ${neighbors.right || 'null'}`);
      console.log(`      ↓  Bottom: ${neighbors.bottom || 'null'}`);
      console.log(`      ←  Left:   ${neighbors.left || 'null'}`);
    } else {
      console.log('   ❌ No tile found');
    }
    
    console.log('='.repeat(60));
  }
  
  static compareTerrainConfig(
    autotileType: string,
    expectedTerrain1: string,
    expectedTerrain2: string,
    actualTile1: string | null,
    actualTile2: string | null
  ) {
    if (!this.enabled) return;
    
    console.log(`\n⚙️  Config Check for ${autotileType}:`);
    console.log(`   Expected: ${expectedTerrain1} ↔ ${expectedTerrain2}`);
    console.log(`   Actual tiles found: ${actualTile1} | ${actualTile2}`);
    
    if (actualTile1 !== expectedTerrain1 && actualTile1 !== expectedTerrain2) {
      console.warn(`   ⚠️  Terrain1 mismatch!`);
    }
    if (actualTile2 !== expectedTerrain1 && actualTile2 !== expectedTerrain2) {
      console.warn(`   ⚠️  Terrain2 mismatch!`);
    }
  }
}

// 在window上暴露，方便浏览器控制台调用
if (typeof window !== 'undefined') {
  (window as any).AutotileDebugger = AutotileDebugger;
}
