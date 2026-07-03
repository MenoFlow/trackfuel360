import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRapport, useRapportShare } from '@/hooks/useRapports';
import { exporterRapport } from '@/lib/utils/exportUtils';
import { FormatExport } from '@/types';
import { FileDown, AlertTriangle, Clock, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function RapportExport() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [isValid, setIsValid] = useState(true);
  const [rapportId, setRapportId] = useState<string>('');
  const [format, setFormat] = useState<FormatExport>('pdf');
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const shareQuery = useRapportShare(token);

  useEffect(() => {
    console.log('[RapportExport] Initialisation avec token:', token);
    
    if (shareQuery.isLoading) return;

    if (!token || shareQuery.data) {
      if (shareQuery.data) {
        setFormat(shareQuery.data.format as FormatExport);
        setExpiresAt(new Date(shareQuery.data.expires_at).getTime());
      }
      if (shareQuery.data) return;
    }

    if (!token) {
      console.error('[RapportExport] Token manquant');
      setIsValid(false);
      return;
    }

    try {
      // Décoder le token
      const decoded = atob(token);
      const [id, fmt, expiration] = decoded.split(':');
      
      console.log('[RapportExport] Token décodé:', { id, format: fmt, expiration });
      
      // Vérifier l'expiration
      const expirationTime = parseInt(expiration, 10);
      const now = Date.now();
      
      if (now > expirationTime) {
        const expired = new Date(expirationTime).toISOString();
        console.error('[RapportExport] Token expiré:', { expiresAt: expired, now: new Date(now).toISOString() });
        setIsValid(false);
        return;
      }

      console.log('[RapportExport] Token valide, temps restant:', Math.floor((expirationTime - now) / 1000 / 60), 'minutes');
      
      setRapportId(id);
      setFormat(fmt as FormatExport);
      setExpiresAt(expirationTime);
    } catch (error) {
      console.error('[RapportExport] Erreur de décodage du token:', error);
      setIsValid(false);
    }
  }, [token, shareQuery.data, shareQuery.isLoading]);

  const legacyRapportQuery = useRapport(rapportId);
  const rapport = shareQuery.data?.rapport || legacyRapportQuery.data;
  const isLoading = shareQuery.isLoading || (!shareQuery.data && legacyRapportQuery.isLoading);
  const [pdfUrl, setPdfUrl] = useState<string>('');

  // Générer le PDF et l'afficher
  useEffect(() => {
    if (rapport) {
      console.log('[RapportExport] Génération du fichier:', { 
        rapportId: rapport.metadata.id, 
        format,
        titre: rapport.metadata.titre 
      });
      
      try {
        // Générer le blob PDF directement
        const blob = exporterRapport(rapport, format, true);
        if (blob) {
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
          console.log('[RapportExport] Fichier généré avec succès, taille:', blob.size, 'bytes');
          
          // Nettoyer l'URL quand le composant est démonté
          return () => {
            console.log('[RapportExport] Nettoyage URL blob');
            URL.revokeObjectURL(url);
          };
        } else {
          console.error('[RapportExport] Échec génération blob');
        }
      } catch (error) {
        console.error('[RapportExport] Erreur génération fichier:', error);
      }
    }
  }, [rapport, format]);

  const handleDownload = () => {
    if (rapport) {
      console.log('[RapportExport] Déclenchement téléchargement:', {
        rapportId: rapport.metadata.id,
        format,
        titre: rapport.metadata.titre
      });
      exporterRapport(rapport, format);
    }
  };

  if (!isValid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-center">Lien invalide ou expiré</CardTitle>
            <CardDescription className="text-center">
              Ce lien de téléchargement n'est plus valide ou a expiré.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/rapports')} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux rapports
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <Skeleton className="h-12 w-12 mx-auto rounded-full mb-4" />
            <Skeleton className="h-6 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!rapport) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-center">Rapport introuvable</CardTitle>
            <CardDescription className="text-center">
              Le rapport demandé n'existe pas ou a été supprimé.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/rapports')} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux rapports
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const timeLeft = Math.max(0, expiresAt - Date.now());
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md">
        <CardHeader>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <FileDown className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-center">Téléchargement de rapport</CardTitle>
          <CardDescription className="text-center">
            {rapport.metadata.titre}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>Type:</strong> {rapport.metadata.type}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Format:</strong> {format.toUpperCase()}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Généré le:</strong>{' '}
              {new Date(rapport.metadata.date_generation).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Par:</strong> {rapport.metadata.utilisateur_nom}
            </p>
          </div>

          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Lien expire dans {hoursLeft}h {minutesLeft}min
            </p>
          </div>

          {/* Afficher le PDF si disponible */}
          {format === 'pdf' && pdfUrl && (
            <div className="border rounded-lg overflow-hidden" style={{ height: '600px' }}>
              <iframe
                src={pdfUrl}
                className="w-full h-full"
                title="Aperçu du rapport PDF"
              />
            </div>
          )}

          <Button onClick={handleDownload} className="w-full">
            <FileDown className="h-4 w-4 mr-2" />
            Télécharger le rapport
          </Button>

          <Button onClick={() => navigate('/rapports')} variant="outline" className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux rapports
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
