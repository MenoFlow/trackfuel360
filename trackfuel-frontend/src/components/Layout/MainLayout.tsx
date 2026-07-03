import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LanguageSelector } from './LanguageSelector';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, 
  Car, 
  Fuel, 
  AlertTriangle, 
  FileText, 
  Settings,
  LogOut,
  Menu,
  FileEdit,
  Map,  
  BarChart3,
  ChevronLeft,
  ChevronRight,
  User,
  ClipboardList,
  Wrench,
  FileCheck,
  CalendarDays,
  WalletCards,
  PackageSearch
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ModuleCode, useModules } from '@/hooks/useModules';
import { AppRole } from '@/types';
import { getCurrentRole, roleIncludes } from '@/lib/accessControl';

interface MainLayoutProps {
  children: ReactNode;
}

type NavItem = {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  module?: ModuleCode;
  roles?: AppRole[];
};

type NavGroup = {
  key: string;
  label: string;
  icon: typeof LayoutDashboard;
  items: NavItem[];
};

const getPageTitle = (pathname: string, groups: NavGroup[]) => {
  const exact = groups.flatMap(group => group.items).find(item => item.path === pathname);
  if (exact) return exact.label;
  if (pathname.startsWith('/vehicle/')) return 'Detail vehicule';
  if (pathname.startsWith('/pleins/')) return 'Detail plein';
  if (pathname.startsWith('/trips/')) return 'Trajets';
  return 'Page';
};

const AppBreadcrumb = ({ groups }: { groups: NavGroup[] }) => {
  const location = useLocation();
  if (location.pathname === '/') return null;

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/">Accueil</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{getPageTitle(location.pathname, groups)}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
};

