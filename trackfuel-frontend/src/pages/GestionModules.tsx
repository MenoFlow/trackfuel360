import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Puzzle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useApplyModuleConfiguration, useModules, useUpdateModule } from '@/hooks/useModules';
import { toast } from 'sonner';
import { useState } from 'react';

const GestionModules = () => {
  const { data: modules = [], isLoading } = useModules();
  const updateModule = useUpdateModule();
  const applyConfiguration = useApplyModuleConfiguration();
  const [configuration, setConfiguration] = useState('fuel_fleet_drivers');

  const onToggle = async (code: any, enabled: boolean) => {
    try {
      await updateModule.mutateAsync({ code, enabled });
      toast.success(enabled ? 'Module active' : 'Module desactive');
    } catch (error: any) {
      toast.error(error.message || 'Mise a jour impossible');
    }
  };

  const onApplyConfiguration = async () => {
    try {
      await applyConfiguration.mutateAsync({ configuration });
      toast.success('Configuration appliquee');
    } catch (error: any) {
      toast.error(error.message || 'Configuration impossible');
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Modules</h1>
          <p className="text-muted-foreground mt-2">
            Activez uniquement les modules vendus ou utiles pour ce client.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuration client</CardTitle>
            <CardDescription>Appliquer une offre type sans reinstallation.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Select value={configuration} onValueChange={setConfiguration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fuel_only">Simple controle du carburant</SelectItem>
                <SelectItem value="fleet_only">Simple gestion du parc</SelectItem>
                <SelectItem value="fuel_fleet_drivers">Carburant + parc + conducteurs</SelectItem>
                <SelectItem value="complete">Solution complete</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={onApplyConfiguration} disabled={applyConfiguration.isPending}>
              Appliquer
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {isLoading ? <p>Chargement...</p> : modules.map(module => (
            <Card key={module.code}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Puzzle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{module.label}</CardTitle>
                      <CardDescription>Code: {module.code}</CardDescription>
                    </div>
                  </div>
                  {/* <Badge variant={module.phase === 'MVP' ? 'secondary' : 'outline'}>{module.phase}</Badge> */}
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  {module.allowed ? 'Autorise pour votre role' : 'Masque pour votre role'}
                </div>
                <Switch
                  checked={module.enabled}
                  disabled={!module.can_manage || updateModule.isPending}
                  onCheckedChange={(checked) => onToggle(module.code, checked)}
                  aria-label={`Activer ${module.label}`}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default GestionModules;
