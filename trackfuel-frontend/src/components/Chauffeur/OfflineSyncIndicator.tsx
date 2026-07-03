import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// import { deleteSyncedData } from '@/lib/services/offlineService';


export const OfflineSyncIndicator = () => {
  const { isOnline, syncStatus, manualSync } = useOfflineSync();
  const { t } = useTranslation();

  // const getStatusColor = () => {
  //   if (!isOnline) return 'bg-destructive';
  //   if (syncStatus.isSyncing) return 'bg-warning';
  //   if (syncStatus.pendingCount > 0) return 'bg-warning';
  //   return 'bg-success';
  // };

  // deleteSyncedData

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="h-4 w-4" />;
    if (syncStatus.isSyncing)
      return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (syncStatus.pendingCount > 0) return <AlertCircle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (!isOnline) return t("offline.status.offline");
    if (syncStatus.isSyncing) return t("offline.status.syncing");
    if (syncStatus.pendingCount > 0)
      return t("offline.status.pending", { count: syncStatus.pendingCount });
    return t("offline.status.synced");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="
    flex items-center gap-2 px-3 py-1 rounded-md 
    border border-gray-300 
    hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200
    md:border-transparent md:hover:bg-transparent md:hover:text-blue-600
  "
        >
          {getStatusIcon()}
          <span className="text-sm font-medium">{getStatusText()}</span>
          {syncStatus.pendingCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-1 md:bg-transparent md:text-blue-600 md:border md:border-blue-600"
            >
              {syncStatus.pendingCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">{t("offline.title")}</h4>
            <div className="flex items-center gap-2 text-sm">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-success" />
              ) : (
                <WifiOff className="h-4 w-4 text-destructive" />
              )}
              <span>
                {isOnline
                  ? t("offline.status.online")
                  : t("offline.status.offline")}
              </span>
            </div>
          </div>

          {syncStatus.pendingCount > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t("offline.pendingActions", {
                  count: syncStatus.pendingCount,
                })}
              </p>
              {isOnline && (
                <>
                  <Button
                    onClick={manualSync}
                    disabled={syncStatus.isSyncing}
                    size="sm"
                    className="w-full"
                  >
                    {syncStatus.isSyncing ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        {t("offline.syncing")}
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {t("offline.syncNow")}
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => {
                      const STORAGE_KEY = "trackfuel_offline";
                      localStorage.removeItem(STORAGE_KEY);
                      window.location.reload();
                    }}
                    disabled={syncStatus.isSyncing}
                    size="sm"
                    className="w-full"
                    variant="destructive"
                  >
                    <Trash2></Trash2>
                  </Button>
                </>
              )}
            </div>
          )}

          {syncStatus.lastSync && (
            <p className="text-xs text-muted-foreground">
              {t("offline.lastSync")}: {syncStatus.lastSync.toLocaleString()}
            </p>
          )}

          {syncStatus.errors.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-destructive">
                {t("offline.errors", { count: syncStatus.errors.length })}
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {syncStatus.errors.map((error) => (
                  <div
                    key={error.id}
                    className="text-xs bg-destructive/10 p-2 rounded"
                  >
                    {error.error || t("offline.unknownError")}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
