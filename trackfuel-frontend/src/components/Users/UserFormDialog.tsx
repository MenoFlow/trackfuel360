import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User } from "@/types";
import { useState, useEffect } from "react";
import { useSites } from "@/hooks/useSites";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSubmit: (data: Omit<User, "id">) => void;
  isLoading: boolean;
}

export const UserFormDialog = ({
  open,
  onOpenChange,
  user,
  onSubmit,
  isLoading,
}: UserFormDialogProps) => {
  const { t } = useTranslation();
  const { data: sites } = useSites();
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [formData, setFormData] = useState<Omit<User, "id">>({
    email: "",
    matricule: "",
    nom: "",
    prenom: "",
    role: "driver",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        matricule: user.matricule,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
        site_id: user.site_id ?? null,
      });
      setPassword("");
    } else {
      setFormData({
        email: "",
        matricule: "",
        nom: "",
        prenom: "",
        role: "driver",
      });
      setPassword("");
    }
    setShowPassword(false);
  }, [user, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  
    const data = {
      ...formData,
      site_id: formData.site_id ?? null,
      password: user ? (password || undefined) : password, // CRÉATION → obligatoire
    };
  
    // Supprime password si vide en édition
    if (user && !password) {
      delete (data as any).password;
    }
  
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {user ? t("users.editUser") : t("users.newUser")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prenom">{t("users.firstName")}</Label>
              <Input
                id="prenom"
                value={formData.prenom}
                onChange={(e) =>
                  setFormData({ ...formData, prenom: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nom">{t("users.lastName")}</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) =>
                  setFormData({ ...formData, nom: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t("users.email")}</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="matricule">{t("users.matricule")}</Label>
            <Input
              id="matricule"
              value={formData.matricule}
              onChange={(e) =>
                setFormData({ ...formData, matricule: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              {t("users.password")} {user && `(${t("common.new")})`}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("users.passwordPlaceholder")}
                required={!user}
                minLength={6}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                title={
                  showPassword
                    ? t("users.hidePassword")
                    : t("users.showPassword")
                }
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {password && password.length < 6 && (
              <p className="text-xs text-destructive">
                {t("users.passwordMinLength")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">{t("users.role")}</Label>
            <Select
              value={formData.role}
              onValueChange={(value) =>
                setFormData({ ...formData, role: value as User["role"] })
              }
            >
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{t("users.roles.admin")}</SelectItem>
                <SelectItem value="manager">
                  {t("users.roles.manager")}
                </SelectItem>
                {/* <SelectItem value="supervisor">
                  {t("users.roles.supervisor")}
                </SelectItem> */}
                <SelectItem value="driver">
                  {t("users.roles.driver")}
                </SelectItem>
                <SelectItem value="auditor">
                  {t("users.roles.auditor")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(
            formData.role === "driver") && (
            <div className="space-y-2">
              <Label htmlFor="site">
                {t("vehicles.site")} ({t("common.new")})
              </Label>
              <Select
                value={formData.site_id?.toString() ?? ""}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    site_id:
                      (value === "" || "aucun") ? null : parseInt(value),
                  })
                }
              >
                <SelectTrigger id="site">
                  <SelectValue placeholder={t("vehicles.site")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aucun">{t("common.none")}</SelectItem>
                  {sites?.map((site) => (
                    <SelectItem key={site.id} value={site.id.toString()}>
                      {site.nom} - {site.ville}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isLoading || (password && password.length < 6)}
            >
              {isLoading
                ? t("common.loading")
                : user
                ? t("common.edit")
                : t("common.add")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
