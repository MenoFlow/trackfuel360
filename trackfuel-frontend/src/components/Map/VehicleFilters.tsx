import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FilterState } from '@/types';
import { useTranslation } from 'react-i18next';
import { MotionLayout } from '@/components/Layout/MotionLayout';

interface VehicleFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export function VehicleFilters({ filters, onFilterChange }: VehicleFiltersProps) {
  const { t } = useTranslation();

  const handleToggle = (key: keyof FilterState) => {
    onFilterChange({
      ...filters,
      [key]: !filters[key],
    });
  };

  return (
    <MotionLayout variant="slideUp">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('filters.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="filter-high"
              checked={filters.showHigh}
              onCheckedChange={() => handleToggle('showHigh')}
            />
            <Label htmlFor="filter-high" className="text-sm cursor-pointer">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>{t('filters.normal')}</span>
              </div>
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="filter-medium"
              checked={filters.showMedium}
              onCheckedChange={() => handleToggle('showMedium')}
            />
            <Label htmlFor="filter-medium" className="text-sm cursor-pointer">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span>{t('filters.medium')}</span>
              </div>
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="filter-low"
              checked={filters.showLow}
              onCheckedChange={() => handleToggle('showLow')}
            />
            <Label htmlFor="filter-low" className="text-sm cursor-pointer">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span>{t('filters.low')}</span>
              </div>
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="filter-critical"
              checked={filters.showCritical}
              onCheckedChange={() => handleToggle('showCritical')}
            />
            <Label htmlFor="filter-critical" className="text-sm cursor-pointer">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>{t('filters.critical')}</span>
              </div>
            </Label>
          </div>
        </CardContent>
      </Card>
    </MotionLayout>
  );
}
