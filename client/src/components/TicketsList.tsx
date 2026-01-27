import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Ticket } from '@/pages/Dashboard';

interface TicketsListProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
}

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  'Aberto': { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30' },
  'Em Progresso': { bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500/30' },
  'Aguardando': { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/30' },
  'Resolvido': { bg: 'bg-green-500/20', text: 'text-green-300', border: 'border-green-500/30' },
  'Fechado': { bg: 'bg-slate-500/20', text: 'text-slate-300', border: 'border-slate-500/30' },
};

const priorityColors: Record<string, string> = {
  'Baixa': 'text-green-400',
  'Média': 'text-yellow-400',
  'Alta': 'text-red-400',
  'Crítica': 'text-red-500 font-bold',
};

const priorityBorderColors: Record<string, string> = {
  'Baixa': 'bg-green-500',
  'Média': 'bg-yellow-500',
  'Alta': 'bg-red-500',
  'Crítica': 'bg-red-600',
};

export default function TicketsList({ tickets, onSelectTicket }: TicketsListProps) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  if (tickets.length === 0) {
    return (
      <div className="text-center py-16 bg-[#1e293b]/30 rounded-xl border border-white/5 border-dashed">
        <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Search className="text-slate-500" size={32} />
        </div>
        <h3 className="text-lg font-medium text-white mb-1">Nenhum chamado encontrado</h3>
        <p className="text-slate-400">Tente ajustar seus filtros ou termos de busca</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {tickets.map((ticket) => {
        const statusStyle = statusColors[ticket.status] || statusColors['Aberto'];
        
        return (
          <motion.div
            key={ticket.id}
            variants={item}
            onClick={() => onSelectTicket(ticket)}
            className="group bg-[#1e293b]/60 hover:bg-[#1e293b] border border-white/5 hover:border-blue-500/30 rounded-xl p-5 transition-all cursor-pointer shadow-lg hover:shadow-blue-500/5 relative overflow-hidden"
          >
            {/* Left Accent Border */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${priorityBorderColors[ticket.priority] || 'bg-slate-500'}`}></div>

            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between pl-2">
              {/* Main Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-xs text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded border border-white/5">
                    {ticket.ticketId}
                  </span>
                  <span className={`text-xs font-bold uppercase tracking-wider ${priorityColors[ticket.priority]}`}>
                    {ticket.priority}
                  </span>
                </div>
                
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors truncate pr-4">
                  {ticket.title}
                </h3>
                
                <p className="text-slate-400 text-sm line-clamp-2 mb-4 max-w-3xl">
                  {ticket.description}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                    {ticket.status}
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800/50 text-slate-400 border border-white/5">
                    {ticket.sector}
                  </span>
                </div>
              </div>

              {/* Meta Info (Right Side) */}
              <div className="flex flex-row md:flex-col items-center md:items-end gap-4 md:gap-1 text-right min-w-[140px] border-t md:border-t-0 border-white/5 pt-4 md:pt-0 w-full md:w-auto justify-between md:justify-start">
                <div className="flex flex-col items-start md:items-end">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Criado por</span>
                  <span className="text-sm text-slate-300 font-medium">{ticket.createdByName}</span>
                </div>
                
                <div className="flex flex-col items-start md:items-end">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mt-2">Há cerca de</span>
                  <span className="text-sm text-slate-300">
                    {formatDistanceToNow(new Date(ticket.createdAt), { locale: ptBR })}
                  </span>
                </div>

                <div className="flex flex-col items-start md:items-end">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mt-2">Responsável</span>
                  <span className="text-sm text-blue-400 font-medium">
                    {ticket.assignedToName || 'Não atribuído'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
