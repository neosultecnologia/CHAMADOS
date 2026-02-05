import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface CreateTicketModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateTicketModal({ onClose, onSuccess }: CreateTicketModalProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [errors, setErrors] = useState<Record<string, string>>({}); 
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Técnico' as const,
    priority: 'Média' as const,
    departmentId: undefined as number | undefined,
    assignedToId: undefined as number | undefined,
  });

  const { data: departments = [] } = trpc.departments.list.useQuery();
  const { data: users = [] } = trpc.userManagement.listAll.useQuery();
  const approvedUsers = users.filter(u => u.approvalStatus === 'approved');

  const createTicketMutation = trpc.tickets.create.useMutation({
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      toast.error('Erro ao criar chamado: ' + error.message);
    },
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Título é obrigatório';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    createTicketMutation.mutate({
      title: formData.title,
      description: formData.description,
      category: formData.category,
      priority: formData.priority,
      departmentId: formData.departmentId,
      assignedToId: formData.assignedToId,
    });
  };

  const isLoading = createTicketMutation.isPending;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Novo Chamado</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg text-blue-200 hover:text-white transition"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-blue-100 mb-2">
              Título do Chamado *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Descreva brevemente o problema"
              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-200 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition"
              disabled={isLoading}
            />
            {errors.title && (
              <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={14} /> {errors.title}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-100 mb-2">
              Descrição Detalhada *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Forneça detalhes completos sobre o problema"
              rows={5}
              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-200 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition resize-none"
              disabled={isLoading}
            />
            {errors.description && (
              <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={14} /> {errors.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-blue-100 mb-2">
                Categoria
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/20 text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition"
                disabled={isLoading}
              >
                <option value="Técnico">Técnico</option>
                <option value="Acesso">Acesso</option>
                <option value="Funcionalidade">Funcionalidade</option>
                <option value="Dúvida">Dúvida</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-100 mb-2">
                Prioridade
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/20 text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition"
                disabled={isLoading}
              >
                <option value="Baixa">Baixa</option>
                <option value="Média">Média</option>
                <option value="Alta">Alta</option>
                <option value="Crítica">Crítica</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-100 mb-2">
                Setor (opcional)
              </label>
              <select
                value={formData.departmentId?.toString() || ""}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/20 text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition"
                disabled={isLoading}
              >
                <option value="">Sem setor</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-blue-100 mb-2">
                  Atribuir para (opcional)
                </label>
                <select
                  value={formData.assignedToId?.toString() || ""}
                  onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/20 text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition"
                  disabled={isLoading}
                >
                  <option value="">Não atribuir</option>
                  {approvedUsers.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2 px-4 rounded-lg bg-gradient-to-r from-[#0059b3] to-[#00D4FF] text-white font-semibold hover:from-[#003366] hover:to-[#0099CC] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Chamado'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-2 px-4 rounded-lg border border-blue-400 text-blue-400 font-semibold hover:bg-blue-400/10 transition disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
