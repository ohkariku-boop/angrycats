import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { type Cat } from "@/lib/supabase";
import { fetchCatsInBounds } from "@/lib/api";
import { CatIcon } from "./CatIcon";

type WorldMapProps = {
  onCatClick: (cat: Cat) => void;
  refreshKey: number;
};

function createCatIcon(mood: "angry" | "happy", zoom: number): L.DivIcon {
  // Scale icon size with zoom level for a satisfying zoom experience
  const baseSize = zoom < 4 ? 14 : zoom < 8 ? 18 : 24;
  const scale = Math.min(1.8, Math.max(0.5, zoom / 5));
  const size = Math.round(baseSize * scale);

  return L.divIcon({
    className: "cat-marker",
    html: `<div class="cat-marker-inner mood-${mood}" style="width:${size}px;height:${size}px;">
      ${mood === "angry" ? angrySvg(size) : happySvg(size)}
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function angrySvg(size: number): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="55" rx="35" ry="32" fill="#FF6B6B" stroke="#D94545" stroke-width="2"/>
    <polygon points="20,30 28,15 35,32" fill="#FF6B6B" stroke="#D94545" stroke-width="2"/>
    <polygon points="80,30 72,15 65,32" fill="#FF6B6B" stroke="#D94545" stroke-width="2"/>
    <polygon points="24,28 28,20 31,28" fill="#D94545"/>
    <polygon points="76,28 72,20 69,28" fill="#D94545"/>
    <path d="M30 45 L44 50" stroke="#3D1F1F" stroke-width="3" stroke-linecap="round"/>
    <path d="M70 45 L56 50" stroke="#3D1F1F" stroke-width="3" stroke-linecap="round"/>
    <circle cx="38" cy="50" r="3" fill="#3D1F1F"/>
    <circle cx="62" cy="50" r="3" fill="#3D1F1F"/>
    <path d="M40 72 Q50 62 60 72" stroke="#3D1F1F" stroke-width="3" fill="none" stroke-linecap="round"/>
  </svg>`;
}

function happySvg(size: number): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="55" rx="35" ry="32" fill="#FFD56B" stroke="#E8B73E" stroke-width="2"/>
    <polygon points="20,30 28,15 35,32" fill="#FFD56B" stroke="#E8B73E" stroke-width="2"/>
    <polygon points="80,30 72,15 65,32" fill="#FFD56B" stroke="#E8B73E" stroke-width="2"/>
    <polygon points="24,28 28,20 31,28" fill="#FF9F43"/>
    <polygon points="76,28 72,20 69,28" fill="#FF9F43"/>
    <path d="M32 48 Q38 42 44 48" stroke="#3D2B1F" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M56 48 Q62 42 68 48" stroke="#3D2B1F" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="28" cy="62" r="5" fill="#FF8FA3" opacity="0.6"/>
    <circle cx="72" cy="62" r="5" fill="#FF8FA3" opacity="0.6"/>
    <path d="M40 68 Q50 78 60 68" stroke="#3D2B1F" stroke-width="3" fill="none" stroke-linecap="round"/>
  </svg>`;
}

export function WorldMap({ onCatClick, refreshKey }: WorldMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [loading, setLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize map
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 20,
      zoomControl: true,
      worldCopyJump: true,
      maxBoundsViscosity: 0.8,
      preferCanvas: true,
    });

    // Free dark basemap (no API key required)
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      {
        attribution:
          "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
        maxZoom: 16,
      }
    ).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const loadCats = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    const bounds = map.getBounds();
    const zoom = map.getZoom();
    const south = bounds.getSouth();
    const west = bounds.getWest();
    const north = bounds.getNorth();
    const east = bounds.getEast();

    setLoading(true);

    // Scale limits with zoom: more cats visible as you zoom in
    const limit = zoom < 3 ? 2000 : zoom < 5 ? 3500 : zoom < 8 ? 5000 : zoom < 12 ? 7000 : 10000;

    const cats = await fetchCatsInBounds(south, west, north, east, limit);

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add new markers
    for (const cat of cats) {
      const icon = createCatIcon(cat.mood, zoom);
      const marker = L.marker([cat.lat, cat.lng], { icon });
      marker.on("click", () => onCatClick(cat));
      marker.addTo(map);
      markersRef.current.push(marker);
    }

    setVisibleCount(cats.length);
    setLoading(false);
  }, [onCatClick]);

  // Load cats on map move (debounced)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMove = () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = setTimeout(() => {
        loadCats();
      }, 300);
    };

    map.on("moveend", handleMove);
    map.on("zoomend", handleMove);

    // Initial load
    loadCats();

    return () => {
      map.off("moveend");
      map.off("zoomend");
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, [loadCats]);

  // Reload when refreshKey changes (e.g., after making a cat happy)
  useEffect(() => {
    if (refreshKey > 0) {
      loadCats();
    }
  }, [refreshKey, loadCats]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {loading && (
        <div className="absolute top-4 right-4 z-[1000] bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 text-white text-sm font-medium">
          Loading cats...
        </div>
      )}
      <div className="absolute bottom-4 right-4 z-[1000] bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5 text-white text-xs">
        Showing {visibleCount} cats in view
      </div>
    </div>
  );
}
