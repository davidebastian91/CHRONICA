import React, { useState } from 'react';
import type { Character, InventoryItem, ItemCategory } from '../types';
import {
  ITEM_CATEGORIES,
  getCharacterInventory,
  updateCharacterInventory,
  useConsumable,
} from '../utils/inventorySystem';
import { matchWeaponFromCatalog } from '../utils/wodCombatRules';
import {
  Shield,
  Plus,
  Minus,
  Sparkles,
  AlertCircle,
  Package,
  Swords,
} from 'lucide-react';

interface StructuredInventoryViewProps {
  character: Character;
  onUpdateCharacter: (updated: Character) => void;
  allowEdit?: boolean; // Se true (Master o Creazione), permette aggiunta libera
  compact?: boolean; // Se true, stile compatto per smartphone
}

export const StructuredInventoryView: React.FC<StructuredInventoryViewProps> = ({
  character,
  onUpdateCharacter,
  allowEdit = false,
  compact = false,
}) => {
  const [activeCategory, setActiveCategory] = useState<ItemCategory | 'all'>('all');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Form aggiunta per Master
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCat, setNewCat] = useState<ItemCategory>('gear');
  const [newQty, setNewQty] = useState(1);
  const [newDesc, setNewDesc] = useState('');

  const items = getCharacterInventory(character);

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleQtyChange = (itemId: string, delta: number) => {
    const updatedItems = items.map((item) => {
      if (item.id === itemId) {
        const nextQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: nextQty };
      }
      return item;
    });
    onUpdateCharacter(updateCharacterInventory(character, updatedItems));
  };

  const handleToggleEquip = (itemId: string) => {
    const updatedItems = items.map((item) => {
      if (item.id === itemId) {
        return { ...item, isEquipped: !item.isEquipped };
      }
      return item;
    });
    onUpdateCharacter(updateCharacterInventory(character, updatedItems));
  };

  const handleUseItem = (itemId: string) => {
    const res = useConsumable(character, itemId);
    if (res.success) {
      onUpdateCharacter(res.updatedChar);
      showToast(res.message);
    } else {
      showToast(res.message);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    const updatedItems = items.filter((i) => i.id !== itemId);
    onUpdateCharacter(updateCharacterInventory(character, updatedItems));
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newItem: InventoryItem = {
      id: `item_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: newName.trim(),
      category: newCat,
      quantity: Math.max(1, newQty),
      description: newDesc.trim() || undefined,
      isEquipped: newCat === 'weapon' ? true : undefined,
    };

    const updatedItems = [...items, newItem];
    onUpdateCharacter(updateCharacterInventory(character, updatedItems));

    setNewName('');
    setNewDesc('');
    setNewQty(1);
    setShowAddForm(false);
    showToast(`Aggiunto ${newItem.name} all'inventario.`);
  };

  const filteredItems = activeCategory === 'all'
    ? items
    : items.filter((i) => i.category === activeCategory);

  // Conteggio per badge
  const countWeapons = items.filter((i) => i.category === 'weapon').length;
  const countAmmo = items.filter((i) => i.category === 'ammo').reduce((s, i) => s + i.quantity, 0);
  const countConsumables = items.filter((i) => i.category === 'consumable').reduce((s, i) => s + i.quantity, 0);
  const countGear = items.filter((i) => i.category === 'gear').length;

  return (
    <div className="space-y-4">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div className="bg-emerald-950/90 border border-emerald-500/80 text-emerald-200 text-xs px-3 py-2 rounded-xl flex items-center space-x-2 animate-fadeIn shadow-lg">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Barra Categorie */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-1.5 ${
            activeCategory === 'all'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Tutto ({items.length})</span>
        </button>

        {ITEM_CATEGORIES.map((cat) => {
          let badgeCount = 0;
          if (cat.id === 'weapon') badgeCount = countWeapons;
          if (cat.id === 'ammo') badgeCount = countAmmo;
          if (cat.id === 'consumable') badgeCount = countConsumables;
          if (cat.id === 'gear') badgeCount = countGear;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              <span className="ml-1 text-[10px] font-mono opacity-80">({badgeCount})</span>
            </button>
          );
        })}
      </div>

      {/* Lista Oggetti */}
      <div className={compact ? 'space-y-2' : 'space-y-2.5'}>
        {filteredItems.length === 0 ? (
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-6 text-center text-slate-500 font-serif italic text-xs sm:text-sm">
            Nessun oggetto in questa categoria.
          </div>
        ) : (
          filteredItems.map((item) => {
            const isOutOfAmmo = item.category === 'ammo' && item.quantity === 0;

            return (
              <div
                key={item.id}
                className={`rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  compact ? 'p-2.5 sm:p-3' : 'p-3 sm:p-3.5'
                } ${
                  isOutOfAmmo
                    ? 'bg-red-950/20 border-red-900/60 text-red-200'
                    : 'bg-slate-950/60 border-slate-800/90 hover:border-slate-700 text-slate-200'
                }`}
              >
                {/* Nome e Dettagli */}
                <div className="flex items-start space-x-3">
                  <span className="text-xl shrink-0 mt-0.5">
                    {item.category === 'weapon' && '🗡️'}
                    {item.category === 'ammo' && '🏹'}
                    {item.category === 'consumable' && '🧪'}
                    {item.category === 'gear' && '🎒'}
                  </span>

                  <div>
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className="font-serif font-bold text-sm sm:text-base text-slate-100">
                        {item.name}
                      </span>

                      {item.category === 'weapon' && (
                        <button
                          type="button"
                          onClick={() => handleToggleEquip(item.id)}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                            item.isEquipped
                              ? 'bg-indigo-950 border-indigo-600 text-indigo-300 font-bold'
                              : 'bg-slate-900 border-slate-700 text-slate-400'
                          }`}
                        >
                          {item.isEquipped ? '✓ Impugnata' : 'Rifodera'}
                        </button>
                      )}

                      {isOutOfAmmo && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-red-950 border border-red-700 text-red-300 font-bold flex items-center space-x-1">
                          <AlertCircle className="w-3 h-3 text-red-400" />
                          <span>ESAURITA (0)</span>
                        </span>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-xs text-slate-400 font-serif italic mt-0.5">
                        {item.description}
                      </p>
                    )}

                    {item.damageOrEffect && (
                      <span className="text-[11px] font-mono text-emerald-400 block mt-0.5">
                        ⚡ {item.damageOrEffect}
                      </span>
                    )}

                    {/* Dati Ufficiali Combattimento WoD per le Armi */}
                    {item.category === 'weapon' && (() => {
                      const weapon = item.weaponStats || matchWeaponFromCatalog(item.name);
                      return (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] font-mono">
                          <span className="px-1.5 py-0.5 rounded bg-red-950/80 border border-red-700/80 text-red-200 font-bold flex items-center gap-1">
                            <Swords className="w-3 h-3 text-red-400" />
                            <span>
                              {weapon.addStrength ? `Forza + ${weapon.baseDamage}` : `${weapon.baseDamage} Dadi`}{' '}
                              [{weapon.damageType === 'aggravated' ? '✦ AGGRAVATO' : weapon.damageType === 'lethal' ? '✕ LETALE' : '/ BASHING'}]
                            </span>
                          </span>
                          <span className="text-slate-400 px-1 py-0.5 bg-slate-900 rounded border border-slate-800">
                            Diff {weapon.difficulty}
                          </span>
                          {weapon.rangeMeters && (
                            <span className="text-slate-400 px-1 py-0.5 bg-slate-900 rounded border border-slate-800">
                              Portata {weapon.rangeMeters}m
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Controlli Quantità & Azioni */}
                <div className="flex items-center justify-between sm:justify-end space-x-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                  {/* Se è munizione o consumabile, mostra quantità e modificatori */}
                  {(item.category === 'ammo' || item.category === 'consumable' || item.quantity > 1) && (
                    <div className="flex items-center space-x-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl px-2 py-1">
                      <button
                        type="button"
                        onClick={() => handleQtyChange(item.id, -1)}
                        className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 cursor-pointer"
                        title="Diminuisci quantità (1 colpo/uso)"
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <span
                        className={`font-mono font-bold text-xs px-1 min-w-[24px] text-center ${
                          isOutOfAmmo ? 'text-red-400' : 'text-slate-100'
                        }`}
                      >
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleQtyChange(item.id, 1)}
                        className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 cursor-pointer"
                        title="Aggiungi quantità"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Pulsante Usa per Consumabili */}
                  {item.category === 'consumable' && (
                    <button
                      type="button"
                      onClick={() => handleUseItem(item.id)}
                      className="px-3 py-1.5 bg-gradient-to-r from-emerald-800 to-indigo-900 hover:from-emerald-700 text-white rounded-xl text-xs font-serif font-bold uppercase tracking-wider cursor-pointer shadow-md flex items-center space-x-1"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-300" />
                      <span>Usa (1)</span>
                    </button>
                  )}

                  {/* Tasto Rimuovi / Scarta */}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg transition-colors cursor-pointer text-xs"
                    title="Scarta oggetto dall'inventario"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info & Modalità Master */}
      <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="text-[11px] font-mono text-slate-400 flex items-center space-x-1.5">
          <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>
            {allowEdit
              ? 'Modalità Master: puoi aggiungere o modificare qualsiasi equipaggiamento.'
              : 'Regola D10: le munizioni scalano a ogni tiro a distanza. Al raggiungimento di 0 colpi l\'arma si scarica!'}
          </span>
        </div>

        {allowEdit && (
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1.5 bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 rounded-xl font-mono text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuovo Oggetto</span>
          </button>
        )}
      </div>

      {/* Form di Aggiunta per Master */}
      {allowEdit && showAddForm && (
        <form onSubmit={handleAddItem} className="bg-slate-950 p-4 rounded-2xl border border-indigo-700/60 space-y-3 animate-fadeIn">
          <h5 className="font-serif font-bold text-xs uppercase tracking-wider text-indigo-300">
            Aggiungi Oggetto da Master
          </h5>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Nome Oggetto</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="es. Frecce con punta d'argento, Spada bastarda..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Categoria</label>
              <select
                value={newCat}
                onChange={(e) => setNewCat(e.target.value as ItemCategory)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="weapon">🗡️ Arma</option>
                <option value="ammo">🏹 Munizioni</option>
                <option value="consumable">🧪 Consumabile</option>
                <option value="gear">🎒 Attrezzatura</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Quantità</label>
              <input
                type="number"
                min={1}
                max={999}
                value={newQty}
                onChange={(e) => setNewQty(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Descrizione o Effetto (Opzionale)</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="es. +1 Danno Letale, Cura 1 ferita..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-serif font-bold text-xs uppercase cursor-pointer"
            >
              Aggiungi all'Inventario
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
