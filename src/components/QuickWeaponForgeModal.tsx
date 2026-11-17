import React, { useState } from 'react';
import {
  X,
  Hammer,
  Swords,
  Crosshair,
  ShieldAlert,
  Package,
  Check,
} from 'lucide-react';
import type { ThematicGearOption } from '../utils/wodMeritsAndGear';

interface QuickWeaponForgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddGear: (gear: ThematicGearOption) => void;
}

type ForgeTab = 'weapon' | 'ammo';

interface WeaponBaseArchetype {
  id: string;
  label: string;
  category: 'melee' | 'ranged';
  twoHanded: boolean;
  damage: string;
  range?: string;
  minStrength: number;
  icon: string;
  defaultDescription: string;
}

const WEAPON_ARCHETYPES: WeaponBaseArchetype[] = [
  {
    id: 'light_blade',
    label: 'Pugnale / Daga Rapida',
    category: 'melee',
    twoHanded: false,
    damage: 'Forza + 1 (L)',
    minStrength: 1,
    icon: '🗡️',
    defaultDescription: 'Lama corta e rapida per imboscate, tagli precisi e scontri a distanza ravvicinata.',
  },
  {
    id: 'side_sword',
    label: 'Spada da Lato / Sciabola',
    category: 'melee',
    twoHanded: false,
    damage: 'Forza + 2 (L)',
    minStrength: 2,
    icon: '⚔️',
    defaultDescription: 'Lama bilanciata per fendente e affondo, ideale per duelli e scherma da mischia.',
  },
  {
    id: 'heavy_axe',
    label: 'Mannaia / Ascia da Battaglia',
    category: 'melee',
    twoHanded: true,
    damage: 'Forza + 3 (L)',
    minStrength: 3,
    icon: '🪓',
    defaultDescription: 'Arma pesante a due mani capace di spaccare corazze rigide e lamiere con forza d\'urto.',
  },
  {
    id: 'tactical_bow',
    label: 'Arco Tattico Silenzioso',
    category: 'ranged',
    twoHanded: true,
    damage: '2 (L) + Forza',
    range: '50/100/200m',
    minStrength: 2,
    icon: '🏹',
    defaultDescription: 'Arco composito in corno e resine, 100% silenzioso per eliminare vedette senza allarmi.',
  },
  {
    id: 'flintlock_pistol',
    label: 'Pistola a Pietra Focaia',
    category: 'ranged',
    twoHanded: false,
    damage: '3 (L) Letale',
    range: '15/30/60m',
    minStrength: 2,
    icon: '🔫',
    defaultDescription: 'Arma da fuoco da pugno a polvere nera. Impatto micidiale a bruciapelo e ricarica lenta.',
  },
  {
    id: 'musket_rifle',
    label: 'Moschetto a Canna Lunga',
    category: 'ranged',
    twoHanded: true,
    damage: '4 (L) Letale',
    range: '40/80/160m',
    minStrength: 2,
    icon: '🔫',
    defaultDescription: 'Fucile industriale a lungo raggio che spara palle pesanti capaci di forare corazze.',
  },
  {
    id: 'blunderbuss',
    label: 'Trombone da Breccia',
    category: 'ranged',
    twoHanded: true,
    damage: '4 (L) a Cono',
    range: '10/20m',
    minStrength: 2,
    icon: '💥',
    defaultDescription: 'Canna svasata a campana caricata a mitraglia per spazzare corridoi e cunicoli stretti.',
  },
  {
    id: 'gunsword',
    label: 'Spada-Pistola Ibrida',
    category: 'melee',
    twoHanded: false,
    damage: '2 (L) Mischia + 3 (L) Sparo',
    range: '10m',
    minStrength: 2,
    icon: '🗡️🔫',
    defaultDescription: 'Lama forgiata con canna da sparo a bruciapelo integrata lungo il piatto per colpi a sorpresa.',
  },
];

