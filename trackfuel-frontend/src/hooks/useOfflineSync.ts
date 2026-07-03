import { useState, useEffect } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { SyncService } from '@/lib/services/syncService';
import { SyncStatus } from '@/types/offline';

export const useOfflineSync = () => {
  const isOnline = useOnlineStatus();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncService.getSyncStatus());

  useEffect(() => {
    // S'abonner aux mises à jour du statut de sync
    const unsubscribe = SyncService.subscribe(setSyncStatus);
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Lancer la synchronisation automatiquement quand on revient en ligne
    if (isOnline && syncStatus.pendingCount > 0 && !syncStatus.isSyncing) {
      console.log('🔄 Auto-syncing after coming online');
      SyncService.syncAll();
    }
  }, [isOnline, syncStatus.pendingCount, syncStatus.isSyncing]);

  const manualSync = async () => {
    if (!isOnline) {
      console.warn('Cannot sync while offline');
      return;
    }
    await SyncService.syncAll();
  };

  return {
    isOnline,
    syncStatus,
    manualSync,
  };
};
