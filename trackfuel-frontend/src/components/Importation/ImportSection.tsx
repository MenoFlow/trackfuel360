import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Upload, FileUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { DATA_TYPES } from "@/types";
import { parseExcelFile, validateDependencies, validateRequiredFields, validateFieldFormats } from "@/lib/utils/excelUtils";
import { ImportGuide } from "./ImportGuide";
import { MotionLayout } from "../Layout/MotionLayout";
import { useAggregatedData } from "@/lib/mockData";
import { useTranslation } from "react-i18next";

interface PreviewRow {
  id: string;
  type: string;
  data: Record<string, any>;
  selected: boolean;
  hasError: boolean;
  errorMessage?: string;
}

export const ImportSection = () => {
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
        geofences,
      } = useAggregatedData();
    
      const dataByType: Record<string, any[]> = {
        Site: sites,
        Geofence: geofences,
        User: users,
        Vehicule: vehicules,
        Affectation: affectations,
        Trip: trajets,
        TraceGps: traceGPSPoints,
        Plein: pleins,
        PleinExifMetadata: pleinExifMetadata,
        NiveauCarburant: niveauxCarburant,
        Parametre: [params],
        Correction: corrections,
      };
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".xlsx") && !selectedFile.name.endsWith(".xls")) {
      toast.error(t('import.error'));
      return;
    }

    setFile(selectedFile);

    try {
      const parsedData = await parseExcelFile(selectedFile);
      const previewRows: PreviewRow[] = [];
      let rowId = 1;

      const existingData = { ...dataByType };

      const insertionOrder = DATA_TYPES.map((type) => type.value);

      for (const sheetName of insertionOrder) {
        const rows = parsedData[sheetName];
        if (!rows) continue;

        const typeConfig = DATA_TYPES.find((t) => t.value === sheetName);
        if (!typeConfig) {
          toast.warning(`Type "${sheetName}" inconnu, ignoré`);
          continue;
        }

        // Initialiser le tableau pour ce type si nécessaire
        if (!existingData[sheetName]) {
          existingData[sheetName] = [];
        }

        for (const row of rows as Record<string, any>[]) {
          const requiredValidation = validateRequiredFields(sheetName, row);
          const formatValidation = validateFieldFormats(sheetName, row);
          const depValidation = validateDependencies(sheetName, row, existingData);

          const hasError = !requiredValidation.valid || !formatValidation.valid || !depValidation.valid;
          const errorMessage = !requiredValidation.valid 
            ? requiredValidation.message 
            : !formatValidation.valid 
            ? formatValidation.message
            : depValidation.message;

          previewRows.push({
            id: `${rowId++}`,
            type: sheetName,
            data: row,
            selected: !hasError,
            hasError,
            errorMessage,
          });

          // Ajouter la ligne à existingData si elle est valide, pour les prochaines validations
          if (!hasError) {
            existingData[sheetName].push(row);
          }
        }
      }

      setPreviewData(previewRows);
      
      const errorCount = previewRows.filter((r) => r.hasError).length;
      if (errorCount > 0) {
        toast.warning(t('import.errorDescription'));
      } else {
        toast.success(t('import.successDescription', { count: previewRows.length }));
      }
    } catch (error) {
      toast.error(t('import.error'));
      console.error(error);
    }
  };

  const handleRowToggle = (id: string) => {
    setPreviewData((prev) =>
      prev.map((row) => (row.id === id ? { ...row, selected: !row.selected } : row))
    );
  };

  const handleImport = async () => {
    const selectedRows = previewData.filter((row) => row.selected);
    const rowsWithErrors = selectedRows.filter((row) => row.hasError);

    if (selectedRows.length === 0) {
      toast.error(t('import.noData'));
      return;
    }

    if (rowsWithErrors.length > 0) {
      toast.error(t('import.errorDescription'));
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    try {
      // TODO: Décommenter pour appeler l'API backend MySQL
      
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      }
      const API_BASE = import.meta.env.VITE_API_BASE_URL as string;
      
      const response = await fetch(API_BASE+'/api/import', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.success) {
        // toast.success(t('import.successDescription', { count: result.inserted }));
        setPreviewData([]);
        setFile(null);
        setImportProgress(100);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        toast.error(`${t('import.error')}: ${result.message}`);
        if (result.errors && result.errors.length > 0) {
          console.error('Erreurs d\'import:', result.errors);
        }
      }
      

      // Simulation d'import (à supprimer quand l'API backend est prête)
      // for (let i = 0; i <= selectedRows.length; i++) {
      //   setImportProgress((i / selectedRows.length) * 100);
      //   await new Promise((resolve) => setTimeout(resolve, 100));
      // }

      toast.success(t('import.successDescription', { count: selectedRows.length }));
      setPreviewData([]);
      setFile(null);
      setImportProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      toast.error(t('import.error'));
      console.error(error);
    } finally {
      setIsImporting(false);
    }
  };
  
  return (
    <div className="space-y-4 sm:space-y-6">
      <ImportGuide />
      
      <Card className="p-4 sm:p-6">
        <MotionLayout variant="fade">
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground">{t('import.title')}</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {t('import.description')}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {isImporting && (
                <MotionLayout variant="slideUp">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t('import.progress')}</span>
                      <span className="font-medium">{Math.round(importProgress)}%</span>
                    </div>
                    <Progress value={importProgress} className="h-2" />
                  </div>
                </MotionLayout>
              )}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  aria-label={t('import.selectFile')}
                />
                <label htmlFor="file-upload">
                  <Button asChild variant="outline" className="gap-2 cursor-pointer w-full sm:w-auto">
                    <span>
                      <Upload className="h-4 w-4" />
                      <span className="text-sm sm:text-base">{t('import.selectFile')}</span>
                    </span>
                  </Button>
                </label>
                {file && (
                  <p className="text-sm text-muted-foreground mt-2">{file.name}</p>
                )}
              </div>

              {previewData.length > 0 && (
                <MotionLayout variant="slideUp">
                  <div className="space-y-4">
                    <div className="border border-border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 px-3 sm:px-4 py-2 sm:py-3 border-b border-border">
                        <h3 className="font-medium text-xs sm:text-sm">{t('import.preview')}</h3>
                      </div>
                      <div className="max-h-[400px] overflow-auto">
                        <table className="w-full text-xs sm:text-sm">
                          <thead className="bg-muted/30 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground w-12">
                                <Checkbox
                                  checked={previewData.every((row) => row.selected)}
                                  onCheckedChange={(checked) => {
                                    setPreviewData((prev) =>
                                      prev.map((row) => ({ ...row, selected: !!checked && !row.hasError }))
                                    );
                                  }}
                                  aria-label={t('import.selectAll')}
                                />
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                                {t('export.type')}
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                                Données
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground w-12">
                                Statut
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.map((row) => (
                              <tr
                                key={row.id}
                                className={`border-b border-border ${
                                  row.hasError ? "bg-destructive/5" : ""
                                }`}
                              >
                                <td className="px-4 py-3">
                                  <Checkbox
                                    checked={row.selected}
                                    onCheckedChange={() => handleRowToggle(row.id)}
                                    disabled={row.hasError}
                                    aria-label={`${t('import.selectRows')} ${row.type}`}
                                  />
                                </td>
                                <td className="px-4 py-3 text-sm font-medium">{t(`dataTypes.${row.type}`)}</td>
                                <td className="px-4 py-3 text-sm text-muted-foreground">
                                  {Object.entries(row.data)
                                    .slice(0, 3)
                                    .map(([key, value]) => `${key}: ${value}`)
                                    .join(", ")}
                                </td>
                                <td className="px-4 py-3">
                                  {row.hasError ? (
                                    <AlertCircle className="h-4 w-4 text-destructive" />
                                  ) : (
                                    <CheckCircle2 className="h-4 w-4 text-success" />
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {previewData.some((row) => row.hasError) && (
                      <MotionLayout variant="scale">
                        <div className="bg-destructive/10 border-2 border-destructive/50 rounded-lg p-3 sm:p-4">
                          <div className="flex gap-2 sm:gap-3">
                            <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-destructive flex-shrink-0 mt-0.5" />
                            <div className="space-y-2 flex-1">
                              <p className="text-sm sm:text-base font-semibold text-destructive">
                                ⚠️ {t('import.validationErrors')}
                              </p>
                              <p className="text-xs sm:text-sm text-destructive/90 font-medium">
                                {t('import.errorDescription')}
                              </p>
                              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                                {previewData
                                  .filter((row) => row.hasError)
                                  .map((row) => (
                                    <div key={row.id} className="bg-background/50 rounded p-2 border border-destructive/20">
                                      <p className="text-xs sm:text-sm text-destructive font-medium">
                                        • {t('export.type')}: <span className="font-bold">{t(`dataTypes.${row.type}`)}</span>
                                      </p>
                                      <p className="text-xs text-destructive/80 ml-3 mt-1">
                                        {row.errorMessage}
                                      </p>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </MotionLayout>
                    )}

                    <Button 
                      onClick={handleImport} 
                      disabled={isImporting || previewData.filter(r => r.selected).some(r => r.hasError)} 
                      className="gap-2 w-full sm:w-auto"
                      aria-label={t('import.importButton')}
                    >
                      <Upload className="h-4 w-4" />
                      <span className="text-sm sm:text-base">
                        {isImporting ? t('import.progress') : t('import.importButton')}
                      </span>
                    </Button>
                  </div>
                </MotionLayout>
              )}
            </div>
          </div>
        </MotionLayout>
      </Card>
    </div>
  );
};
