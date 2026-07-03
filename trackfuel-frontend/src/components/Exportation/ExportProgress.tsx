import { Progress } from "@/components/ui/progress";
import { MotionLayout } from "../Layout/MotionLayout";

interface ExportProgressProps {
  progress: number;
  status: string;
}

export const ExportProgress = ({ progress, status }: ExportProgressProps) => {
  return (
    <MotionLayout variant="slideUp">
      <div className="space-y-2 p-4 border border-border rounded-lg bg-muted/30" role="status" aria-live="polite">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{status}</span>
          <span className="text-sm text-muted-foreground">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} />
      </div>
    </MotionLayout>
  );
};
