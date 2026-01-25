'use client';

import { useState, useEffect } from 'react';

interface AutotilePickerProps {
  autotileType: string;
  currentIndex: number;
  spriteSheetSrc: string;
  onSelect: (index: number) => void;
  onClose: () => void;
  tileInfo: {
    x: number;
    y: number;
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
  };
}

export function AutotilePicker({
  autotileType,
  currentIndex,
  spriteSheetSrc,
  onSelect,
  onClose,
  tileInfo,
}: AutotilePickerProps) {
  const [selectedIndex, setSelectedIndex] = useState(currentIndex);
  const [imageLoaded, setImageLoaded] = useState(false);

  const cols = 4;
  const rows = 7;
  const tileWidth = 128;
  const tileHeight = 64;

  const handleTileClick = (index: number) => {
    setSelectedIndex(index);
  };

  const handleConfirm = () => {
    onSelect(selectedIndex);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[95vh] flex flex-col" style={{overflow:"scroll"}}>
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-2xl font-bold">选择Autotile瓦片</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Tile信息 - 可滚动区域开始 */}
        <div className="overflow-y-auto flex-1 pr-2">
          {/* Tile信息 */}
          <div className="mb-4 p-4 bg-gray-100 rounded flex-shrink-0">
          <h3 className="font-bold mb-2">Tile信息</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>位置:</strong> ({tileInfo.x}, {tileInfo.y})</p>
              <p><strong>类型:</strong> {autotileType}</p>
              <p><strong>当前Index:</strong> {currentIndex} (Row {Math.floor(currentIndex / 4)}, Col {currentIndex % 4})</p>
            </div>
            <div>
              <p><strong>邻居:</strong></p>
              <p className="ml-2">↑ {tileInfo.neighbors.top || 'null'}</p>
              <p className="ml-2">→ {tileInfo.neighbors.right || 'null'}</p>
              <p className="ml-2">↓ {tileInfo.neighbors.bottom || 'null'}</p>
              <p className="ml-2">← {tileInfo.neighbors.left || 'null'}</p>
            </div>
          </div>
          <div className="mt-2">
            <p><strong>Corners:</strong></p>
            <div className="grid grid-cols-2 gap-2 ml-2 text-sm">
              <p>↖ TL: {tileInfo.corners.topLeft}</p>
              <p>↗ TR: {tileInfo.corners.topRight}</p>
              <p>↙ BL: {tileInfo.corners.bottomLeft}</p>
              <p>↘ BR: {tileInfo.corners.bottomRight}</p>
            </div>
          </div>
        </div>

        {/* Sprite Sheet预览 */}
        <div className="mb-4">
          <h3 className="font-bold mb-2">选择瓦片 (点击选择，{selectedIndex === currentIndex ? '当前' : '已修改'})</h3>
          <div className="relative inline-block border-2 border-gray-300">
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p>Loading...</p>
              </div>
            )}
            <img
              src={spriteSheetSrc}
              alt="Autotile Sprite Sheet"
              onLoad={() => setImageLoaded(true)}
              className="block"
              style={{ imageRendering: 'pixelated', width: '896px', height: 'auto' }}
            />
            {/* 网格覆盖层 */}
            {imageLoaded && (
              <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
                {Array.from({ length: cols * rows }).map((_, index) => {
                  const row = Math.floor(index / cols);
                  const col = index % cols;
                  const isSelected = index === selectedIndex;
                  const isCurrent = index === currentIndex;
                  
                  return (
                    <div
                      key={index}
                      onClick={() => handleTileClick(index)}
                      className={`
                        border cursor-pointer transition-all
                        ${isSelected ? 'bg-blue-500 bg-opacity-50 border-blue-700 border-2' : 'border-gray-400 hover:bg-yellow-300 hover:bg-opacity-30'}
                        ${isCurrent ? 'ring-4 ring-green-500' : ''}
                      `}
                      title={`Index ${index} (Row ${row}, Col ${col})${isCurrent ? ' - Current' : ''}`}
                    >
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white text-shadow">
                        {index}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="mt-2 text-sm text-gray-600">
            <p>🟦 蓝色 = 选中 | 🟩 绿框 = 当前使用 | 移动鼠标查看编号</p>
          </div>
        </div>

        {/* 预览区域 */}
        <div className="mb-4 flex gap-4">
          <div className="flex-1">
            <h4 className="font-bold mb-1 text-sm">当前使用 (Index {currentIndex})</h4>
            <div className="border-2 border-green-500 inline-block bg-gray-100 p-2">
              <canvas
                width={tileWidth}
                height={tileHeight}
                ref={(canvas) => {
                  if (canvas && imageLoaded) {
                    const ctx = canvas.getContext('2d');
                    const img = new Image();
                    img.src = spriteSheetSrc;
                    img.onload = () => {
                      const sx = (currentIndex % cols) * tileWidth;
                      const sy = Math.floor(currentIndex / cols) * tileHeight;
                      ctx?.drawImage(img, sx, sy, tileWidth, tileHeight, 0, 0, tileWidth, tileHeight);
                    };
                  }
                }}
              />
            </div>
          </div>
          <div className="flex-1">
            <h4 className="font-bold mb-1 text-sm">新选择 (Index {selectedIndex})</h4>
            <div className="border-2 border-blue-500 inline-block bg-gray-100 p-2">
              <canvas
                width={tileWidth}
                height={tileHeight}
                ref={(canvas) => {
                  if (canvas && imageLoaded) {
                    const ctx = canvas.getContext('2d');
                    const img = new Image();
                    img.src = spriteSheetSrc;
                    img.onload = () => {
                      const sx = (selectedIndex % cols) * tileWidth;
                      const sy = Math.floor(selectedIndex / cols) * tileHeight;
                      ctx?.drawImage(img, sx, sy, tileWidth, tileHeight, 0, 0, tileWidth, tileHeight);
                    };
                  }
                }}
              />
            </div>
          </div>
        </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
            disabled={selectedIndex === currentIndex}
          >
            {selectedIndex === currentIndex ? '未修改' : '确认修改'}
          </button>
        </div>
      </div>
    </div>
  );
}
