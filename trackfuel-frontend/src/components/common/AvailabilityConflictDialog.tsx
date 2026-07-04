import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type ConflictRange = {
  type: 'affectation' | 'mission';
  id: number;
  date_debut: string;
  date_fin: string;
  libelle?: string;
};

type AvailabilityConflict = {
  requested_start?: string;
  requested_end?: string;
  chauffeur?: {
    next_free_start?: string | null;
    ranges?: ConflictRange[];
  };
  vehicule?: {
    next_free_start?: string | null;
    ranges?: ConflictRange[];
  };
};

interface AvailabilityConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availability?: AvailabilityConflict | null;
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const renderRanges = (ranges: ConflictRange[] = []) => {
  if (ranges.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune plage bloquante trouvée.</p>;
  }

  return (
    <div className="space-y-2">
      {ranges.map((range) => (
        <div key={`${range.type}-${range.id}`} className="rounded-md border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={range.type === 'mission' ? 'default' : 'secondary'}>
              {range.type === 'mission' ? 'Mission' : 'Affectation'}
            </Badge>
            <span className="text-sm font-medium">{range.libelle || 'Plage assignée'}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatDateTime(range.date_debut)} - {formatDateTime(range.date_fin)}
          </p>
        </div>
      ))}
    </div>
  );
};

export const AvailabilityConflictDialog = ({
  open,
  onOpenChange,
  availability,
}: AvailabilityConflictDialogProps) => {
  const chauffeurRanges = availability?.chauffeur?.ranges || [];
  const vehiculeRanges = availability?.vehicule?.ranges || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Période indisponible
          </DialogTitle>
          <DialogDescription>
            Impossible de créer cette mission ou affectation sur la plage demandée.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <p className="font-medium">Plage demandée</p>
            <p className="text-muted-foreground">
              {formatDateTime(availability?.requested_start)} - {formatDateTime(availability?.requested_end)}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div>
                <p className="font-medium">Disponibilité chauffeur</p>
                <p className="text-sm text-muted-foreground">
                  Libre à partir de : {formatDateTime(availability?.chauffeur?.next_free_start)}
                </p>
              </div>
              {renderRanges(chauffeurRanges)}
            </div>

            <div className="space-y-3">
              <div>
                <p className="font-medium">Disponibilité véhicule</p>
                <p className="text-sm text-muted-foreground">
                  Libre à partir de : {formatDateTime(availability?.vehicule?.next_free_start)}
                </p>
              </div>
              {renderRanges(vehiculeRanges)}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Compris</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
