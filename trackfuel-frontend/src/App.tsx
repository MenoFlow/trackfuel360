// App.tsx
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { MotionLayout } from "./components/Layout/MotionLayout";

// Pages
import Index from "./pages/Index";
import Vehicules from "./pages/Vehicules";
import VehicleDetail from "./components/Vehicules/vehicle-detail";
import Pleins from "./pages/Pleins";
import PleinDetails from "./pages/PleinDetails";
import Alertes from "./pages/Alertes";
import Rapports from "./pages/Rapports";
import RapportExport from "./pages/RapportExport";
import Parametres from "./pages/Parametres";
import GestionUtilisateurs from "./pages/GestionUtilisateurs";
import GestionCorrections from "./pages/GestionCorrections";
import GestionSites from "./pages/GestionSites";
import Login from "./pages/Login";
import DashboardChauffeur from "./pages/DashboardChauffeur";
import DemandeCorrectionForm from "./components/Chauffeur/DemandeCorrectionForm";
import AjoutPleinForm from "./components/Chauffeur/AjoutPleinForm";
import ComparaisonFlotte from "./pages/ComparaisonFlotte";
import NotFound from "./pages/NotFound";
import { MainLayout } from "./components/Layout/MainLayout";
import { ExportSection } from "./components/Exportation/ExportSection";
import { ImportSection } from "./components/Importation/ImportSection";
import NotificationParameters from "./pages/NotificationParameters";
import { LanguageProvider } from "./contexts/LanguageContext";
import MapView from "./pages/MapView";
import ManualTripEntryMap from "./components/Trip/ManualTripEntryMap";
import Affectations from "./pages/Affectations";
import Header from "./components/Chauffeur/Header";
import { toast } from "./hooks/use-toast";
import Chauffeurs from "./pages/Chauffeurs";
import Missions from "./pages/Missions";
import Maintenance from "./pages/Maintenance";
import Conformite from "./pages/Conformite";
import { ModuleCode, useModuleEnabled } from "./hooks/useModules";
import GestionModules from "./pages/GestionModules";
import Bootstrap from "./pages/Bootstrap";
import Planning from "./pages/Planning";
import Budgets from "./pages/Budgets";
import AtelierStock from "./pages/AtelierStock";
import { AppRole } from "./types";
import { getCurrentUser, roleIncludes } from "./lib/accessControl";

// React Query
const queryClient = new QueryClient();

// Route protection wrapper with role-based access
const ProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}) => {
  const currentUserStr = localStorage.getItem("currentUser");

  if (!currentUserStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const currentUser = JSON.parse(currentUserStr);
    if (currentUser?.role === "driver") currentUser.role = "conducteur";

    if (!roleIncludes(currentUser.role, allowedRoles)) {
      if (currentUser.role === "conducteur") {
        return <Navigate to="/chauffeur" replace />;
      }
        // 👉 Ajout du toast avant la redirection
      toast({
        title: "Accès refusé",
        description: "Vous n’avez pas les permissions nécessaires pour accéder à cette page.",
        variant: "destructive", // ou "default" selon ton design system
      });
      return <Navigate to="/" replace />;
    }

    return <>{children}</>;
  } catch (error) {
    console.error("Error parsing user:", error);
    return <Navigate to="/login" replace />;
  }
};
const currentUser = getCurrentUser();
const ModuleGate = ({ module, children }: { module: ModuleCode; children: React.ReactNode }) => {
  const enabled = useModuleEnabled(module);

  if (!enabled) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const ExportImportPage = () => {
  const isAuditor = getCurrentUser()?.role === "auditor";

  return (
    <MainLayout>
      <div className="space-y-6">
        <MotionLayout variant="slideUp">
          <ExportSection />
        </MotionLayout>
        {!isAuditor && (
          <MotionLayout variant="slideUp">
            <ImportSection />
          </MotionLayout>
        )}
      </div>
    </MainLayout>
  );
};

// Helper to wrap pages with MotionLayout + ProtectedRoute if needed
const withMotion = (
  Component: React.ReactNode,
  variant: "fade" | "slideUp" = "slideUp",
  protect = true,
  allowedRoles?: AppRole[],
  module?: ModuleCode
) =>
  protect ? (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <MotionLayout variant={variant}>
        {module ? <ModuleGate module={module}>{Component}</ModuleGate> : Component}
      </MotionLayout>
    </ProtectedRoute>
  ) : (
    <MotionLayout variant={variant}>{Component}</MotionLayout>
  );
  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    window.location.href = "/login";
  };
  

