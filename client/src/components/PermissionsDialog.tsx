import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { MODULES, ACTIONS, type UserPermissions, type ModulePermissions } from '@shared/permissions';
import { Eye, Plus, Edit, Trash2 } from 'lucide-react';

interface PermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
  userName: string;
  currentPermissions: any;
}

const MODULE_LABELS: Record<string, string> = {
  [MODULES.CHAMADOS]: 'Chamados (Help Desk)',
  [MODULES.PROJETOS]: 'Projetos',
  [MODULES.RH]: 'RH',
  [MODULES.ECOMMERCE]: 'E-commerce',
  [MODULES.MARKETING]: 'Marketing',
  [MODULES.TECNOLOGIA]: 'Tecnologia',
};

const ACTION_LABELS: Record<string, { label: string; icon: any }> = {
  [ACTIONS.READ]: { label: 'Visualizar', icon: Eye },
  [ACTIONS.CREATE]: { label: 'Criar', icon: Plus },
  [ACTIONS.UPDATE]: { label: 'Editar', icon: Edit },
  [ACTIONS.DELETE]: { label: 'Excluir', icon: Trash2 },
};

function parsePermissions(permissions: any): UserPermissions {
  if (!permissions) return {};
  
  // If it's a JSON string, parse it
  if (typeof permissions === 'string') {
    try {
      permissions = JSON.parse(permissions);
    } catch {
      return {};
    }
  }
  
  // If it's an array (legacy format), convert to new format with full access
  if (Array.isArray(permissions)) {
    const result: any = {};
    for (const module of permissions) {
      result[module] = {
        create: true,
        read: true,
        update: true,
        delete: true,
      };
    }
    return result as UserPermissions;
  }
  
  // If it's an object with boolean values (semi-legacy), convert to granular
  if (typeof permissions === 'object') {
    const result: any = {};
    for (const [module, value] of Object.entries(permissions)) {
      if (typeof value === 'boolean') {
        result[module] = {
          create: value,
          read: value,
          update: value,
          delete: value,
        };
      } else if (typeof value === 'object' && value !== null) {
        result[module] = value as ModulePermissions;
      }
    }
    return result as UserPermissions;
  }
  
  return {};
}

export function PermissionsDialog({
  open,
  onOpenChange,
  userId,
  userName,
  currentPermissions,
}: PermissionsDialogProps) {
  const [permissions, setPermissions] = useState<UserPermissions>(() => 
    parsePermissions(currentPermissions)
  );
  const utils = trpc.useUtils();

  // Update permissions when dialog opens with new data
  useEffect(() => {
    if (open) {
      setPermissions(parsePermissions(currentPermissions));
    }
  }, [open, currentPermissions]);

  const updatePermissionsMutation = trpc.users.updatePermissions.useMutation({
    onSuccess: () => {
      toast.success('Permissões atualizadas com sucesso!');
      utils.userManagement.listAll.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleToggleAction = (module: string, action: string) => {
    setPermissions(prev => {
      const modulePerms = (prev as any)[module] || { create: false, read: false, update: false, delete: false };
      return {
        ...prev,
        [module]: {
          ...modulePerms,
          [action]: !modulePerms[action],
        },
      };
    });
  };

  const handleToggleModule = (module: string) => {
    const modulePerms = (permissions as any)[module];
    const hasAnyPermission = modulePerms && (modulePerms.create || modulePerms.read || modulePerms.update || modulePerms.delete);
    
    // If any permission is enabled, disable all; otherwise enable all
    setPermissions(prev => ({
      ...prev,
      [module]: {
        create: !hasAnyPermission,
        read: !hasAnyPermission,
        update: !hasAnyPermission,
        delete: !hasAnyPermission,
      },
    }));
  };

  const handleSave = () => {
    updatePermissionsMutation.mutate({
      userId,
      permissions: permissions as any,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-br from-[#003366] to-[#0059b3] border-blue-400/30 text-white max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Gerenciar Permissões - {userName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-blue-100">
            Selecione as ações específicas que este usuário pode realizar em cada módulo:
          </p>

          <div className="space-y-4">
            {Object.values(MODULES).map((module) => {
              const modulePerms = (permissions as any)[module] || { create: false, read: false, update: false, delete: false };
              const hasAnyPermission = modulePerms.create || modulePerms.read || modulePerms.update || modulePerms.delete;
              
              return (
                <div key={module} className="bg-white/5 rounded-lg p-4 space-y-3">
                  {/* Module Header with Toggle All */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id={`module-${module}`}
                        checked={hasAnyPermission}
                        onCheckedChange={() => handleToggleModule(module)}
                        className="border-blue-300"
                      />
                      <Label
                        htmlFor={`module-${module}`}
                        className="text-white font-semibold cursor-pointer text-lg"
                      >
                        {MODULE_LABELS[module] || module}
                      </Label>
                    </div>
                  </div>

                  {/* Action Permissions */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pl-8">
                    {Object.entries(ACTION_LABELS).map(([action, { label, icon: Icon }]) => (
                      <div
                        key={action}
                        className="flex items-center space-x-2 p-2 bg-white/5 rounded hover:bg-white/10 transition-colors"
                      >
                        <Checkbox
                          id={`${module}-${action}`}
                          checked={modulePerms[action as keyof ModulePermissions] || false}
                          onCheckedChange={() => handleToggleAction(module, action)}
                          className="border-blue-300"
                        />
                        <Label
                          htmlFor={`${module}-${action}`}
                          className="text-white cursor-pointer flex items-center gap-1.5 text-sm"
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-transparent border-blue-300 text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={updatePermissionsMutation.isPending}
              className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-gray-900 font-semibold"
            >
              {updatePermissionsMutation.isPending ? 'Salvando...' : 'Salvar Permissões'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
