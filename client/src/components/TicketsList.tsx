import React from 'react';
import { Ticket } from '@/contexts/TicketsContext';
import { motion } from 'framer-motion';
import { AlertCircle, Clock, CheckCircle, Pause, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TicketsListProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
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

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-4"
    >
      {tickets.map((ticket) => {
        const statusColor = statusColors[ticket.status];
        return (
          <motion.div
            key={ticket.id}
            variants={item}
            onClick={() => onSelectTicket(ticket)}
            className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 hover:border-cyan-400/50 transition cursor-pointer group"
          >
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              {/* Left Section */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3 mb-2">
                  <div className={`${statusColor.bg} ${statusColor.text} p-2 rounded-lg flex-shrink-0 mt-1`}>
                    {statusColor.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono text-blue-300 bg-blue-500/20 px-2 py-1 rounded">
                        {ticket.id}
                      </span>
                      <span className={`text-xs font-semibold ${priorityColors[ticket.priority]}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition truncate">
                      {ticket.title}
                    </h3>
                    <p className="text-sm text-blue-200 line-clamp-2 mt-1">
                      {ticket.description}
                    </p>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                    {ticket.category}
                  </span>
                  <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                    {ticket.sector}
                  </span>
                  <span className={`text-xs ${statusColor.bg} ${statusColor.text} px-2 py-1 rounded`}>
                    {ticket.status}
                  </span>
                </div>
              </div>

              {/* Right Section */}
              <div className="flex flex-col items-end gap-2 text-sm text-blue-200">
                <div className="text-right">
                  <p className="text-xs text-blue-300">Criado por</p>
                  <p className="font-semibold text-white">{ticket.createdBy}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-300">
                    {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
                {ticket.assignedTo && (
                  <div className="text-right">
                    <p className="text-xs text-blue-300">Responsável</p>
                    <p className="font-semibold text-cyan-400">{ticket.assignedTo}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
