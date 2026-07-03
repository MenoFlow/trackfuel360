import { useState } from 'react';
import { Geofence } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Edit2, Trash2, AlertTriangle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MotionLayout } from '@/components/Layout/MotionLayout';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { getGeofenceColor } from '@/lib/utils/mapUtils';

interface GeofenceDetailsPanelProps {
  geofence: Geofence | null;
  isEditing: boolean;
  isReadOnly: boolean;
  onEdit: (geofence: Geofence) => void;
  onDelete: (id: number) => Promise<void>;
  onClose: () => void;
}

export function GeofenceDetailsPanel({ 
  geofence, 
  isEditing,
  isReadOnly,
  onEdit, 
  onDelete,
  onClose,
}: GeofenceDetailsPanelProps) {
  const { t } = useTranslation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!geofence) return null;

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(geofence.id);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <MotionLayout variant="slideUp">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">{t('geofence.selected')}</CardTitle>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <span className="text-sm font-semibold">{t('geofence.name')}:</span>
            <p className="text-sm">{geofence.nom}</p>
          </div>
          <div>
            <span className="text-sm font-semibold">{t('geofence.type')}:</span>
            <div className="mt-1">
              <Badge style={{ backgroundColor: getGeofenceColor(geofence.type) }}>
                {t(`geofence.types.${geofence.type}`)}
              </Badge>
            </div>
          </div>
          <div>
            <span className="text-sm font-semibold">{t('geofence.center')}:</span>
            <p className="text-xs text-muted-foreground">
              {Number(geofence.lat).toFixed(5)}, {Number(geofence.lon).toFixed(5)}
            </p>
          </div>
          <div>
            <span className="text-sm font-semibold">{t('geofence.radius')}:</span>
            <p className="text-xs text-muted-foreground">
              {(geofence.rayon_metres / 1000).toFixed(2)} km
            </p>
          </div>

          {!isReadOnly && (
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => onEdit(geofence)}
                disabled={isEditing}
              >
                <Edit2 className="h-3 w-3 mr-1" />
                {isEditing ? t('geofence.editing') : t('geofence.edit')}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                title={t('geofence.delete')}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleConfirmDelete}
        title={t('geofence.deleteConfirmTitle')}
        description={t('geofence.deleteConfirmDescription', { name: geofence.nom })}
        confirmText={t('geofence.delete')}
        icon={AlertTriangle}
        isLoading={isDeleting}
      />
    </MotionLayout>
  );
}
