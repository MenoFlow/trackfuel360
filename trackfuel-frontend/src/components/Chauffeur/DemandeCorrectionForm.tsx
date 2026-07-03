import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useChauffeurAccess } from '@/hooks/useChauffeurAccess';
import { usePleins } from '@/hooks/usePleins';
import { useTrajets } from '@/hooks/useTrajets';
import { useCreateCorrection } from '@/hooks/useCorrections';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import Header from './Header';
import { useAffectations } from '@/hooks/useAffectations';
import { useVehicules } from '@/hooks/useVehicules';

// Types (doivent être définis quelque part ou importés)
type Plein = {
  id: number;
  date: string;
  litres: number;
  odometre: number;
  station?: string;
  chauffeur_id: number;
};

type Trajet = {
  id: number;
  date_debut: string;
  distance_km: number;
  chauffeur_id: number;
};

export default function DemandeCorrectionForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser, logout, filterDataForDriver, filterVehiculesForDriver } = useChauffeurAccess();
  const { data: allPleins } = usePleins();
  const { data: allTrajets } = useTrajets();
  const createCorrection = useCreateCorrection();
  const isOnline = useOnlineStatus();
  const { data: allVehicules, isLoading: vehiculesLoading } = useVehicules();
  const { data: affectations } = useAffectations();

  const location = useLocation();
  const { pleinId, isNotEditable, oldVal, newVal } = (location.state as { pleinId?: number, isNotEditable?: boolean, oldVal?: string, newVal?: string }) || {};

  const [type, setType] = useState<'plein' | 'trajet'>('plein');
  const [itemId, setItemId] = useState<number | null>(null);
  const [champ, setChamp] = useState<'litres' | 'odometre' | 'distance_km'>('litres');
  const [justification, setJustification] = useState('');
  const [newValue, setNewValue] = useState("");


  // Filtrer les données pour le chauffeur
  const mesVehicules = allVehicules && affectations 
  ? filterVehiculesForDriver(allVehicules, affectations) 
  : [];

  // Filtrer les données
  const mesPleins = allPleins ? filterDataForDriver(allPleins, mesVehicules) : [];
  const mesTrajets = allTrajets ? filterDataForDriver(allTrajets, mesVehicules) : [];


  // Ajoute cet effet juste après les déclarations de state
  useEffect(() => {
    if (pleinId && mesPleins.length > 0) {
      // Vérifie que le pleinId appartient bien au chauffeur (sécurité + évite bug si données pas encore chargées)
      const pleinExiste = mesPleins.some(p => p.id === pleinId);
      if (pleinExiste) {
        setType('plein');
        setItemId(pleinId);
        // Optionnel : pré-sélectionner le champ le plus courant (litres)
        setChamp('litres');
      }
    }
  }, [pleinId, mesPleins]); // Se déclenche quand pleinId ou mesPleins changent

  // Sélectionner l'élément (type-safe)
  const selectedPlein = type === 'plein' ? mesPleins.find(p => p.id === Number(itemId)) : null;
  const selectedTrajet = type === 'trajet' ? mesTrajets.find(t => t.id === Number(itemId)) : null;

  // Récupérer oldValue en fonction du type
  const oldValue = (() => {
    if (type === 'plein' && selectedPlein) {
      return champ === 'litres' ? selectedPlein.litres : selectedPlein.odometre;
    }
    if (type === 'trajet' && selectedTrajet) {
      return champ === 'distance_km' ? selectedTrajet.distance_km : null;
    }
    return null;
  })();

  // Réinitialiser les champs
  const handleTypeChange = (value: 'plein' | 'trajet') => {
    setType(value);
    setItemId(null);
    setChamp(value === 'trajet' ? 'distance_km' : 'litres');
    setNewValue('');
  };

  const handleChampChange = (value: 'litres' | 'odometre' | 'distance_km') => {
    setChamp(value);
    setNewValue('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numValue = Number(newValue);
    if (!itemId || isNaN(numValue) || numValue < 0) {
      toast({
        title: t('errors.invalidInput'),
        description: t('driver.validNumberRequired'),
        variant: 'destructive',
      });
      return;
    }

    try {
      await createCorrection.mutateAsync({
        table: type === 'plein' ? 'pleins' : 'trips',
        record_id: Number(itemId),
        champ,
        old_value: oldValue?.toString() ?? '',
        new_value: newValue,
        comment: justification,
        requested_by: currentUser.id,
      });

      toast({
        title: isOnline ? t('driver.requestSent') : t('offline.status.savedLocally'),
        description: isOnline ? t('driver.requestSentDesc') : t('offline.willSyncLater'),
      });
      navigate('/chauffeur');
    } catch (error: any) {
      toast({
        title: t('errors.generic'),
        description: error?.message || String(error),
        variant: 'destructive',
      });
    }
  };
  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header currentUser={currentUser} logout={logout} isDashboard={false} />
      <div className="md:mx-12 px-6 py-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('driver.correctionRequestTitle')}</CardTitle>
            <CardDescription>{t('driver.correctionRequestDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {!isOnline && (
              <Alert className="mb-4">
                <AlertDescription>{t('offline.workingOffline')}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Type */}
              <div className="space-y-2">
                <Label>{t('driver.correctionType')}</Label>
                <Select value={type} onValueChange={handleTypeChange} disabled={isNotEditable}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plein">{t('driver.fuelCorrection')}</SelectItem>
                    <SelectItem value="trajet">{t('driver.tripCorrection')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Élément */}
              <div className="space-y-2">
                <Label>
                  {type === 'plein' ? t('driver.selectFuel') : t('driver.selectTrip')}
                </Label>
                <Select value={String(itemId) || ''} onValueChange={(value) => setItemId(Number(value) || null)} disabled={isNotEditable} required>
                  <SelectTrigger>
                    <SelectValue placeholder={t('driver.choose')} />
                  </SelectTrigger>
                  <SelectContent>
                    {type === 'plein'
                      ? mesPleins.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            {new Date(p.date).toLocaleDateString('fr-FR')} - {p.litres}L - {p.odometre}km
                          </SelectItem>
                        ))
                      : mesTrajets.map((t) => (
                          <SelectItem key={t.id} value={t.id.toString()}>
                            {new Date(t.date_debut).toLocaleDateString('fr-FR')} - {t.distance_km}km
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Champ à corriger */}
              {itemId && (
                <div className="space-y-2">
                  <Label>{t('driver.fieldToCorrect')}</Label>
                  <Select value={champ} onValueChange={handleChampChange} disabled={isNotEditable}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {type === 'trajet' ? (
                        <SelectItem value="distance_km">{t('driver.distanceKm')}</SelectItem>
                      ) : (
                        <>
                          <SelectItem value="litres">{t('driver.liters')}</SelectItem>
                          <SelectItem value="odometre">{t('driver.odometer')}</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Valeur actuelle */}
              {itemId && oldValue !== null && (
                <div className="space-y-2">
                  <Label>{t('driver.currentValue')}</Label>
                  <div className="flex items-center gap-3">
                    <Input value={(oldVal === null) ? oldValue : oldVal} disabled className="bg-muted" />
                  </div>
                </div>
              )}

              {/* Nouvelle valeur */}
              {itemId && (
                <div className="space-y-2">
                  <Label>{t('driver.newValue')}</Label>
                  <Input
                    type="number"
                    placeholder={t('driver.enterNewValue')}
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
              )}

              {/* Justification */}
              <div className="space-y-2">
                <Label>{t('driver.correctionJustification')}</Label>
                <Textarea
                  placeholder={t('driver.correctionJustificationPlaceholder')}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              {/* Boutons */}
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => navigate('/chauffeur')} className="flex-1">
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={createCorrection.isPending || !itemId || !newValue || oldValue === null}
                  className="flex-1"
                >
                  {createCorrection.isPending ? t('driver.sending') : t('driver.sendRequest')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}