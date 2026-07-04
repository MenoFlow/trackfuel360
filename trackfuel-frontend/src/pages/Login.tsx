import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useUsers } from '@/hooks/useUsers';
import { useTranslation } from 'react-i18next';
import { Fuel, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: users } = useUsers();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

    try {
      const response = await fetch(API_BASE+'/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
  
      const result = await response.json();
  
      if (result.success) {
        localStorage.setItem('currentUser', JSON.stringify(result.user));
        toast({
          title: t('login.successTitle'),
          description: `${t('login.successMessage')} ${result.user.prenom} ${result.user.nom}`,
        });
        navigate(result.user.role === 'conducteur' ? '/chauffeur' : '/');
      } else {
        toast({
          title: t('login.errorTitle'),
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: t('login.errorTitle'),
        description: 'Erreur serveur',
        variant: 'destructive',
      });
    }
  
    setIsLoading(false);
  };
  
 
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-12 h-12 bg-primary rounded-full flex items-center justify-center">
            <Fuel className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">TrackFuel360</CardTitle>
          <CardDescription>
            {t('login.connectToAccess')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('login.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('login.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('login.password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('login.signingIn') : t('login.signIn')}
            </Button>
          </form>
          <p className='text-center mt-4 text-muted-foreground'>Tous droits réservés &copy; {new Date().getFullYear()}</p>
        </CardContent>
      </Card>
    </div>
  );
}
