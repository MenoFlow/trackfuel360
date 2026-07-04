// src/components/Affectations/AffectationDialog.tsx
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useCreateAffectation, useUpdateAffectation } from '@/hooks/useAffectations';
import { useVehicules } from '@/hooks/useVehicules';
import { useUsers } from '@/hooks/useUsers';
import { Affectation } from '@/types';
import { toast } from 'sonner';
import { AvailabilityConflictDialog } from '@/components/common/AvailabilityConflictDialog';

interface AffectationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  affectation?: Affectation;
  onSuccess?: () => void; // NOUVEAU PROP
}

const formSchema = z.object({
  vehicule_id: z.number().min(1, 'Le véhicule est requis'),
  chauffeur_id: z.number().min(1, 'Le chauffeur est requis'),
  date_debut: z.date({ required_error: 'La date de début est requise' }),
  date_fin: z.date({ required_error: 'La date de fin est requise' }),
}).refine((data) => data.date_fin > data.date_debut, {
  message: 'La date de fin doit être après la date de début',
  path: ['date_fin'],
});

type FormData = z.infer<typeof formSchema>;

const toDateTimeLocal = (date: Date) => {
  if (!date || Number.isNaN(date.getTime())) return '';
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
};

const addHours = (date: Date, hours: number) => new Date(date.getTime() + hours * 60 * 60 * 1000);

export const AffectationDialog = ({ 
  open, 
  onOpenChange, 
  affectation, 
  onSuccess 
}: AffectationDialogProps) => {
  const { t } = useTranslation();
  const { data: vehicules } = useVehicules();
  const { data: chauffeurs } = useUsers();
  const createAffectation = useCreateAffectation();
  const updateAffectation = useUpdateAffectation();
  const [availabilityConflict, setAvailabilityConflict] = useState<any>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicule_id: 0,
      chauffeur_id: 0,
      date_debut: new Date(),
      date_fin: addHours(new Date(), 1),
    },
  });

  // Reset formulaire à l'ouverture
  useEffect(() => {
    if (!open) return;

    if (affectation) {
      form.reset({
        vehicule_id: affectation.vehicule_id,
        chauffeur_id: affectation.chauffeur_id,
        date_debut: new Date(affectation.date_debut),
        date_fin: new Date(affectation.date_fin),
      });
    } else {
      form.reset({
        vehicule_id: 0,
        chauffeur_id: 0,
        date_debut: new Date(),
        date_fin: addHours(new Date(), 1),
      });
    }
    setAvailabilityConflict(null);
  }, [open, affectation, form]);

  const dateDebut = form.watch('date_debut');

  const onSubmit = async (data: FormData) => {
    try {
      const payload: Omit<Affectation, 'id'> = {
        vehicule_id: data.vehicule_id!,
        chauffeur_id: data.chauffeur_id!,
        date_debut: data.date_debut.toISOString(),
        date_fin: data.date_fin.toISOString(),
      };

      if (affectation) {
        await updateAffectation.mutateAsync({
          id: affectation.id,
          data: payload,
        });
      } else {
        await createAffectation.mutateAsync(payload);
      }

      // Appelle onSuccess (ferme + toast dans le parent)
      onSuccess?.();

    } catch (error) {
      const apiError = error as Error & { availability?: any; code?: string };
      if (apiError.availability) {
        setAvailabilityConflict(apiError.availability);
        return;
      }
      toast.error(
        affectation 
          ? t('assignments.errorUpdate') 
          : t('assignments.errorCreation')
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {affectation ? t('assignments.editAssignment') : t('assignments.newAssignment')}
          </DialogTitle>
          <DialogDescription>
            {t('assignments.fillForm')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* VÉHICULE */}
            <FormField
              control={form.control}
              name="vehicule_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('assignments.vehicle')}</FormLabel>
                  <Select 
                    onValueChange={(v) => field.onChange(Number(v))} 
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('assignments.selectVehicle')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vehicules?.map((v) => (
                        <SelectItem key={v.id} value={v.id.toString()}>
                          {v.immatriculation} - {v.marque} {v.modele}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* CHAUFFEUR */}
            <FormField
              control={form.control}
              name="chauffeur_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('assignments.driver')}</FormLabel>
                  <Select 
                    onValueChange={(v) => field.onChange(Number(v))} 
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('assignments.selectDriver')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {chauffeurs?.filter((c) => (c.role==="driver")).map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.prenom} {c.nom} ({c.matricule})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* DATE DÉBUT */}
            <FormField
              control={form.control}
              name="date_debut"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('assignments.startDate')}</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      value={toDateTimeLocal(field.value)}
                      onChange={(event) => field.onChange(new Date(event.target.value))}
                      max={dateDebut && form.watch('date_fin') ? toDateTimeLocal(form.watch('date_fin')) : undefined}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* DATE FIN */}
            <FormField
              control={form.control}
              name="date_fin"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('assignments.endDate')}</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      value={toDateTimeLocal(field.value)}
                      onChange={(event) => field.onChange(new Date(event.target.value))}
                      min={dateDebut ? toDateTimeLocal(dateDebut) : undefined}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={createAffectation.isPending || updateAffectation.isPending}
              >
                {createAffectation.isPending || updateAffectation.isPending
                  ? t('common.saving')
                  : t('common.save')
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>

        <AvailabilityConflictDialog
          open={Boolean(availabilityConflict)}
          onOpenChange={(isOpen) => !isOpen && setAvailabilityConflict(null)}
          availability={availabilityConflict}
        />
      </DialogContent>
    </Dialog>
  );
};
