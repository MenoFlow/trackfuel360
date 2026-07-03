import { useState, useEffect } from 'react';

async function checkInternetAccess(): Promise<boolean> {
  try {
    const response = await fetch("https://www.google.com", { 
      mode: "no-cors",
      cache: "no-cache"
    });
    return true;
  } catch (error) {
    return false;
  }
}

export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Vérification initiale
    checkInternetAccess().then(setIsOnline);

    // Vérification périodique toutes les 10 secondes
    const interval = setInterval(async () => {
      const online = await checkInternetAccess();
      if (online !== isOnline) {
        setIsOnline(online);
        console.log(online ? '🌐 Connection restored' : '📡 Connection lost');
      }
    }, 10000);

    // Écouter les événements natifs comme indication supplémentaire
    const handleOnline = () => {
      console.log('🌐 Browser online event');
      checkInternetAccess().then(setIsOnline);
    };

    const handleOffline = () => {
      console.log('📡 Browser offline event');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOnline]);

  return isOnline;
};
