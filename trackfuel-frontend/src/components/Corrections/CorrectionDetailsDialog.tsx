import { useState } from 'react';
import { Correction, Plein, Vehicule } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, CheckCircle2, XCircle, Clock, User, Calendar, FileText } from 'lucide-react';
import { ValidationResult } from '@/lib/utils/correctionValidation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CorrectionDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  correction: Correction;
  plein?: Plein;
  vehicule?: Vehicule;
  validationResult?: ValidationResult;
  onValidate: (correctionId: number, comment: string) => void;
  onReject: (correctionId: number, comment: string) => void;
  isLoading?: boolean;
}

const CorrectionDetailsDialog = ({
  open,
  onOpenChange,
  correction,
  plein,
  vehicule,
  validationResult,
  onValidate,
  onReject,
  isLoading = false
}: CorrectionDetailsDialogProps) => {
  const [comment, setComment] = useState('');
  const [actionType, setActionType] = useState<'validate' | 'reject' | null>(null);

  const handleAction = () => {
    if (!comment.trim()) {
      return;
    }

    if (actionType === 'validate') {
      onValidate(correction.id, comment);
    } else if (actionType === 'reject') {
      onReject(correction.id, comment);
    }

    setComment('');
    setActionType(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> En attente</Badge>;
      case 'validated':
        return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle2 className="h-3 w-3" /> Validée</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Rejetée</Badge>;
      default:
        return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      litres: 'Litres',
      odometre: 'Odomètre',
      prix_unitaire: 'Prix unitaire',
      station: 'Station',
      date: 'Date'
    };
    return labels[field] || field;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Détails de la correction #{correction.id}</span>
            {getStatusBadge(correction.status)}
          </DialogTitle>
          <DialogDescription>
            Correction proposée pour le plein {correction.record_id}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-12rem)]">
          <div className="space-y-6 pr-4">
            {/* Informations de base */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Demandeur</span>
                </div>
                <p className="font-medium">{correction.requested_by}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Date de demande</span>
                </div>
                <p className="font-medium">
                  {format(new Date(correction.requested_at), 'PPpp', { locale: fr })}
                </p>
              </div>
            </div>

            <Separator />

            {/* Valeurs */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Modification proposée
              </h3>
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Champ</span>
                  <Badge variant="secondary">{getFieldLabel(correction.champ)}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Ancienne valeur</p>
                    <p className="text-lg font-mono font-semibold text-red-600 line-through">
                      {correction.old_value}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Nouvelle valeur</p>
                    <p className="text-lg font-mono font-semibold text-green-600">
                      {correction.new_value}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Justification */}
            {correction.comment && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold">Justification du demandeur</h3>
                  <p className="text-sm bg-muted/30 p-3 rounded-md italic">
                    "{correction.comment}"
                  </p>
                </div>
              </>
            )}

            {/* Contrôles automatiques */}
            {validationResult && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Contrôles automatiques
                    </span>
                    <span className={`text-2xl font-bold ${getScoreColor(validationResult.score)}`}>
                      {validationResult.score}/100
                    </span>
                  </h3>

                  {validationResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-red-600">Erreurs détectées</p>
                      {validationResult.errors.map((error, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm bg-red-50 dark:bg-red-950/20 p-2 rounded border border-red-200 dark:border-red-800">
                          <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <span>{error}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {validationResult.warnings.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-orange-600">Avertissements</p>
                      {validationResult.warnings.map((warning, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm bg-orange-50 dark:bg-orange-950/20 p-2 rounded border border-orange-200 dark:border-orange-800">
                          <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                          <span>{warning}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {validationResult.errors.length === 0 && validationResult.warnings.length === 0 && (
                    <div className="flex items-center gap-2 text-sm bg-green-50 dark:bg-green-950/20 p-3 rounded border border-green-200 dark:border-green-800">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-green-700 dark:text-green-400">Aucun problème détecté</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Informations contextuelles */}
            {(vehicule || plein) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold">Informations contextuelles</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {vehicule && (
                      <>
                        <div>
                          <span className="text-muted-foreground">Véhicule</span>
                          <p className="font-medium">{vehicule.immatriculation} - {vehicule.marque} {vehicule.modele}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Capacité réservoir</span>
                          <p className="font-medium">{vehicule.capacite_reservoir}L</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Consommation nominale</span>
                          <p className="font-medium">{vehicule.consommation_nominale}L/100km</p>
                        </div>
                      </>
                    )}
                    {plein && (
                      <>
                        <div>
                          <span className="text-muted-foreground">Date du plein</span>
                          <p className="font-medium">{format(new Date(plein.date), 'PPpp', { locale: fr })}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Station</span>
                          <p className="font-medium">{plein.station}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Type de saisie</span>
                          <Badge variant="outline">{plein.type_saisie}</Badge>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Historique de validation */}
            {correction.validated_by && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold">Audit Trail</h3>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="text-muted-foreground">Traité par :</span>{' '}
                      <span className="font-medium">{correction.validated_by}</span>
                    </p>
                    {correction.validated_at && (
                      <p>
                        <span className="text-muted-foreground">Date :</span>{' '}
                        <span className="font-medium">
                          {format(new Date(correction.validated_at), 'PPpp', { locale: fr })}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Actions admin (uniquement si en attente) */}
            {correction.status === 'pending' && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-comment">
                      Commentaire administrateur <span className="text-red-600">*</span>
                    </Label>
                    <Textarea
                      id="admin-comment"
                      placeholder="Justifiez votre décision de validation ou de rejet..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={4}
                      className="resize-none"
                    />
                    {actionType && !comment.trim() && (
                      <p className="text-sm text-red-600">Le commentaire est obligatoire</p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        setActionType('validate');
                        if (comment.trim()) {
                          onValidate(correction.id, comment);
                          setComment('');
                          setActionType(null);
                        }
                      }}
                      disabled={isLoading}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Valider la correction
                    </Button>
                    <Button
                      onClick={() => {
                        setActionType('reject');
                        // Appelle DIRECTEMENT si déjà un commentaire
                        if (comment.trim()) {
                          onReject(correction.id, comment);
                          setComment('');
                          setActionType(null);
                        }
                      }}
                      disabled={isLoading}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rejeter la correction
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default CorrectionDetailsDialog;
