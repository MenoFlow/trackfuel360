import { Alert } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, X, Trash2, MapPin, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS, es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { MotionLayout } from '@/components/Layout/MotionLayout';

interface AlertPanelProps {
  alerts: Alert[];
  onDeleteAlert: (id: string) => void;
  onClearAll: () => void;
  onClose: () => void;
}

export function AlertPanel({ alerts, onDeleteAlert, onClearAll, onClose }: AlertPanelProps) {
  const { t, i18n } = useTranslation();

  const getLocale = () => {
    switch (i18n.language) {
      case 'fr': return fr;
      case 'es': return es;
      case 'en': return enUS;
      default: return fr;
    }
  };

  return (
    <MotionLayout variant="slideUp">
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-lg">{t('alerts.title')}</CardTitle>
            <Badge variant="destructive">{alerts.length}</Badge>
          </div>
          <div className="flex gap-2">
            {alerts.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onClearAll}
                className="text-muted-foreground hover:text-destructive"
                title={t('alerts.clearAll')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-280px)]">
            {alerts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{t('alerts.noAlerts')}</p>
              </div>
            ) : (
              <div className="space-y-2 p-4">
                {alerts.map((alert) => (
                  <Card
                    key={alert.id}
                    className={`${
                      !alert.isRead ? 'border-destructive bg-destructive/5' : ''
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                          <h4 className="font-semibold text-sm">
                            {alert.vehicleModele}
                          </h4>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDeleteAlert(alert.id)}
                          className="h-6 w-6 p-0"
                          title={t('alerts.delete')}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{t('vehicle.registration')}:</span>
                          <span>{alert.vehicleImmatriculation}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          <span className="font-medium">{t('alerts.zone')}:</span>
                          <span className="text-destructive font-medium">
                            {alert.geofenceName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{t('alerts.coordinates')}:</span>
                          <span>
                            {alert.coordinates[0].toFixed(5)}, {alert.coordinates[1].toFixed(5)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatDistanceToNow(new Date(alert.timestamp), {
                              addSuffix: true,
                              locale: getLocale(),
                            })}
                          </span>
                        </div>
                      </div>

                      {!alert.isRead && (
                        <Badge
                          variant="destructive"
                          className="mt-2 text-xs"
                        >
                          {t('alerts.unread')}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </MotionLayout>
  );
}
