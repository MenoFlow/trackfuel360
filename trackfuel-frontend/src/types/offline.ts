// Types pour la gestion hors-ligne
export interface OfflineMetadata {
  _offline: boolean;
  _timestamp: number;
  _tempId: string;
}

export interface SyncQueueItem {
  id: string;
  type: 'plein' | 'trajet';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
  error?: string;
  lastAttempt?: number;
}

export interface OfflineStorage {
  pleins: any[];
  trajets: any[];
  syncQueue: SyncQueueItem[];
  lastSync?: number;
}

export interface SyncStatus {
  isSyncing: boolean;
  pendingCount: number;
  lastSync?: Date;
  errors: SyncQueueItem[];
}
