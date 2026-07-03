import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Settings, Users, MapPin, Bell, Database, Puzzle } from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/utils/motionVariants';
import { MotionWrapper } from '@/components/Layout/MotionWrapper';
import { AppRole } from '@/types';
import { getCurrentRole, roleIncludes } from '@/lib/accessControl';

const Parametres = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currentRole = getCurrentRole();

  const sections: Array<{
    title: string;
    description: string;
    icon: typeof Settings;
    action: () => void;
    roles: AppRole[];
  }> = [
    {
      title: t('settings.userManagement'),
      description: t('settings.userManagementDesc'),
      icon: Users,
      action: () => navigate('/parametres/utilisateurs'),
      roles: ['admin', 'manager'],
    },
    {
      title: t('settings.sitesAndDepots'),
      description: t('settings.sitesAndDepotsDesc'),
      icon: MapPin,
      action: () => navigate('/parametres/sites'),
      roles: ['admin', 'manager'],
    },
    {
      title: 'Modules',
      description: 'Activation par client et masquage des fonctionnalites inutilisees.',
      icon: Puzzle,
      action: () => navigate('/parametres/modules'),
      roles: ['admin'],
    },
    {
      title: t('settings.notifications'),
      description: t('settings.notificationsDesc'),
      icon: Bell,
      action: () => navigate('/parametres/notifications'),
      roles: ['admin', 'manager'],
    },
    {
      title: t('settings.importExport'),
      description: t('settings.importExportDesc'),
      icon: Database,
      action: () => navigate('/parametres/export_import'),
      roles: ['admin', 'auditor'],
    },
  ].filter(section => roleIncludes(currentRole, section.roles));

  return (
    <MainLayout>
      <div className="space-y-6">
        <MotionWrapper variant="slideUp">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-bold text-foreground">{t('settings.title')}</h1>
            <p className="text-muted-foreground mt-2">
              {t('settings.description')}
            </p>
          </div>
        </MotionWrapper>

        <motion.div 
          className="grid gap-4 md:grid-cols-2"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <motion.div key={index} variants={staggerItem}>
                <Card className="h-full">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{section.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {section.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={section.action}
                    disabled={!section.action}
                  >
                    {t('common.configure')}
                  </Button>
                </CardContent>
              </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default Parametres;
