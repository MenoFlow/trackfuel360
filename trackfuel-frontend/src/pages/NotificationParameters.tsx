// src/pages/NotificationParameters.tsx
import { useState, useEffect } from "react";
import { useParametres } from "@/hooks/useParameter";
import { Parametre } from "@/lib/data/mockData.parametres";
import ParametreCard from "@/components/common/ParametreCard";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { MainLayout } from "@/components/Layout/MainLayout";

const NotificationParameters = () => {
  const { t } = useTranslation();
  const {
    parametres,
    isLoading,
    saveParametres,
    resetParametres,
    isSaving,
    isResetting,
  } = useParametres();

  // Toujours un tableau, même au premier render
  const [localParametres, setLocalParametres] = useState<Parametre[]>([]);

  // SÉCURITÉ : on n'accepte que les tableaux
  useEffect(() => {
    if (Array.isArray(parametres)) {
      setLocalParametres(parametres);
    }
  }, [parametres]);

  const handleChange = (id: string, value: number) => {
    setLocalParametres((prev) =>
      prev.map((p) => (p.id === id ? { ...p, valeur: value } : p))
    );
  };

  const handleSave = () => {
    // Envoie SEULEMENT ce que le backend attend
    const payload = localParametres.map((p) => ({
      id: p.id,
      valeur: p.valeur,
    }));

    saveParametres(payload, {
      onSuccess: () => {
        toast.success(t("notification.toast.saveSuccess"));
      },
      onError: () => {
        toast.error(t("notification.toast.saveError"));
      },
    });
  };

  const handleReset = () => {
    resetParametres(undefined, {
      onSuccess: () => {
        toast.success(t("notification.toast.resetSuccess"));
      },
      onError: () => {
        toast.error(t("notification.toast.resetError"));
      },
    });
  };

  // Chargement
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">
            {t("notification.a11y.loading")}
          </p>
        </div>
      </div>
    );
  }

  // Protection finale : si pas de données
  if (!Array.isArray(localParametres) || localParametres.length === 0) {
    return (
      <MainLayout>
        <div className="p-12 text-center">
          <p className="text-lg text-muted-foreground">
            Aucun paramètre disponible pour le moment.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <header className="">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              {t("notification.page.title")}
            </h2>
            <p className="mt-3 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl">
              {t("notification.page.description")}
            </p>
          </header>

          <main className="pt-6">
            {" "}
            {/* ajoute du padding pour compenser le header fixe */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mb-8">
              {localParametres.map((parametre) => (
                <ParametreCard
                  key={parametre.id}
                  parametre={parametre}
                  value={parametre.valeur}
                  onChange={handleChange}
                />
              ))}
            </div>
          </main>

          <footer className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6 sm:pt-8 border-t border-border">
            <Button
              onClick={handleSave}
              disabled={isSaving || isResetting}
              className="flex-1 sm:flex-none min-w-[200px]"
              size="lg"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t("notification.button.saving")}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-5 w-5" />
                  {t("notification.button.save")}
                </>
              )}
            </Button>

            <Button
              onClick={handleReset}
              disabled={isSaving || isResetting}
              variant="secondary"
              className="flex-1 sm:flex-none min-w-[200px]"
              size="lg"
            >
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t("notification.button.resetting")}
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-5 w-5" />
                  {t("notification.button.reset")}
                </>
              )}
            </Button>
          </footer>
        </main>
      </div>
    </MainLayout>
  );
};

export default NotificationParameters;
