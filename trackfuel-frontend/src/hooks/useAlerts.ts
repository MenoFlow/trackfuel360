import { useState, useEffect, useCallback } from 'react';
import { Alert } from '@/types';

const STORAGE_KEY = 'geofence_alerts';

/**
 * Hook personnalisé pour gérer les alertes avec persistance localStorage
 */
export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // Charger depuis localStorage au montage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setAlerts(parsed);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des alertes:', error);
    }
  }, []);

  // Sauvegarder dans localStorage à chaque modification
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des alertes:', error);
    }
  }, [alerts]);

  const addAlert = useCallback((alert: Omit<Alert, 'id' | 'timestamp' | 'isRead'>) => {
    const newAlert: Alert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    setAlerts((prev) => [newAlert, ...prev]);
    return newAlert;
  }, []);

  const deleteAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isRead: true } : a))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
  }, []);

  const clearAll = useCallback(() => {
    setAlerts([]);
  }, []);

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  return {
    alerts,
    addAlert,
    deleteAlert,
    markAsRead,
    markAllAsRead,
    clearAll,
    unreadCount,
  };
}
