import { Button } from '@/components/ui/button';
import { Plus, X, Eye, EyeOff, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MapToolbarProps {
  isDrawing: boolean;
  isReadOnly: boolean;
  onToggleDrawing: () => void;
  onToggleReadOnly: () => void;
}

export function MapToolbar({
  isDrawing,
  isReadOnly,
  onToggleDrawing,
  onToggleReadOnly,
}: MapToolbarProps) {
  const { t } = useTranslation(); 

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
      <div className="flex gap-2">
        
        <Button
          size="sm"
          variant={isReadOnly ? 'outline' : 'secondary'}
          onClick={onToggleReadOnly}
          className="whitespace-nowrap"
        >
          {isReadOnly ? (
            <>
              <Eye className="h-4 w-4 mr-2" />
              {t('map.readMode')}
            </>
          ) : (
            <>
              <EyeOff className="h-4 w-4 mr-2" />
              {t('map.editMode')}
            </>
          )}
        </Button>

        {!isReadOnly && (
          <Button
            size="sm"
            variant="outline"
            onClick={onToggleDrawing}
            className={
              isDrawing
                ? "w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium border border-red-600 text-red-600 hover:bg-red-50 hover:text-red-700 active:scale-95 transition-all duration-200"
                : "w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium border border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700 active:scale-95 transition-all duration-200"
            }
          >


            {isDrawing ? (
              <>
                <X className="h-4 w-4 mr-2" />
                {t('map.stopDrawing')}
              </>
            ) : (
              <>
                <Pencil className="h-4 w-4 mr-2" />
                {t('map.startDrawing')}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
