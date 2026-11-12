const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const SAVES_DIR = path.join(__dirname, 'saves');
const PROFILES_FILE = path.join(SAVES_DIR, 'profiles.json');

const DEFAULT_PROFILES = [
  {
    id: 'master',
    name: 'Master / Creatore',
    pin: '1234',
    isMaster: true,
    avatar: 'crown',
    createdAt: Date.now(),
  },
];

let pool = null;
let isConnected = false;

if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });
  } catch (err) {
    console.warn('[DB] Errore configurazione Pool PostgreSQL:', err.message);
  }
}

// Fallback locale: lettura profili
function getProfilesLocal() {
  if (!fs.existsSync(PROFILES_FILE)) {
    try {
      if (!fs.existsSync(SAVES_DIR)) fs.mkdirSync(SAVES_DIR, { recursive: true });
      fs.writeFileSync(PROFILES_FILE, JSON.stringify(DEFAULT_PROFILES, null, 2), 'utf-8');
    } catch {}
    return DEFAULT_PROFILES;
  }
  try {
    const raw = fs.readFileSync(PROFILES_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return DEFAULT_PROFILES;
  }
}

// Fallback locale: salvataggio profili
function saveProfilesLocal(profiles) {
  try {
    if (!fs.existsSync(SAVES_DIR)) fs.mkdirSync(SAVES_DIR, { recursive: true });
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2), 'utf-8');
  } catch (e) {
    console.error('[DB Local] Errore salvataggio profili:', e.message);
  }
}

