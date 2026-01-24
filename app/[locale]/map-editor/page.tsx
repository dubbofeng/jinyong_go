"use client";

import { useState } from "react";
// @ts-ignore
const Noise = require("noisejs");
import Image from "next/image";

const TILE_TYPES = ["gold", "wood", "dirt", "fire", "water"];

const TILE_SPRITE_POSITIONS: Record<string, [number, number]> = {
  wood_center: [0, 0],
  gold_center: [1, 0],
  dirt_center: [2, 0],
  fire_center: [3, 0],
  water_center: [4, 0],
};

export default function MapEditor() {
  const [selectedTile, setSelectedTile] = useState("gold");
  const [mapData, setMapData] = useState(
    Array.from({ length: 32 }, () => Array(32).fill("gold"))
  );
  const [mapName, setMapName] = useState("");
  const [mapId, setMapId] = useState("");
  const [mapType, setMapType] = useState<"world" | "scene">("scene");
  const [isSaving, setIsSaving] = useState(false);

  const handleTileClick = (x: number, y: number) => {
    const newMap = [...mapData];
    newMap[y][x] = selectedTile;
    setMapData(newMap);
  };

  const exportMap = () => {
    const json = JSON.stringify(mapData);
    console.log(json);
    navigator.clipboard.writeText(json);
    window.alert("Map exported to clipboard as JSON");
  };

  const autoGenerate = (theme: string = "balanced") => {
    // @ts-ignore
    const noise = new Noise.Noise(Math.random());
    const newMap = mapData.map((row, y) =>
      row.map((tile, x) => {
        const value = noise.perlin2(x / 10, y / 10);

        if (theme === "mountain") {
          if (value < -0.3) return "water";
          if (value < -0.1) return "gold";
          if (value < 0.2) return "dirt";
          if (value < 0.4) return "wood";
          return "gold";
        } else if (theme === "forest") {
          if (value < -0.25) return "water";
          if (value < 0.3) return "wood";
          if (value < 0.5) return "dirt";
          return "wood";
        } else {
          // balanced
          if (value < -0.2) return "water";
          if (value < -0.05) return "gold";
          if (value < 0.15) return "wood";
          if (value < 0.3) return "fire";
          return "dirt";
        }
      })
    );
    setMapData(newMap);
  };

  const saveMap = async () => {
    if (!mapId || !mapName) {
      alert("Please enter both Map ID and Map Name");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/maps/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mapId,
          name: mapName,
          mapType,
          width: 32,
          height: 32,
          description: `Generated ${mapType} map`,
        }),
      });

      if (response.ok) {
        alert("Map saved successfully!");
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || "Failed to save map"}`);
      }
    } catch (error) {
      console.error("Error saving map:", error);
      alert("Error saving map");
    } finally {
      setIsSaving(false);
    }
  };

  const getBackgroundPosition = (tile: string) => {
    const [col, row] = TILE_SPRITE_POSITIONS[`${tile}_center`] || [0, 0];
    return `-${col * 128}px -${row * 64}px`;
  };

  return (
    <div className="p-4 space-y-4">
      {/* Map Info */}
      <div className="flex gap-4 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Map ID</label>
          <input
            type="text"
            value={mapId}
            onChange={(e) => setMapId(e.target.value)}
            placeholder="e.g., huashan_scene"
            className="border rounded px-3 py-2 w-64"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Map Name</label>
          <input
            type="text"
            value={mapName}
            onChange={(e) => setMapName(e.target.value)}
            placeholder="e.g., 华山"
            className="border rounded px-3 py-2 w-64"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Map Type</label>
          <select
            value={mapType}
            onChange={(e) => setMapType(e.target.value as "world" | "scene")}
            className="border rounded px-3 py-2"
          >
            <option value="world">World Map</option>
            <option value="scene">Scene Map</option>
          </select>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2">
        {TILE_TYPES.map((tile) => (
          <button
            key={tile}
            className={`px-4 py-2 rounded ${
              selectedTile === tile
                ? "bg-blue-500 text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
            onClick={() => setSelectedTile(tile)}
          >
            {tile}
          </button>
        ))}
        <button
          className="px-4 py-2 rounded bg-green-500 text-white hover:bg-green-600"
          onClick={() => autoGenerate("balanced")}
        >
          Auto Generate (Balanced)
        </button>
        <button
          className="px-4 py-2 rounded bg-green-500 text-white hover:bg-green-600"
          onClick={() => autoGenerate("forest")}
        >
          Generate Forest
        </button>
        <button
          className="px-4 py-2 rounded bg-green-500 text-white hover:bg-green-600"
          onClick={() => autoGenerate("mountain")}
        >
          Generate Mountain
        </button>
        <button
          className="px-4 py-2 rounded bg-purple-500 text-white hover:bg-purple-600"
          onClick={exportMap}
        >
          Export JSON
        </button>
        <button
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          onClick={saveMap}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save to Database"}
        </button>
      </div>

      {/* Isometric Grid */}
      <div
        className="relative"
        style={{
          width: "2048px",
          height: "1024px",
          marginLeft: "1024px",
        }}
      >
        {mapData.map((row, y) =>
          row.map((tile, x) => {
            const offsetX = (x - y) * 64 + 1024 / 2 - 64;
            const offsetY = ((x + y) * 64) / 2;
            return (
              <div
                key={`${x}-${y}`}
                onClick={() => handleTileClick(x, y)}
                className="absolute cursor-pointer hover:opacity-80 transition-opacity"
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
          })
        )}
      </div>
    </div>
  );
}
