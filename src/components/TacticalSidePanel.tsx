import React, { useState } from 'react';
import type { CampaignConfig, HandoutSpec, Character } from '../types';
import { TacticalSketchView } from './TacticalSketchView';
import { generateThematicDistricts, isDistrictsMismatchingEra } from '../utils/districtGenerator';
import {
  Map,
  Compass,
  FileText,
  Scroll,
  ChevronRight,
  ChevronLeft,
  Maximize2,
  Layers,
  MapPin,
  Sparkles,
  Eye,
} from 'lucide-react';

interface TacticalSidePanelProps {
  campaign: CampaignConfig;
  character?: Character | null;
  characterName?: string;
  party?: { id: string; name: string }[];
  activeEnemies?: any[];
  discoveredHandouts?: HandoutSpec[];
  onSelectMap: (mapId: string) => void;
  onOpenFullMapModal: () => void;
  onOpenHandoutModal: (handout: HandoutSpec) => void;
  onAskTacticalUpdate?: () => void;
}

export const TacticalSidePanel: React.FC<TacticalSidePanelProps> = ({
  campaign,
  character,
  characterName = 'Kael',
  party = [],
  activeEnemies = [],
  discoveredHandouts = [],
  onSelectMap,
  onOpenFullMapModal,
  onOpenHandoutModal,
  onAskTacticalUpdate,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'sketch' | 'handouts'>('map');

  React.useEffect(() => {
    if (campaign.activeBattlemap) {
      setActiveTab('sketch');
    }
  }, [campaign.activeBattlemap]);

  const maps = campaign.maps || [];
  const activeMap = maps.find((m) => m.id === campaign.activeMapId) || maps[0];

  const sideDistricts = React.useMemo(() => {
    let list =
      campaign.cityDistricts && campaign.cityDistricts.length > 0
        ? campaign.cityDistricts
        : generateThematicDistricts(campaign.era, campaign.city);
    if (isDistrictsMismatchingEra(list, campaign.era)) {
      list = generateThematicDistricts(campaign.era, campaign.city);
    }
    return list;
  }, [campaign.cityDistricts, campaign.era, campaign.city]);

  const sidePartyDistrict = sideDistricts.find((d) => d.id === campaign.activeDistrictId) || sideDistricts[0];

  // Estrazione Oggetti Missione & Trama dall'inventario della squadra
  const missionGearItems = React.useMemo(() => {
    if (!character) return [];
    const items = character.structuredInventory && character.structuredInventory.length > 0
      ? character.structuredInventory
      : (character.inventory || []).map((it, idx) => ({ id: `it_${idx}`, name: String(it), category: 'gear' as const, quantity: 1 }));

    return items.filter((i: any) => {
      const n = (i.name || '').toLowerCase();
      if (i.category === 'weapon' || i.category === 'ammo' || i.category === 'consumable') return false;
      if (n.includes('giubbotto') || n.includes('cuoio rigido') || n.includes('armatura')) return false;
      return true; // Oggetti narrativi, bottini, dispacci, monete, reliquie, manufatti
    });
  }, [character]);

  const totalMissionCount = discoveredHandouts.length + missionGearItems.length;

  return (
    <div
      className={`transition-all duration-300 relative flex flex-col h-full bg-slate-950/95 border-l border-slate-800 ${
        isCollapsed ? 'w-12 shrink-0' : 'w-full md:w-[320px] lg:w-[420px] xl:w-[480px] shrink-0'
      }`}
    >
      {/* Bottone Flottante Riduci / Espandi */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? 'Espandi Tavolo Tattico' : 'Comprimi Pannello'}
        className="absolute -left-3.5 top-5 z-30 w-7 h-7 rounded-full bg-slate-900 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center shadow-xl cursor-pointer hover:bg-slate-800 transition-transform"
      >
        {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {/* STATO COMPRESSO (Barra Verticale) */}
      {isCollapsed ? (
        <div className="flex flex-col items-center py-4 space-y-4 text-slate-400">
          <button
            type="button"
            onClick={() => {
              setIsCollapsed(false);
              setActiveTab('map');
            }}
            title="Mappe Attive"
            className="p-2 rounded-xl hover:bg-slate-900 text-indigo-400 hover:text-indigo-300 cursor-pointer"
          >
            <Map className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsCollapsed(false);
              setActiveTab('sketch');
            }}
            title="Schizzo Tattico"
            className="p-2 rounded-xl hover:bg-slate-900 text-amber-400 hover:text-amber-300 cursor-pointer"
          >
            <Compass className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsCollapsed(false);
              setActiveTab('handouts');
            }}
            title="Oggetti Missione & Reperti"
            className="p-2 rounded-xl hover:bg-slate-900 text-amber-400 hover:text-amber-300 cursor-pointer relative"
          >
            <Scroll className="w-5 h-5" />
            {totalMissionCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>
        </div>
      ) : (
        /* STATO ESPANSO (Tavolo Tattico Completo) */
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header Switcher Tab */}
          <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800/80">
              <button
                type="button"
                onClick={() => setActiveTab('map')}
                className={`py-1.5 px-3 rounded-lg text-xs font-serif font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  activeTab === 'map'
                    ? 'bg-indigo-900/80 text-white shadow-md border border-indigo-700/60'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Map className="w-3.5 h-3.5" />
                <span>Mappa</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('sketch')}
                className={`py-1.5 px-3 rounded-lg text-xs font-serif font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  activeTab === 'sketch'
                    ? 'bg-amber-900/80 text-white shadow-md border border-amber-700/60'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Schizzo Tattico</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('handouts')}
                className={`py-1.5 px-3 rounded-lg text-xs font-serif font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  activeTab === 'handouts'
                    ? 'bg-amber-900/80 text-white shadow-md border border-amber-700/60'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Scroll className="w-3.5 h-3.5 text-amber-400" />
                <span>Oggetti Missione</span>
                {totalMissionCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-black font-mono text-[9px] font-bold">
                    {totalMissionCount}
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={onOpenFullMapModal}
              title="Apri Mappa a Schermo Intero"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 cursor-pointer transition-colors shadow-sm"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* CONTENUTO TAB */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col min-h-0 space-y-3">
            {/* =================================================================== */}
            {/* TAB 1: MAPPA ATTIVA & GALLERIA LUOGHI                                */}
            {/* =================================================================== */}
            {activeTab === 'map' && (
              <div className="space-y-3 flex flex-col h-full min-h-0">
                {/* Visualizzatore Immagine Mappa Attiva (Sempre in vista a schermo) */}
                <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/90 shadow-2xl group shrink-0 h-[260px] sm:h-[300px] flex items-center justify-center">
                  {activeMap?.imageUrl ? (
                    <img
                      src={activeMap.imageUrl}
                      alt={activeMap.name}
                      className="w-full h-full object-contain cursor-pointer transition-transform duration-300 group-hover:scale-[1.02]"
                      onClick={onOpenFullMapModal}
                    />
                  ) : (
                    <div
                      onClick={onOpenFullMapModal}
                      className="w-full h-full relative cursor-pointer bg-[#0c101a] p-2 flex flex-col items-center justify-center overflow-hidden group select-none"
                      title="Clicca per aprire la Mappa a Schermo Intero"
                    >
                      {/* Mini SVG Preview dei Distretti Dinamici */}
                      <svg viewBox="0 0 100 100" className="w-full h-full max-h-[250px] transition-transform duration-300 group-hover:scale-[1.03]">
                        <defs>
                          <pattern id="tactical-grid-mini" width="10" height="10" patternUnits="userSpaceOnUse">
                            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#334155" strokeWidth="0.3" strokeOpacity="0.25" />
                          </pattern>
                        </defs>
                        <rect width="100" height="100" fill="url(#tactical-grid-mini)" />

                        {/* Poligoni dei Distretti */}
                        {sideDistricts.map((d) => {
                          const isPartyHere = d.id === sidePartyDistrict?.id;
                          const pts = d.polyPoints.map((p) => p.join(',')).join(' ');
                          return (
                            <g key={d.id}>
                              <polygon
                                points={pts}
                                fill={isPartyHere ? `${d.factionColor}38` : '#1e293b55'}
                                stroke={isPartyHere ? d.factionColor : '#475569'}
                                strokeWidth={isPartyHere ? '1.8' : '0.8'}
                                strokeDasharray={isPartyHere ? undefined : '2,1'}
                                className="transition-all"
                              />
                              <text
                                x={d.centerPoint[0]}
                                y={d.centerPoint[1] - 1}
                                textAnchor="middle"
                                fill={isPartyHere ? '#ffffff' : '#94a3b8'}
                                fontSize="4.2"
                                fontFamily="serif"
                                fontWeight={isPartyHere ? '900' : 'bold'}
                              >
                                {d.name.split('&')[0].trim()}
                              </text>
                            </g>
                          );
                        })}

                        {/* Segnalino Animato Gruppo ("Voi Siete Qui") */}
                        {sidePartyDistrict && (
                          <g transform={`translate(${sidePartyDistrict.centerPoint[0]}, ${sidePartyDistrict.centerPoint[1] + 5})`}>
                            <circle r="4.5" fill="#f59e0b" opacity="0.4" className="animate-ping" />
                            <circle r="2.8" fill="#f59e0b" stroke="#ffffff" strokeWidth="0.7" />
                            <polygon points="0,-1.5 1,1.5 -1,1.5" fill="#000" />
                          </g>
                        )}
                      </svg>

                      {/* Badge Posizione Corrente della Squadra */}
                      <div className="absolute bottom-2 left-2 right-20 px-2.5 py-1 rounded-xl bg-slate-950/90 border border-amber-600/60 backdrop-blur-md shadow-lg flex items-center space-x-1.5 text-[11px] font-serif truncate">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                        <span className="text-amber-200 truncate">
                          Gruppo: <strong className="text-white">{sidePartyDistrict?.name?.split('&')[0]?.trim() || campaign.city}</strong>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Badge Nome Mappa Attiva in Sovrimpressione */}
                  <div className="absolute top-2 left-2 px-2.5 py-1 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800 text-xs font-serif font-bold text-slate-200 shadow-lg flex items-center space-x-1.5 pointer-events-none">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{activeMap?.name || `Distretti: ${campaign.city}`}</span>
                  </div>

                  {/* Pulsante Ingrandisci in Sovrimpressione */}
                  <button
                    type="button"
                    onClick={onOpenFullMapModal}
                    className="absolute bottom-2 right-2 px-2.5 py-1 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-700 text-[11px] font-mono text-slate-300 flex items-center space-x-1 shadow-lg cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Ingrandisci</span>
                  </button>
                </div>

                {/* Galleria Miniature Mappe Caricate (Scrollabile separatamente) */}
                {maps.length > 1 && (
                  <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto pr-1">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span className="flex items-center space-x-1">
                        <Layers className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Mappe della Cronaca ({maps.length})</span>
                      </span>
                      <span>Clicca per cambiare</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {maps.map((m) => {
                        const isCurrent = m.id === activeMap?.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => onSelectMap(m.id)}
                            className={`p-1.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col space-y-1 ${
                              isCurrent
                                ? 'bg-indigo-950/80 border-indigo-500 shadow-md ring-1 ring-indigo-500'
                                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
                            }`}
                          >
                            <div className="h-16 rounded-lg overflow-hidden bg-slate-950 flex items-center justify-center">
                              {m.imageUrl ? (
                                <img src={m.imageUrl} alt={m.name} className="w-full h-full object-cover" />
                              ) : (
                                <MapPin className="w-4 h-4 text-slate-600" />
                              )}
                            </div>
                            <span className="text-[10px] font-serif font-bold text-slate-200 truncate block">
                              {m.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* =================================================================== */}
            {/* TAB 2: SCHIZZO TATTICO MINIMALE (Battlemap Blueprint)                */}
            {/* =================================================================== */}
            {activeTab === 'sketch' && (
              <div className="flex-1 flex flex-col h-full min-h-[440px] w-full">
                <TacticalSketchView
                  battlemap={campaign.activeBattlemap}
                  activeEnemies={activeEnemies}
                  characterName={characterName}
                  party={party}
                  campaign={campaign}
                  onAskTacticalUpdate={onAskTacticalUpdate}
                  onOpenFullMap={onOpenFullMapModal}
                />
              </div>
            )}

            {/* =================================================================== */}
            {/* TAB 3: OGGETTI MISSIONE & REPERTI (Manufatti & Documenti di Trama)  */}
            {/* =================================================================== */}
            {activeTab === 'handouts' && (
              <div className="space-y-4">
                <div className="p-3 bg-gradient-to-r from-amber-950/40 via-cyan-950/30 to-slate-900 border border-amber-800/40 rounded-2xl flex items-start space-x-2.5">
                  <Scroll className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-serif font-bold text-xs text-amber-200">
                      Oggetti Missione &amp; Reperti
                    </h4>
                    <p className="text-[11px] text-slate-400 font-serif leading-relaxed mt-0.5">
                      Dispacci cifrati, reliquie, manufatti e documenti chiave trovati dalla squadra.
                    </p>
                  </div>
                </div>

                {/* SEZIONE 1: DOCUMENTI & DISPACCI RIVELABILI */}
                {discoveredHandouts.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold block px-1">
                      📜 Documenti &amp; Dispacci Leggibili ({discoveredHandouts.length})
                    </span>
                    <div className="space-y-2">
                      {discoveredHandouts.map((h) => (
                        <div
                          key={h.id}
                          onClick={() => onOpenHandoutModal(h)}
                          className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-600/80 transition-all cursor-pointer flex items-center justify-between group shadow-md"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                              {h.type === 'runic_stone' ? (
                                <Sparkles className="w-4 h-4" />
                              ) : (
                                <FileText className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <p className="font-serif font-bold text-xs text-slate-100 group-hover:text-cyan-200 transition-colors">
                                {h.title}
                              </p>
                              <p className="text-[10px] font-mono text-slate-400">
                                {h.authorOrSeal || (h.type === 'military_dispatch' ? 'Dispaccio Tattico Cifrato' : 'Reperto d\'Epoca')}
                              </p>
                            </div>
                          </div>

                          <span className="p-1.5 rounded-lg bg-slate-950 text-slate-400 group-hover:text-cyan-300">
                            <Eye className="w-4 h-4" />
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SEZIONE 2: MANUFATTI & OGGETTI CHIAVE RACCOLTI DALLA SQUADRA */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block px-1">
                    💎 Manufatti &amp; Oggetti di Trama ({missionGearItems.length})
                  </span>

                  {missionGearItems.length === 0 && discoveredHandouts.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 text-slate-500">
                      <Scroll className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-serif">Nessun oggetto missione ancora registrato.</p>
                      <p className="text-[10px] font-mono text-slate-600 mt-1">
                        Ogni manufatto, chiave, bottino narrativo o dispaccio recuperato comparirà automaticamente qui!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {missionGearItems.map((item: any, idx: number) => {
                        const isDoc = /dispaccio|lettera|documento|pergamena|cifrat/i.test(item.name);
                        return (
                          <div
                            key={item.id || `m_item_${idx}`}
                            className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/90 shadow-sm flex items-start justify-between space-x-3"
                          >
                            <div className="flex items-start space-x-3">
                              <div className="w-9 h-9 rounded-xl bg-amber-950/60 border border-amber-800/50 flex items-center justify-center text-amber-300 shrink-0 mt-0.5">
                                {isDoc ? <FileText className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className="font-serif font-bold text-xs text-amber-100">
                                  {item.name}
                                </p>
                                {item.description && (
                                  <p className="text-[11px] text-slate-400 font-serif leading-relaxed mt-0.5">
                                    {item.description}
                                  </p>
                                )}
                                <span className="inline-block mt-1 text-[9px] font-mono text-amber-500/90 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                                  In possesso del gruppo • Visibile in Inventario
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
