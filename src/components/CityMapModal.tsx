import React, { useEffect, useRef, useState } from 'react';
import { X, MapPin, Trash2, Compass, Upload, Navigation, Loader2, Plus, Landmark, Sparkles } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { CampaignConfig, CampaignMap, CityDistrict } from '../types';
import { compressMapImage, safeLocalStorageSet } from '../utils/mapStorage';
import { generateThematicDistricts, isDistrictsMismatchingEra } from '../utils/districtGenerator';
import { ThematicDistrictMapView } from './ThematicDistrictMapView';

interface MapMarker {
  id: string;
  name: string;
  desc?: string;
  lat?: number;
  lng?: number;
  xPercent?: number; // per mappe custom
  yPercent?: number;
  type: 'haven' | 'elysium' | 'crime' | 'point';
}

interface CityMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  cityName: string;
  era: string;
  campaign?: CampaignConfig;
  onUpdateMaps?: (maps: CampaignMap[], activeMapId?: string) => void;
  onUpdateDistricts?: (districts: CityDistrict[], activeDistrictId?: string) => void;
  onSendPlayerAction?: (actionText: string) => void;
}

type TileLayerStyle = 'dark' | 'osm' | 'satellite';

const KNOWN_CITY_COORDINATES: Record<string, [number, number]> = {
  // Western / Frontiera
  tombstone: [31.7142, -110.0652],
  tombstonearizona: [31.7142, -110.0652],
  deadwood: [44.3769, -103.7296],
  dodgecity: [37.7528, -100.0171],
  sanfrancisco: [37.7749, -122.4194],
  austin: [30.2672, -97.7431],
  elpaso: [31.7619, -106.485],

  // Oriente & Asia
  changan: [34.3416, 108.9398],
  xian: [34.3416, 108.9398],
  pechino: [39.9042, 116.4074],
  beijing: [39.9042, 116.4074],
  shanghai: [31.2304, 121.4737],
  luoyang: [34.6186, 112.4539],
  hangzhou: [30.2741, 120.1551],
  kyoto: [35.0116, 135.7681],
  edo: [35.6762, 139.6503],
  tokyo: [35.6762, 139.6503],
  osaka: [34.6937, 135.5023],

  // Città Europee & Storiche
  praga: [50.0755, 14.4378],
  londra: [51.5074, -0.1278],
  london: [51.5074, -0.1278],
  milano: [45.4642, 9.19],
  roma: [41.9028, 12.4964],
  rome: [41.9028, 12.4964],
  venezia: [45.4408, 12.3155],
  firenze: [43.7696, 11.2558],
  costantinopoli: [41.0082, 28.9784],
  istanbul: [41.0082, 28.9784],
  atene: [37.9838, 23.7275],
  newyork: [40.7128, -74.006],
  neworleans: [29.9511, -90.0715],
  parigi: [48.8566, 2.3522],
  paris: [48.8566, 2.3522],
  berlino: [52.52, 13.405],
  boston: [42.3601, -71.0589],
  chicago: [41.8781, -87.6298],
  tortuga: [20.0573, -72.7936],
  portroyal: [17.9369, -76.8413],
  nassau: [25.0479, -77.3554],
  ilcairo: [30.0444, 31.2357],
  alessandria: [31.2001, 29.9187],
};

