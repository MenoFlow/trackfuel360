import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileSpreadsheet, Eye } from "lucide-react";
import { toast } from "sonner";
import { DATA_TYPES } from "@/types";
import { generateStyledExcelFile, downloadFile, ExportHistory as ExportHistoryType } from "@/lib/utils/excelUtils";
import { ExportProgress } from "./ExportProgress";
import { ExportHistory } from "./ExportHistory";
import { ExportPreview } from "./ExportPreview";
import { MotionLayout } from "../Layout/MotionLayout";
import { useAggregatedData } from "@/lib/mockData";
import { useTranslation } from "react-i18next";

export const ExportSection = () => {
    const {
      users,
      vehicules,
      sites,
      affectations,
      corrections,
      params,
      trajets,
      traceGPSPoints,
      pleins,
      niveauxCarburant,
      pleinExifMetadata,
      pleinOcrData,
      geofences,
    } = useAggregatedData();

    const parametreRows = Object.entries(params || {}).map(([id, valeur]) => ({
      id,
      label: id,
      description: id,
      valeur,
      unite: '',
      min: 0,
      max: 999999,
    }));
  
    const dataByType: Record<string, any[]> = {
      Client: [],
      Module: [],
      ClientModule: [],
      AppConfiguration: [],
      RoleModulePermission: [],
      Site: sites,
      Geofence: geofences,
      User: users,
      DriverProfile: [],
      Vehicule: vehicules,
      Affectation: affectations,
      Trip: trajets,
      TraceGps: traceGPSPoints,
      Plein: pleins,
      BonCarburantScanne: pleinOcrData,
      PleinExifMetadata: pleinExifMetadata,
      NiveauCarburant: niveauxCarburant,
      Parametre: parametreRows,
      Correction: corrections,
      OrdreMission: [],
      MaintenanceIntervention: [],
      DocumentAdministratif: [],
      VehicleReservation: [],
      BudgetCout: [],
      StockPiece: [],
      PieceSortie: [],
      RapportGenere: [],
      RapportShareToken: [],
    };
  const { t } = useTranslation();
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<string>("excel");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [exportHistory, setExportHistory] = useState<ExportHistoryType[]>([]);
  const [lastExportUrl, setLastExportUrl] = useState<string | null>(null);

  const handleTypeToggle = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    setLastExportUrl(null);
    
    try {
      setExportStatus(t('export.progress'));
      setExportProgress(20);
      await new Promise((resolve) => setTimeout(resolve, 500));

      setExportStatus(t('export.progressDescription'));
      setExportProgress(50);
      
      const blob = generateStyledExcelFile(selectedTypes, exportFormat, dataByType);
      await new Promise((resolve) => setTimeout(resolve, 500));

      setExportStatus(t('export.progress'));
      setExportProgress(80);

      const extension = exportFormat === 'excel' ? 'xlsx' : exportFormat === 'csv' ? 'csv' : 'json';
      const filename = `trackfuel_export_${Date.now()}.${extension}`;
      
      downloadFile(blob, filename);
      
      setExportProgress(100);
      setExportStatus(t('export.success'));

      const url = URL.createObjectURL(blob);
      setLastExportUrl(url);

      const totalRows = selectedTypes.reduce((acc, type) => {
        const data = dataByType[type as keyof typeof dataByType] || [];
        return acc + (Array.isArray(data) ? data.length : 1);
      }, 0);

      const historyItem: ExportHistoryType = {
        id: Date.now().toString(),
        types: selectedTypes,
        format: exportFormat,
        date: new Date().toISOString(),
        filename,
        rowCount: totalRows,
      };
      setExportHistory((prev) => [historyItem, ...prev]);

      toast.success(t('export.success'));
    } catch (error) {
      toast.error(t('export.errorDescription'));
      console.error(error);
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
        setExportStatus("");
      }, 1000);
    }
  };

  const handlePreviewExport = () => {
    if (selectedTypes.length === 0) {
      toast.error(t('import.noData'));
      return;
    }
    setShowPreview(true);
  };

  const handleConfirmExport = () => {
    setShowPreview(false);
    handleExport();
  };

  const handleDownloadFromHistory = (item: ExportHistoryType) => {
    const blob = generateStyledExcelFile(item.types, item.format, dataByType);
    downloadFile(blob, item.filename);
    toast.success(t('export.success'));
  };

  return (
    <Card className="p-4 sm:p-6">
      <MotionLayout variant="fade">
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">{t('export.title')}</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">{t('export.description')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-xs sm:text-sm font-medium mb-2 sm:mb-3 block">{t('export.selectTypes')}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                {DATA_TYPES.map((type) => (
                  <div
                    key={type.value}
                    className="flex items-center space-x-2 p-2 sm:p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={`export-${type.value}`}
                      checked={selectedTypes.includes(type.value)}
                      onCheckedChange={() => handleTypeToggle(type.value)}
                    />
                    <Label
                      htmlFor={`export-${type.value}`}
                      className="text-xs sm:text-sm cursor-pointer flex-1"
                    >
                      {t(`dataTypes.${type.value}`)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="export-format" className="text-xs sm:text-sm font-medium mb-2 block">
                {t('export.selectFormat')}
              </Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger id="export-format" className="w-full sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">{t('formats.excel')}</SelectItem>
                  <SelectItem value="csv">{t('formats.csv')}</SelectItem>
                  <SelectItem value="json">{t('formats.json')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isExporting && (
              <ExportProgress progress={exportProgress} status={exportStatus} />
            )}

            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 pt-2">
              <Button
                onClick={handlePreviewExport}
                disabled={isExporting || selectedTypes.length === 0}
                variant="outline"
                className="gap-2 w-full sm:w-auto"
                aria-label={t('export.preview')}
              >
                <Eye className="h-4 w-4" />
                <span className="text-sm sm:text-base">{t('export.preview')}</span>
              </Button>
              <Button
                onClick={handleExport}
                disabled={isExporting || selectedTypes.length === 0}
                className="gap-2 w-full sm:w-auto"
                aria-label={t('export.exportButton')}
              >
                <Download className="h-4 w-4" />
                <span className="text-sm sm:text-base">{isExporting ? t('export.progress') : t('export.exportButton')}</span>
              </Button>
              {selectedTypes.length > 0 && (
                <span className="text-xs sm:text-sm text-muted-foreground self-center" role="status">
                  {selectedTypes.length} {t('export.type')}(s)
                </span>
              )}
            </div>

            {lastExportUrl && !isExporting && (
              <MotionLayout variant="slideUp">
                <div className="p-3 sm:p-4 bg-success/10 border border-success/30 rounded-lg">
                  <p className="text-xs sm:text-sm font-medium text-success mb-2">✓ {t('export.success')}</p>
                  <Button
                    variant="link"
                    className="h-auto p-0 text-xs sm:text-sm text-success hover:text-success/80"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = lastExportUrl;
                      link.download = `trackfuel_export_${Date.now()}.${exportFormat === 'excel' ? 'xlsx' : exportFormat}`;
                      link.click();
                    }}
                    aria-label={t('export.download')}
                  >
                    {t('export.download')}
                  </Button>
                </div>
              </MotionLayout>
            )}
          </div>
        </div>
      </MotionLayout>

      <ExportHistory history={exportHistory} onDownload={handleDownloadFromHistory} />

      <ExportPreview
        open={showPreview}
        onClose={() => setShowPreview(false)}
        selectedTypes={selectedTypes}
        onConfirm={handleConfirmExport}
        dataByType={dataByType}
      />
    </Card>
  );
};
