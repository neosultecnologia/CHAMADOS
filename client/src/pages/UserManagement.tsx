import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { 
  Loader2, 
  UserCheck, 
  UserX, 
  Shield, 
  User as UserIcon,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Users,
  UserCog,
  Building2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { PermissionsDialog } from '@/components/PermissionsDialog';
import { Settings } from 'lucide-react';

type Tab = 'pending' | 'all';

export default function UserManagement() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [permissionsDialog, setPermissionsDialog] = useState<{ open: boolean; userId: number; userName: string; permissions: string[] } | null>(null);
  const utils = trpc.useUtils();

  const { data: pendingUsers, isLoading: loadingPending } = trpc.userManagement.listPending.useQuery(
    undefined,
    { enabled: isAuthenticated && user?.role === 'admin' }
  );

  const { data: allUsers, isLoading: loadingAll } = trpc.userManagement.listAll.useQuery(
    undefined,
    { enabled: isAuthenticated && user?.role === 'admin' && activeTab === 'all' }
  );

  const approveMutation = trpc.userManagement.approve.useMutation({
    onSuccess: () => {
      toast.success('Usuário aprovado com sucesso!');
      utils.userManagement.listPending.invalidate();
      utils.userManagement.listAll.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const rejectMutation = trpc.userManagement.reject.useMutation({
    onSuccess: () => {
      toast.success('Usuário rejeitado');
      utils.userManagement.listPending.invalidate();
      utils.userManagement.listAll.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateRoleMutation = trpc.userManagement.updateRole.useMutation({
    onSuccess: () => {
      toast.success('Papel do usuário atualizado');
      utils.userManagement.listAll.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.userManagement.delete.useMutation({
    onSuccess: () => {
      toast.success('Usuário excluído');
      utils.userManagement.listPending.invalidate();
      utils.userManagement.listAll.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== 'admin')) {
      setLocation('/dashboard');
    }
  }, [authLoading, isAuthenticated, user, setLocation]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a1628] via-[#1a365d] to-[#0a1628]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            <Clock className="w-3 h-3" />
            Pendente
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Aprovado
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
            <XCircle className="w-3 h-3" />
            Rejeitado
          </span>
        );
      default:
        return null;
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
          <Shield className="w-3 h-3" />
          Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
        <UserIcon className="w-3 h-3" />
        Usuário
      </span>
    );
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#1a365d] to-[#0a1628]">
      {/* Header */}
      <header className="bg-[#0a1628]/80 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLocation('/dashboard')}
                className="flex items-center gap-2 text-blue-200 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Voltar ao Portal</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <UserCog className="w-6 h-6 text-cyan-400" />
              <h1 className="text-xl font-bold text-white">Gerenciamento de Usuários</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'pending'
                ? 'bg-cyan-500 text-white'
                : 'bg-white/10 text-blue-200 hover:bg-white/20'
            }`}
          >
            <Clock className="w-4 h-4" />
            Pendentes
            {pendingUsers && pendingUsers.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {pendingUsers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-cyan-500 text-white'
                : 'bg-white/10 text-blue-200 hover:bg-white/20'
            }`}
          >
            <Users className="w-4 h-4" />
            Todos os Usuários
          </button>
        </div>

        {/* Pending Users Tab */}
        {activeTab === 'pending' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {loadingPending ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              </div>
            ) : pendingUsers && pendingUsers.length > 0 ? (
              pendingUsers.map((pendingUser) => (
                <div
                  key={pendingUser.id}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {pendingUser.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{pendingUser.name}</h3>
                        <p className="text-blue-200 text-sm">{pendingUser.email}</p>
                        <div className="flex items-center gap-3 mt-2">
                          {getStatusBadge(pendingUser.approvalStatus)}
                          {pendingUser.sector && (
                            <span className="inline-flex items-center gap-1 text-xs text-blue-300">
                              <Building2 className="w-3 h-3" />
                              {pendingUser.sector}
                            </span>
                          )}
                        </div>
                        <p className="text-blue-300/60 text-xs mt-2">
                          Cadastrado em: {formatDate(pendingUser.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => approveMutation.mutate({ userId: pendingUser.id })}
                        disabled={approveMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <UserCheck className="w-4 h-4" />
                        Aprovar
                      </button>
                      <button
                        onClick={() => rejectMutation.mutate({ userId: pendingUser.id })}
                        disabled={rejectMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <UserX className="w-4 h-4" />
                        Rejeitar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <CheckCircle2 className="w-16 h-16 text-green-400/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Nenhum usuário pendente</h3>
                <p className="text-blue-200/60">Todos os cadastros foram processados</p>
              </div>
            )}
        </motion.div>
        )}

        {/* All Users Tab */}
        {activeTab === 'all' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {loadingAll ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              </div>
            ) : allUsers && allUsers.length > 0 ? (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left px-6 py-4 text-blue-200 font-medium">Usuário</th>
                      <th className="text-left px-6 py-4 text-blue-200 font-medium">Setor</th>
                      <th className="text-left px-6 py-4 text-blue-200 font-medium">Status</th>
                      <th className="text-left px-6 py-4 text-blue-200 font-medium">Papel</th>
                      <th className="text-left px-6 py-4 text-blue-200 font-medium">Último Acesso</th>
                      <th className="text-right px-6 py-4 text-blue-200 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map((listUser) => (
                      <tr key={listUser.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                              {listUser.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div>
                              <p className="text-white font-medium">{listUser.name}</p>
                              <p className="text-blue-300/60 text-sm">{listUser.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-blue-200">{listUser.sector || '-'}</td>
                        <td className="px-6 py-4">{getStatusBadge(listUser.approvalStatus)}</td>
                        <td className="px-6 py-4">{getRoleBadge(listUser.role)}</td>
                        <td className="px-6 py-4 text-blue-300/60 text-sm">
                          {formatDate(listUser.lastSignedIn)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {listUser.approvalStatus === 'pending' && (
                              <>
                                <button
                                  onClick={() => approveMutation.mutate({ userId: listUser.id })}
                                  className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                                  title="Aprovar"
                                >
                                  <UserCheck className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => rejectMutation.mutate({ userId: listUser.id })}
                                  className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                  title="Rejeitar"
                                >
                                  <UserX className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {listUser.approvalStatus === 'approved' && listUser.id !== user?.id && (
                              <button
                                onClick={() => updateRoleMutation.mutate({ 
                                  userId: listUser.id, 
                                  role: listUser.role === 'admin' ? 'user' : 'admin' 
                                })}
                                className="p-2 text-purple-400 hover:bg-purple-500/20 rounded-lg transition-colors"
                                title={listUser.role === 'admin' ? 'Remover admin' : 'Tornar admin'}
                              >
                                <Shield className="w-4 h-4" />
                              </button>
                            )}
                            {listUser.approvalStatus === 'approved' && listUser.role !== 'admin' && (
                              <button
                                onClick={() => setPermissionsDialog({
                                  open: true,
                                  userId: listUser.id,
                                  userName: listUser.name,
                                  permissions: Array.isArray(listUser.permissions) ? listUser.permissions : [],
                                })}
                                className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                                title="Gerenciar permissões"
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                            )}
                            {listUser.id !== user?.id && (
                              <button
                                onClick={() => {
                                  if (confirm('Tem certeza que deseja excluir este usuário?')) {
                                    deleteMutation.mutate({ userId: listUser.id });
                                  }
                                }}
                                className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-blue-400/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Nenhum usuário cadastrado</h3>
                <p className="text-blue-200/60">Os usuários aparecerão aqui após o cadastro</p>
              </div>
            )}
          </motion.div>
        )}
      </main>

      {permissionsDialog && (
        <PermissionsDialog
          open={permissionsDialog.open}
          onOpenChange={(open) => !open && setPermissionsDialog(null)}
          userId={permissionsDialog.userId}
          userName={permissionsDialog.userName}
          currentPermissions={permissionsDialog.permissions}
        />
      )}
    </div>
  );
}
