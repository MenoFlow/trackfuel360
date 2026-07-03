import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Download, FileText } from "lucide-react";
import { ExportHistory as ExportHistoryType } from "@/lib/utils/excelUtils";
import { MotionLayout } from "../Layout/MotionLayout";
import { format } from "date-fns";
import { fr, enUS, es } from "date-fns/locale";
import { useTranslation } from "react-i18next";

interface ExportHistoryProps {
  history: ExportHistoryType[];
  onDownload: (item: ExportHistoryType) => void;
}

export const ExportHistory = ({ history, onDownload }: ExportHistoryProps) => {
  const { t, i18n } = useTranslation();
  
  const getLocale = () => {
    switch (i18n.language) {
      case 'fr': return fr;
      case 'es': return es;
      case 'mg': return fr; // Fallback to French for Malagasy
      default: return enUS;
    }
  };

  if (history.length === 0) return null;

  return (
    <MotionLayout variant="slideUp">
      <Card className="p-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">{t('export.history')}</h3>
        </div>
        <div className="space-y-2">
          {history.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(item.date), "dd MMM yyyy 'à' HH:mm", { locale: getLocale() })} • {item.types.length} {t('export.type')}(s) • {item.rowCount} {t('export.rows')}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDownload(item)}
                className="gap-2 flex-shrink-0"
                aria-label={`${t('export.download')} ${item.filename}`}
              >
                <Download className="h-4 w-4" />
                {t('export.download')}
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </MotionLayout>
  );
};
