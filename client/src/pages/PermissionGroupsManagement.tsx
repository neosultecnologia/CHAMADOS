import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Shield, Plus, Pencil, Trash2, Users, ArrowLeft } from 'lucide-react';
import { MODULES } from '@shared/permissions';
import { useLocation } from 'wouter';

interface PermissionGroupForm {
  name: string;
  description: string;
  permissions: Record<string, boolean>;
  isDefault: boolean;
}

const MODULE_LABELS: Record<string, string> = {
  [MODULES.CHAMADOS]: 'Chamados',
  [MODULES.PROJETOS]: 'Projetos',
  [MODULES.RH]: 'RH',
  [MODULES.ECOMMERCE]: 'E-commerce',
  [MODULES.MARKETING]: 'Marketing',
  [MODULES.TECNOLOGIA]: 'Tecnologia',
};

export default function PermissionGroupsManagement() {
  const [, navigate] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [formData, setFormData] = useState<PermissionGroupForm>({
    name: '',
    description: '',
    permissions: {
      [MODULES.CHAMADOS]: false,
      [MODULES.PROJETOS]: false,
      [MODULES.RH]: false,
      [MODULES.ECOMMERCE]: false,
      [MODULES.MARKETING]: false,
      [MODULES.TECNOLOGIA]: false,
    },
    isDefault: false,
  });

  const { data: groups = [], refetch } = trpc.permissionGroups.list.useQuery();
  const createMutation = trpc.permissionGroups.create.useMutation();
  const updateMutation = trpc.permissionGroups.update.useMutation();
  const deleteMutation = trpc.permissionGroups.delete.useMutation();

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome do grupo é obrigatório');
      return;
    }

    try {
      await createMutation.mutateAsync(formData);
      toast.success('Grupo criado com sucesso');
      setIsCreateDialogOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar grupo');
    }
  };

  const handleEdit = async () => {
    if (!editingGroupId) return;
    if (!formData.name.trim()) {
      toast.error('Nome do grupo é obrigatório');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: editingGroupId,
        ...formData,
      });
      toast.success('Grupo atualizado com sucesso');
      setIsEditDialogOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar grupo');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o grupo "${name}"? Os usuários com este grupo perderão a atribuição.`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ id });
      toast.success('Grupo excluído com sucesso');
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir grupo');
    }
  };

  const openEditDialog = (group: any) => {
    setEditingGroupId(group.id);
    setFormData({
      name: group.name,
      description: group.description || '',
      permissions: typeof group.permissions === 'string' 
        ? JSON.parse(group.permissions) 
        : group.permissions,
      isDefault: group.isDefault || false,
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      permissions: {
        [MODULES.CHAMADOS]: false,
        [MODULES.PROJETOS]: false,
        [MODULES.RH]: false,
        [MODULES.ECOMMERCE]: false,
        [MODULES.MARKETING]: false,
        [MODULES.TECNOLOGIA]: false,
      },
      isDefault: false,
    });
    setEditingGroupId(null);
  };

  const togglePermission = (module: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: !prev.permissions[module],
      },
    }));
  };

  const getPermissionCount = (permissions: any) => {
    const perms = typeof permissions === 'string' ? JSON.parse(permissions) : permissions;
    return Object.values(perms).filter(Boolean).length;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003366] via-[#004080] to-[#0059b3] p-8">
      <div className="container max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Shield size={32} />
                Grupos de Permissões
              </h1>
              <p className="text-blue-100 mt-1">
                Gerencie perfis de acesso para facilitar a atribuição de permissões
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsCreateDialogOpen(true);
            }}
            className="bg-[#FFD700] text-[#003366] hover:bg-[#FFC700] font-semibold"
          >
            <Plus size={18} className="mr-2" />
            Novo Grupo
          </Button>
        </div>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group: any) => {
            const permissions = typeof group.permissions === 'string' 
              ? JSON.parse(group.permissions) 
              : group.permissions;
            const permissionCount = getPermissionCount(group.permissions);

            return (
              <Card key={group.id} className="bg-white/95 backdrop-blur-sm hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-[#003366] flex items-center gap-2">
                        <Shield size={20} />
                        {group.name}
                      </CardTitle>
                      {group.description && (
                        <CardDescription className="mt-2">
                          {group.description}
                        </CardDescription>
                      )}
                    </div>
                    {group.isDefault && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                        Padrão
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Permission Count */}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users size={16} />
                      <span>{permissionCount} módulo{permissionCount !== 1 ? 's' : ''} permitido{permissionCount !== 1 ? 's' : ''}</span>
                    </div>

                    {/* Permission List */}
                    <div className="space-y-1">
                      {Object.entries(MODULE_LABELS).map(([module, label]) => (
                        <div key={module} className="flex items-center gap-2 text-sm">
                          <div className={`w-2 h-2 rounded-full ${permissions[module] ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span className={permissions[module] ? 'text-gray-900' : 'text-gray-400'}>
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(group)}
                        className="flex-1"
                      >
                        <Pencil size={14} className="mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(group.id, group.name)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {groups.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Shield size={48} className="mx-auto text-white/50 mb-4" />
              <p className="text-white/70 text-lg">Nenhum grupo criado ainda</p>
              <p className="text-white/50 text-sm mt-2">Crie grupos para facilitar o gerenciamento de permissões</p>
            </div>
          )}
        </div>

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Grupo</DialogTitle>
              <DialogDescription>
                Defina um perfil de permissões que pode ser atribuído a múltiplos usuários
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Nome do Grupo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Suporte, Gerente, Desenvolvedor"
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva o propósito deste grupo"
                  rows={3}
                />
              </div>

              <div>
                <Label className="mb-3 block">Permissões de Módulos</Label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(MODULE_LABELS).map(([module, label]) => (
                    <div key={module} className="flex items-center space-x-2">
                      <Checkbox
                        id={`create-${module}`}
                        checked={formData.permissions[module]}
                        onCheckedChange={() => togglePermission(module)}
                      />
                      <label
                        htmlFor={`create-${module}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isDefault"
                  checked={formData.isDefault}
                  onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked as boolean })}
                />
                <label
                  htmlFor="isDefault"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Marcar como grupo padrão
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="bg-[#003366] hover:bg-[#004080]"
              >
                {createMutation.isPending ? 'Criando...' : 'Criar Grupo'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Grupo</DialogTitle>
              <DialogDescription>
                Atualize as informações e permissões do grupo
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-name">Nome do Grupo *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Suporte, Gerente, Desenvolvedor"
                />
              </div>

              <div>
                <Label htmlFor="edit-description">Descrição</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva o propósito deste grupo"
                  rows={3}
                />
              </div>

              <div>
                <Label className="mb-3 block">Permissões de Módulos</Label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(MODULE_LABELS).map(([module, label]) => (
                    <div key={module} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-${module}`}
                        checked={formData.permissions[module]}
                        onCheckedChange={() => togglePermission(module)}
                      />
                      <label
                        htmlFor={`edit-${module}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-isDefault"
                  checked={formData.isDefault}
                  onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked as boolean })}
                />
                <label
                  htmlFor="edit-isDefault"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Marcar como grupo padrão
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleEdit}
                disabled={updateMutation.isPending}
                className="bg-[#003366] hover:bg-[#004080]"
              >
                {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
