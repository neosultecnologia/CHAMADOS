import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { useTickets } from '@/contexts/TicketsContext';
import { LogOut, Menu, X, Plus, Search, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import TicketsList from '@/components/TicketsList';
import CreateTicketModal from '@/components/CreateTicketModal';
import TicketDetailModal from '@/components/TicketDetailModal';
import { Ticket } from '@/contexts/TicketsContext';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { tickets } = useTickets();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    sector: '',
  });

  const handleLogout = () => {
    logout();
    toast.success('Logout realizado com sucesso');
    setLocation('/');
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = searchQuery === '' || 
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filters.status === '' || ticket.status === filters.status;
    const matchesPriority = filters.priority === '' || ticket.priority === filters.priority;
    const matchesSector = filters.sector === '' || ticket.sector === filters.sector;

    return matchesSearch && matchesStatus && matchesPriority && matchesSector;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Animated background orbs */}
      <div className="fixed top-20 left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
      <div className="fixed bottom-20 right-10 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '2s' }}></div>

      {/* Header */}
      <header className="backdrop-blur-xl bg-white/5 border-b border-white/10 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-white hover:text-cyan-400 transition"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center">
                <span className="text-lg font-bold text-slate-900">NJ</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">NEROS JL</h1>
                <p className="text-xs text-blue-200">Help Desk</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-blue-100">
              <span className="text-sm">Bem-vindo,</span>
              <span className="font-semibold text-cyan-400">{user?.fullName}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <motion.aside
          initial={{ x: -300 }}
          animate={{ x: sidebarOpen ? 0 : -300 }}
          transition={{ duration: 0.3 }}
          className="fixed md:relative md:translate-x-0 w-64 h-[calc(100vh-73px)] backdrop-blur-xl bg-white/5 border-r border-white/10 p-6 overflow-y-auto z-30"
        >
          <nav className="space-y-2">
            <div className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-4">Menu</div>
            <a href="#" className="block px-4 py-2 rounded-lg text-blue-100 hover:bg-blue-500/20 transition">
              Início
            </a>
            <a href="#" className="block px-4 py-2 rounded-lg text-blue-100 hover:bg-blue-500/20 transition">
              Ouvidoria
            </a>
            <a href="#" className="block px-4 py-2 rounded-lg text-blue-100 hover:bg-blue-500/20 transition">
              Documentos e Políticas
            </a>
            <a href="#" className="block px-4 py-2 rounded-lg text-blue-100 hover:bg-blue-500/20 transition">
              Administrador
            </a>
          </nav>

          {/* Announcements */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-4">Avisos</div>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-xs text-yellow-200">Manutenção programada para amanhã às 22h</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <p className="text-xs text-blue-200">Novo sistema de backup implementado</p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                <p className="text-xs text-green-200">Todos os sistemas operacionais</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <p className="text-xs text-purple-200">Atualização de segurança disponível</p>
              </div>
            </div>
          </div>
        </motion.aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Header Section */}
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Central de Sistemas Neosul</h2>
              <p className="text-blue-200">Gerencie seus chamados de suporte técnico de forma eficiente</p>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300" size={20} />
                <input
                  type="text"
                  placeholder="Buscar por título, descrição ou ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-200 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-blue-100 hover:bg-white/20 transition flex items-center gap-2"
                >
                  <Filter size={18} />
                  Filtros
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold hover:from-blue-600 hover:to-cyan-600 transition flex items-center gap-2"
                >
                  <Plus size={18} />
                  Novo Chamado
                </button>
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg p-4 space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-100 mb-2">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-cyan-400 transition"
                    >
                      <option value="">Todos</option>
                      <option value="Aberto">Aberto</option>
                      <option value="Em Progresso">Em Progresso</option>
                      <option value="Aguardando">Aguardando</option>
                      <option value="Resolvido">Resolvido</option>
                      <option value="Fechado">Fechado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-100 mb-2">Prioridade</label>
                    <select
                      value={filters.priority}
                      onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-cyan-400 transition"
                    >
                      <option value="">Todas</option>
                      <option value="Baixa">Baixa</option>
                      <option value="Média">Média</option>
                      <option value="Alta">Alta</option>
                      <option value="Crítica">Crítica</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-100 mb-2">Setor</label>
                    <select
                      value={filters.sector}
                      onChange={(e) => setFilters({ ...filters, sector: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-cyan-400 transition"
                    >
                      <option value="">Todos</option>
                      <option value="TI">TI</option>
                      <option value="RH">RH</option>
                      <option value="Financeiro">Financeiro</option>
                      <option value="Faturamento">Faturamento</option>
                      <option value="Suporte">Suporte</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tickets List */}
            <TicketsList tickets={filteredTickets} onSelectTicket={setSelectedTicket} />

            {filteredTickets.length === 0 && (
              <div className="text-center py-12">
                <p className="text-blue-200 text-lg">Nenhum chamado encontrado</p>
              </div>
            )}
          </motion.div>
        </main>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateTicketModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            toast.success('Chamado criado com sucesso!');
          }}
        />
      )}

      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </div>
  );
}
