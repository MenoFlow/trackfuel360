import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

interface AlertButtonProps {
  unreadCount: number;
  onClick: () => void;
  isOpen: boolean;
}

export function AlertButton({ unreadCount, onClick, isOpen }: AlertButtonProps) {
  const { t } = useTranslation();

  if (unreadCount === 0 && !isOpen) return null;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Button
        variant={isOpen ? 'secondary' : 'destructive'}
        size="lg"
        onClick={onClick}
        className="relative danger-ring shadow-lg"
      >
        <AlertTriangle className="h-5 w-5 mr-2" />
        {/* {t('alerts.button')} */}
        {unreadCount > 0 && (
          <Badge
            variant="secondary"
            className="ml-2 bg-background text-destructive-foreground"
          >
            {unreadCount}
          </Badge>
        )}
      </Button>
    </motion.div>
  );
}
