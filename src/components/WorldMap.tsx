import { useEffect, useRef, useState, useCallback, type FormEvent } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { type Cat } from "@/lib/supabase";
import { fetchCatsInBounds } from "@/lib/api";

type WorldMapProps = {
  onCatClick: (cat: Cat) => void;
  refreshKey: number;
};

// Cache DivIcons by "mood-size" so we don't rebuild SVG on every marker
const iconCache = new Map<string, L.DivIcon>();

function getCatDivIcon(mood: "angry" | "happy", zoom: number): L.DivIcon {
  const size =
    zoom < 4 ? 12 : zoom < 6 ? 16 : zoom < 9 ? 20 : zoom < 12 ? 24 : 28;
  const key = `${mood}-${size}`;
  let icon = iconCache.get(key);
  if (icon) return icon;

  icon = L.divIcon({
    className: "cat-marker",
    html: `<div class="cat-marker-inner mood-${mood}" style="width:${size}px;height:${size}px">
      ${mood === "angry" ? angrySvg(size) : happySvg(size)}
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
  iconCache.set(key, icon);
  return icon;
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

function limitForZoom(zoom: number): number {
  // Fewer markers at low zoom = smoother pan/zoom
  if (zoom < 3) return 1200;
  if (zoom < 5) return 2000;
  if (zoom < 8) return 3500;
  if (zoom < 11) return 5000;
  return 7000;
}

/** Use lightweight canvas circles below this zoom; detailed cat icons above */
const DETAIL_ZOOM = 6;

export function WorldMap({ onCatClick, refreshKey }: WorldMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [loading, setLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const lastFetchRef = useRef<{
    zoomBucket: number;
    south: number;
    west: number;
    north: number;
    east: number;
  } | null>(null);
  const onCatClickRef = useRef(onCatClick);
  onCatClickRef.current = onCatClick;

  // Initialize map once
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const worldBounds = L.latLngBounds(L.latLng(-85, -180), L.latLng(85, 180));

    const map = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 16,
      zoomControl: true,
      worldCopyJump: false,
      maxBounds: worldBounds,
      maxBoundsViscosity: 1.0,
      preferCanvas: true,
      // Smoother zoom animation
      zoomAnimation: true,
      markerZoomAnimation: false, // skip marker CSS zoom anim — big win with many markers
      fadeAnimation: true,
    });

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
        maxZoom: 16,
        noWrap: true,
        bounds: worldBounds,
        keepBuffer: 2,
        updateWhenZooming: false, // wait until zoom ends to fetch tiles
        updateWhenIdle: true,
      }
    ).addTo(map);

    const layer = L.layerGroup().addTo(map);
    layerRef.current = layer;
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  const loadCats = useCallback(async (force = false) => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    const bounds = map.getBounds();
    const zoom = map.getZoom();
    const south = bounds.getSouth();
    const west = bounds.getWest();
    const north = bounds.getNorth();
    const east = bounds.getEast();
    const zoomBucket = Math.floor(zoom);

    // Skip fetch if view barely changed (same zoom bucket + ~80% overlap)
    const prev = lastFetchRef.current;
    if (!force && prev && prev.zoomBucket === zoomBucket) {
      const latSpan = Math.max(north - south, 0.001);
      const lngSpan = Math.max(east - west, 0.001);
      const same =
        Math.abs(prev.south - south) / latSpan < 0.25 &&
        Math.abs(prev.north - north) / latSpan < 0.25 &&
        Math.abs(prev.west - west) / lngSpan < 0.25 &&
        Math.abs(prev.east - east) / lngSpan < 0.25;
      if (same) return;
    }

    const reqId = ++requestIdRef.current;
    setLoading(true);

    const limit = limitForZoom(zoom);
    const cats = await fetchCatsInBounds(south, west, north, east, limit);

    // Ignore stale responses (user zoomed again while loading)
    if (reqId !== requestIdRef.current) return;

    lastFetchRef.current = { zoomBucket, south, west, north, east };

    // Clear previous markers in one shot
    layer.clearLayers();

    const useDetail = zoom >= DETAIL_ZOOM;
    const angryColor = "#FF6B6B";
    const happyColor = "#FFD56B";

    // Build markers — canvas circles when zoomed out, cat icons when zoomed in
    if (useDetail) {
      for (const cat of cats) {
        const marker = L.marker([cat.lat, cat.lng], {
          icon: getCatDivIcon(cat.mood, zoom),
          interactive: true,
        });
        marker.on("click", () => onCatClickRef.current(cat));
        layer.addLayer(marker);
      }
    } else {
      const radius = zoom < 3 ? 2 : zoom < 5 ? 3 : 4;
      for (const cat of cats) {
        const marker = L.circleMarker([cat.lat, cat.lng], {
          radius,
          color: cat.mood === "happy" ? happyColor : angryColor,
          fillColor: cat.mood === "happy" ? happyColor : angryColor,
          fillOpacity: 0.85,
          weight: 0,
          interactive: true,
        });
        marker.on("click", () => onCatClickRef.current(cat));
        layer.addLayer(marker);
      }
    }

    setVisibleCount(cats.length);
    setLoading(false);
  }, []);

  // Debounced reload on move/zoom end
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const schedule = () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      // Slightly longer debounce while zooming feels smoother
      fetchTimeoutRef.current = setTimeout(() => loadCats(false), 200);
    };

    map.on("moveend", schedule);
    map.on("zoomend", schedule);

    // Initial load once map is ready
    loadCats(true);

    return () => {
      map.off("moveend", schedule);
      map.off("zoomend", schedule);
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, [loadCats]);

  useEffect(() => {
    if (refreshKey > 0) loadCats(true);
  }, [refreshKey, loadCats]);

  const searchLocation = useCallback(async (e?: FormEvent) => {
    e?.preventDefault();
    const q = searchQuery.trim();
    if (!q || !mapRef.current) return;

    setSearching(true);
    setSearchError(null);

    try {
      // OpenStreetMap Nominatim — free, no API key (fair-use)
      const url =
        "https://nominatim.openstreetmap.org/search?" +
        new URLSearchParams({
          q,
          format: "json",
          limit: "1",
          addressdetails: "0",
        }).toString();

      const res = await fetch(url, {
        headers: { Accept: "application/json" },
      });

      if (!res.ok) throw new Error("Search failed");

      const results = (await res.json()) as Array<{
        lat: string;
        lon: string;
        display_name: string;
        boundingbox?: [string, string, string, string];
      }>;

      if (!results.length) {
        setSearchError("No place found. Try another name.");
        return;
      }

      const place = results[0];
      const map = mapRef.current;

      if (place.boundingbox) {
        // boundingbox: [south, north, west, east]
        const [south, north, west, east] = place.boundingbox.map(Number);
        const bounds = L.latLngBounds(
          L.latLng(south, west),
          L.latLng(north, east)
        );
        map.fitBounds(bounds.pad(0.08), { maxZoom: 12, animate: true });
      } else {
        map.flyTo([Number(place.lat), Number(place.lon)], 10, { duration: 1.2 });
      }
    } catch {
      setSearchError("Couldn't search right now. Try again.");
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* Location search */}
      <form
        onSubmit={searchLocation}
        className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] w-[min(92vw,380px)] pointer-events-auto"
      >
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#140f0e]/85 backdrop-blur-md shadow-xl p-1.5">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchError(null);
            }}
            placeholder="Search country, city, town..."
            className="flex-1 min-w-0 bg-transparent px-3 py-2 text-sm text-[#f6efe6] placeholder-white/35 focus:outline-none"
          />
          <button
            type="submit"
            disabled={searching || !searchQuery.trim()}
            className="shrink-0 rounded-xl bg-[#ff5c5c] text-[#140f0e] font-semibold text-sm px-3.5 py-2 disabled:opacity-40 hover:brightness-110 transition"
          >
            {searching ? "..." : "Go"}
          </button>
        </div>
        {searchError && (
          <p className="mt-1.5 text-center text-xs text-[#ff5c5c] bg-black/50 rounded-lg px-2 py-1">
            {searchError}
          </p>
        )}
      </form>

      {loading && (
        <div className="absolute top-4 right-4 z-[1000] bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 text-white text-sm font-medium pointer-events-none">
          Loading cats...
        </div>
      )}
      <div className="absolute bottom-4 right-4 z-[1000] bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5 text-white text-xs pointer-events-none">
        {visibleCount === 0 && !loading
          ? "No cats in this view — pan or search another place"
          : `Showing ${visibleCount.toLocaleString()} cats in view`}
        {visibleCount > 0 && mapRef.current && mapRef.current.getZoom() < DETAIL_ZOOM
          ? " · zoom in for faces"
          : ""}
      </div>
    </div>
  );
}
