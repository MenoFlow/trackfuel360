// src/services/OfflineService.ts

import { OfflineStorage, SyncQueueItem } from "@/types/offline";

const STORAGE_KEY = "trackfuel_offline";

export class OfflineService {
  private static getStorage(): OfflineStorage {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return {
        pleins: [],
        trajets: [],
        syncQueue: [],
      };
    }
    try {
      return JSON.parse(data);
    } catch {
      return {
        pleins: [],
        trajets: [],
        syncQueue: [],
      };
    }
  }

  //deleteSyncedData

  static deleteSyncedData(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  private static saveStorage(storage: OfflineStorage): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  }

  // Sauvegarde un plein + OCR + photo hors-ligne
  static savePleinOffline(plein: any, ocrData?: any, photoFile?: File): number {
    const storage = this.getStorage();
    const tempId = Date.now();
    const timestamp = Date.now();

    const offlinePlein = {
      ...plein,
      id: tempId,
      _offline: true,
      _timestamp: timestamp,
      _tempId: tempId,
      // On garde les données OCR attachées au plein
      _ocrData: ocrData || null,
      // Photo en base64 si présente
      _photoBase64: null as string | null,
    };

    // Conversion photo → base64 (asynchrone mais on attend pas ici car on est déjà dans un contexte sync)
    if (photoFile) {
      const reader = new FileReader();
      reader.onload = () => {
        offlinePlein._photoBase64 = reader.result as string;
        // Sauvegarde mise à jour avec photo
        const updatedStorage = this.getStorage();
        const index = updatedStorage.pleins.findIndex((p) => p.id === tempId);
        if (index !== -1) {
          updatedStorage.pleins[index] = offlinePlein;
          this.saveStorage(updatedStorage);
        }
      };
      reader.readAsDataURL(photoFile);
    }

    storage.pleins.push(offlinePlein);

    // Ajouter à la file de synchronisation
    const syncItem: SyncQueueItem = {
      id: `sync_${Date.now()}_${Math.random()}`,
      type: "plein",
      action: "create",
      data: {
        pleinData: plein,
        ocrData: ocrData || null,
        photoBase64: photoFile ? true : false, // on saura qu'il y a une photo à envoyer
        tempId,
      },
      timestamp,
      retries: 0,
      maxRetries: 5,
    };

    storage.syncQueue.push(syncItem);
    this.saveStorage(storage);

    return tempId;
  }

  // Récupère tous les pleins hors-ligne (avec OCR + photo)
  static getPleinsOffline() {
    return this.getStorage().pleins;
  }

  static removePleinOffline(tempId: number): void {
    const storage = this.getStorage();
    storage.pleins = storage.pleins.filter((p) => p.id !== tempId);
    storage.syncQueue = storage.syncQueue.filter(
      (item) => !(item.type === "plein" && (item.data as any).tempId === tempId)
    );
    this.saveStorage(storage);
  }

  // === TRAJETS (inchangés) ===
  static saveTrajetOffline(trajet: any): number {
    const storage = this.getStorage();
    const tempId = Date.now();
    const offlineTrajet = {
      ...trajet,
      id: tempId,
      _offline: true,
      _timestamp: Date.now(),
      _tempId: tempId,
    };

    storage.trajets.push(offlineTrajet);

    const syncItem: SyncQueueItem = {
      id: `sync_${Date.now()}`,
      type: "trajet",
      action: "create",
      data: offlineTrajet,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 3,
    };
    storage.syncQueue.push(syncItem);

    this.saveStorage(storage);
    return tempId;
  }

  static getTrajetsOffline(): any[] {
    return this.getStorage().trajets;
  }

  static removeTrajetOffline(tempId: number): void {
    const storage = this.getStorage();
    storage.trajets = storage.trajets.filter((t) => t.id !== tempId);
    this.saveStorage(storage);
  }

  // === FILE DE SYNCHRONISATION ===
  static getSyncQueue(): SyncQueueItem[] {
    return this.getStorage().syncQueue;
  }

  static removeSyncItem(itemId: string): void {
    const storage = this.getStorage();
    storage.syncQueue = storage.syncQueue.filter((item) => item.id !== itemId);
    this.saveStorage(storage);
  }

  static updateSyncItem(itemId: string, updates: Partial<SyncQueueItem>): void {
    const storage = this.getStorage();
    const index = storage.syncQueue.findIndex((item) => item.id === itemId);
    if (index !== -1) {
      storage.syncQueue[index] = { ...storage.syncQueue[index], ...updates };
      this.saveStorage(storage);
    }
  }

  static markItemAsFailed(itemId: string, error: string): void {
    const storage = this.getStorage();
    const item = storage.syncQueue.find((i) => i.id === itemId);
    if (item) {
      item.retries += 1;
      item.error = error;
      item.lastAttempt = Date.now();
      this.saveStorage(storage);
    }
  }

  static updateLastSync(): void {
    const storage = this.getStorage();
    storage.lastSync = Date.now();
    this.saveStorage(storage);
  }

  static getLastSync(): number | undefined {
    return this.getStorage().lastSync;
  }

  static clearAllOfflineData(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  // === UTILITAIRES ===
  static async convertPhotoToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
