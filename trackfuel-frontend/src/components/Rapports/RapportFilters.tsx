import { useState } from 'react';
import { RapportFilters, RapportType, AlerteType, CorrectionStatus, SaisieType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useVehicules } from '@/hooks/useVehicules';
import { useSites } from '@/hooks/useSites';
import { X, Filter } from 'lucide-react';

interface RapportFiltersProps {
  filtres: RapportFilters;
  onFiltresChange: (filtres: RapportFilters) => void;
  onReset: () => void;
  selectedType?: RapportType;
}

export const RapportFiltersComponent = ({ filtres, onFiltresChange, onReset, selectedType }: RapportFiltersProps) => {
  const [localFiltres, setLocalFiltres] = useState<RapportFilters>(filtres);
  const { data: vehicules } = useVehicules();
  const { data: sites } = useSites();

  // Déterminer quels filtres afficher selon le type de rapport
  const shouldShowFilter = (filterName: string): boolean => {
    if (!selectedType) return true;
    
    const filterMap: Record<RapportType, string[]> = {
      'mensuel_site': ['date_debut', 'date_fin', 'site_id', 'vehicule_id'],
      'top_ecarts': ['date_debut', 'date_fin', 'site_id', 'type_anomalie', 'score_minimum'],
      'anomalies': ['date_debut', 'date_fin', 'site_id', 'vehicule_id', 'chauffeur_id', 'type_anomalie', 'score_minimum', 'type_saisie'],
      'corrections': ['date_debut', 'date_fin', 'site_id', 'vehicule_id', 'statut_correction'],
      'comparaison': ['date_debut', 'date_fin', 'site_id'],
      'kpi_global': ['date_debut', 'date_fin', 'site_id'],
    };
    
    return filterMap[selectedType]?.includes(filterName) ?? true;
  };

  const handleChange = (key: keyof RapportFilters, value: any) => {
    const newFiltres = { ...localFiltres, [key]: value || undefined };
    setLocalFiltres(newFiltres);
    onFiltresChange(newFiltres);
  };

  const handleReset = () => {
    setLocalFiltres({});
    onReset();
  };

  const nbFiltresActifs = Object.values(localFiltres).filter(v => v !== undefined && v !== '').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Filtres</CardTitle>
            {nbFiltresActifs > 0 && (
              <span className="text-sm text-muted-foreground">
                ({nbFiltresActifs} actif{nbFiltresActifs > 1 ? 's' : ''})
              </span>
            )}
          </div>
          {nbFiltresActifs > 0 && (
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <X className="h-4 w-4 mr-1" />
              Réinitialiser
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Période */}
          {shouldShowFilter('date_debut') && (
            <div className="space-y-2">
              <Label htmlFor="date_debut">Date début</Label>
              <Input
                id="date_debut"
                type="date"
                value={localFiltres.date_debut || ''}
                onChange={(e) => handleChange('date_debut', e.target.value)}
              />
            </div>
          )}

          {shouldShowFilter('date_fin') && (
            <div className="space-y-2">
              <Label htmlFor="date_fin">Date fin</Label>
              <Input
                id="date_fin"
                type="date"
                value={localFiltres.date_fin || ''}
                onChange={(e) => handleChange('date_fin', e.target.value)}
              />
            </div>
          )}

          {/* Site */}
          {shouldShowFilter('site_id') && (
            <div className="space-y-2">
              <Label htmlFor="site_id">Site</Label>
              <Select value={(localFiltres.site_id)?.toString() || ''} onValueChange={(v) => handleChange('site_id', v)}>
                <SelectTrigger id="site_id">
                  <SelectValue placeholder="Tous les sites" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aucun">Tous les sites</SelectItem>
                  {sites?.map(site => (
                    <SelectItem key={site.id} value={(site.id)?.toString()}>
                      {site.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Véhicule */}
          {shouldShowFilter('vehicule_id') && (
            <div className="space-y-2">
              <Label htmlFor="vehicule_id">Véhicule</Label>
              <Select value={localFiltres.vehicule_id?.toString() || ''} onValueChange={(v) => handleChange('vehicule_id', v)}>
                <SelectTrigger id="vehicule_id">
                  <SelectValue placeholder="Tous les véhicules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aucun">Tous les véhicules</SelectItem>
                  {vehicules?.map(vehicule => (
                    <SelectItem key={vehicule.id} value={vehicule.id?.toString()}>
                      {vehicule.immatriculation} - {vehicule.modele}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Chauffeur */}
          {shouldShowFilter('chauffeur_id') && (
            <div className="space-y-2">
              <Label htmlFor="chauffeur_id">Chauffeur</Label>
              <Select value={localFiltres.chauffeur_id?.toString() || ''} onValueChange={(v) => handleChange('chauffeur_id', v)}>
                <SelectTrigger id="chauffeur_id">
                  <SelectValue placeholder="Tous les chauffeurs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aucun">Tous les chauffeurs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Type d'anomalie */}
          {shouldShowFilter('type_anomalie') && (
            <div className="space-y-2">
              <Label htmlFor="type_anomalie">Type d'anomalie</Label>
              <Select value={localFiltres.type_anomalie || ''} onValueChange={(v) => handleChange('type_anomalie', v as AlerteType)}>
                <SelectTrigger id="type_anomalie">
                  <SelectValue placeholder="Tous les types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aucun">Tous les types</SelectItem>
                  <SelectItem value="consommation_elevee">Consommation élevée</SelectItem>
                  <SelectItem value="plein_hors_zone">Plein hors zone</SelectItem>
                  <SelectItem value="doublon_bon">Doublon bon</SelectItem>
                  <SelectItem value="distance_gps_ecart">Écart GPS</SelectItem>
                  <SelectItem value="immobilisation_anormale">Immobilisation anormale</SelectItem>
                  <SelectItem value="carburant_disparu">Carburant disparu</SelectItem>
                  <SelectItem value="plein_suspect">Plein suspect</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Score minimum */}
          {shouldShowFilter('score_minimum') && (
            <div className="space-y-2">
              <Label htmlFor="score_minimum">Score minimum</Label>
              <Input
                id="score_minimum"
                type="number"
                min="0"
                max="100"
                value={localFiltres.score_minimum || ''}
                onChange={(e) => handleChange('score_minimum', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="0-100"
              />
            </div>
          )}

          {/* Statut correction */}
          {shouldShowFilter('statut_correction') && (
            <div className="space-y-2">
              <Label htmlFor="statut_correction">Statut correction</Label>
              <Select value={localFiltres.statut_correction || ''} onValueChange={(v) => handleChange('statut_correction', v as CorrectionStatus)}>
                <SelectTrigger id="statut_correction">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aucun">Tous les statuts</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="validated">Validée</SelectItem>
                  <SelectItem value="rejected">Rejetée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Type de saisie */}
          {shouldShowFilter('type_saisie') && (
            <div className="space-y-2">
              <Label htmlFor="type_saisie">Type de saisie</Label>
              <Select value={localFiltres.type_saisie || ''} onValueChange={(v) => handleChange('type_saisie', v as SaisieType)}>
                <SelectTrigger id="type_saisie">
                  <SelectValue placeholder="Tous les types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aucun">Tous les types</SelectItem>
                  <SelectItem value="auto">Automatique</SelectItem>
                  <SelectItem value="manuelle">Manuelle</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
