import { OfflineService } from '@/lib/services/offlineService';
import { SyncQueueItem, SyncStatus } from '@/types/offline';

export class SyncService {
  private static isSyncing = false;
  private static syncCallbacks: Array<(status: SyncStatus) => void> = [];

  static subscribe(callback: (status: SyncStatus) => void) {
    this.syncCallbacks.push(callback);
    return () => {
      this.syncCallbacks = this.syncCallbacks.filter(cb => cb !== callback);
    };
  }

  private static notifySubscribers(status: SyncStatus) {
    this.syncCallbacks.forEach(callback => callback(status));
  }

  static async syncAll(): Promise<void> {
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress');
      return;
    }

    if (!navigator.onLine) {
      console.log('📡 Offline, skipping sync');
      return;
    }

    this.isSyncing = true;
    const queue = OfflineService.getSyncQueue();
    const errors: SyncQueueItem[] = [];

    this.notifySubscribers({
      isSyncing: true,
      pendingCount: queue.length,
      errors: [],
    });

    console.log(queue);

    console.log(`🔄 Starting sync: ${queue.length} items in queue`);

    for (const item of queue) {
      // Skip items that exceeded max retries
      if (item.retries >= item.maxRetries) {
        errors.push(item);
        continue;
      }

      try {
        await this.syncItem(item);
        OfflineService.removeSyncItem(item.id);
        console.log(`✅ Synced item ${item.id}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Failed to sync item ${item.id}:`, errorMsg);
        OfflineService.markItemAsFailed(item.id, errorMsg);
        errors.push({ ...item, error: errorMsg });
      }
    }

    OfflineService.updateLastSync();
    this.isSyncing = false;

    const remainingQueue = OfflineService.getSyncQueue();
    this.notifySubscribers({
      isSyncing: false,
      pendingCount: remainingQueue.length,
      lastSync: new Date(),
      errors,
    });

    console.log(`✨ Sync complete: ${errors.length} errors, ${remainingQueue.length} items remaining`);
  }

  private static async syncItem(item: SyncQueueItem): Promise<void> {
    const { type, action, data } = item;

    console.log(data);

    const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

    const API_BASE_URL = API_BASE+'/api/pleins';

    // TODO: Remplacer par de vrais appels API
    // Pour l'instant, simulation
    await new Promise(resolve => setTimeout(resolve, 500));

    if (type === 'plein' && action === 'create') {
      // Simuler l'appel API
      
      // En production, cela serait :
      const formData = new FormData();

      // Plein
      Object.entries(data.pleinData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      // OCR
      if (data.ocrData) {
        if (data.ocrData.station) formData.append('ocr_station', data.ocrData.station);
        if (data.ocrData.date_bon) formData.append('ocr_date_bon', data.ocrData.date_bon);
        if (data.ocrData.litres) formData.append('ocr_litres', data.ocrData.litres.toString());
        if (data.ocrData.prix_total) formData.append('ocr_prix_total', data.ocrData.prix_total.toString());
        if (data.ocrData.chauffeur_matricule) formData.append('ocr_chauffeur_matricule', data.ocrData.chauffeur_matricule);
        if (data.ocrData.chauffeur_nom) formData.append('ocr_chauffeur_nom', data.ocrData.chauffeur_nom);
        if (data.ocrData.chauffeur_prenom) formData.append('ocr_chauffeur_prenom', data.ocrData.chauffeur_prenom);
        if (data.ocrData.vehicule_immatriculation) formData.append('ocr_vehicule_immatriculation', data.ocrData.vehicule_immatriculation);
        if (data.ocrData.vehicule_marque) formData.append('ocr_vehicule_marque', data.ocrData.vehicule_marque);
      }

      if (data.photoBase64) {
        formData.append('photo_bon', data.photoBase64);
      }

      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        body: formData,
      });

      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');

      if (!response.ok) {
        let errorData: any = { error: 'Erreur serveur' };

        if (isJson) {
          try {
            errorData = await response.json();
          } catch {
            // JSON corrompu → on garde le message générique
          }
        }

        const err = new Error(errorData.error || 'Erreur inconnue');
        (err as any).details = errorData; // On garde tout (dernier_odometre, espaceDisponible, etc.)
        (err as any).status = response.status;
        throw err;
      }
      console.log(data);

      OfflineService.removePleinOffline(data.tempId);

      // const data2 = await response.json();
      // return data2.pleinId;
      // Nettoyer les données locales après succès
    }

    if (type === 'trajet' && action === 'create') {
      console.log('📤 Would POST to /api/trajets:', data);
      OfflineService.removeTrajetOffline(data._tempId);
    }

    // Simuler un échec aléatoire pour tester la logique de retry (à retirer en prod)
    // if (Math.random() < 0.2) {
    //   throw new Error('Simulated sync error');
    // }
  }

  static getSyncStatus(): SyncStatus {
    const queue = OfflineService.getSyncQueue();
    const lastSync = OfflineService.getLastSync();
    const errors = queue.filter(item => item.error && item.retries >= item.maxRetries);

    return {
      isSyncing: this.isSyncing,
      pendingCount: queue.length,
      lastSync: lastSync ? new Date(lastSync) : undefined,
      errors,
    };
  }
}
