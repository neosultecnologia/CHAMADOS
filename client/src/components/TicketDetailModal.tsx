import React, { useState, useEffect } from 'react';
import { Ticket } from '@/contexts/TicketsContext';
import { useTickets } from '@/contexts/TicketsContext';
import { useAuth } from '@/contexts/AuthContext';
import { X, Send, Paperclip, AlertCircle, CheckCircle, Clock, Pause, XCircle, User, Briefcase, Tag, Calendar } from 'lucide-react';
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
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0f172a]/90 border border-white/10 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-black/50"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-4">
            <div className={`${statusColor.bg} ${statusColor.text} p-3 rounded-xl shadow-inner`}>
              {statusColor.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  #{ticket.id.split('_')[1]}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar size={12} />
                  {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: ptBR })}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">{ticket.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-0 grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-white/10">
          
          {/* Left Column: Details & Activity */}
          <div className="lg:col-span-2 p-6 space-y-8">
            {/* Description */}
            <div className="bg-white/5 rounded-xl p-5 border border-white/5">
              <h3 className="text-sm font-semibold text-blue-200 mb-3 flex items-center gap-2">
                <Briefcase size={16} />
                Descrição do Problema
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                {ticket.description}
              </p>
            </div>

            {/* Comments */}
            <div>
              <h3 className="text-sm font-semibold text-blue-200 mb-4 flex items-center gap-2">
                <User size={16} />
                Comentários ({ticket.comments.length})
              </h3>
              
              <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {ticket.comments.length === 0 ? (
                  <p className="text-sm text-slate-500 italic text-center py-4">Nenhum comentário ainda.</p>
                ) : (
                  ticket.comments.map((comment) => (
                    <div key={comment.id} className="bg-white/5 border border-white/5 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
                            {comment.author.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-cyan-300">{comment.author}</span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 pl-8">{comment.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="relative">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Escreva um comentário..."
                  className="w-full pl-4 pr-12 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !commentText.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-cyan-500 text-white hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>

            {/* Activity Feed */}
            <div>
              <h3 className="text-sm font-semibold text-blue-200 mb-4">Histórico de Atividades</h3>
              <div className="relative pl-4 border-l border-white/10 space-y-6">
                {ticket.activities.map((activity) => (
                  <div key={activity.id} className="relative">
                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-slate-700 border-2 border-[#0f172a]"></div>
                    <div className="text-xs text-slate-400 mb-0.5">
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: ptBR })}
                    </div>
                    <div className="text-sm text-slate-300">
                      <span className="font-medium text-cyan-400">{activity.author}</span> {activity.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Metadata & Actions */}
          <div className="bg-white/[0.02] p-6 space-y-8">
            {/* Status Control */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 block">Status</label>
              <div className="grid grid-cols-2 gap-2">
                {['Aberto', 'Em Progresso', 'Aguardando', 'Resolvido', 'Fechado'].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                      selectedStatus === status
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                        : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Properties */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Prioridade</label>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/5 border border-white/10 ${priorityColors[ticket.priority]}`}>
                  {ticket.priority}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Categoria</label>
                <div className="flex items-center gap-2 text-slate-300 bg-white/5 px-3 py-2 rounded-lg border border-white/5">
                  <Tag size={14} className="text-slate-500" />
                  {ticket.category}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Setor</label>
                <select
                  value={selectedSector}
                  onChange={(e) => handleSectorChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 focus:outline-none focus:border-cyan-500/50 transition-colors"
                >
                  <option value="TI">TI</option>
                  <option value="RH">RH</option>
                  <option value="Financeiro">Financeiro</option>
                  <option value="Faturamento">Faturamento</option>
                  <option value="Suporte">Suporte</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Responsável</label>
                <select
                  value={selectedAssigned}
                  onChange={(e) => handleAssignChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 focus:outline-none focus:border-cyan-500/50 transition-colors"
                >
                  <option value="">Não atribuído</option>
                  <option value="suporte_1">Suporte 1</option>
                  <option value="suporte_2">Suporte 2</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {/* Attachments */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 block flex justify-between items-center">
                Anexos
                <span className="bg-white/10 text-white px-1.5 py-0.5 rounded text-[10px]">{ticket.attachments.length}</span>
              </label>
              <div className="space-y-2 mb-3">
                {ticket.attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group cursor-pointer">
                    <div className="p-2 rounded bg-blue-500/20 text-blue-400">
                      <Paperclip size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300 truncate font-medium">{attachment.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {formatDistanceToNow(new Date(attachment.uploadedAt), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleAddAttachment}
                className="w-full px-3 py-2 rounded-lg border border-dashed border-slate-600 text-slate-400 hover:bg-white/5 hover:text-white hover:border-slate-400 transition-all flex items-center justify-center gap-2 text-xs font-medium"
              >
                <Paperclip size={14} />
                Adicionar Anexo
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
