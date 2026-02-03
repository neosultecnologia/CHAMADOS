import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { MODULES } from '@shared/permissions';

interface PermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
  userName: string;
  currentPermissions: string[];
}

const MODULE_LABELS: Record<string, string> = {
  [MODULES.CHAMADOS]: 'Chamados (Help Desk)',
  [MODULES.PROJETOS]: 'Projetos',
  [MODULES.RH]: 'RH',
  [MODULES.ECOMMERCE]: 'E-commerce',
  [MODULES.MARKETING]: 'Marketing',
  [MODULES.TECNOLOGIA]: 'Tecnologia',
};

export function PermissionsDialog({
  open,
  onOpenChange,
  userId,
  userName,
  currentPermissions,
}: PermissionsDialogProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(currentPermissions);
  const utils = trpc.useUtils();

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

  const handleTogglePermission = (module: string) => {
    setSelectedPermissions(prev =>
      prev.includes(module)
        ? prev.filter(p => p !== module)
        : [...prev, module]
    );
  };

  const handleSave = () => {
    updatePermissionsMutation.mutate({
      userId,
      permissions: selectedPermissions,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-br from-[#003366] to-[#0059b3] border-blue-400/30 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Gerenciar Permissões - {userName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-blue-100">
            Selecione os módulos que este usuário pode acessar:
          </p>

          <div className="space-y-3">
            {Object.values(MODULES).map((module) => (
              <div key={module} className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                <Checkbox
                  id={`permission-${module}`}
                  checked={selectedPermissions.includes(module)}
                  onCheckedChange={() => handleTogglePermission(module)}
                  className="border-blue-300"
                />
                <Label
                  htmlFor={`permission-${module}`}
                  className="text-white cursor-pointer flex-1"
                >
                  {MODULE_LABELS[module] || module}
                </Label>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4">
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
