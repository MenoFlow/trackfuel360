import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { RapportData } from '@/types';

interface RapportDB extends DBSchema {
  rapports: {
    key: string;
    value: {
      rapport: RapportData;
      blob?: Blob;
      expiresAt: number;
    };
    indexes: { 'by-expiration': number };
  };
}

const DB_NAME = 'rapports-db';
const DB_VERSION = 1;
const STORE_NAME = 'rapports';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

let dbPromise: Promise<IDBPDatabase<RapportDB>> | null = null;

/**
 * Initialise la connexion IndexedDB
 */
async function getDB(): Promise<IDBPDatabase<RapportDB>> {
  if (!dbPromise) {
    dbPromise = openDB<RapportDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'rapport.metadata.id' });
          store.createIndex('by-expiration', 'expiresAt');
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Stocke un rapport dans IndexedDB
 */
export async function storeRapport(rapport: RapportData, blob?: Blob): Promise<void> {
  const db = await getDB();
  const expiresAt = Date.now() + MAX_AGE_MS;
  
  await db.put(STORE_NAME, {
    rapport,
    blob,
    expiresAt,
  });
  
  console.log('[RapportStorage] Rapport stocké:', rapport.metadata.id);
}

/**
 * Récupère un rapport depuis IndexedDB
 */
export async function getRapport(rapportId: string): Promise<{ rapport: RapportData; blob?: Blob } | null> {
  const db = await getDB();
  const entry = await db.get(STORE_NAME, rapportId);
  
  if (!entry) {
    console.warn('[RapportStorage] Rapport introuvable:', rapportId);
    return null;
  }
  
  // Vérifier l'expiration
  if (Date.now() > entry.expiresAt) {
    console.warn('[RapportStorage] Rapport expiré:', rapportId);
    await db.delete(STORE_NAME, rapportId);
    return null;
  }
  
  return { rapport: entry.rapport, blob: entry.blob };
}

/**
 * Récupère tous les rapports (métadonnées uniquement)
 */
export async function getAllRapports(): Promise<RapportData[]> {
  const db = await getDB();
  const entries = await db.getAll(STORE_NAME);
  
  const now = Date.now();
  const valid: RapportData[] = [];
  const expired: string[] = [];
  
  for (const entry of entries) {
    if (now > entry.expiresAt) {
      expired.push(entry.rapport.metadata.id);
    } else {
      valid.push(entry.rapport);
    }
  }
  
  // Supprimer les rapports expirés
  if (expired.length > 0) {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await Promise.all(expired.map(id => tx.store.delete(id)));
    await tx.done;
    console.log('[RapportStorage] Nettoyage:', expired.length, 'rapports expirés');
  }
  
  return valid;
}

/**
 * Supprime un rapport
 */
export async function deleteRapport(rapportId: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, rapportId);
  console.log('[RapportStorage] Rapport supprimé:', rapportId);
}

/**
 * Vide tous les rapports
 */
export async function clearAllRapports(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_NAME);
  console.log('[RapportStorage] Tous les rapports supprimés');
}

/**
 * Nettoie les rapports expirés
 */
export async function cleanupExpiredRapports(): Promise<number> {
  const db = await getDB();
  const now = Date.now();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const index = tx.store.index('by-expiration');
  
  let deleted = 0;
  let cursor = await index.openCursor(IDBKeyRange.upperBound(now));
  
  while (cursor) {
    await cursor.delete();
    deleted++;
    cursor = await cursor.continue();
  }
  
  await tx.done;
  
  if (deleted > 0) {
    console.log('[RapportStorage] Nettoyage automatique:', deleted, 'rapports expirés');
  }
  
  return deleted;
}
