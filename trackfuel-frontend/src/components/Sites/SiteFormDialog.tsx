// src/components/Sites/SiteFormDialog.tsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Site } from '@/types';
import { useCreateSite, useUpdateSite } from '@/hooks/useSites';
import { useToast } from '@/hooks/use-toast';
import { Building2 } from 'lucide-react';

const siteSchema = z.object({
  nom: z.string().min(1, 'required').max(100),
  ville: z.string().min(1, 'required').max(100),
  pays: z.string().min(1, 'required').max(100),
});

type SiteFormData = z.infer<typeof siteSchema>;

interface SiteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site?: Site;
}

export function SiteFormDialog({ open, onOpenChange, site }: SiteFormDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isEdit = !!site;
  const createSite = useCreateSite();
  const updateSite = useUpdateSite();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SiteFormData>({
    resolver: zodResolver(siteSchema),
  });

  useEffect(() => {
    if (open) {
      if (site) {
        reset({ nom: site.nom, ville: site.ville, pays: site.pays });
      } else {
        reset({ nom: '', ville: '', pays: 'RDC' });
      }
    }
  }, [site, open, reset]);

  const onSubmit = (data: SiteFormData) => {
    if (isEdit) {
      updateSite.mutate(
        { 
          id: site!.id, 
          data: data as Omit<Site, 'id'> 
        },
        {
          onSuccess: () => {
            toast({ title: t('sites.updateSuccess') });
            onOpenChange(false);
          },
          onError: () => {
            toast({ title: t('sites.saveError'), variant: 'destructive' });
          },
        }
      );
    } else {
      createSite.mutate(
        data as Omit<Site, 'id'>, // ICI LE FIX
        {
          onSuccess: () => {
            toast({ title: t('sites.createSuccess') });
            onOpenChange(false);
          },
          onError: () => {
            toast({ title: t('sites.saveError'), variant: 'destructive' });
          },
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {isEdit ? t('sites.editSite') : t('sites.addSite')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">{t('sites.name')}</Label>
            <Input id="nom" {...register('nom')} placeholder="ex: Kinshasa Hub" />
            {errors.nom && <p className="text-sm text-destructive">{t('form.required')}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ville">{t('sites.city')}</Label>
            <Input id="ville" {...register('ville')} placeholder="ex: Kinshasa" />
            {errors.ville && <p className="text-sm text-destructive">{t('form.required')}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pays">{t('sites.country')}</Label>
            <Input id="pays" {...register('pays')} placeholder="ex: RDC" />
            {errors.pays && <p className="text-sm text-destructive">{t('form.required')}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={createSite.isPending || updateSite.isPending}
            >
              {createSite.isPending || updateSite.isPending
                ? t('common.saving')
                : isEdit
                ? t('common.save')
                : t('common.add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}