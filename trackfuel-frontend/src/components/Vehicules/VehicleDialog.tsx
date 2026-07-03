import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Vehicule } from '@/types';
import { useSites } from '@/hooks/useSites';
import { useCreateVehicule, useUpdateVehicule } from '@/hooks/useVehicules';

interface VehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicule?: Vehicule;
}

export function VehicleDialog({ open, onOpenChange, vehicule }: VehicleDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: sites } = useSites();
  const createVehicule = useCreateVehicule();
  const updateVehicule = useUpdateVehicule();

  const [formData, setFormData] = useState({
    immatriculation: '',
    marque: '',
    modele: '',
    type: 'diesel' as 'diesel' | 'essence' | 'hybride' | 'gpl',
    capacite_reservoir: '',
    consommation_nominale: '',
    carburant_initial: '0',
    kilometrage_initial: '', // ← Nouveau champ
    actif: true,
    site_id: '' as string | null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset du formulaire à l'ouverture
  useEffect(() => {
    if (vehicule) {
      setFormData({
        immatriculation: vehicule.immatriculation,
        marque: vehicule.marque,
        modele: vehicule.modele,
        type: vehicule.type,
        capacite_reservoir: vehicule.capacite_reservoir.toString(),
        consommation_nominale: vehicule.consommation_nominale.toString(),
        carburant_initial: (vehicule.carburant_initial ?? 0).toString(),
        kilometrage_initial: (vehicule.kilometrage_initial ?? 0).toString(),
        actif: Boolean(vehicule.actif),
        site_id: vehicule.site_id?.toString() || '',
      });
    } else {
      setFormData({
        immatriculation: '',
        marque: '',
        modele: '',
        type: 'diesel',
        capacite_reservoir: '',
        consommation_nominale: '',
        carburant_initial: '0',
        kilometrage_initial: '0', // Par défaut à 0 pour un nouveau véhicule
        actif: true,
        site_id: '',
      });
    }
    setErrors({});
  }, [vehicule, open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.immatriculation.trim()) {
      newErrors.immatriculation = t('validation.required');
    }

    if (!formData.marque.trim()) newErrors.marque = t('validation.required');
    if (!formData.modele.trim()) newErrors.modele = t('validation.required');

    const capacite = parseFloat(formData.capacite_reservoir);
    if (isNaN(capacite) || capacite <= 0)
      newErrors.capacite_reservoir = 'Capacité invalide';

    const conso = parseFloat(formData.consommation_nominale);
    if (isNaN(conso) || conso <= 0)
      newErrors.consommation_nominale = 'Consommation invalide';

    const carburant = parseFloat(formData.carburant_initial);
    if (isNaN(carburant) || carburant < 0)
      newErrors.carburant_initial = 'Valeur négative interdite';

    // Kilométrage initial obligatoire à la création
    const km = parseFloat(formData.kilometrage_initial);
    if (!vehicule && (formData.kilometrage_initial === '' || isNaN(km) || km < 0)) {
      newErrors.kilometrage_initial = 'Kilométrage initial requis et ≥ 0';
    }
    if (vehicule && formData.kilometrage_initial !== '' && (isNaN(km) || km < 0)) {
      newErrors.kilometrage_initial = 'Kilométrage invalide';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {


      if (vehicule) {
        const payload = {
          // immatriculation: formData.immatriculation.trim().toUpperCase(),
          marque: formData.marque.trim(),
          modele: formData.modele.trim(),
          type: formData.type,
          capacite_reservoir: parseFloat(formData.capacite_reservoir),
          consommation_nominale: parseFloat(formData.consommation_nominale),
          carburant_initial: parseFloat(formData.carburant_initial || '0'),
          kilometrage_initial: parseFloat(formData.kilometrage_initial || '0'),
          actif: formData.actif,
          site_id: formData.site_id ? parseInt(formData.site_id) : null,
        };
        await updateVehicule.mutateAsync({
          id: vehicule.id!,
          data: payload,
        });
        toast({
          title: t('vehicles.updateSuccess'),
          description: `Véhicule ${formData.immatriculation} mis à jour`,
        });
      } else {
        const payload = {
          immatriculation: formData.immatriculation.trim().toUpperCase(),
          marque: formData.marque.trim(),
          modele: formData.modele.trim(),
          type: formData.type,
          capacite_reservoir: parseFloat(formData.capacite_reservoir),
          consommation_nominale: parseFloat(formData.consommation_nominale),
          carburant_initial: parseFloat(formData.carburant_initial || '0'),
          kilometrage_initial: parseFloat(formData.kilometrage_initial || '0'),
          actif: formData.actif,
          site_id: formData.site_id ? parseInt(formData.site_id) : null,
        };
        await createVehicule.mutateAsync(payload);
        toast({
          title: t('vehicles.createSuccess'),
          description: `Véhicule ${formData.immatriculation} ajouté à la flotte`,
        });
      }

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || t('common.unknownError'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {vehicule ? t('vehicles.editVehicle') : t('vehicles.addVehicle')}
          </DialogTitle>
          <DialogDescription>
            {vehicule
              ? 'Modifiez les caractéristiques du véhicule'
              : 'Enregistrez un nouveau véhicule dans la flotte'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Immatriculation */}
            <div className="space-y-2">
              <Label htmlFor="immatriculation">
                {t('vehicles.registration')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="immatriculation"
                value={formData.immatriculation}
                onChange={(e) =>
                  setFormData({ ...formData, immatriculation: e.target.value.toUpperCase() })
                }
                placeholder="Ex: 1234 TAD"
                disabled={!!vehicule}
                className={errors.immatriculation ? 'border-destructive' : ''}
              />
              {errors.immatriculation && (
                <p className="text-sm text-destructive">{errors.immatriculation}</p>
              )}
            </div>

            {/* Marque */}
            <div className="space-y-2">
              <Label htmlFor="marque">
                {t('vehicles.brand')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="marque"
                value={formData.marque}
                onChange={(e) => setFormData({ ...formData, marque: e.target.value })}
                placeholder="Toyota"
                className={errors.marque ? 'border-destructive' : ''}
              />
              {errors.marque && <p className="text-sm text-destructive">{errors.marque}</p>}
            </div>

            {/* Modèle */}
            <div className="space-y-2">
              <Label htmlFor="modele">
                {t('vehicles.model')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="modele"
                value={formData.modele}
                onChange={(e) => setFormData({ ...formData, modele: e.target.value })}
                placeholder="Hilux"
                className={errors.modele ? 'border-destructive' : ''}
              />
              {errors.modele && <p className="text-sm text-destructive">{errors.modele}</p>}
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">
                {t('vehicles.type')} <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v as any })}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="essence">Essence</SelectItem>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="hybride">Hybride</SelectItem>
                  <SelectItem value="gpl">GPL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Capacité réservoir */}
            <div className="space-y-2">
              <Label htmlFor="capacite_reservoir">
                {t('vehicles.tankCapacity')} (L) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="capacite_reservoir"
                type="number"
                step="0.1"
                value={formData.capacite_reservoir}
                onChange={(e) => setFormData({ ...formData, capacite_reservoir: e.target.value })}
                placeholder="80"
              />
              {errors.capacite_reservoir && (
                <p className="text-sm text-destructive">{errors.capacite_reservoir}</p>
              )}
            </div>

            {/* Consommation nominale */}
            <div className="space-y-2">
              <Label htmlFor="consommation_nominale">
                {t('vehicles.nominalConsumption')} (L/100km) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="consommation_nominale"
                type="number"
                step="0.01"
                value={formData.consommation_nominale}
                onChange={(e) => setFormData({ ...formData, consommation_nominale: e.target.value })}
                placeholder="10.5"
              />
              {errors.consommation_nominale && (
                <p className="text-sm text-destructive">{errors.consommation_nominale}</p>
              )}
            </div>

            {/* Carburant initial */}
            <div className="space-y-2">
              <Label htmlFor="carburant_initial">Carburant initial (L)</Label>
              <Input
                id="carburant_initial"
                type="number"
                step="0.1"
                value={formData.carburant_initial}
                onChange={(e) => setFormData({ ...formData, carburant_initial: e.target.value })}
                placeholder="0"
              />
            </div>

            {/* Kilométrage initial → NOUVEAU CHAMP */}
            <div className="space-y-2">
              <Label htmlFor="kilometrage_initial">
                Kilométrage initial (km){' '}
                <span className="text-destructive">{!vehicule && '*'}</span>
              </Label>
              <Input
                id="kilometrage_initial"
                type="number"
                step="0.1"
                value={formData.kilometrage_initial}
                onChange={(e) => setFormData({ ...formData, kilometrage_initial: e.target.value })}
                placeholder="125000"
                className={errors.kilometrage_initial ? 'border-destructive' : ''}
              />
              {errors.kilometrage_initial && (
                <p className="text-sm text-destructive">{errors.kilometrage_initial}</p>
              )}
            </div>

            {/* Site */}
            <div className="space-y-2">
            <Label htmlFor="site_id">Site</Label>
            <Select
              value={formData.site_id || undefined}
              onValueChange={(v) =>
                setFormData({ ...formData, site_id: v === "null" ? null : v })
              }
            >
              <SelectTrigger id="site_id">
                <SelectValue placeholder="Aucun site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="null">Aucun site</SelectItem>
                {sites?.map((site) => (
                  <SelectItem key={site.id} value={site.id.toString()}>
                    {site.nom} ({site.ville})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            </div>

            {/* Actif */}
            <div className="flex items-center space-x-3">
              <Switch
                id="actif"
                checked={formData.actif} // ← ici c'est un vrai boolean
                onCheckedChange={(checked) => setFormData({ ...formData, actif: checked })}
              />
              <Label htmlFor="actif" className="cursor-pointer font-medium">
                Véhicule actif
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('common.saving') : vehicule ? t('common.update') : t('common.add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}