export function resolveCityCoordinates(cityName: string, era?: string): [number, number] {
  if (!cityName) return [34.3416, 108.9398];

  // Rimuovi testo tra parentesi (es. "(Dinastia Tang 750 d.C.)")
  const stripped = cityName.replace(/\([^)]*\)/g, '').trim();
  const rawLower = stripped.toLowerCase();
  const cleanAlpha = rawLower.replace(/[^a-z]/g, '');

  // 1. Controllo esatto o per inclusione
  for (const [key, coords] of Object.entries(KNOWN_CITY_COORDINATES)) {
    if (cleanAlpha.includes(key) || key.includes(cleanAlpha) || rawLower.includes(key)) {
      return coords;
    }
  }

  // 2. Fallback sensato per epoca invece di forzare sempre Tombstone in Arizona!
  const normEra = (era || '').toLowerCase();
  if (normEra.includes('china') || normEra.includes('tang') || normEra.includes('ming') || normEra.includes('wuxia')) {
    return [34.3416, 108.9398]; // Chang'an / Xi'an
  }
  if (normEra.includes('japan') || normEra.includes('samurai') || normEra.includes('edo') || normEra.includes('feudal')) {
    return [35.0116, 135.7681]; // Kyoto
  }
  if (normEra.includes('west') || normEra.includes('frontier')) {
    return [31.7142, -110.0652]; // Tombstone
  }
  if (normEra.includes('victor') || normEra.includes('gothic')) {
    return [51.5074, -0.1278]; // Londra
  }
  if (normEra.includes('pirate') || normEra.includes('carib')) {
    return [20.0573, -72.7936]; // Tortuga
  }
  if (normEra.includes('ancient') || normEra.includes('roma') || normEra.includes('myth')) {
    return [41.9028, 12.4964]; // Roma
  }
  if (normEra.includes('cyber')) {
    return [35.6762, 139.6503]; // Neo Tokyo
  }

  return [41.9028, 12.4964];
}

const TILE_LAYERS: Record<TileLayerStyle, { url: string; attribution: string; maxZoom: number; className?: string }> = {
  dark: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    className: 'leaflet-dark-tiles',
  },
  osm: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    className: '',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; DigitalGlobe, GeoEye, Earthstar Geographics',
    maxZoom: 18,
    className: '',
  },
};

