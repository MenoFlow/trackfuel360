import React from "react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Edit, Trash2, Loader2, Eye } from "lucide-react";
import { Trip } from "@/types/trip";
import { useTranslation } from "react-i18next";

interface MobileTripDialogProps {
  vehiculeId: number;
  trips: Trip[];
  isLoading: boolean;
  onEdit: (trip: Trip) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

export default function MobileTripDialog({
  vehiculeId,
  trips,
  isLoading,
  onEdit,
  onDelete,
  isDeleting,
}: MobileTripDialogProps) {
  const { t } = useTranslation();
  
  const vehicleTrips = trips.filter((t) => t.vehicule_id === vehiculeId);

  return (
    <div className="block md:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">
            <Activity className="w-5 h-5 mr-2" />
            {t('trips.tripsButton')} ({vehicleTrips.length})
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh]">
          <SheetHeader>
            <SheetTitle>{t('trips.vehicleTrips')} {vehiculeId}</SheetTitle>
            <SheetDescription>
              {t('trips.manageTrips')}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100%-120px)] mt-4 px-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : vehicleTrips.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('trips.noTrips')}
              </div>
            ) : (
              <div className="space-y-3 pb-4">
                {vehicleTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="p-4 border rounded-lg bg-card space-y-2"
                  >
                    <div className="font-medium">{t('trips.trip')} #{trip.id}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(trip.date_debut).toLocaleString("fr-FR")} →{" "}
                      {new Date(trip.date_fin).toLocaleString("fr-FR")}
                    </div>
                    <div className="text-sm font-semibold">
                      {trip.distance_km} km
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(trip)}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        {t('trips.edit')}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (window.confirm(t('trips.confirmDelete'))) {
                            onDelete(trip.id);
                          }
                        }}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <SheetFooter className="mt-4">
            <SheetClose asChild>
              <Button variant="outline">{t('trips.close')}</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
