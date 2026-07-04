import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, TrendingUp, TrendingDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { useAggregatedData } from '@/lib/mockData';
import { calculerComparaisonFlotte, calculerMoyenneFlotte } from '@/lib/services/comparaisonService';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';
import { staggerContainer } from '@/lib/utils/motionVariants';
import { MotionWrapper } from '@/components/Layout/MotionWrapper';

type TriType = 'ecart_desc' | 'ecart_asc' | 'consommation_desc' | 'consommation_asc' | 'cout_desc' | 'cout_asc';

const ComparaisonFlotte = () => {
  const { vehicules, trajets, pleins, niveauxCarburant, users, sites } = useAggregatedData()
  const { t } = useTranslation();
  const [periode, setPeriode] = useState<number>(30);
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [chauffeurFilter, setChauffeurFilter] = useState<string>('all');
  const [tri, setTri] = useState<TriType>('ecart_desc');
  // Calcul des données de comparaison
  const comparaisons = useMemo(() => {
    return calculerComparaisonFlotte(
      vehicules,
      trajets,
      niveauxCarburant,
      pleins,
      users,
      sites,
      periode
    );
  }, [periode]);

  // Filtres
  const comparaisonsFiltrees = useMemo(() => {
    let filtered = [...comparaisons];

    if (siteFilter !== 'all') {
      filtered = filtered.filter(c => c.site_nom === siteFilter);
    }

    if (chauffeurFilter !== 'all') {
      const [nom, prenom] = chauffeurFilter.split('|');
      filtered = filtered.filter(c => 
        c.chauffeur_nom === nom && c.chauffeur_prenom === prenom
      );
    }

    // Tri
    switch (tri) {
      case 'ecart_desc':
        filtered.sort((a, b) => b.ecart_pct - a.ecart_pct);
        break;
      case 'ecart_asc':
        filtered.sort((a, b) => a.ecart_pct - b.ecart_pct);
        break;
      case 'consommation_desc':
        filtered.sort((a, b) => b.consommation_l_100km - a.consommation_l_100km);
        break;
      case 'consommation_asc':
        filtered.sort((a, b) => a.consommation_l_100km - b.consommation_l_100km);
        break;
      case 'cout_desc':
        filtered.sort((a, b) => b.cout_par_km - a.cout_par_km);
        break;
      case 'cout_asc':
        filtered.sort((a, b) => a.cout_par_km - b.cout_par_km);
        break;
    }

    return filtered;
  }, [comparaisons, siteFilter, chauffeurFilter, tri]);

  // Moyennes de flotte
  const moyenneConsommation = calculerMoyenneFlotte(comparaisonsFiltrees, 'consommation_l_100km');
  const moyenneCout = calculerMoyenneFlotte(comparaisonsFiltrees, 'cout_par_km');

  // Listes pour filtres
  const sitesMemo = useMemo(() => {
    const sitesUniques = new Set(comparaisons.map(c => c.site_nom).filter(Boolean));
    return Array.from(sitesUniques);
  }, [comparaisons]);

  const chauffeurs = useMemo(() => {
    const chauffeursUniques = new Set(
      comparaisons
        .filter(c => c.chauffeur_nom && c.chauffeur_prenom)
        .map(c => `${c.chauffeur_nom}|${c.chauffeur_prenom}`)
    );
    return Array.from(chauffeursUniques).map(ch => {
      const [nom, prenom] = ch.split('|');
      return { nom, prenom };
    });
  }, [comparaisons]);

  // Export Excel
  const handleExport = () => {
    const dataToExport = comparaisonsFiltrees.map(c => ({
      'Véhicule': c.immatriculation,
      'Marque': c.marque,
      'Modèle': c.modele,
      'Consommation (L/100km)': c.consommation_l_100km,
      'Coût/km': c.cout_par_km,
      'Écart (%)': c.ecart_pct,
      'Conducteur': c.chauffeur_nom && c.chauffeur_prenom 
        ? `${c.chauffeur_prenom} ${c.chauffeur_nom}` 
        : 'N/A',
      'Site': c.site_nom || 'N/A',
      'Distance totale (km)': c.total_distance_km,
      'Litres totaux': c.total_litres,
      'Coût total': c.total_cout,
      'Nb pleins': c.nb_pleins,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comparaison Flotte');
    XLSX.writeFile(wb, `comparaison_flotte_${periode}j_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Fonction pour obtenir la couleur de l'écart
  const getEcartColor = (ecart: number) => {
    if (ecart > 20) return 'text-red-600 dark:text-red-400';
    if (ecart > 0) return 'text-orange-600 dark:text-orange-400';
    if (ecart < 0) return 'text-green-600 dark:text-green-400';
    return 'text-muted-foreground';
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* En-tête */}
        <MotionWrapper variant="slideUp">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-bold tracking-tight">{t('comparison.title')}</h1>
            <p className="text-muted-foreground mt-2">
              {t('comparison.description')}
            </p>
          </div>
        </MotionWrapper>

        {/* Filtres et actions */}
        <MotionWrapper variant="slideUp" delay={0.1}>
          <Card>
          <CardHeader>
            <CardTitle>{t('comparison.filtersAndOptions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {/* Période */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('comparison.period')}</label>
                <Select value={periode.toString()} onValueChange={(v) => setPeriode(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">{t('comparison.last7days')}</SelectItem>
                    <SelectItem value="30">{t('comparison.last30days')}</SelectItem>
                    <SelectItem value="90">{t('comparison.last90days')}</SelectItem>
                    <SelectItem value="180">{t('comparison.last6months')}</SelectItem>
                    <SelectItem value="365">{t('comparison.last12months')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Site */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('vehicles.site')}</label>
                <Select value={siteFilter} onValueChange={setSiteFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('comparison.allSites')}</SelectItem>
                    {sitesMemo.map(site => (
                      <SelectItem key={site} value={site!}>{site}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Conducteur */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('alerts.driver')}</label>
                <Select value={chauffeurFilter} onValueChange={setChauffeurFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('comparison.allDrivers')}</SelectItem>
                    {chauffeurs.map(ch => (
                      <SelectItem key={`${ch.nom}|${ch.prenom}`} value={`${ch.nom}|${ch.prenom}`}>
                        {ch.prenom} {ch.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tri */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('comparison.sortBy')}</label>
                <Select value={tri} onValueChange={(v) => setTri(v as TriType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ecart_desc">{t('comparison.deviationDesc')}</SelectItem>
                    <SelectItem value="ecart_asc">{t('comparison.deviationAsc')}</SelectItem>
                    <SelectItem value="consommation_desc">{t('comparison.consumptionDesc')}</SelectItem>
                    <SelectItem value="consommation_asc">{t('comparison.consumptionAsc')}</SelectItem>
                    <SelectItem value="cout_desc">{t('comparison.costDesc')}</SelectItem>
                    <SelectItem value="cout_asc">{t('comparison.costAsc')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Export */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('common.export')}</label>
                <Button onClick={handleExport} variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Excel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        </MotionWrapper>

        {/* Moyennes globales */}
        <motion.div 
          className="grid gap-4 md:grid-cols-3"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <MotionWrapper variant="stagger" delay={0}>
            <Card>
            <CardHeader className="pb-3">
              <CardDescription>{t('comparison.vehiclesAnalyzed')}</CardDescription>
              <CardTitle className="text-3xl">{comparaisonsFiltrees.length}</CardTitle>
            </CardHeader>
          </Card>
          </MotionWrapper>

          <MotionWrapper variant="stagger" delay={0.1}>
            <Card>
            <CardHeader className="pb-3">
              <CardDescription>{t('comparison.fleetAvgConsumption')}</CardDescription>
              <CardTitle className="text-3xl">{moyenneConsommation} <span className="text-lg text-muted-foreground">L/100km</span></CardTitle>
            </CardHeader>
          </Card>
          </MotionWrapper>

          <MotionWrapper variant="stagger" delay={0.2}>
            <Card>
            <CardHeader className="pb-3">
              <CardDescription>{t('comparison.avgCostPerKm')}</CardDescription>
              <CardTitle className="text-3xl">{((moyenneCout)).toFixed(2)} <span className="text-lg text-muted-foreground">Ariary</span></CardTitle>
            </CardHeader>
          </Card>
          </MotionWrapper>
        </motion.div>

        {/* Tableau comparatif */}
        <MotionWrapper variant="slideUp" delay={0.3}>
          <Card>
          <CardHeader>
            <CardTitle>{t('comparison.comparativeTable')}</CardTitle>
            <CardDescription>
              {comparaisonsFiltrees.length} {comparaisonsFiltrees.length > 1 ? t('comparison.vehiclesCountPlural') : t('comparison.vehiclesCount')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('comparison.vehicle')}</TableHead>
                    <TableHead>{t('comparison.consumption')}</TableHead>
                    <TableHead>{t('comparison.costPerKm')}</TableHead>
                    <TableHead>{t('comparison.deviation')}</TableHead>
                    <TableHead>{t('alerts.driver')}</TableHead>
                    <TableHead>{t('vehicles.site')}</TableHead>
                    <TableHead className="text-right">{t('comparison.distance')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparaisonsFiltrees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        {t('comparison.noDataAvailable')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    comparaisonsFiltrees.map((comp) => (
                      <TableRow key={comp.vehicule_id}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-semibold">{comp.immatriculation}</div>
                            <div className="text-xs text-muted-foreground">
                              {comp.marque} {comp.modele}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {comp.consommation_l_100km}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {((comp.cout_par_km)).toFixed(2)} Ariary
                        </TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1 font-semibold ${getEcartColor(comp.ecart_pct)}`}>
                            {comp.ecart_pct > 0 ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : comp.ecart_pct < 0 ? (
                              <TrendingDown className="h-4 w-4" />
                            ) : null}
                            {comp.ecart_pct > 0 ? '+' : ''}{comp.ecart_pct}%
                          </div>
                        </TableCell>
                        <TableCell>
                          {comp.chauffeur_nom && comp.chauffeur_prenom
                            ? `${comp.chauffeur_prenom} ${comp.chauffeur_nom}`
                            : <span className="text-muted-foreground">N/A</span>
                          }
                        </TableCell>
                        <TableCell>
                          {comp.site_nom || <span className="text-muted-foreground">N/A</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          {comp.total_distance_km.toFixed(0)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        </MotionWrapper>
      </div>
    </MainLayout>
  );
};

export default ComparaisonFlotte;