// Inizializzazione Tabelle e Migrazione Automatica
async function initDb() {
  if (!pool) {
    console.log('[DB] Nessun DATABASE_URL rilevato -> Modalità archivio locale (saves/)');
    return;
  }

  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS chronica_profiles (
          id TEXT PRIMARY KEY,
          data JSONB NOT NULL
        );
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS chronica_saves (
          id TEXT PRIMARY KEY,
          profile_id TEXT,
          title TEXT,
          data JSONB NOT NULL,
          updated_at BIGINT NOT NULL
        );
      `);

      // Migrazione automatica profili se la tabella è vuota
      const profCheck = await client.query('SELECT COUNT(*) FROM chronica_profiles');
      if (parseInt(profCheck.rows[0].count, 10) === 0) {
        const localProfiles = getProfilesLocal();
        for (const p of localProfiles) {
          await client.query(
            'INSERT INTO chronica_profiles (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data',
            [p.id, JSON.stringify(p)]
          );
        }
        console.log(`[DB] Inizializzati ${localProfiles.length} profili su Supabase.`);
      }

      // Migrazione automatica salvataggi se la tabella è vuota
      const savesCheck = await client.query('SELECT COUNT(*) FROM chronica_saves');
      if (parseInt(savesCheck.rows[0].count, 10) === 0 && fs.existsSync(SAVES_DIR)) {
        const files = fs.readdirSync(SAVES_DIR).filter((f) => f.endsWith('.json') && f !== 'profiles.json');
        let migratedCount = 0;
        for (const file of files) {
          try {
            const raw = fs.readFileSync(path.join(SAVES_DIR, file), 'utf-8');
            const data = JSON.parse(raw);
            const saveId = file.replace('.json', '');
            const profileId = data.profileId || 'master';
            const title = data.campaign?.title || saveId;
            const updatedAt = Date.now();
            await client.query(
              'INSERT INTO chronica_saves (id, profile_id, title, data, updated_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
              [saveId, profileId, title, JSON.stringify(data), updatedAt]
            );
            migratedCount++;
          } catch {}
        }
        if (migratedCount > 0) {
          console.log(`[DB] Migrate con successo ${migratedCount} cronache locali su Supabase.`);
        }
      }

      isConnected = true;
      console.log('➜ Database Cloud:   Supabase PostgreSQL Connesso');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[DB] Errore connessione Supabase:', err.message);
    console.warn('[DB] Fallback automatico su archivio locale.');
    isConnected = false;
  }
}

// Lettura Profili
async function getProfiles() {
  if (isConnected && pool) {
    try {
      const res = await pool.query("SELECT data FROM chronica_profiles ORDER BY (data->>'createdAt')::bigint ASC");
      if (res.rows.length > 0) {
        return res.rows.map((r) => r.data);
      }
    } catch (e) {
      console.error('[DB] Errore lettura profili da cloud:', e.message);
    }
  }
  return getProfilesLocal();
}

// Salvataggio Profili
async function saveProfiles(profiles) {
  // Salva sempre anche in locale come backup
  saveProfilesLocal(profiles);

  if (isConnected && pool) {
    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM chronica_profiles');
        for (const p of profiles) {
          await client.query('INSERT INTO chronica_profiles (id, data) VALUES ($1, $2)', [p.id, JSON.stringify(p)]);
        }
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('[DB] Errore salvataggio profili su cloud:', err.message);
    }
  }
}

// Lista Salvataggi
async function listSaves(targetProfileId) {
  if (isConnected && pool) {
    try {
      let query = 'SELECT id, profile_id, title, data, updated_at FROM chronica_saves';
      const params = [];
      if (targetProfileId && targetProfileId !== 'all') {
        query += ' WHERE profile_id = $1';
        params.push(targetProfileId);
      }
      query += ' ORDER BY updated_at DESC';

      const res = await pool.query(query, params);
      return res.rows.map((row) => {
        const d = row.data || {};
        return {
          id: row.id,
          fileName: `${row.id}.json`,
          title: d.campaign?.title || row.title || row.id,
          era: d.campaign?.era || 'Non specificata',
          city: d.campaign?.city || 'Sconosciuta',
          characterName: d.character?.name || 'Senza Nome',
          messagesCount: d.messages?.length || 0,
          updatedAt: Number(row.updated_at),
          profileId: row.profile_id || 'master',
          authorName: d.authorName || (row.profile_id === 'master' ? 'Al Bocia' : 'Giocatore'),
        };
      });
    } catch (e) {
      console.error('[DB] Errore lista salvataggi da cloud:', e.message);
    }
  }

  // Fallback Locale
  const list = [];
  if (!fs.existsSync(SAVES_DIR)) return list;
  const files = fs.readdirSync(SAVES_DIR).filter((f) => f.endsWith('.json') && f !== 'profiles.json');
  for (const file of files) {
    const filePath = path.join(SAVES_DIR, file);
    try {
      const stats = fs.statSync(filePath);
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      const saveProfileId = data.profileId || 'master';
      if (targetProfileId && targetProfileId !== 'all' && saveProfileId !== targetProfileId) {
        continue;
      }
      list.push({
        id: file.replace('.json', ''),
        fileName: file,
        title: data.campaign?.title || file,
        era: data.campaign?.era || 'Non specificata',
        city: data.campaign?.city || 'Sconosciuta',
        characterName: data.character?.name || 'Senza Nome',
        messagesCount: data.messages?.length || 0,
        updatedAt: stats.mtimeMs,
        profileId: saveProfileId,
        authorName: data.authorName || (saveProfileId === 'master' ? 'Al Bocia' : 'Giocatore'),
      });
    } catch {}
  }
  return list;
}

// Salva Cronaca
async function saveChronicle(payload) {
  const saveId = payload.id || `save_${Date.now()}`;
  const profileId = payload.profileId || 'master';
  const title = payload.campaign?.title || saveId;
  const now = Date.now();

  // Salva anche su file locale come cache/backup
  try {
    if (!fs.existsSync(SAVES_DIR)) fs.mkdirSync(SAVES_DIR, { recursive: true });
    fs.writeFileSync(path.join(SAVES_DIR, `${saveId}.json`), JSON.stringify(payload, null, 2), 'utf-8');
  } catch {}

  if (isConnected && pool) {
    try {
      await pool.query(
        `INSERT INTO chronica_saves (id, profile_id, title, data, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE
         SET profile_id = EXCLUDED.profile_id,
             title = EXCLUDED.title,
             data = EXCLUDED.data,
             updated_at = EXCLUDED.updated_at`,
        [saveId, profileId, title, JSON.stringify(payload), now]
      );
    } catch (e) {
      console.error('[DB] Errore scrittura salvataggio su cloud:', e.message);
    }
  }

  return saveId;
}

// Carica Cronaca Singola
async function loadChronicle(saveId) {
  if (isConnected && pool) {
    try {
      const res = await pool.query('SELECT data FROM chronica_saves WHERE id = $1', [saveId]);
      if (res.rows.length > 0) {
        return res.rows[0].data;
      }
    } catch (e) {
      console.error('[DB] Errore caricamento salvataggio da cloud:', e.message);
    }
  }

  // Fallback Locale
  const filePath = path.join(SAVES_DIR, `${saveId}.json`);
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch {}
  }
  return null;
}

// Elimina Cronaca
async function deleteChronicle(saveId) {
  let deleted = false;

  // Rimuovi locale
  const filePath = path.join(SAVES_DIR, `${saveId}.json`);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      deleted = true;
    } catch {}
  }

  if (isConnected && pool) {
    try {
      const res = await pool.query('DELETE FROM chronica_saves WHERE id = $1', [saveId]);
      if (res.rowCount > 0) deleted = true;
    } catch (e) {
      console.error('[DB] Errore cancellazione da cloud:', e.message);
    }
  }

  return deleted;
}

module.exports = {
  initDb,
  getProfiles,
  saveProfiles,
  listSaves,
  saveChronicle,
  loadChronicle,
  deleteChronicle,
};
