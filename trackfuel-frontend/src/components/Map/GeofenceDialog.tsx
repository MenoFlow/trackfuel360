import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { GeofenceType, Geofence } from '@/types';
import { useTranslation } from 'react-i18next';
import { MotionLayout } from '@/components/Layout/MotionLayout';

interface GeofenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, type: GeofenceType) => void;
  editingGeofence?: Geofence | null;
}

export function GeofenceDialog({ open, onOpenChange, onSave, editingGeofence }: GeofenceDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [type, setType] = useState<GeofenceType>('depot');
  useEffect(() => {
    if (open) {
      if (editingGeofence) {
        setName(editingGeofence.nom);
        setType(editingGeofence.type);
      } else {
        setName('');
        setType('depot');
      }
    }
  }, [open, editingGeofence]);

  const handleSave = () => {
    if (name.trim()) {
      onSave(name, type);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <MotionLayout variant="slideUp">
          <DialogHeader>
            <DialogTitle>
              {editingGeofence ? t('geofence.edit') : t('geofence.new')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('geofence.name')}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('geofence.namePlaceholder')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSave();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">{t('geofence.type')}</Label>
              <Select value={type} onValueChange={(value) => setType(value as GeofenceType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="depot">{t('geofence.types.depot')}</SelectItem>
                  <SelectItem value="station">{t('geofence.types.station')}</SelectItem>
                  <SelectItem value="zone_risque">{t('geofence.types.zone_risque')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} className="w-full" disabled={!name.trim()}>
              {t('geofence.save')}
            </Button>
          </div>
        </MotionLayout>
      </DialogContent>
    </Dialog>
  );
}
