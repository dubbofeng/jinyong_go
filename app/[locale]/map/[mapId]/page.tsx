"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";

type Tile = {
  id: number;
  mapId: number;
  x: number;
  y: number;
  tileType: string;
  createdAt: Date;
  updatedAt: Date;
};

type MapInfo = {
  id: number;
  mapId: string;
  name: string;
  mapType: string;
  width: number;
  height: number;
};

interface MapItem {
  id: number;
  itemName: string;
  itemPath: string;
  itemType: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  animated?: number;
  currentFrame?: number;
  targetMapId?: string;
  targetX?: number;
  targetY?: number;
}

const IsometricMapViewer = () => {
  const params = useParams();
  const mapId = params?.mapId as string;
  const [mapData, setMapData] = useState<Tile[]>([]);
  const [mapInfo, setMapInfo] = useState<MapInfo | null>(null);
  const [mapItems, setMapItems] = useState<MapItem[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (mapId) {
      fetchMapData();
      fetchMapItems();
    }
  }, [mapId]);

  const fetchMapData = async () => {
    try {
      const response = await fetch(`/api/maps/${mapId}`);
      const data = await response.json();
      setMapData(data.tiles);
      setMapInfo(data.map);
    } catch (error) {
      console.error("Error fetching map data:", error);
    }
  };

  const fetchMapItems = async () => {
    try {
      const response = await fetch(`/api/maps/${mapId}/items`);
      const data = await response.json();
      setMapItems(
        data.items.map((item: MapItem) => ({ ...item, currentFrame: 0 }))
      );
    } catch (error) {
      console.error("Error fetching map items:", error);
    }
  };

  // Animation effect for animated items
  useEffect(() => {
    let frameCount = 0;
    const FRAME_DELAY = 5;

    const animateItems = () => {
      frameCount++;

      if (frameCount % FRAME_DELAY === 0) {
        setMapItems((prevItems) => {
          return prevItems.map((item) => {
            if (item.animated && item.animated > 0) {
              const nextFrame =
                ((item.currentFrame || 0) + 1) % (item.animated + 1);
              return { ...item, currentFrame: nextFrame };
            }
            return item;
          });
        });
      }

      animationFrameRef.current = requestAnimationFrame(animateItems);
    };

    animationFrameRef.current = requestAnimationFrame(animateItems);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const getBackgroundPosition = (tile: Tile) => {
    const positions: Record<string, string> = {
      wood: "0px 0px",
      gold: "-128px 0px",
      dirt: "-256px 0px",
      fire: "-384px 0px",
      water: "-512px 0px",
    };
    return positions[tile.tileType] || "0px 0px";
  };

  const getImagePath = (item: MapItem) => {
    if (item.animated && item.animated > 0) {
      const basePath = item.itemPath.replace(/\/\d{3}\.png$/, "");
      const frameNumber = String(item.currentFrame || 0).padStart(3, "0");
      return `${basePath}/${frameNumber}.png`;
    }
    return item.itemPath;
  };

  const handleItemClick = (item: MapItem) => {
    // Handle portal teleportation
    if (item.itemType === "portal" && item.targetMapId) {
      window.location.href = `/map/${item.targetMapId}`;
    }
  };

  if (!mapInfo) {
    return <div className="p-4">Loading map...</div>;
  }

  return (
    <div className="p-4 overflow-auto">
      <h1 className="text-2xl font-bold mb-4 text-center">
        {mapInfo.name}
        <span className="text-sm text-gray-500 ml-2">
          ({mapInfo.mapType === "world" ? "世界地图" : "场景地图"})
        </span>
      </h1>

      <div
        className="relative"
        style={{
          width: "2048px",
          height: "1024px",
          marginLeft: "1024px",
        }}
      >
        {/* Render tiles */}
        {mapData.map((tile, index) => {
          const offsetX = (tile.x - tile.y) * 64 + 1024 / 2 - 64;
          const offsetY = ((tile.x + tile.y) * 64) / 2;
          return (
            <div
              key={`tile-${index}`}
              className="absolute"
              style={{
                left: offsetX,
                top: offsetY,
                width: 128,
                height: 64,
                backgroundImage: "url(/game/isometric/autotiles/center.png)",
                backgroundSize: "640px 64px",
                backgroundPosition: getBackgroundPosition(tile),
              }}
            ></div>
          );
        })}

        {/* Render map items */}
        {mapItems.map((item) => {
          const offsetX = (item.x - item.y) * 64 + 1024 / 2 - 64;
          const offsetY = ((item.x + item.y) * 64) / 2;

          const itemWidth = item.width || 64;
          const itemHeight = item.height || 64;
          const maxWidth = 256;
          const adjustedWidth = Math.min(itemWidth, maxWidth);
          const adjustedHeight = (itemHeight * adjustedWidth) / itemWidth;
          const centerX = offsetX + (128 - adjustedWidth) / 2;
          const centerY = offsetY + (64 - adjustedHeight);

          return (
            <div
              key={`item-${item.id}`}
              className={`absolute ${
                item.itemType === "portal" ? "cursor-pointer" : ""
              }`}
              onClick={() => handleItemClick(item)}
              style={{
                left: centerX,
                top: centerY,
                width: adjustedWidth,
                height: adjustedHeight,
                zIndex: 10 + item.y,
              }}
            >
              <Image
                src={getImagePath(item)}
                alt={item.itemName}
                width={adjustedWidth}
                height={adjustedHeight}
                style={{
                  objectFit: "contain",
                  imageRendering: "pixelated",
                }}
                priority
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IsometricMapViewer;
