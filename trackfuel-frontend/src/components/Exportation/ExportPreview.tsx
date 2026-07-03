import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, X } from "lucide-react";
import { MotionLayout } from "../Layout/MotionLayout";
import { PreviewTable } from "./PreviewTable";
import { useTranslation } from "react-i18next";

interface ExportPreviewProps {
  open: boolean;
  onClose: () => void;
  selectedTypes: string[];
  onConfirm: () => void;
  dataByType: Record<string, any[]>;
}

export const ExportPreview = ({ open, onClose, selectedTypes, onConfirm, dataByType }: ExportPreviewProps) => {
  const { t } = useTranslation();
  
  const previewData = selectedTypes.map((type) => {
    const data = dataByType[type as keyof typeof dataByType] || [];
    const items = Array.isArray(data) ? data : [data];
    return { type, items: items.slice(0, 5), total: items.length };
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{t('export.previewTitle')}</DialogTitle>
          <DialogDescription>
            {t('export.previewDescription')}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {previewData.map(({ type, items, total }) => (
              <MotionLayout key={type} variant="fade">
                <PreviewTable type={type} items={items} total={total} />
              </MotionLayout>
            ))}
          </div>
        </ScrollArea>
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X className="h-4 w-4" />
            {t('export.close')}
          </Button>
          <Button onClick={onConfirm} className="gap-2">
            <Download className="h-4 w-4" />
            {t('export.exportButton')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
