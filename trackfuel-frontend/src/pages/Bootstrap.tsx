import { useEffect, useState } from 'react';
import NotFound from './NotFound';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const Bootstrap = () => {
  const [status, setStatus] = useState<'loading' | 'created' | 'not-found' | 'error'>('loading');

  useEffect(() => {
    let mounted = true;
    const urls = API_BASE
      ? [`${API_BASE}/api/bootstrap`]
      : ['/api/bootstrap'];

    const requestBootstrap = async () => {
      let lastError: unknown = null;

      for (const url of urls) {
        try {
          const response = await fetch(url);

          if (response.status === 404) {
            return { notFound: true };
          }

          const contentType = response.headers.get('content-type') || '';
          if (!response.ok || !contentType.includes('application/json')) {
            throw new Error('Reponse bootstrap invalide');
          }

          return response.json();
        } catch (error) {
          lastError = error;
        }
      }

      throw lastError;
    };

    requestBootstrap()
      .then(data => {
        if (data?.notFound) {
          if (mounted) setStatus('not-found');
          return;
        }

        if (!data) return;

        console.info('Compte admin TrackFuel360 cree');
        console.info('Email:', data.credentials.email);
        console.info('Mot de passe:', data.credentials.password);

        if (mounted) setStatus('created');
      })
      .catch(error => {
        console.error('Erreur bootstrap TrackFuel360:', error);
        if (mounted) setStatus('error');
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (status === 'not-found') return <NotFound />;

  if (status === 'created') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold">Configuration terminee</h1>
          <p className="mt-3 text-muted-foreground">
            Le compte admin a ete cree. Ouvrez la console du navigateur pour recuperer l'email et le mot de passe.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold">Bootstrap indisponible</h1>
          <p className="mt-3 text-muted-foreground">Verifiez que l'API et la base de donnees sont accessibles.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-muted-foreground">Configuration initiale...</p>
    </div>
  );
};

export default Bootstrap;
