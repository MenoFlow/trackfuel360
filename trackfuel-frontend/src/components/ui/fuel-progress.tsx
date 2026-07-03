import * as React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Fuel } from "lucide-react";
import { cn } from "@/lib/utils";

interface FuelProgressProps {
  level: number; // 0-100
  status: 'critical' | 'low' | 'medium' | 'high';
  remaining: number; // in liters
  className?: string;
  showAlert?: boolean;
}

const getStatusColors = (status: string) => {
  switch (status) {
    case 'critical':
      return {
        bg: 'bg-gradient-to-r from-destructive/20 to-destructive/30',
        fill: 'bg-gradient-to-r from-destructive to-destructive-glow',
        border: 'border-destructive/50',
        text: 'text-destructive'
      };
    case 'low':
      return {
        bg: 'bg-gradient-to-r from-accent/20 to-accent/30',
        fill: 'bg-gradient-to-r from-accent to-accent-glow',
        border: 'border-accent/50',
        text: 'text-accent'
      };
    case 'medium':
      return {
        bg: 'bg-gradient-to-r from-primary/20 to-primary/30',
        fill: 'bg-gradient-to-r from-primary to-primary-glow',
        border: 'border-primary/50',
        text: 'text-primary'
      };
    case 'high':
      return {
        bg: 'bg-gradient-to-r from-secondary1/20 to-secondary1/30',
        fill: 'bg-gradient-to-r from-secondary1 to-secondary-glow1',
        border: 'border-secondary1/50',
        text: 'text-secondary1'
      };
    default:
      return {
        bg: 'bg-muted',
        fill: 'bg-primary',
        border: 'border-border',
        text: 'text-foreground'
      };
  }
};

export const FuelProgress: React.FC<FuelProgressProps> = ({
  level,
  status,
  remaining,
  className,
  showAlert = true
}) => {
  const colors = getStatusColors(status);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Fuel className={cn("h-4 w-4", colors.text)} />
          <span className="font-medium">Carburant</span>
          {showAlert && status === 'critical' && (
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </motion.div>
          )}
        </div>
        <span className={cn("font-semibold", colors.text)}>
          {remaining.toFixed(1)}L ({level.toFixed(0)}%)
        </span>
      </div>
      
      <div className={cn(
        "relative h-3 rounded-full border transition-all duration-300",
        colors.bg,
        colors.border
      )}>
        <motion.div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            colors.fill,
            status === 'critical' && "animate-fuel-pulse"
          )}
          style={{ width: `${Math.max(2, level)}%` }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(2, level)}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};