const TACTICAL_TRAITS = [
  {
    id: 'arcane_conductive',
    label: '⚡ Conduttiva / Arcana',
    desc: 'Conduce fulmini, calore o cariche magiche senza rovinare la tempra.',
  },
  {
    id: 'armor_piercing',
    label: '🎯 Perforante (+1)',
    desc: 'Ignora 1 punto di corazza o lamiera nemica grazie a punta o forgiatura speciale.',
  },
  {
    id: 'silent_stealth',
    label: '🤫 Silenziosa / Furtiva',
    desc: 'Nessun rumore all\'estrazione o allo scocco, ideale per imboscate notturne.',
  },
  {
    id: 'brutal_impact',
    label: '💥 Brutale / Spacca-Ossa',
    desc: 'Massa d\'impatto amplificata: atterra o fa indietreggiare il bersaglio.',
  },
  {
    id: 'perfect_balance',
    label: '⚖️ Perfettamente Bilanciata',
    desc: 'Fattura artigianale superiore: conferisce +1 all\'Iniziativa in combattimento.',
  },
];

const SPECIAL_AMMO_TYPES = [
  {
    id: 'silver',
    label: '✦ Piombo & Argento Puro',
    maxQty: 4,
    defaultQty: 3,
    damage: '✦ Danno Aggravato (Argento)',
    desc: 'Letale contro Licantropi, mutanti alchemici, spiriti e nuclei arcani; annulla la rigenerazione naturale.',
  },
  {
    id: 'incendiary',
    label: '🔥 Carica Incendiaria (Zolfo)',
    maxQty: 6,
    defaultQty: 4,
    damage: '1 (L) + Fuoco Continuo',
    desc: 'Appicca fuoco al bersaglio all\'impatto e fa detonare depositi o barili di polvere nera nemici.',
  },
  {
    id: 'bodkin',
    label: '📍 Punta a Spillo Perforante',
    maxQty: 12,
    defaultQty: 8,
    damage: 'Perforante (Ignora 2 Armatura)',
    desc: 'Cuspide conica in acciaio temprato per infiltrarsi tra fessure delle piastre e scudi.',
  },
  {
    id: 'breaching',
    label: '💣 Carica da Breccia Esplosiva',
    maxQty: 3,
    defaultQty: 2,
    damage: '4 (L) Detonazione Ravvicinata',
    desc: 'Minima carica detonante all\'impatto per abbattere porte rinforzate o atterrare gruppi stretti.',
  },
];

