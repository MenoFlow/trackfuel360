import { AlertTriangle, ArrowRight, CheckCircle2, Clock3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type DashboardAlertPriority = 'critical' | 'warning' | 'info';

export interface DashboardAlertItem {
  id: string;
  title: string;
  description: string;
  destination: string;
  actionLabel: string;
  source: string;
  priority: DashboardAlertPriority;
  timestamp?: string;
}

interface AlertCenterProps {
  alerts: DashboardAlertItem[];
  isRefreshing?: boolean;
  onOpen: (alert: DashboardAlertItem) => void;
}

const priorityStyles: Record<DashboardAlertPriority, string> = {
  critical: 'border-destructive/40 bg-destructive/5 hover:bg-destructive/10',
  warning: 'border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10',
  info: 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10',
};

const priorityLabels: Record<DashboardAlertPriority, string> = {
  critical: 'Critique',
  warning: 'À traiter',
  info: 'À surveiller',
};

export function AlertCenter({ alerts, isRefreshing = false, onOpen }: AlertCenterProps) {
  const criticalCount = alerts.filter(alert => alert.priority === 'critical').length;

  return (
    <Card className="overflow-hidden border-amber-500/30 shadow-sm" aria-live="polite">
      <CardHeader className="border-b bg-muted/25 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Centre d’alertes
              <Badge variant={criticalCount > 0 ? 'destructive' : 'secondary'}>{alerts.length}</Badge>
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Tous les incidents actifs, classés par priorité. Sélectionnez-en un pour agir directement.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${isRefreshing ? 'animate-pulse bg-amber-500' : 'bg-emerald-500'}`} />
            {isRefreshing ? 'Actualisation…' : 'Données à jour'}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {alerts.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Aucun incident actif.
          </div>
        ) : (
          <div className="max-h-[32rem] space-y-2 overflow-y-auto p-3 sm:p-4">
            {alerts.map(alert => (
              <button
                type="button"
                key={alert.id}
                onClick={() => onOpen(alert)}
                className={`group flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${priorityStyles[alert.priority]}`}
                aria-label={`${alert.title}. ${alert.actionLabel}`}
              >
                <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${alert.priority === 'critical' ? 'text-destructive' : alert.priority === 'warning' ? 'text-amber-600' : 'text-blue-600'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">{alert.title}</span>
                    <Badge variant="outline" className="bg-background/70">{priorityLabels[alert.priority]}</Badge>
                    <Badge variant="secondary">{alert.source}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{alert.description}</p>
                  {alert.timestamp && (
                    <span className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock3 className="h-3 w-3" />
                      {alert.timestamp}
                    </span>
                  )}
                </div>
                <span className="hidden shrink-0 items-center gap-1 self-center text-sm font-medium text-primary sm:flex">
                  {alert.actionLabel}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
