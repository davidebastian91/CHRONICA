import React, { useState } from 'react';
import {
  Compass,
  Shield,
  MapPin,
  Navigation,
  Flame,
  Castle,
  Train,
  Wine,
  Mountain,
  Wheat,
  Church,
  Beer,
  Anchor,
  Building,
  Cpu,
  Factory,
  Skull,
  Crown,
  Ghost,
  Eye,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import type { CityDistrict, DistrictAlertLevel, DistrictLandmark } from '../types';

interface ThematicDistrictMapViewProps {
  districts: CityDistrict[];
  activeDistrictId?: string;
  onSelectActiveDistrict?: (districtId: string) => void;
  onUpdateDistrictAlert?: (districtId: string, alert: DistrictAlertLevel) => void;
  onFastTravelAction?: (actionText: string) => void;
  era: string;
  cityName: string;
}

export const ThematicDistrictMapView: React.FC<ThematicDistrictMapViewProps> = ({
  districts,
  activeDistrictId,
  onSelectActiveDistrict,
  onUpdateDistrictAlert,
  onFastTravelAction,
  era,
  cityName,
}) => {
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>(() => {
    return activeDistrictId || districts[0]?.id || '';
  });
  const [hoveredDistrictId, setHoveredDistrictId] = useState<string | null>(null);
  const [selectedLandmark, setSelectedLandmark] = useState<DistrictLandmark | null>(null);

  const isCyber = era.toLowerCase().includes('cyber') || era.toLowerCase().includes('sci-fi');
  const isWest = era.toLowerCase().includes('west') || era.toLowerCase().includes('frontier');
  const isOrient =
    era.toLowerCase().includes('china') ||
    era.toLowerCase().includes('tang') ||
    era.toLowerCase().includes('ming') ||
    era.toLowerCase().includes('japan') ||
    era.toLowerCase().includes('wuxia') ||
    era.toLowerCase().includes('samurai') ||
    era.toLowerCase().includes('feudal');

  const selectedDistrict = districts.find((d) => d.id === selectedDistrictId) || districts[0];
  const partyDistrict = districts.find((d) => d.id === activeDistrictId) || districts[0];

  const getDistrictIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Shield': return <Shield className="w-4 h-4" />;
      case 'Castle': return <Castle className="w-4 h-4" />;
      case 'Train': return <Train className="w-4 h-4" />;
      case 'Wine': return <Wine className="w-4 h-4" />;
      case 'Mountain': return <Mountain className="w-4 h-4" />;
      case 'Wheat': return <Wheat className="w-4 h-4" />;
      case 'Church': return <Church className="w-4 h-4" />;
      case 'Beer': return <Beer className="w-4 h-4" />;
      case 'Flame': return <Flame className="w-4 h-4" />;
      case 'Anchor': return <Anchor className="w-4 h-4" />;
      case 'Building': return <Building className="w-4 h-4" />;
      case 'Cpu': return <Cpu className="w-4 h-4" />;
      case 'Factory': return <Factory className="w-4 h-4" />;
      case 'Skull': return <Skull className="w-4 h-4" />;
      case 'Crown': return <Crown className="w-4 h-4" />;
      case 'Ghost': return <Ghost className="w-4 h-4" />;
      default: return <Compass className="w-4 h-4" />;
    }
  };

  const getAlertBadge = (level: DistrictAlertLevel) => {
    switch (level) {
      case 'safe':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 border border-emerald-500/80 text-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Tranquillo
          </span>
        );
      case 'patrolled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950/80 border border-amber-500/80 text-amber-300">
            <Eye className="w-3 h-3 text-amber-400" />
            Sorvegliato
          </span>
        );
      case 'lockdown':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-950/90 border border-rose-500 text-rose-200 animate-pulse">
            <Lock className="w-3 h-3 text-rose-400" />
            Allarme / Coprifuoco
          </span>
        );
    }
  };

  return (
    <div className={`relative w-full h-full flex flex-col lg:flex-row overflow-hidden select-none ${
      isCyber
        ? 'bg-slate-950 text-slate-100 font-sans'
        : isWest
        ? 'bg-[#1a140f] text-amber-100 font-serif'
        : isOrient
        ? 'bg-[#140e11] text-amber-100 font-serif'
        : 'bg-[#181512] text-amber-100 font-serif'
    }`}>
      {/* AREA MAPPA VETTORIALE A SCHERMO */}
      <div className="relative flex-1 h-[52%] lg:h-full flex items-center justify-center p-3 sm:p-5 overflow-hidden">
        {/* Texture di Sfondo d'Epoca */}
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${
            isCyber
              ? 'bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:24px_24px] opacity-15'
              : isOrient
              ? 'bg-[radial-gradient(#eab308_1px,transparent_1px)] [background-size:26px_26px] opacity-12'
              : 'bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:28px_28px] opacity-10'
          }`}
        />

        {/* Effetto Pergamena / Vignetta angoli */}
        <div className={`absolute inset-0 pointer-events-none ${
          isCyber
            ? 'shadow-[inset_0_0_80px_rgba(6,182,212,0.15)]'
            : 'shadow-[inset_0_0_100px_rgba(0,0,0,0.85)]'
        }`} />

        {/* Elemento d'atmosfera centrale (Rosa dei venti in filigrana) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
          <Compass className="w-96 h-96 text-amber-500" />
        </div>

        {/* TELAIO SVG DELLA MAPPA A DISTRETTI */}
        <div className="relative w-full h-full max-w-[850px] max-h-[600px] flex items-center justify-center">
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full drop-shadow-2xl overflow-visible"
          >
            <defs>
              {/* Filtro per bagliore sui bordi dei distretti */}
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* DISEGNO DEI POLIGONI DEI DISTRETTI */}
            {districts.map((d) => {
              const isSelected = d.id === selectedDistrictId;
              const isHovered = d.id === hoveredDistrictId;
              const isPartyHere = d.id === partyDistrict?.id;
              const pointsString = d.polyPoints.map((p) => `${p[0]},${p[1]}`).join(' ');

              // Colori di riempimento e contorno
              const fillColor = isSelected
                ? isCyber
                  ? 'rgba(6, 182, 212, 0.35)'
                  : 'rgba(217, 119, 6, 0.38)'
                : isHovered
                ? isCyber
                  ? 'rgba(6, 182, 212, 0.22)'
                  : 'rgba(217, 119, 6, 0.22)'
                : isCyber
                ? 'rgba(15, 23, 42, 0.65)'
                : 'rgba(30, 24, 18, 0.65)';

              const strokeColor = isSelected
                ? '#fbbf24'
                : isHovered
                ? '#f59e0b'
                : isCyber
                ? 'rgba(6, 182, 212, 0.45)'
                : 'rgba(180, 140, 90, 0.45)';

              return (
                <g key={d.id} className="cursor-pointer transition-all duration-300">
                  {/* Poligono Distretto */}
                  <polygon
                    points={pointsString}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={isSelected ? '0.9' : isHovered ? '0.7' : '0.4'}
                    strokeDasharray={isSelected ? 'none' : '1.5, 0.8'}
                    filter={isSelected ? 'url(#glow)' : undefined}
                    onClick={() => {
                      setSelectedDistrictId(d.id);
                      setSelectedLandmark(null);
                    }}
                    onMouseEnter={() => setHoveredDistrictId(d.id)}
                    onMouseLeave={() => setHoveredDistrictId(null)}
                    className="transition-all duration-200"
                  />

                  {/* Etichetta del Distretto posizionata al centroide */}
                  <g
                    transform={`translate(${d.centerPoint[0]}, ${d.centerPoint[1]})`}
                    className="pointer-events-none select-none"
                  >
                    {/* Badge Icona Distretto */}
                    <circle
                      cx="0"
                      cy="-3"
                      r="2.8"
                      fill={isCyber ? '#090d16' : '#221910'}
                      stroke={isSelected ? '#fbbf24' : strokeColor}
                      strokeWidth="0.3"
                    />

                    {/* Testo Nome Distretto */}
                    <text
                      x="0"
                      y="2.8"
                      textAnchor="middle"
                      fill={isSelected ? '#fff' : isCyber ? '#94a3b8' : '#fde68a'}
                      fontSize="2.4"
                      fontWeight={isSelected ? 'bold' : 'normal'}
                      fontFamily={isCyber ? 'monospace' : 'serif'}
                      letterSpacing="0.05em"
                    >
                      {d.name.split('&')[0].trim()}
                    </text>

                    {/* Badge di Allerta (Pallino colorato) */}
                    <circle
                      cx="0"
                      cy="5.2"
                      r="0.8"
                      fill={
                        d.alertLevel === 'safe'
                          ? '#10b981'
                          : d.alertLevel === 'patrolled'
                          ? '#f59e0b'
                          : '#ef4444'
                      }
                    />

                    {/* SEGNALINO "VOI SIETE QUI" (Se il party è in questo distretto) */}
                    {isPartyHere && (
                      <g transform="translate(0, -8.5)" className="animate-bounce">
                        {/* Alone luminoso dorato */}
                        <circle cx="0" cy="0" r="3.2" fill="rgba(245, 158, 11, 0.35)" />
                        <circle cx="0" cy="0" r="2.2" fill="#d97706" stroke="#fff" strokeWidth="0.4" />
                        <text
                          x="0"
                          y="0.8"
                          textAnchor="middle"
                          fill="#fff"
                          fontSize="2"
                          fontWeight="bold"
                        >
                          ★
                        </text>
                      </g>
                    )}
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Legenda Rapida in basso a sinistra della mappa */}
          <div className="absolute bottom-2 left-2 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-slate-300">
            <span className="flex items-center gap-1 font-bold text-amber-300">
              <span className="text-amber-400 font-black">★</span> Voi Siete Qui:
            </span>
            <span className="truncate max-w-[140px] text-white font-semibold">
              {partyDistrict?.name.split('&')[0]}
            </span>
          </div>
        </div>
      </div>

      {/* PANNELLO LATERALE DEI DETTAGLI DEL DISTRETTO */}
      <div className={`w-full lg:w-[380px] h-[48%] lg:h-full border-t lg:border-t-0 lg:border-l flex flex-col overflow-hidden backdrop-blur-md ${
        isCyber
          ? 'bg-slate-950/95 border-cyan-900/50'
          : isWest
          ? 'bg-[#1e1712]/95 border-amber-900/40'
          : 'bg-[#1b1510]/95 border-amber-900/40'
      }`}>
        {/* Testata del Distretto Selezionato */}
        <div className="p-4 border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400/90 flex items-center gap-1.5">
              {getDistrictIcon(selectedDistrict.iconName)}
              <span>Distretto di {cityName}</span>
            </span>
            {getAlertBadge(selectedDistrict.alertLevel)}
          </div>

          <h2 className="text-base sm:text-lg font-serif font-black tracking-wide text-slate-100 leading-tight">
            {selectedDistrict.name}
          </h2>
          <p className="text-xs text-amber-300/80 italic mt-0.5 font-serif">
            {selectedDistrict.subtitle}
          </p>

          {/* Fazione al comando */}
          {selectedDistrict.faction && (
            <div className="mt-2.5 flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-mono text-[11px]">Controllo:</span>
              <span
                className="font-bold px-2 py-0.5 rounded text-[11px]"
                style={{
                  backgroundColor: `${selectedDistrict.factionColor || '#d97706'}22`,
                  color: selectedDistrict.factionColor || '#d97706',
                  border: `1px solid ${selectedDistrict.factionColor || '#d97706'}55`,
                }}
              >
                {selectedDistrict.faction}
              </span>
            </div>
          )}
        </div>

        {/* Descrizione & Luoghi Chiave (Scrollabile) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-xs leading-relaxed text-slate-300 font-serif">
            {selectedDistrict.description}
          </p>

          {/* Lista Luoghi d'Interesse (Landmarks) */}
          <div>
            <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Luoghi Chiave & Punti d'Interesse ({selectedDistrict.landmarks.length})</span>
            </h4>

            <div className="space-y-2">
              {selectedDistrict.landmarks.map((lm) => {
                const isSelectedLm = selectedLandmark?.id === lm.id;
                return (
                  <div
                    key={lm.id}
                    onClick={() => setSelectedLandmark(isSelectedLm ? null : lm)}
                    className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                      isSelectedLm
                        ? 'bg-amber-950/80 border-amber-500 text-amber-100 shadow-md'
                        : 'bg-black/30 border-white/5 hover:border-white/20 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold font-serif text-slate-100">{lm.name}</span>
                      <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-mono ${
                        lm.type === 'haven'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : lm.type === 'elysium'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : lm.type === 'crime'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {lm.type === 'haven' ? 'Rifugio' : lm.type === 'elysium' ? 'Zona Neutrale' : lm.type === 'crime' ? 'Pericoloso' : 'Punto'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-normal font-serif">
                      {lm.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Opzioni Rapide per il Master: Modifica Livello d'Allerta */}
          {onUpdateDistrictAlert && (
            <div className="pt-2 border-t border-white/10">
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1.5">
                Stato di Sicurezza / Allerta (Regia Master):
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => onUpdateDistrictAlert(selectedDistrict.id, 'safe')}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                    selectedDistrict.alertLevel === 'safe'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/60 hover:bg-emerald-950'
                  }`}
                >
                  Tranquillo
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateDistrictAlert(selectedDistrict.id, 'patrolled')}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                    selectedDistrict.alertLevel === 'patrolled'
                      ? 'bg-amber-600 text-white shadow'
                      : 'bg-amber-950/40 text-amber-400 border border-amber-900/60 hover:bg-amber-950'
                  }`}
                >
                  Sorvegliato
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateDistrictAlert(selectedDistrict.id, 'lockdown')}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                    selectedDistrict.alertLevel === 'lockdown'
                      ? 'bg-rose-600 text-white shadow'
                      : 'bg-rose-950/40 text-rose-400 border border-rose-900/60 hover:bg-rose-950'
                  }`}
                >
                  Coprifuoco
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Barra di Azione in basso: Sposta il gruppo o Invia Azione */}
        <div className="p-3 bg-black/40 border-t border-white/10 flex flex-col gap-2 shrink-0">
          {selectedDistrict.id !== partyDistrict?.id ? (
            <button
              type="button"
              onClick={() => {
                if (onSelectActiveDistrict) {
                  onSelectActiveDistrict(selectedDistrict.id);
                }
                if (onFastTravelAction) {
                  onFastTravelAction(`Ci spostiamo verso il quartiere "${selectedDistrict.name}" per esplorarlo.`);
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-serif font-black text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer"
            >
              <Navigation className="w-4 h-4 text-slate-950" />
              <span>Sposta il Gruppo Qui & Inizia Viaggio</span>
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-amber-950/50 border border-amber-500/40 text-amber-300 text-xs font-serif font-semibold">
              <span className="text-amber-400">★</span> Il gruppo si trova attualmente in questa zona
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
