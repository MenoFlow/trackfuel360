import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Fuel, LogOut, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OfflineSyncIndicator } from './OfflineSyncIndicator';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '../Layout/LanguageSelector';
import { ThemeToggle } from '../common/ThemeToggle';
import { useState } from 'react';

interface HeaderProps {
  currentUser: {
    prenom: string;
    nom: string;
    matricule: string;
  };
  logout: () => void;
  isDashboard?: boolean;
}

export default function Header({ logout, isDashboard = true }: HeaderProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <div className="mx-4 md:mx-8 px-2 py-3 md:py-4 flex items-center justify-between">
        {/* Partie gauche */}
        <div className="flex items-center gap-2 md:gap-4">
          <div hidden={isDashboard}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/chauffeur')}
            >
              <ArrowLeft className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">{t('common.back')}</span>
            </Button>
          </div>

          <div hidden={!isDashboard} className="flex items-center gap-3">
            <Fuel className="h-6 w-6" />
            <h1 className="text-lg md:text-xl font-bold text-foreground">
              TrackFuel360
            </h1>
          </div>
        </div>

        {/* Partie droite - Desktop */}
        <div className="hidden sm:flex items-center gap-3 md:gap-4">
          <OfflineSyncIndicator />
          <ThemeToggle />
          <LanguageSelector />
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            {t('nav.logout')}
          </Button>
        </div>

        {/* Bouton hamburger - Mobile uniquement */}
        <div className="sm:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>

      {/* Menu mobile déroulant */}
      {mobileMenuOpen && (
  <div className="sm:hidden border-t border-border bg-card">
    <div className="px-4 py-4 space-y-4">

      {/* === 1. Statut de synchronisation === */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <OfflineSyncIndicator />
        </div>
      </div>

      <div className="h-px bg-border" /> {/* Séparateur fin */}

      {/* === 2. Préférences rapides === */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('common.theme')}</span>
          <ThemeToggle />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('common.language')}</span>
          <LanguageSelector />
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* === 3. Déconnexion (mise en évidence) === */}
      <Button
        variant="destructive"
        className="w-full justify-center font-medium"
        size="sm"
        onClick={() => {
          logout();
          setMobileMenuOpen(false);
        }}
      >
        <LogOut className="h-4 w-4 mr-2" />
        {t('nav.logout')}
      </Button>
    </div>
  </div>
)}
    </header>
  );
}