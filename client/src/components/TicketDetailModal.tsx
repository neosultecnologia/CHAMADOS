import React, { useState, useEffect } from 'react';
import { Ticket } from '@/contexts/TicketsContext';
import { useTickets } from '@/contexts/TicketsContext';
import { useAuth } from '@/contexts/AuthContext';
import { X, Send, Paperclip, AlertCircle, CheckCircle, Clock, Pause, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TicketDetailModalProps {
  ticket: Ticket;
  onClose: () => void;
}

const statusColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  'Aberto': { bg: 'bg-blue-500/20', text: 'text-blue-300', icon: <AlertCircle size={16} /> },
  'Em Progresso': { bg: 'bg-yellow-500/20', text: 'text-yellow-300', icon: <Clock size={16} /> },
  'Aguardando': { bg: 'bg-purple-500/20', text: 'text-purple-300', icon: <Pause size={16} /> },
  'Resolvido': { bg: 'bg-green-500/20', text: 'text-green-300', icon: <CheckCircle size={16} /> },
  'Fechado': { bg: 'bg-gray-500/20', text: 'text-gray-300', icon: <XCircle size={16} /> },
};

const priorityColors: Record<string, string> = {
  'Baixa': 'text-green-400',
  'Média': 'text-yellow-400',
  'Alta': 'text-orange-400',
  'Crítica': 'text-red-400',
};