export const CityMapModal: React.FC<CityMapModalProps> = ({
  isOpen,
  onClose,
  cityName,
  era,
  campaign,
  onUpdateMaps,
  onUpdateDistricts,
  onSendPlayerAction,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const activeTileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Gestione Distretti Dinamici con correzione automatica se l'epoca salvata non corrisponde
  const [districts, setDistricts] = useState<CityDistrict[]>(() => {
    let list: CityDistrict[] = [];
    if (campaign?.cityDistricts && campaign.cityDistricts.length > 0) {
      list = campaign.cityDistricts;
    } else {
      const saved = localStorage.getItem(`chronica_districts_${cityName}_${era}`);
      if (saved) {
        try {
          list = JSON.parse(saved);
        } catch {}
      }
    }
    if (list.length === 0 || isDistrictsMismatchingEra(list, era)) {
      list = generateThematicDistricts(era, cityName);
    }
    return list;
  });

  const [activeDistrictId, setActiveDistrictId] = useState<string>(() => {
    return campaign?.activeDistrictId || districts[0]?.id || '';
  });

  // Aggiorna e salva automaticamente se i distretti correnti erano un preset generico non allineato all'epoca
  useEffect(() => {
    if (isOpen && districts.length > 0 && isDistrictsMismatchingEra(districts, era)) {
      const fresh = generateThematicDistricts(era, cityName);
      setDistricts(fresh);
      setActiveDistrictId(fresh[0].id);
      onUpdateDistricts?.(fresh, fresh[0].id);
      safeLocalStorageSet(`chronica_districts_${cityName}_${era}`, JSON.stringify(fresh));
    }
  }, [isOpen, era, cityName]);

  const campaignMaps = campaign?.maps || [];
  const [selectedMapId, setSelectedMapId] = useState<string | 'districts' | 'osm' | 'legacy_custom'>(() => {
    if (campaign?.activeMapId && campaignMaps.some((m) => m.id === campaign.activeMapId)) {
      return campaign.activeMapId;
    }
    if (campaignMaps.length > 0) {
      return campaignMaps[0].id;
    }
    return 'districts'; // DEFAULT: Mappa a Distretti viva e tematica
  });

  const [tileStyle, setTileStyle] = useState<TileLayerStyle>('dark');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [resolvedCoords, setResolvedCoords] = useState<[number, number]>(() => {
    return resolveCityCoordinates(cityName, era);
  });

  const [customMapUrl, setCustomMapUrl] = useState<string | null>(
    localStorage.getItem(`chronica_custom_map_${cityName}`) || null
  );

  // Mappa attualmente visualizzata
  const activeCampaignMap = campaignMaps.find((m) => m.id === selectedMapId);
  const currentImageUrl = activeCampaignMap?.imageUrl || (selectedMapId === 'legacy_custom' ? customMapUrl : null);
  const isViewingImage = Boolean(currentImageUrl);

  const mapMode: 'districts' | 'osm' | 'custom' =
    selectedMapId === 'districts' ? 'districts' : selectedMapId === 'osm' ? 'osm' : 'custom';

  const setMapMode = (mode: 'districts' | 'osm' | 'custom') => {
    if (mode === 'districts') {
      setSelectedMapId('districts');
    } else if (mode === 'osm') {
      setSelectedMapId('osm');
    } else if (campaignMaps.length > 0) {
      setSelectedMapId(campaignMaps[0].id);
    } else {
      setSelectedMapId('legacy_custom');
    }
  };

  const [markers, setMarkers] = useState<MapMarker[]>(() => {
    const saved = localStorage.getItem(`chronica_markers_${cityName}`);
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 'm1',
            name: 'Rifugio Personale / Covo',
            desc: 'Il tuo santuario sicuro dalle insidie della frontiera',
            type: 'haven',
            xPercent: 50,
            yPercent: 50,
          },
          {
            id: 'm2',
            name: 'Punto di Ritrovo / Eliseo',
            desc: 'Zona neutrale presidiata',
            type: 'elysium',
            xPercent: 62,
            yPercent: 38,
          },
        ];
  });

  const [newMarkerName, setNewMarkerName] = useState('');
  const [newMarkerType, setNewMarkerType] = useState<'haven' | 'elysium' | 'crime' | 'point'>('point');

  // Salva i marker in memoria persistente
  useEffect(() => {
    localStorage.setItem(`chronica_markers_${cityName}`, JSON.stringify(markers));
  }, [markers, cityName]);

  // Geocodifica dinamica della città con OpenStreetMap Nominatim se non conosciuta a priori
  useEffect(() => {
    if (!isOpen || !cityName) return;

    // Risoluzione locale istantanea
    const localCoords = resolveCityCoordinates(cityName, era);
    setResolvedCoords(localCoords);
    if (leafletMapRef.current) {
      leafletMapRef.current.setView(localCoords, 13);
    }

    // Se il nome contiene suffissi d'epoca (es. "Chang'an, Cina (Dinastia Tang 750 d.C.)"), estrai la città base
    const strippedName = cityName.replace(/\([^)]*\)/g, '').trim();
    const primarySearch = strippedName.split(',')[0].trim() || strippedName;

    // Ricerca diretta di geocoding OpenStreetMap
    setIsGeocoding(true);
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(primarySearch)}&limit=1`, {
      headers: { 'User-Agent': 'ChronicaTTRPG/1.0' },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.length > 0 && data[0].lat && data[0].lon) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          setResolvedCoords([lat, lon]);
          if (leafletMapRef.current) {
            leafletMapRef.current.setView([lat, lon], 13);
          }
        }
      })
      .catch((err) => {
        console.warn('Geocodifica città non riuscita:', err);
      })
      .finally(() => {
        setIsGeocoding(false);
      });
  }, [isOpen, cityName, era]);

  // Inizializzazione e gestione robusta di Leaflet
  useEffect(() => {
    if (!isOpen || mapMode !== 'osm' || !mapContainerRef.current) return;

    // Distruggi istanza precedente se presente
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    // Inizializza mappa centrata sulle coordinate risolte
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      fadeAnimation: true,
    }).setView(resolvedCoords, 14);

    leafletMapRef.current = map;

    // Layer delle mattonelle
    const currentLayerConf = TILE_LAYERS[tileStyle];
    const tileLayer = L.tileLayer(currentLayerConf.url, {
      attribution: currentLayerConf.attribution,
      subdomains: 'abcd',
      maxZoom: currentLayerConf.maxZoom,
      className: currentLayerConf.className,
    }).addTo(map);
    activeTileLayerRef.current = tileLayer;

    // LayerGroup per i Pin
    const markersGroup = L.layerGroup().addTo(map);
    markersLayerGroupRef.current = markersGroup;

    // Aggiungi marker esistenti
    markers.forEach((m, idx) => {
      // Se non ha coordinate reali, assegna un offset attorno al centro
      const lat = m.lat ?? resolvedCoords[0] + (idx === 0 ? 0 : (idx % 2 === 0 ? 0.003 : -0.003) * idx);
      const lng = m.lng ?? resolvedCoords[1] + (idx === 0 ? 0 : (idx % 2 === 0 ? -0.004 : 0.004) * idx);

      const color =
        m.type === 'haven'
          ? '#3b82f6'
          : m.type === 'elysium'
          ? '#a855f7'
          : m.type === 'crime'
          ? '#ef4444'
          : '#f59e0b';

      const customIcon = L.divIcon({
        className: 'custom-pin',
        html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 12px ${color};"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      L.marker([lat, lng], { icon: customIcon })
        .addTo(markersGroup)
        .bindPopup(
          `<div style="font-family:serif; min-width:140px;">
            <strong style="color:#0f172a; font-size:13px;">${m.name}</strong><br/>
            <small style="color:#64748b; font-size:11px;">${m.desc || 'Punto segnato sulla mappa'}</small>
          </div>`
        );
    });

    // Supporto Click sulla Mappa Reale per aggiungere un nuovo punto!
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const pointName = newMarkerName.trim() || `Luogo segnato #${markers.length + 1}`;

      const newM: MapMarker = {
        id: `m_${Date.now()}`,
        name: pointName,
        desc: `Coordinate: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        type: newMarkerType,
        lat,
        lng,
        xPercent: 50,
        yPercent: 50,
      };

      setMarkers((prev) => [...prev, newM]);
      setNewMarkerName('');
    });

    // Risolve il classico bug Leaflet in modali: invalida la dimensione dopo che il layout è stabile
    const resizeTimer1 = setTimeout(() => map.invalidateSize(), 80);
    const resizeTimer2 = setTimeout(() => map.invalidateSize(), 300);
    const resizeTimer3 = setTimeout(() => map.invalidateSize(), 600);

    const observer = new ResizeObserver(() => {
      if (leafletMapRef.current) {
        leafletMapRef.current.invalidateSize();
      }
    });
    observer.observe(mapContainerRef.current);

    return () => {
      clearTimeout(resizeTimer1);
      clearTimeout(resizeTimer2);
      clearTimeout(resizeTimer3);
      observer.disconnect();
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [isOpen, mapMode, resolvedCoords]);

  // Aggiorna lo stile delle mattonelle (Dark / OSM / Satellite) a caldo
  useEffect(() => {
    if (!leafletMapRef.current || mapMode !== 'osm') return;
    if (activeTileLayerRef.current) {
      leafletMapRef.current.removeLayer(activeTileLayerRef.current);
    }
    const conf = TILE_LAYERS[tileStyle];
    const newLayer = L.tileLayer(conf.url, {
      attribution: conf.attribution,
      subdomains: 'abcd',
      maxZoom: conf.maxZoom,
      className: conf.className,
    }).addTo(leafletMapRef.current);
    activeTileLayerRef.current = newLayer;
  }, [tileStyle, mapMode]);

  if (!isOpen) return null;

  const handleAddNewMap = async (e: React.ChangeEvent<HTMLInputElement>, category: 'general' | 'location') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imageUrl = await compressMapImage(file, 1600, 1200, 0.75);
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      const newMap: CampaignMap = {
        id: `map_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name: category === 'general' ? `Mappa Generale - ${baseName}` : baseName,
        category,
        imageUrl,
        createdAt: Date.now(),
      };
      const updated = [...campaignMaps, newMap];
      setSelectedMapId(newMap.id);
      if (onUpdateMaps) {
        onUpdateMaps(updated, newMap.id);
      }
    } catch (err) {
      console.error('[CityMapModal] Errore compressione mappa:', err);
    } finally {
      e.target.value = '';
    }
  };

  const handleRemoveCampaignMap = (mapId: string) => {
    const updated = campaignMaps.filter((m) => m.id !== mapId);
    const nextSelected = updated[0]?.id || 'osm';
    setSelectedMapId(nextSelected);
    if (onUpdateMaps) {
      onUpdateMaps(updated, nextSelected);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const url = await compressMapImage(file, 1600, 1200, 0.75);
        setCustomMapUrl(url);
        safeLocalStorageSet(`chronica_custom_map_${cityName}`, url);
        setSelectedMapId('legacy_custom');
      } catch (err) {
        console.error('[CityMapModal] Errore caricamento mappa custom:', err);
      } finally {
        e.target.value = '';
      }
    }
  };

  const handleCustomMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isViewingImage) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

    const name = prompt('Nome del nuovo luogo o punto d\'interesse sulla mappa:', 'Nuovo Luogo');
    if (name && name.trim()) {
      const newM: MapMarker = {
        id: `marker_${Date.now()}`,
        name: name.trim(),
        desc: `Punto d'interesse su ${activeCampaignMap?.name || 'Mappa Personalizzata'}`,
        type: newMarkerType,
        xPercent,
        yPercent,
      };
      setMarkers([...markers, newM]);
    }
  };

  const removeMarker = (id: string) => {
    setMarkers(markers.filter((m) => m.id !== id));
  };

  const centerOnMarker = (m: MapMarker) => {
    if (mapMode === 'osm' && leafletMapRef.current && m.lat !== undefined && m.lng !== undefined) {
      leafletMapRef.current.setView([m.lat, m.lng], 16, { animate: true });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-5">
      <div className="w-full max-w-6xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-indigo-950/60 overflow-hidden flex flex-col h-[90vh]">
        {/* Header Modale */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 px-4 sm:px-5 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <Compass className="w-6 h-6 text-indigo-400" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-black text-sm sm:text-base tracking-wider uppercase text-slate-100">
                  Mappa: {cityName}
                </h3>
                {isGeocoding && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-300 font-mono">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Rilevamento coordinate...</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-indigo-300 font-mono">
                {mapMode === 'osm'
                  ? `Coordinate: ${resolvedCoords[0].toFixed(4)}, ${resolvedCoords[1].toFixed(4)} • Epoca: ${era}`
                  : `Mappa Immagine / Pianta Personalizzata • ${era}`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Selettore Stile Mattonelle su OSM */}
            {mapMode === 'osm' && (
              <div className="hidden sm:flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 space-x-1 text-xs">
                <button
                  type="button"
                  onClick={() => setTileStyle('dark')}
                  className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                    tileStyle === 'dark' ? 'bg-indigo-900 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🌙 Noir Dark
                </button>
                <button
                  type="button"
                  onClick={() => setTileStyle('osm')}
                  className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                    tileStyle === 'osm' ? 'bg-indigo-900 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🗺️ Stradale
                </button>
                <button
                  type="button"
                  onClick={() => setTileStyle('satellite')}
                  className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                    tileStyle === 'satellite' ? 'bg-indigo-900 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🛰️ Satellite
                </button>
              </div>
            )}

            {/* Pulsante Rigenera Distretti per quest'Epoca */}
            {mapMode === 'districts' && (
              <button
                type="button"
                onClick={() => {
                  const fresh = generateThematicDistricts(era, cityName);
                  setDistricts(fresh);
                  setActiveDistrictId(fresh[0].id);
                  onUpdateDistricts?.(fresh, fresh[0].id);
                  safeLocalStorageSet(`chronica_districts_${cityName}_${era}`, JSON.stringify(fresh));
                }}
                title="Rigenera la mappa a distretti calibrandola sull'epoca storica corrente"
                className="hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-amber-950/70 border border-amber-600/60 hover:bg-amber-900/80 text-amber-200 text-xs font-serif transition-colors cursor-pointer shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Aggiorna a {era.replace('_', ' ')}</span>
              </button>
            )}

            {/* Switch Modalità: Distretti d'Epoca vs Mappe Immagine vs OSM */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-1 flex space-x-1 text-xs">
              <button
                type="button"
                onClick={() => setMapMode('districts')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  mapMode === 'districts'
                    ? 'bg-amber-600 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Landmark className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Distretti d'Epoca</span>
                <span className="sm:hidden">Distretti</span>
              </button>
              <button
                type="button"
                onClick={() => setMapMode('custom')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  mapMode === 'custom' ? 'bg-indigo-900 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mappe Immagine</span>
                <span className="sm:hidden">Immagini</span>
              </button>
              <button
                type="button"
                onClick={() => setMapMode('osm')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  mapMode === 'osm' ? 'bg-emerald-900 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Visualizza la mappa geografica contemporanea (mondo reale odierno)"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{era === 'modern' ? 'Mappa Reale OSM' : 'Satellite Oggi (Terra)'}</span>
                <span className="sm:hidden">GPS</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Barra di Navigazione Multi-Mappa */}
        <div className="bg-slate-950/95 border-b border-slate-800 px-4 py-2 flex items-center justify-between gap-3 overflow-x-auto shrink-0 select-none">
          <div className="flex items-center space-x-2 shrink-0">
            {/* Tab Distretti d'Epoca Dinamici */}
            <button
              type="button"
              onClick={() => setSelectedMapId('districts')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-serif transition-all cursor-pointer ${
                selectedMapId === 'districts'
                  ? 'bg-amber-950/90 border-amber-500 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <Landmark className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-bold">Distretti: {cityName}</span>
              <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-mono bg-amber-500/20 text-amber-300 font-bold">
                Interattiva
              </span>
            </button>

            {campaignMaps.map((m) => {
              const isSelected = selectedMapId === m.id;
              const isGeneral = m.category === 'general';
              return (
                <div
                  key={m.id}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-serif transition-all cursor-pointer ${
                    isSelected
                      ? isGeneral
                        ? 'bg-amber-950/80 border-amber-500 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                        : 'bg-indigo-950/80 border-indigo-500 text-indigo-200 shadow-[0_0_10px_rgba(99,102,241,0.3)]'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                  onClick={() => {
                    setSelectedMapId(m.id);
                    if (onUpdateMaps) onUpdateMaps(campaignMaps, m.id);
                  }}
                >
                  {isGeneral ? <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" /> : <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                  <span className="font-bold max-w-[150px] truncate">{m.name}</span>
                  <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-mono bg-black/40 text-slate-400">
                    {isGeneral ? 'Generale' : 'Luogo'}
                  </span>
                  {onUpdateMaps && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Rimuovere la mappa "${m.name}"?`)) {
                          handleRemoveCampaignMap(m.id);
                        }
                      }}
                      className="ml-1 text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors"
                      title="Rimuovi mappa"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Tab Mappa OSM Reale */}
            <button
              type="button"
              onClick={() => setSelectedMapId('osm')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-serif transition-all cursor-pointer ${
                selectedMapId === 'osm'
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
              title="Visualizza la mappa satellitare o stradale della Terra odierna"
            >
              <Navigation className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{era === 'modern' ? 'Mappa Stradale / Satellite OSM' : 'Satellite Oggi (Terra)'}</span>
            </button>
          </div>

          {/* Pulsanti per caricare nuove mappe al volo */}
          <div className="flex items-center space-x-2 shrink-0">
            <label className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-serif cursor-pointer transition-colors shadow-sm">
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span>+ Mappa Luogo</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleAddNewMap(e, 'location')}
                className="hidden"
              />
            </label>

            <label className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/40 border border-amber-800/80 text-amber-200 text-xs font-serif cursor-pointer transition-colors shadow-sm">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>+ Mappa Generale</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleAddNewMap(e, 'general')}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Area Mappa & Sidebar */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          {/* Mappa visualizzata */}
          <div className="flex-1 bg-slate-950 relative overflow-hidden flex items-center justify-center">
            {selectedMapId === 'districts' ? (
              <ThematicDistrictMapView
                districts={districts}
                activeDistrictId={activeDistrictId}
                onSelectActiveDistrict={(dId) => {
                  setActiveDistrictId(dId);
                  if (onUpdateDistricts) {
                    onUpdateDistricts(districts, dId);
                  }
                }}
                onUpdateDistrictAlert={(dId, alert) => {
                  const updated = districts.map((d) => (d.id === dId ? { ...d, alertLevel: alert } : d));
                  setDistricts(updated);
                  safeLocalStorageSet(`chronica_districts_${cityName}_${era}`, JSON.stringify(updated));
                  if (onUpdateDistricts) {
                    onUpdateDistricts(updated, activeDistrictId);
                  }
                }}
                onFastTravelAction={(actionText) => {
                  onClose();
                  if (onSendPlayerAction) {
                    onSendPlayerAction(actionText);
                  }
                }}
                era={era}
                cityName={cityName}
              />
            ) : selectedMapId === 'osm' ? (
              <div className="relative w-full h-full min-h-[400px]">
                {era !== 'modern' && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2.5 rounded-xl bg-slate-950/90 border border-amber-500/70 shadow-2xl backdrop-blur-md flex items-center space-x-3 text-xs max-w-xl text-left pointer-events-auto">
                    <Compass className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
                    <span className="text-slate-300">
                      Stai visualizzando la mappa satellitare/stradale del mondo contemporaneo. Per esplorare la pianta d'epoca con i quartieri storici, usa i <strong>Distretti d'Epoca</strong>.
                    </span>
                    <button
                      type="button"
                      onClick={() => setMapMode('districts')}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-serif font-bold text-xs shrink-0 cursor-pointer shadow-md transition-all"
                    >
                      Vai ai Distretti
                    </button>
                  </div>
                )}
                <div
                  ref={mapContainerRef}
                  className="w-full h-full min-h-[400px] z-10"
                  style={{ background: '#090d16' }}
                />
              </div>
            ) : currentImageUrl ? (
              <div
                onClick={handleCustomMapClick}
                className="relative w-full h-full flex items-center justify-center p-2 cursor-crosshair overflow-hidden select-none"
              >
                <img
                  src={currentImageUrl}
                  alt={activeCampaignMap?.name || 'Mappa Personalizzata'}
                  className="max-h-full max-w-full object-contain pointer-events-none rounded-lg shadow-lg border border-slate-800"
                />
                {/* Pin sulla mappa custom */}
                {markers.map((m) => {
                  if (m.xPercent === undefined || m.yPercent === undefined) return null;
                  const color =
                    m.type === 'haven'
                      ? 'bg-blue-500'
                      : m.type === 'elysium'
                      ? 'bg-purple-500'
                      : m.type === 'crime'
                      ? 'bg-red-500'
                      : 'bg-amber-500';

                  return (
                    <div
                      key={m.id}
                      style={{ left: `${m.xPercent}%`, top: `${m.yPercent}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                    >
                      <div
                        className={`w-4 h-4 rounded-full ${color} border-2 border-white shadow-[0_0_10px_rgba(255,255,255,0.7)] animate-pulse`}
                      />
                      <div className="opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity absolute bottom-5 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-700 text-slate-100 text-[11px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-30 font-mono">
                        {m.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-8 max-w-md">
                <Landmark className="w-12 h-12 text-amber-500/80 mx-auto mb-3" />
                <h4 className="font-serif font-bold text-lg text-slate-200">Nessuna Immagine Caricata</h4>
                <p className="text-xs text-slate-400 mt-1 mb-4">
                  Puoi visualizzare la Mappa a Distretti d'Epoca interattiva generata per la tua ambientazione, oppure caricare una tua illustrazione.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => setSelectedMapId('districts')}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-xl text-xs font-serif font-black inline-flex items-center justify-center space-x-1.5 shadow-md cursor-pointer"
                  >
                    <Landmark className="w-4 h-4" />
                    <span>Apri Mappa a Distretti</span>
                  </button>
                  <label className="px-4 py-2 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-800/80 text-indigo-200 rounded-xl text-xs font-semibold cursor-pointer inline-flex items-center justify-center space-x-1.5">
                    <MapPin className="w-4 h-4 text-indigo-400" />
                    <span>Carica Mappa Immagine</span>
                    <input type="file" accept="image/*" onChange={(e) => handleAddNewMap(e, 'location')} className="hidden" />
                  </label>
                </div>
              </div>
            )}

            {/* Suggerimento visivo in basso sulla mappa OSM */}
            {mapMode === 'osm' && (
              <div className="absolute bottom-3 left-3 z-20 bg-slate-950/85 backdrop-blur border border-slate-800 rounded-xl px-3 py-1.5 text-[11px] text-slate-300 pointer-events-none font-serif flex items-center gap-1.5 shadow-lg">
                <Navigation className="w-3.5 h-3.5 text-indigo-400" />
                <span>Clicca un punto qualsiasi sulla mappa per piazzare un nuovo rifugio o luogo.</span>
              </div>
            )}
          </div>

          {/* Sidebar Luoghi Chiave (mostrata solo per OSM o Mappa Immagine Custom) */}
          {selectedMapId !== 'districts' && (
            <div className="w-full md:w-80 bg-slate-900/95 border-t md:border-t-0 md:border-l border-slate-800 p-4 flex flex-col shrink-0 overflow-y-auto z-20">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-slate-200 flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-red-500" />
                  <span>Punti di Interesse ({markers.length})</span>
                </h4>
                <span className="text-[10px] font-mono text-indigo-400">Tocca per centrare</span>
              </div>

              {/* Lista Marker */}
              <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                {markers.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => centerOnMarker(m)}
                    className="p-2.5 bg-slate-950/80 border border-slate-800/90 rounded-xl flex items-start justify-between group hover:border-indigo-600 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            m.type === 'haven'
                              ? 'bg-blue-500'
                              : m.type === 'elysium'
                              ? 'bg-purple-500'
                              : m.type === 'crime'
                              ? 'bg-red-500'
                              : 'bg-amber-500'
                          }`}
                        />
                        <span className="font-semibold text-xs text-slate-200 truncate">{m.name}</span>
                      </div>
                      {m.desc && <p className="text-[10px] text-slate-400 mt-0.5 truncate font-serif">{m.desc}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMarker(m.id);
                      }}
                      className="text-slate-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                      title="Elimina punto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

            {/* Aggiungi nuovo punto con nome e tipo */}
            <div className="pt-3 border-t border-slate-800 space-y-2 mt-2">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                Nuovo Segnaposto:
              </span>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newMarkerName}
                  onChange={(e) => setNewMarkerName(e.target.value)}
                  placeholder="Nome del luogo..."
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 flex-1 focus:outline-none focus:border-indigo-500 font-serif"
                />
                <select
                  value={newMarkerType}
                  onChange={(e) => setNewMarkerType(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-slate-200 font-mono"
                >
                  <option value="haven">Rifugio</option>
                  <option value="elysium">Ritrovo</option>
                  <option value="crime">Pericolo</option>
                  <option value="point">Punto</option>
                </select>
              </div>

              {mapMode === 'custom' ? (
                <label className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center space-x-2 transition-colors cursor-pointer mt-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{customMapUrl ? 'Sostituisci Immagine' : 'Carica Immagine'}</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              ) : (
                <p className="text-[10px] text-slate-500 italic">
                  * Scrivi il nome e poi clicca un punto sulla mappa per posizionarlo.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
  );
};
