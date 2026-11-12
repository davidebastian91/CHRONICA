import type { CampaignConfig, Character, StoryMessage, ActiveCombatEnemy } from '../types';

export interface ChronicleSaveData {
  version: string;
  savedAt: number;
  campaign: CampaignConfig;
  character?: Character | null;
  messages: StoryMessage[];
  activeEnemies?: ActiveCombatEnemy[];
  profileId?: string;
  authorName?: string;
  isSpectatorHost?: boolean;
}

export interface ServerSaveSummary {
  id: string;
  fileName: string;
  title: string;
  era: string;
  city: string;
  characterName: string;
  messagesCount: number;
  updatedAt: number;
  profileId?: string;
  authorName?: string;
}

// 1. Esporta salvataggio come file scaricabile sul PC/Telefono
export function exportChronicleToFile(
  campaign: CampaignConfig,
  character: Character | null | undefined,
  messages: StoryMessage[],
  activeEnemies?: ActiveCombatEnemy[]
) {
  const data: ChronicleSaveData = {
    version: '1.0',
    savedAt: Date.now(),
    campaign,
    character: character || null,
    isSpectatorHost: !character,
    messages,
    activeEnemies,
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const cleanTitle = (campaign.title || 'cronaca').replace(/[^a-zA-Z0-9_-]/g, '_');
  const a = document.createElement('a');
  a.href = url;
  a.download = `${cleanTitle}_salvataggio.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 2. Importa salvataggio da file locale caricato dall'utente
export function importChronicleFromFile(file: File): Promise<ChronicleSaveData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed.campaign || !parsed.character || !parsed.messages) {
          throw new Error('Formato salvataggio non valido: mancano sezioni obbligatorie.');
        }
        resolve(parsed);
      } catch (err: any) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Errore di lettura del file.'));
    reader.readAsText(file);
  });
}

// 3. Salvataggi su Disco Server (Linux / PC)
export async function saveChronicleToServer(
  campaign: CampaignConfig,
  character: Character | null | undefined,
  messages: StoryMessage[],
  profileId?: string,
  authorName?: string,
  activeEnemies?: ActiveCombatEnemy[]
): Promise<boolean> {
  try {
    const data: ChronicleSaveData = {
      version: '1.0',
      savedAt: Date.now(),
      campaign,
      character: character || null,
      isSpectatorHost: !character,
      messages,
      activeEnemies,
      profileId,
      authorName,
    };

    const res = await fetch('/api/saves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: campaign.id,
        profileId,
        authorName,
        ...data,
      }),
    });

    return res.ok;
  } catch (err) {
    console.warn('Server non disponibile per il salvataggio su disco:', err);
    return false;
  }
}

export async function fetchServerSaves(profileId?: string): Promise<ServerSaveSummary[]> {
  try {
    const url = profileId ? `/api/saves?profileId=${encodeURIComponent(profileId)}` : '/api/saves';
    const res = await fetch(url);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function loadChronicleFromServer(id: string): Promise<ChronicleSaveData | null> {
  try {
    const res = await fetch(`/api/saves/${id}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function deleteChronicleFromServer(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/saves/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}