export default function TicketDetailModal({ ticket: initialTicket, onClose }: TicketDetailModalProps) {
  const { getTicket, updateTicket, addComment, addAttachment, addActivity } = useTickets();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(initialTicket);
  const [commentText, setCommentText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(initialTicket.status);
  const [selectedSector, setSelectedSector] = useState(initialTicket.sector);
  const [selectedAssigned, setSelectedAssigned] = useState(initialTicket.assignedTo || '');
  const [isLoading, setIsLoading] = useState(false);

  // Sync ticket from context when it changes
  useEffect(() => {
    const updatedTicket = getTicket(initialTicket.id);
    if (updatedTicket) {
      setTicket(updatedTicket);
      setSelectedStatus(updatedTicket.status);
      setSelectedSector(updatedTicket.sector);
      setSelectedAssigned(updatedTicket.assignedTo || '');
    }
  }, [getTicket, initialTicket.id]);

  const handleStatusChange = (newStatus: string) => {
    setSelectedStatus(newStatus as any);
    updateTicket(ticket.id, { status: newStatus as any });
    addActivity(ticket.id, {
      type: 'status',
      author: user?.username || 'sistema',
      description: `Alterou o status de "${ticket.status}" para "${newStatus}"`,
    });
    const updated = getTicket(ticket.id);
    if (updated) setTicket(updated);
  };

  const handleSectorChange = (newSector: string) => {
    setSelectedSector(newSector as any);
    updateTicket(ticket.id, { sector: newSector as any });
    addActivity(ticket.id, {
      type: 'sector',
      author: user?.username || 'sistema',
      description: `Alterou o setor de "${ticket.sector}" para "${newSector}"`,
    });
    const updated = getTicket(ticket.id);
    if (updated) setTicket(updated);
  };

  const handleAssignChange = (newAssigned: string) => {
    setSelectedAssigned(newAssigned);
    updateTicket(ticket.id, { assignedTo: newAssigned || undefined });
    addActivity(ticket.id, {
      type: 'assigned',
      author: user?.username || 'sistema',
      description: `Atribuiu o chamado a "${newAssigned || 'ninguém'}"`,
    });
    const updated = getTicket(ticket.id);
    if (updated) setTicket(updated);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsLoading(true);
    try {
      addComment(ticket.id, user?.username || 'sistema', commentText);
      setCommentText('');
      const updated = getTicket(ticket.id);
      if (updated) setTicket(updated);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAttachment = () => {
    const fileName = `arquivo_${Date.now()}.pdf`;
    addAttachment(ticket.id, fileName);
    const updated = getTicket(ticket.id);
    if (updated) setTicket(updated);
  };

  const statusColor = statusColors[ticket.status];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className={`${statusColor.bg} ${statusColor.text} p-2 rounded-lg`}>
              {statusColor.icon}
            </div>
            <div>
              <p className="text-xs text-blue-300 font-mono">{ticket.id}</p>
              <h2 className="text-2xl font-bold text-white">{ticket.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg text-blue-200 hover:text-white transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-blue-300 mb-1">Descrição</p>
              <p className="text-white text-sm leading-relaxed">{ticket.description}</p>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-blue-300 mb-1">Prioridade</p>
                <p className={`text-sm font-semibold ${priorityColors[ticket.priority]}`}>
                  {ticket.priority}
                </p>
              </div>
              <div>
                <p className="text-xs text-blue-300 mb-1">Categoria</p>
                <p className="text-sm text-white">{ticket.category}</p>
              </div>
              <div>
                <p className="text-xs text-blue-300 mb-1">Criado em</p>
                <p className="text-sm text-white">
                  {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: ptBR })}
                </p>
              </div>
            </div>
          </div>

          {/* Status Management */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg p-4">
            <p className="text-sm font-semibold text-blue-100 mb-3">Alterar Status</p>
            <div className="flex flex-wrap gap-2">
              {['Aberto', 'Em Progresso', 'Aguardando', 'Resolvido', 'Fechado'].map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                    selectedStatus === status
                      ? 'bg-cyan-500 text-white'
                      : 'bg-white/10 text-blue-200 hover:bg-white/20'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Sector and Assignment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-blue-100 mb-2">Setor</label>
              <select
                value={selectedSector}
                onChange={(e) => handleSectorChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-cyan-400 transition"
              >
                <option value="TI">TI</option>
                <option value="RH">RH</option>
                <option value="Financeiro">Financeiro</option>
                <option value="Faturamento">Faturamento</option>
                <option value="Suporte">Suporte</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-100 mb-2">Responsável</label>
              <select
                value={selectedAssigned}
                onChange={(e) => handleAssignChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-cyan-400 transition"
              >
                <option value="">Não atribuído</option>
                <option value="suporte_1">Suporte 1</option>
                <option value="suporte_2">Suporte 2</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {/* Comments Section */}
          <div>
            <p className="text-sm font-semibold text-blue-100 mb-3">Comentários ({ticket.comments.length})</p>
            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
              {ticket.comments.map((comment) => (
                <div key={comment.id} className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-cyan-400">{comment.author}</p>
                    <p className="text-xs text-blue-300">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                  <p className="text-sm text-blue-100">{comment.content}</p>
                </div>
              ))}
            </div>

            {/* Add Comment */}
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Adicione um comentário..."
                className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-200 focus:outline-none focus:border-cyan-400 transition"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !commentText.trim()}
                className="px-3 py-2 rounded-lg bg-cyan-500 text-white hover:bg-cyan-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} />
              </button>
            </form>
          </div>

          {/* Attachments Section */}
          <div>
            <p className="text-sm font-semibold text-blue-100 mb-3">Anexos ({ticket.attachments.length})</p>
            <div className="space-y-2 mb-3">
              {ticket.attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10">
                  <Paperclip size={16} className="text-blue-300" />
                  <span className="text-sm text-blue-100 flex-1">{attachment.name}</span>
                  <span className="text-xs text-blue-300">
                    {formatDistanceToNow(new Date(attachment.uploadedAt), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={handleAddAttachment}
              className="w-full px-3 py-2 rounded-lg border border-dashed border-blue-300 text-blue-300 hover:bg-blue-500/10 transition flex items-center justify-center gap-2"
            >
              <Paperclip size={16} />
              Selecionar Arquivo
            </button>
          </div>

          {/* Activity Feed */}
          <div>
            <p className="text-sm font-semibold text-blue-100 mb-3">Feed de Atividades</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {ticket.activities.map((activity) => (
                <div key={activity.id} className="flex gap-2 text-xs text-blue-200 p-2 rounded-lg bg-white/5">
                  <span className="text-blue-300 font-mono flex-shrink-0">
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: ptBR })}
                  </span>
                  <span className="flex-1">
                    <span className="text-cyan-400 font-semibold">{activity.author}</span> {activity.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