export const QuickWeaponForgeModal: React.FC<QuickWeaponForgeModalProps> = ({
  isOpen,
  onClose,
  onAddGear,
}) => {
  const [activeTab, setActiveTab] = useState<ForgeTab>('weapon');

  // Stato Forgia Arma
  const [weaponName, setWeaponName] = useState('');
  const [selectedArchetypeId, setSelectedArchetypeId] = useState<string>('side_sword');
  const [isDualWield, setIsDualWield] = useState(false);
  const [selectedTraitId, setSelectedTraitId] = useState<string>('armor_piercing');
  const [customLore, setCustomLore] = useState('');

  // Stato Munizioni Speciali
  const [ammoName, setAmmoName] = useState('');
  const [ammoWeaponType, setAmmoWeaponType] = useState<'bow' | 'firearm' | 'crossbow'>('bow');
  const [selectedAmmoTypeId, setSelectedAmmoTypeId] = useState<string>('silver');
  const [ammoQuantity, setAmmoQuantity] = useState<number>(3);

  if (!isOpen) return null;

  const currentArchetype = WEAPON_ARCHETYPES.find((a) => a.id === selectedArchetypeId) || WEAPON_ARCHETYPES[0];
  const currentTrait = TACTICAL_TRAITS.find((t) => t.id === selectedTraitId) || TACTICAL_TRAITS[0];
  const currentAmmoType = SPECIAL_AMMO_TYPES.find((a) => a.id === selectedAmmoTypeId) || SPECIAL_AMMO_TYPES[0];

  const handleArchetypeChange = (archId: string) => {
    setSelectedArchetypeId(archId);
    const arch = WEAPON_ARCHETYPES.find((a) => a.id === archId);
    if (arch && arch.twoHanded) {
      setIsDualWield(false);
    }
  };

  const handleCreateWeapon = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = weaponName.trim()
      ? isDualWield && !weaponName.toLowerCase().startsWith('coppia')
        ? `Coppia di ${weaponName.trim()}`
        : weaponName.trim()
      : isDualWield
      ? `Coppia di ${currentArchetype.label}`
      : currentArchetype.label;

    const specialParts: string[] = [];
    if (isDualWield) {
      specialParts.push('Coppia d\'Armi: +1 Dado attacchi ravvicinati multipli / doppio sparo prima di ricaricare');
    }
    specialParts.push(currentTrait.label);
    if (currentArchetype.twoHanded) {
      specialParts.push('Due Mani†');
    }

    const uniqueId = `custom_forge_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const forgedWeapon: ThematicGearOption = {
      id: uniqueId,
      name: `${currentArchetype.icon} ${finalName}`,
      category: 'weapon',
      screenCategory: currentArchetype.category,
      quantity: 1,
      isEquipped: true,
      damageOrEffect: `${currentArchetype.damage}${isDualWield ? ' [Doppia]' : ''}`,
      sizeOrRange: currentArchetype.range
        ? `Gittata: ${currentArchetype.range} | Taglia ${currentArchetype.twoHanded ? 3 : 2}`
        : currentArchetype.twoHanded
        ? 'Due Mani† | Taglia 3'
        : 'Una Mano | Taglia 2',
      minStrength: currentArchetype.minStrength,
      costDots: '•••',
      specialRules: specialParts.join(' • '),
      description: customLore.trim() || `${currentArchetype.defaultDescription} Modifica speciale: ${currentTrait.desc}`,
      eras: ['fantasy', 'victorian'],
    };

    onAddGear(forgedWeapon);
    onClose();
  };

  const handleCreateAmmo = (e: React.FormEvent) => {
    e.preventDefault();
    const weaponLabel =
      ammoWeaponType === 'bow'
        ? 'Frecce per Arco'
        : ammoWeaponType === 'crossbow'
        ? 'Dardi per Balestra'
        : 'Palle di Piombo per Arma da Fuoco';

    const defaultTitle = `${currentAmmoType.label} (${weaponLabel}) (x${ammoQuantity})`;
    const finalTitle = ammoName.trim() ? `${ammoName.trim()} (x${ammoQuantity})` : defaultTitle;
    const uniqueId = `custom_ammo_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const forgedAmmo: ThematicGearOption = {
      id: uniqueId,
      name: `🏹 ${finalTitle}`,
      category: 'ammo',
      screenCategory: 'ranged',
      quantity: Math.max(1, Math.min(ammoQuantity, currentAmmoType.maxQty)),
      costDots: currentAmmoType.id === 'silver' ? '••••' : '••',
      damageOrEffect: currentAmmoType.damage,
      sizeOrRange: 'Scorta Tattica Portatile',
      specialRules: currentAmmoType.desc,
      description: `${ammoQuantity} cariche speciali forgiate a mano. ${currentAmmoType.desc}`,
      eras: ['fantasy', 'victorian'],
    };

    onAddGear(forgedAmmo);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-amber-600/70 rounded-3xl shadow-2xl shadow-amber-950/40 overflow-hidden flex flex-col my-auto max-h-[92vh] animate-fadeIn">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-slate-950 via-amber-950/80 to-slate-950 px-5 sm:px-6 py-4 border-b border-amber-900/60 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/60 flex items-center justify-center text-amber-300 shadow-md">
              <Hammer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-black text-base sm:text-lg text-slate-100 tracking-wider uppercase">
                Banco di Forgiatura Rapido
              </h3>
              <p className="text-[11px] text-amber-300/80 font-mono">
                Crea armi iconiche personali, doppie impugnature e scorte alchemiche
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Arma Iconica vs Munizioni */}
        <div className="bg-slate-950/90 px-5 sm:px-6 py-2.5 border-b border-slate-800 flex space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('weapon')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === 'weapon'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-950/60'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Swords className="w-4 h-4" />
            <span>1. Forgia Arma Iconica</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ammo')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === 'ammo'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-950/60'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Crosshair className="w-4 h-4" />
            <span>2. Scorte Munizioni Speciali</span>
          </button>
        </div>

        {/* CONTENUTO MODAL */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {activeTab === 'weapon' ? (
            <form onSubmit={handleCreateWeapon} className="space-y-5">
              {/* Nome dell'Arma */}
              <div>
                <label className="block text-xs font-mono uppercase text-amber-300 font-bold mb-1.5">
                  Nome dell'Arma Iconica:
                </label>
                <input
                  type="text"
                  value={weaponName}
                  onChange={(e) => setWeaponName(e.target.value)}
                  placeholder="Es. Zanna di Tuono, Il Giudizio di Cenerevia, Spada-Pistola da Duello..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Archetipo Base (Bottoni Rapidi) */}
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 font-bold mb-2">
                  Tipo di Base & Stile d'Impatto:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {WEAPON_ARCHETYPES.map((arch) => {
                    const isSelected = selectedArchetypeId === arch.id;
                    return (
                      <button
                        key={arch.id}
                        type="button"
                        onClick={() => handleArchetypeChange(arch.id)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-amber-950/60 border-amber-500 text-white shadow-md ring-1 ring-amber-500/50'
                            : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-base mb-1">{arch.icon}</div>
                        <div className="font-serif font-bold text-xs text-slate-200 leading-tight">
                          {arch.label}
                        </div>
                        <div className="text-[10px] font-mono text-amber-300/80 mt-1">
                          {arch.damage}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Opzione Doppia Arma / Coppia Gemella */}
              <div className={`p-3.5 rounded-2xl border transition-all ${
                currentArchetype.twoHanded
                  ? 'bg-slate-950/40 border-slate-800/80 opacity-70'
                  : isDualWield
                  ? 'bg-amber-950/40 border-amber-500/80'
                  : 'bg-slate-950 border-slate-800'
              }`}>
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="dual_wield_toggle"
                    disabled={currentArchetype.twoHanded}
                    checked={isDualWield}
                    onChange={(e) => setIsDualWield(e.target.checked)}
                    className="mt-1 w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                  <label htmlFor="dual_wield_toggle" className="flex-1 cursor-pointer">
                    <span className="font-serif font-bold text-sm text-slate-200 block">
                      Coppia d'Armi / Doppia Impugnatura (es. 2 spade, 2 pugnali, 2 pistole)
                    </span>
                    <span className="text-xs text-slate-400 block mt-0.5">
                      {currentArchetype.twoHanded ? (
                        <span className="text-amber-400 font-mono text-[11px] flex items-center gap-1 mt-0.5">
                          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                          Un'arma a due mani (archi, moschetti, mannaie grandi) richiede entrambe le mani: impossibile impugnarne due.
                        </span>
                      ) : (
                        'Garantisce il tratto [Doppia Arma]: +1 Dado a colpi ravvicinati multipli o due spari in successione prima di ricaricare.'
                      )}
                    </span>
                  </label>
                </div>
              </div>

              {/* Modifica Tattica / Pregio di Forgiatura */}
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 font-bold mb-2">
                  1 Pregio o Modifica Tattica di Forgiatura:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TACTICAL_TRAITS.map((tr) => {
                    const isSelected = selectedTraitId === tr.id;
                    return (
                      <button
                        key={tr.id}
                        type="button"
                        onClick={() => setSelectedTraitId(tr.id)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-start space-x-2.5 ${
                          isSelected
                            ? 'bg-amber-950/50 border-amber-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border ${
                            isSelected ? 'bg-amber-500 border-amber-400 text-black' : 'border-slate-700 bg-slate-900'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-amber-300">{tr.label}</div>
                          <div className="text-[10px] text-slate-400 leading-snug mt-0.5">{tr.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Note e Lore Narrativo */}
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 font-bold mb-1.5">
                  Origine Narrativa / Dettagli (Facoltativo):
                </label>
                <textarea
                  value={customLore}
                  onChange={(e) => setCustomLore(e.target.value)}
                  rows={2}
                  placeholder="Es. Forgiata recuperando una piastra di un costrutto del Dominio, o incisa con rune degli spiriti..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none resize-none"
                />
              </div>

              {/* Tasto Azione */}
              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white font-serif font-bold uppercase tracking-wider text-xs sm:text-sm rounded-2xl shadow-xl shadow-amber-950/60 transition-transform hover:scale-[1.01] cursor-pointer flex items-center justify-center space-x-2"
              >
                <Hammer className="w-4 h-4" />
                <span>Forgia Arma & Aggiungi all'Equipaggiamento</span>
              </button>
            </form>
          ) : (
            /* TAB 2: MUNIZIONI SPECIALI */
            <form onSubmit={handleCreateAmmo} className="space-y-5">
              <div>
                <label className="block text-xs font-mono uppercase text-amber-300 font-bold mb-1.5">
                  Nome della Scorta Speciale (Facoltativo):
                </label>
                <input
                  type="text"
                  value={ammoName}
                  onChange={(e) => setAmmoName(e.target.value)}
                  placeholder="Es. Frecce d'Argento di Kael'Dora, Palle Incendiarie alchemiche..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Tipo di Arma a cui sono destinate */}
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 font-bold mb-2">
                  Destinazione Munizioni:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'bow', label: '🏹 Frecce per Arco' },
                    { id: 'firearm', label: '🔫 Palle per Arma da Fuoco' },
                    { id: 'crossbow', label: '🏹 Dardi per Balestra' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setAmmoWeaponType(t.id as any)}
                      className={`p-2.5 rounded-xl border text-center font-mono text-xs font-bold transition-all cursor-pointer ${
                        ammoWeaponType === t.id
                          ? 'bg-amber-950/60 border-amber-500 text-amber-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Proprietà Speciale Munizione */}
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 font-bold mb-2">
                  Carica Alchemica & Effetto (Scorte Contate):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SPECIAL_AMMO_TYPES.map((am) => {
                    const isSelected = selectedAmmoTypeId === am.id;
                    return (
                      <button
                        key={am.id}
                        type="button"
                        onClick={() => {
                          setSelectedAmmoTypeId(am.id);
                          setAmmoQuantity(am.defaultQty);
                        }}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start space-x-2.5 ${
                          isSelected
                            ? 'bg-amber-950/60 border-amber-500 text-white shadow-md'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border ${
                            isSelected ? 'bg-amber-500 border-amber-400 text-black' : 'border-slate-700 bg-slate-900'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-amber-300">{am.label}</div>
                          <div className="text-[10px] text-emerald-400 font-mono mt-0.5">⚡ {am.damage}</div>
                          <div className="text-[10px] text-slate-400 leading-snug mt-1">{am.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selettore Quantità Ragionevole */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="font-serif font-bold text-sm text-slate-200 block">
                    Quantità Scorta nel Limite della Ragione:
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Limite massimo bilanciato per questa carica: <strong>{currentAmmoType.maxQty} colpi</strong>
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setAmmoQuantity((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 font-bold font-mono cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-base text-amber-300 min-w-[24px] text-center">
                    {ammoQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAmmoQuantity((q) => Math.min(currentAmmoType.maxQty, q + 1))}
                    className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 font-bold font-mono cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Tasto Azione */}
              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-emerald-700 to-indigo-800 hover:from-emerald-600 hover:to-indigo-700 text-white font-serif font-bold uppercase tracking-wider text-xs sm:text-sm rounded-2xl shadow-xl shadow-indigo-950/60 transition-transform hover:scale-[1.01] cursor-pointer flex items-center justify-center space-x-2"
              >
                <Package className="w-4 h-4" />
                <span>Crea Scorta Speciale & Aggiungi all'Inventario ({ammoQuantity} colpi)</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
