import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Fuel, Edit } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export interface FillData {
  id?: number;
  vehicleId: number;
  date: string;
  volume: number;
  type_saisie: 'Auto' | 'Manuelle';
  ocrText?: string;
  photoUrl?: string;
  notes?: string;
  status?: 'pending' | 'validated' | 'rejected';
}

interface FillFormProps {
  vehicleId: number;
  vehicleName: string;
  existingFill?: FillData;
  onSubmit: (fill: FillData) => void;
  mode?: 'create' | 'edit';
}

export const FillForm: React.FC<FillFormProps> = ({ 
  vehicleId, 
  vehicleName,
  existingFill, 
  onSubmit,
  mode = 'create' 
}) => {
  const [open, setOpen] = React.useState(false);
  const [volume, setVolume] = React.useState(existingFill?.volume?.toString() || "");
  const [date, setDate] = React.useState(existingFill?.date || new Date().toISOString().split('T')[0]);
  const [type_saisie, setTypeSaisie] = React.useState<'Auto' | 'Manuelle'>(existingFill?.type_saisie || 'Manuelle');
  const [notes, setNotes] = React.useState(existingFill?.notes || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const volumeNum = parseFloat(volume);
    
    if (!volume || isNaN(volumeNum) || volumeNum <= 0) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un volume valide",
        variant: "destructive",
      });
      return;
    }

    const fillData: FillData = {
      ...existingFill,
      vehicleId,
      date,
      volume: volumeNum,
      type_saisie: type_saisie,
      notes,
      status: mode === 'edit' ? 'pending' : existingFill?.status || 'validated',
    };

    onSubmit(fillData);
    
    toast({
      title: mode === 'create' ? "Plein ajouté" : "Correction proposée",
      description: mode === 'create' 
        ? `${volumeNum}L ajoutés pour ${vehicleName}` 
        : `La correction sera soumise à validation`,
    });
    
    setOpen(false);
    
    // Reset form if creating
    if (mode === 'create') {
      setVolume("");
      setNotes("");
      setDate(new Date().toISOString().split('T')[0]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={mode === 'edit' ? "outline" : "default"} size="sm">
          {mode === 'edit' ? <Edit className="h-4 w-4 mr-2" /> : <Fuel className="h-4 w-4 mr-2" />}
          {mode === 'edit' ? 'Corriger' : 'Ajouter plein'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Corriger le plein' : 'Enregistrer un plein'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit' 
              ? 'Proposer une correction pour ce ravitaillement'
              : 'Ajouter un nouveau ravitaillement'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vehicle">Véhicule</Label>
            <Input
              id="vehicle"
              value={vehicleName}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="volume">Volume (litres) *</Label>
            <Input
              id="volume"
              type="number"
              step="0.1"
              min="0"
              placeholder="Ex: 45.5"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type de saisie</Label>
            <Select value={type_saisie} onValueChange={(value: 'Auto' | 'Manuelle') => setTypeSaisie(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Manuelle">
                  <div className="flex items-center gap-2">
                    <span>Saisie Manuelle</span>
                    <Badge variant="secondary">Manuel</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="Auto">
                  <div className="flex items-center gap-2">
                    <span>Détection OCR</span>
                    <Badge variant="default">Auto</Badge>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === 'edit' && (
            <div className="space-y-2">
              <Label htmlFor="notes">Raison de la correction *</Label>
              <Textarea
                id="notes"
                placeholder="Expliquez pourquoi cette correction est nécessaire..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                required
                rows={3}
              />
            </div>
          )}

          {mode === 'create' && (
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea
                id="notes"
                placeholder="Ajouter des notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">
              {mode === 'edit' ? 'Proposer correction' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