const Sidebar = ({ mobile = false, collapsed = false, onToggleCollapse, onLogoutClick }: { mobile?: boolean; collapsed?: boolean; onToggleCollapse?: () => void; onLogoutClick?: () => void }) => {
  const location = useLocation();
  const { t } = useTranslation();
  const { data: modules = [] } = useModules();
  const currentRole = getCurrentRole();
  const isEnabled = (code?: ModuleCode) => {
    if (!code) return true;
    const module = modules.find(item => item.code === code);
    return module ? module.enabled && module.allowed : true;
  };

  const navGroupDefinitions: NavGroup[] = [
    {
      key: 'home',
      label: 'Accueil',
      icon: LayoutDashboard,
      items: [
        { path: '/', label: t('nav.dashboard'), icon: LayoutDashboard, roles: ['admin', 'manager', 'supervisor', 'auditor'] },
      ],
    },
    {
      key: 'operations',
      label: 'Operations',
      icon: Car,
      items: [
        { path: '/vehicules', label: t('nav.vehicles'), icon: Car, module: 'fleet', roles: ['admin', 'manager', 'supervisor'] },
        { path: '/affectations', label: t('assignments.title'), icon: User, module: 'fleet', roles: ['admin', 'manager', 'supervisor'] },
        { path: '/chauffeurs', label: 'Chauffeurs', icon: User, module: 'drivers', roles: ['admin', 'manager', 'supervisor'] },
        { path: '/missions', label: 'Missions', icon: ClipboardList, module: 'missions', roles: ['admin', 'manager', 'supervisor'] },
        { path: '/planning', label: 'Planning', icon: CalendarDays, module: 'planning', roles: ['admin', 'manager', 'supervisor'] },
      ],
    },
    {
      key: 'fuel_compliance',
      label: 'Carburant & conf.',
      icon: Fuel,
      items: [
        { path: '/pleins', label: t('nav.fuel'), icon: Fuel, module: 'fuel', roles: ['admin', 'manager', 'supervisor'] },
        { path: '/maintenance', label: 'Maintenance', icon: Wrench, module: 'maintenance', roles: ['admin', 'manager', 'supervisor'] },
        { path: '/conformite', label: 'Conformite', icon: FileCheck, module: 'documents', roles: ['admin', 'manager', 'supervisor', 'auditor'] },
        { path: '/parametres/corrections', label: t('nav.corrections'), icon: FileEdit, module: 'fuel', roles: ['admin', 'manager', 'supervisor'] },
      ],
    },
    {
      key: 'analysis',
      label: 'Analyse',
      icon: BarChart3,
      items: [
        { path: '/alertes', label: t('nav.alerts'), icon: AlertTriangle, module: 'reporting', roles: ['admin', 'auditor'] },
        { path: '/rapports', label: t('nav.reports'), icon: FileText, module: 'reporting', roles: ['admin', 'supervisor', 'auditor'] },
        { path: '/comparaison-flotte', label: t('nav.comparison'), icon: BarChart3, module: 'reporting', roles: ['admin', 'auditor', 'supervisor'] },
        { path: '/budgets', label: 'Budgets', icon: WalletCards, module: 'budgets', roles: ['admin', 'manager', 'supervisor', 'auditor'] },
        { path: '/geofence', label: t('nav.map'), icon: Map, module: 'gps', roles: ['admin', 'manager'] },
      ],
    },
    {
      key: 'admin',
      label: 'Administration',
      icon: Settings,
      items: [
        { path: '/atelier-stock', label: 'Atelier / stock', icon: PackageSearch, module: 'workshop_stock', roles: ['admin', 'manager', 'supervisor'] },
        { path: '/parametres', label: t('nav.settings'), icon: Settings, roles: ['admin', 'manager', 'auditor'] },
      ],
    },
  ];

  const navGroups: NavGroup[] = navGroupDefinitions.map(group => ({
    ...group,
    items: group.items.filter(item => roleIncludes(currentRole, item.roles) && isEnabled(item.module)),
  })).filter(group => group.items.length > 0);

  const renderNavButton = (item: NavItem, nested = false) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;

    return (
      <Link key={item.path} to={item.path}>
        <Button
          variant={isActive ? "secondary" : "ghost"}
          className={cn(
            "w-full gap-3 transition-all duration-300",
            collapsed ? "justify-center px-2" : "justify-start",
            nested && !collapsed && "pl-8",
            isActive && "bg-secondary text-secondary-foreground"
          )}
          title={collapsed ? item.label : undefined}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </Button>
      </Link>
    );
  };
  
  return (
    <div className={cn(
      "flex flex-col h-full transition-all duration-300 relative",
      mobile ? "w-full" : collapsed ? "w-20 border-r border-border bg-card" : "w-64 border-r border-border bg-card"
    )}>
      {/* Collapse/Expand Button - Centered on right border (desktop only) */}
      {!mobile && onToggleCollapse && (
        <Button
          variant="outline"
          size="icon"
          className="absolute top-1/2 -translate-y-1/2 -right-4 z-50 h-8 w-8 rounded-full shadow-md bg-card border-border hover:bg-accent"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      )}
      
      <div className={cn(
        "border-b border-border transition-all duration-300 overflow-hidden",
        "min-h-[80px] flex flex-col justify-center",
        collapsed ? "p-4" : "p-6"
      )}>
        {collapsed ? (
          <h1 className="text-xl font-bold text-foreground text-center">TF</h1>
        ) : (
          <>
            <h1 className="text-xl font-bold text-foreground">TrackFuel360</h1>
            <p className="text-xs text-muted-foreground mt-1">{t('appTitle')}</p>
          </>
        )}
      </div>
      
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {collapsed ? (
          navGroups.flatMap(group => group.items).map(item => renderNavButton(item))
        ) : (
          <Accordion type="multiple" defaultValue={navGroups.map(group => group.key)} className="space-y-1">
            {navGroups.map((group) => {
              const GroupIcon = group.icon;
              return (
                <AccordionItem key={group.key} value={group.key} className="border-0">
                  <AccordionTrigger className="rounded-md px-3 py-2 text-sm hover:bg-muted hover:no-underline">
                    <span className="flex min-w-0 items-center gap-3">
                      <GroupIcon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{group.label}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-1 pt-1 space-y-1">
                    {group.items.map(item => renderNavButton(item, true))}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </nav>
      
      <div className={cn(
        "border-t border-border transition-all duration-300",
        collapsed ? "p-2" : "p-3"
      )}>
        <div className={cn(
          "flex items-center gap-1",
          collapsed ? "flex-col" : "justify-between"
        )}>
          <LanguageSelector />
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            title={t('nav.logout')}
            aria-label={t('nav.logout')}
            onClick={onLogoutClick}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    return stored === 'true';
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', collapsed.toString());
  }, [collapsed]);

  const toggleCollapse = () => setCollapsed(prev => !prev);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    window.location.href = '/login';
  };

  const breadcrumbGroups: NavGroup[] = [
    {
      key: 'all',
      label: 'Pages',
      icon: LayoutDashboard,
      items: [
        { path: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
        { path: '/vehicules', label: t('nav.vehicles'), icon: Car },
        { path: '/pleins', label: t('nav.fuel'), icon: Fuel },
        { path: '/chauffeurs', label: 'Chauffeurs', icon: User },
        { path: '/missions', label: 'Missions', icon: ClipboardList },
        { path: '/maintenance', label: 'Maintenance', icon: Wrench },
        { path: '/conformite', label: 'Conformite', icon: FileCheck },
        { path: '/planning', label: 'Planning', icon: CalendarDays },
        { path: '/budgets', label: 'Budgets', icon: WalletCards },
        { path: '/atelier-stock', label: 'Atelier / stock', icon: PackageSearch },
        { path: '/geofence', label: t('nav.map'), icon: Map },
        { path: '/comparaison-flotte', label: t('nav.comparison'), icon: BarChart3 },
        { path: '/affectations', label: t('assignments.title'), icon: User },
        { path: '/alertes', label: t('nav.alerts'), icon: AlertTriangle },
        { path: '/rapports', label: t('nav.reports'), icon: FileText },
        { path: '/parametres/corrections', label: t('nav.corrections'), icon: FileEdit },
        { path: '/parametres', label: t('nav.settings'), icon: Settings },
      ],
    },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block fixed left-0 top-0 h-screen z-40">
        <Sidebar 
          collapsed={collapsed} 
          onToggleCollapse={toggleCollapse} 
          onLogoutClick={() => setShowLogoutConfirm(true)}
        />
      </aside>
      
      {/* Mobile Sidebar */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <Sidebar mobile onLogoutClick={() => setShowLogoutConfirm(true)} />
          </SheetContent>
        </Sheet>
      </div>
      
      {/* Main Content - DÉCALÉ SELON LA SIDEBAR */}
      <main className={cn(
        "flex-1 overflow-auto transition-all duration-300",
        collapsed ? "md:pl-20" : "md:pl-64"
      )}>
        <div className="w-full min-h-full p-4 md:p-6 pt-16 md:pt-6 app-safe-bottom">
          <AppBreadcrumb groups={breadcrumbGroups} />
          {children}
        </div>
      </main>

      <ConfirmDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        onConfirm={handleLogout}
        title={t('confirm.logout')}
        description={t('confirm.logoutDesc')}
        confirmText={t('nav.logout')}
        icon={LogOut}
      />
    </div>
  );
};
