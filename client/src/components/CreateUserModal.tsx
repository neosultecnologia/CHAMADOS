import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface CreateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateUserModal({ open, onOpenChange }: CreateUserModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    sector: 'TI' as 'TI' | 'RH' | 'Financeiro' | 'Comercial' | 'Suporte' | 'Operações' | 'Outro',
    role: 'user' as 'admin' | 'user',
  });

  const utils = trpc.useUtils();

  const createUserMutation = trpc.userManagement.createUser.useMutation({
    onSuccess: () => {
      toast.success('Usuário criado com sucesso!');
      utils.userManagement.listAll.invalidate();
      onOpenChange(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        sector: 'TI',
        role: 'user',
      });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar usuário');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    createUserMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-br from-[#003366] to-[#0059b3] border-blue-400/30 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Criar Novo Usuário
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white">
              Nome Completo *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Digite o nome completo"
              className="bg-white/10 border-blue-300/30 text-white placeholder:text-blue-200/50"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="usuario@exemplo.com"
              className="bg-white/10 border-blue-300/30 text-white placeholder:text-blue-200/50"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">
              Senha *
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Mínimo 6 caracteres"
              className="bg-white/10 border-blue-300/30 text-white placeholder:text-blue-200/50"
              minLength={6}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sector" className="text-white">
              Setor
            </Label>
            <Select
              value={formData.sector}
              onValueChange={(value: any) => setFormData({ ...formData, sector: value })}
            >
              <SelectTrigger className="bg-white/10 border-blue-300/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TI">TI</SelectItem>
                <SelectItem value="RH">RH</SelectItem>
                <SelectItem value="Financeiro">Financeiro</SelectItem>
                <SelectItem value="Comercial">Comercial</SelectItem>
                <SelectItem value="Suporte">Suporte</SelectItem>
                <SelectItem value="Operações">Operações</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="text-white">
              Papel
            </Label>
            <Select
              value={formData.role}
              onValueChange={(value: any) => setFormData({ ...formData, role: value })}
            >
              <SelectTrigger className="bg-white/10 border-blue-300/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuário</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-transparent border-blue-300 text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createUserMutation.isPending}
              className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-gray-900 font-semibold"
            >
              {createUserMutation.isPending ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