// Router definition
const router = createBrowserRouter(
  [
    // Public routes
    { path: "/login", element: withMotion(<Login />, "fade", false) },
    { path: "/bootstrap", element: withMotion(<Bootstrap />, "fade", false) },
    { path: "/rapports/export/:token", element: withMotion(<RapportExport />, "slideUp", false) },
    { path: "/trips/driver/:vehiculeId", element: withMotion(<><Header currentUser={currentUser} logout={() => handleLogout()} isDashboard={false} /><ManualTripEntryMap /></>, "slideUp", false) },

    // Admin/Manager routes
    { path: "/", element: withMotion(<Index />, "slideUp", true, ["admin", "manager", "supervisor", "auditor"]) },
    { path: "/vehicules", element: withMotion(<Vehicules />, "slideUp", true, ["admin", "manager", "supervisor"], "fleet") },
    { path: "/vehicle/:id", element: withMotion(<VehicleDetail />, "slideUp", true, ["admin", "manager", "supervisor"], "fleet") },
    { path: "/trips/:vehiculeId", element: withMotion(<MainLayout><ManualTripEntryMap /></MainLayout>, "slideUp", true, ["admin", "manager", "supervisor"], "gps") },
    { path: "/pleins", element: withMotion(<Pleins />, "slideUp", true, ["admin", "manager", "supervisor"], "fuel") },
    { path: "/pleins/:id", element: withMotion(<PleinDetails />, "slideUp", true, ["admin", "manager", "supervisor"], "fuel") },
    { path: "/alertes", element: withMotion(<Alertes />, "slideUp", true, ["admin",  "auditor"]) },
    { path: "/affectations", element: withMotion(<Affectations />, "slideUp", true, ["admin", "manager", "supervisor"]) },
    { path: "/chauffeurs", element: withMotion(<Chauffeurs />, "slideUp", true, ["admin", "manager", "supervisor"], "drivers") },
    { path: "/missions", element: withMotion(<Missions />, "slideUp", true, ["admin", "manager", "supervisor"], "missions") },
    { path: "/maintenance", element: withMotion(<Maintenance />, "slideUp", true, ["admin", "manager", "supervisor"], "maintenance") },
    { path: "/conformite", element: withMotion(<Conformite />, "slideUp", true, ["admin", "manager", "supervisor", "auditor"], "documents") },
    { path: "/planning", element: withMotion(<Planning />, "slideUp", true, ["admin", "manager", "supervisor"], "planning") },
    { path: "/budgets", element: withMotion(<Budgets />, "slideUp", true, ["admin", "manager", "supervisor", "auditor"], "budgets") },
    { path: "/atelier-stock", element: withMotion(<AtelierStock />, "slideUp", true, ["admin", "manager", "supervisor"], "workshop_stock") },
    { path: "/rapports", element: withMotion(<Rapports />, "slideUp", true, ["admin", "supervisor", "auditor"], "reporting") },
    { path: "/parametres", element: withMotion(<Parametres />, "slideUp", true, ["admin", "manager", "auditor"]) },
    { path: "/parametres/utilisateurs", element: withMotion(<GestionUtilisateurs />, "slideUp", true, ["admin", "manager"]) },
    { path: "/parametres/sites", element: withMotion(<GestionSites />, "slideUp", true, ["admin", "manager"]) },
    { path: "/parametres/modules", element: withMotion(<GestionModules />, "slideUp", true, ["admin"]) },
    { path: "/parametres/corrections", element: withMotion(<GestionCorrections />, "slideUp", true, ["admin", "manager", "supervisor"]) },
    {
      path: "/parametres/export_import",
      element: (
        <ProtectedRoute allowedRoles={["admin", "auditor"]}>
          <ExportImportPage />
        </ProtectedRoute>
      ),
    },
    { path: "/parametres/notifications", element: withMotion(<NotificationParameters />, "slideUp", true, ["admin", "manager"]) },

    // Chauffeur routes
    { path: "/chauffeur", element: withMotion(<DashboardChauffeur />, "slideUp", true, ["conducteur"]) },
    { path: "/chauffeur/demande-correction", element: withMotion(<DemandeCorrectionForm />, "slideUp", true, ["conducteur"]) },
    { path: "/chauffeur/ajouter-plein", element: withMotion(<AjoutPleinForm />, "slideUp", true, ["conducteur"]) },

    // Map / Comparison
    { path: "/geofence", element: withMotion(<MapView />, "slideUp", true, ["admin", "manager"], "gps") },
    { path: "/comparaison-flotte", element: withMotion(<ComparaisonFlotte />, "slideUp", true, ["admin", "auditor", "supervisor"], "reporting") },

    // Catch-all
    { path: "*", element: withMotion(<NotFound />, "fade", false) },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
);

// Main App
const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RouterProvider router={router} />
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
