import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BookOpen, Download, Info, ChevronDown, ChevronUp } from "lucide-react";
import { DATA_TYPES } from "@/types";
import { generateTemplateExcelFile, downloadFile } from "@/lib/utils/excelUtils";
import { MotionLayout } from "../Layout/MotionLayout";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export const ImportGuide = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const handleDownloadTemplate = () => {
    try {
      const blob = generateTemplateExcelFile();
      downloadFile(blob, `trackfuel_template.xlsx`);
      toast.success(t('import.success'));
    } catch (error) {
      toast.error(t('import.error'));
      console.error(error);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="p-4 sm:p-6 bg-primary/5 border-primary/20">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-0 hover:bg-transparent group"
            aria-label={isOpen ? t('import.guideToggle') : t('import.guideToggle')}
          >
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors">
                  {t('import.guide')}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isOpen ? t('import.guideToggle') : t('import.guideDescription')}
                </p>
              </div>
            </div>
            {isOpen ? (
              <ChevronUp className="h-5 w-5 text-primary flex-shrink-0" />
            ) : (
              <ChevronDown className="h-5 w-5 text-primary flex-shrink-0 animate-pulse" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4 space-y-4 animate-accordion-down">
          <MotionLayout variant="slideUp">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs sm:text-sm">
                {t('import.templateDescription')}
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3 text-xs sm:text-sm text-muted-foreground">
              <div>
                <h4 className="font-medium text-foreground mb-1 text-sm sm:text-base">{t('import.instructions')}</h4>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>{t('import.step1')}</li>
                  <li>{t('import.step2')}</li>
                  <li>{t('import.step3')}</li>
                  <li>{t('import.step4')}</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1 text-sm sm:text-base">{t('import.dependencyOrder')}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {DATA_TYPES.filter((t) => t.dependencies.length > 0).map((type) => (
                    <div key={type.value} className="p-2 bg-muted/50 rounded border border-border text-xs sm:text-sm">
                      <span className="font-medium text-foreground">{t(`dataTypes.${type.value}`)}</span>
                      <span className="text-xs text-muted-foreground ml-2 block sm:inline">
                        → {type.dependencies.map(dep => t(`dataTypes.${dep}`)).join(', ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <Button onClick={handleDownloadTemplate} className="w-full sm:w-auto gap-2 mt-4">
              <Download className="h-4 w-4" />
              <span className="text-sm sm:text-base">{t('import.downloadTemplate')}</span>
            </Button>
          </MotionLayout>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
