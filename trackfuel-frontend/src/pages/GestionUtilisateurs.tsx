import { MainLayout } from '@/components/Layout/MainLayout';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useCurrentUser, hasPermission } from '@/hooks/useUsers';
import { useSites } from '@/hooks/useSites';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Users, Plus, Edit, Trash2, Mail, Shield, Filter } from 'lucide-react';
import { useState, useEffect } from 'react';
import { UserFormDialog } from '@/components/Users/UserFormDialog';
import { User } from '@/types';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

const GestionUtilisateurs = () => {
  const { t } = useTranslation();
  const { data: currentUser } = useCurrentUser();
  const { data: users, isLoading } = useUsers();
  const { data: sites } = useSites();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);
  const itemsPerPage = 5;

  // Délai avant d'afficher le message d'accès refusé
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCheckingPermissions(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  if (isCheckingPermissions || (!hasPermission(currentUser, 'manage_users') && currentUser?.role !== 'admin')) {
    if (isCheckingPermissions) {
      return (
        <MainLayout>
          <div className="flex items-center justify-center h-[60vh]">
            <Skeleton className="h-32 w-96" />
          </div>
        </MainLayout>
      );
    }
    if (!hasPermission(currentUser, 'manage_users') && currentUser?.role !== 'admin') {
      return (
        <MainLayout>
          <div className="flex items-center justify-center h-[60vh]">
            <Card className="max-w-md">
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-semibold">{t('users.accessDenied')}</h3>
                  <p className="text-muted-foreground">
                    {t('users.noPermission')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </MainLayout>
      );
    }
  }

const handleCreateUser = async (data: Omit<User, 'id'> & { password: string }) => {
  try {
    await createUser.mutateAsync(data);
    toast.success(t('success.userCreated'));
    setIsFormOpen(false);
  } catch (error) {
    toast.error(t('errors.userCreation'));
  }
};

  const handleUpdateUser = async (data: Omit<User, 'id'>) => {
    if (!editingUser) return;
    try {
      await updateUser.mutateAsync({ id: editingUser.id, data });
      toast.success(t('success.userUpdated'));
      setEditingUser(null);
      setIsFormOpen(false);
    } catch (error) {
      toast.error(t('errors.userUpdate'));
    }
  };

  const handleDeleteUser = () => {
    if (!deletingUser) return;
  
    deleteUser.mutate(deletingUser.id, {
      onSuccess: () => {
        toast.success(t('success.userDeleted'));
        setDeletingUser(null);
      },
      onError: () => {
        toast.error(t('errors.userDelete'));
      },
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'manager':
      case 'supervisor':
        return 'default';
      case 'auditor':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const filteredUsers = users?.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (siteFilter !== 'all' && (u.site_id).toString() !== siteFilter) return false;
    return true;
  });

  const totalPages = Math.ceil((filteredUsers?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers?.slice(startIndex, endIndex);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-bold text-foreground">{t('users.title')}</h1>
            <p className="text-muted-foreground mt-2">
              {filteredUsers?.length || 0} {t('users.inSystem')}
            </p>
          </div>
          <Button 
            className="w-full sm:w-auto"
            onClick={() => {
              setEditingUser(null);
              setIsFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('users.newUser')}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t('common.filters')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('users.role')}</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    <SelectItem value="admin">{t('users.roles.admin')}</SelectItem>
                    <SelectItem value="manager">{t('users.roles.manager')}</SelectItem>
                    {/* <SelectItem value="supervisor">{t('users.roles.supervisor')}</SelectItem> */}
                    <SelectItem value="driver">{t('users.roles.driver')}</SelectItem>
                    <SelectItem value="auditor">{t('users.roles.auditor')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('vehicles.site')}</Label>
                <Select value={siteFilter} onValueChange={setSiteFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    {sites?.map(s => (
                      <SelectItem key={s.id} value={(s.id).toString()}>{s.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {paginatedUsers && paginatedUsers.length > 0 ? (
          <>
            <div className="grid gap-4">
              {paginatedUsers.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 w-full">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-semibold text-foreground">
                          {user.prenom} {user.nom}
                        </h3>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {t(`users.roles.${user.role}` as any)}
                        </Badge>
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                          <Mail className="h-4 w-4 flex-shrink-0" />
                          <span className="break-all">{user.email}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {t('users.matricule')}: {user.matricule}
                        </p>
                        {user.site_id && (
                          <p className="text-sm text-muted-foreground">
                            {t('vehicles.site')}: {user.site_id}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full lg:w-auto justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingUser(user);
                        setIsFormOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">{t('common.edit')}</span>
                    </Button>
                    {currentUser?.id !== user.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingUser(user)}
                      >
                        <Trash2 className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">{t('common.delete')}</span>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
              </Card>
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('users.inSystem')}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <UserFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingUser(null);
        }}
        user={editingUser}
        onSubmit={editingUser ? handleUpdateUser : handleCreateUser}
        isLoading={createUser.isPending || updateUser.isPending}
      />

      <ConfirmDialog
        open={!!deletingUser}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        onConfirm={handleDeleteUser}
        title={t('confirm.deleteUser')}
        description={`${t('confirm.deleteUserDesc')} ${deletingUser?.prenom} ${deletingUser?.nom}?`}
        confirmText={t('common.delete')}
        icon={Trash2}
        isLoading={deleteUser.isPending}
      />
    </MainLayout>
  );
};

export default GestionUtilisateurs;
