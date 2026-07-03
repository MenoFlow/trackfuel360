import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { MotionLayout } from '@/components/Layout/MotionLayout';

export function LegendPanel() {
  const { t } = useTranslation();

  return (
    <MotionLayout variant="slideUp">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('legend.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="font-semibold mb-2 text-sm">{t('legend.fuelStatus')}</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>{t('legend.normal')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span>{t('legend.medium')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span>{t('legend.low')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>{t('legend.critical')}</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-2 text-sm">{t('legend.zoneTypes')}</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-green-500"></div>
                <span>{t('geofence.types.depot')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
                <span>{t('geofence.types.station')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-red-500"></div>
                <span>{t('geofence.types.zone_risque')}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </MotionLayout>
  );
}
