/**
 * Utilità per la gestione e compressione sicura delle immagini delle mappe.
 * Ridimensiona le immagini caricate per evitare di superare la quota di localStorage
 * e garantire caricamenti istantanei sia su PC che su smartphone.
 */

export async function compressMapImage(file: File, maxWidth = 1600, maxHeight = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Usa image/jpeg per una compressione ottimale (circa 100-250KB invece di 5-10MB)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => {
        resolve(event.target?.result as string);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Salva in modo sicuro nel localStorage senza far crashare l'app in caso di QuotaExceeded.
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    console.warn(`[SafeStorage] Errore salvataggio quota per "${key}":`, err?.message || err);
    // Tenta di liberare spazio rimuovendo vecchie chiavi temporanee
    try {
      localStorage.removeItem('chronica_messages');
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
}

