import { useState } from 'react';
import { MainLayout } from '@/components/Layout/MainLayout';
import { MotionLayout } from '@/components/Layout/MotionLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, FileSpreadsheet, Copy, Clock } from 'lucide-react';
import { RapportType, RapportFilters, FormatExport, RapportData } from '@/types';
import { creerLienRapport, useGenererRapport, useHistoriqueRapports } from '@/hooks/useRapports';
import { useCurrentUser } from '@/hooks/useUsers';
import { exporterRapport, genererLienExportSecurise, copierDansPressePapier } from '@/lib/utils/exportUtils';
import { RapportFiltersComponent } from '@/components/Rapports/RapportFilters';
import { RapportPreview } from '@/components/Rapports/RapportPreview';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useAggregatedData } from '@/lib/mockData';

const Rapports = () => {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<RapportType>('mensuel_site');
  const [filtres, setFiltres] = useState<RapportFilters>({});
  const [rapportGenere, setRapportGenere] = useState<RapportData | null>(null);

  const { data: currentUser } = useCurrentUser();
  const isAuditor = currentUser?.role === 'auditor';
  const { data: historique } = useHistoriqueRapports();
  const { vehicules, trajets, pleins, sites, corrections, niveauxCarburant } = useAggregatedData();
  
  const genererMutation = useGenererRapport(vehicules, sites, trajets, pleins, corrections, niveauxCarburant);

  const rapportTypes: { value: RapportType; label: string }[] = [
    { value: 'mensuel_site', label: t('reports.types.mensuel_site') },
    { value: 'top_ecarts', label: t('reports.types.top_ecarts') },
    { value: 'anomalies', label: t('reports.types.anomalies') },
    { value: 'corrections', label: t('reports.types.corrections') },
    { value: 'comparaison', label: t('reports.types.comparaison') },
    { value: 'kpi_global', label: t('reports.types.kpi_global') },
  ];

  const handleGenerer = async () => {
    if (!currentUser) {
      toast.error(t('errors.notConnected'));
      return;
    }

    try {
      const rapport = await genererMutation.mutateAsync({
        type: selectedType,
        filtres,
        currentUser
      });
      setRapportGenere(rapport);
      toast.success(t('success.reportGenerated'));
    } catch (error) {
      toast.error(t('errors.reportGeneration'));
    }
  };

  const handleExport = (formatExport: FormatExport) => {
    if (!rapportGenere) return;
    try {
      exporterRapport(rapportGenere, formatExport);
      toast.success(`${t('success.reportExported')} ${formatExport.toUpperCase()}`);
    } catch (error) {
      toast.error(t('errors.reportExport'));
    }
  };

  const handleCopyLink = async () => {
    if (!rapportGenere) return;
    try {
      const lien = await creerLienRapport(rapportGenere.metadata.id, 'pdf', 24 * 60)
        || genererLienExportSecurise(rapportGenere.metadata.id, 'pdf', 24 * 60);
      const success = await copierDansPressePapier(lien);
      if (success) {
        toast.success(t('success.linkCopied'));
      } else {
        toast.error(t('errors.linkCopy'));
      }
    } catch (error) {
      toast.error(t('errors.linkCopy'));
    }
  };

  return (
    <MainLayout>
      <MotionLayout variant="slideUp">
        <div className="space-y-6">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-bold text-foreground">{t('reports.title')}</h1>
            <p className="text-muted-foreground mt-2">
              {t('reports.generateAndExport')}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Sélection du type */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('reports.reportType')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedType} onValueChange={(v) => setSelectedType(v as RapportType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {rapportTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Filtres */}
              <RapportFiltersComponent
                filtres={filtres}
                onFiltresChange={setFiltres}
                onReset={() => setFiltres({})}
                selectedType={selectedType}
              />

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={handleGenerer} 
                  disabled={genererMutation.isPending} 
                  className="w-full sm:flex-1"
                >
                  {genererMutation.isPending ? t('reports.generating') : t('reports.generateReport')}
                </Button>
              </div>

              {/* Aperçu */}
              <RapportPreview rapport={rapportGenere} isLoading={genererMutation.isPending} />
            </div>

            <div className="space-y-6">
              {/* Export */}
              {rapportGenere && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t('reports.export')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full justify-start" onClick={() => handleExport('pdf')}>
                      <FileText className="h-4 w-4 mr-2" />
                      {t('reports.formats.pdf')}
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={() => handleExport('excel')}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      {t('reports.formats.excel')}
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={() => handleExport('csv')}>
                      <Download className="h-4 w-4 mr-2" />
                      {t('reports.formats.csv')}
                    </Button>
                    {!isAuditor && (
                      <Button variant="outline" className="w-full justify-start" onClick={handleCopyLink}>
                        <Copy className="h-4 w-4 mr-2" />
                        {t('reports.copyLink')}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Historique */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t('reports.history')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {historique && historique.length > 0 ? (
                    <div className="space-y-2">
                      {historique.slice(0, 5).map(h => (
                        <div key={h.id} className="text-sm p-2 bg-muted/50 rounded">
                          <p className="font-medium">{h.titre}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(h.date_generation), 'dd/MM/yy HH:mm', { locale: fr })}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('reports.noRecentReports')}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </MotionLayout>
    </MainLayout>
  );
};

export default Rapports;
