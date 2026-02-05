import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';
import { LogOut, Menu, X, Plus, Search, Filter, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import NotificationBell from '@/components/NotificationBell';
import TicketsList from '@/components/TicketsList';
import ChatBox from '@/components/ChatBox';
import OnlineOperators from '@/components/OnlineOperators';
import CreateTicketModal from '@/components/CreateTicketModal';
import TicketDetailModal from '@/components/TicketDetailModal';

// Type for ticket from database
export type Ticket = {
  id: number;
  ticketId: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  departmentId: number | null;
  createdById: number;
  createdByName: string;
  assignedToId: number | null;
  assignedToName: string | null;
  createdAt: number;
  updatedAt: number;
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    departmentId: undefined as number | undefined,
  });
  const [showChat, setShowChat] = useState(false);
  const [chatMinimized, setChatMinimized] = useState(false);

  // Fetch tickets from database
  const { data: tickets = [], isLoading, refetch } = trpc.tickets.list.useQuery({
    status: filters.status || undefined,
    priority: filters.priority || undefined,
    departmentId: filters.departmentId,
    search: searchQuery || undefined,
  });

  // Fetch announcements and departments
  const { data: announcements = [] } = trpc.announcements.list.useQuery();
  const { data: departments = [] } = trpc.departments.list.useQuery();

  const handleLogout = async () => {
    await logout();
    toast.success('Logout realizado com sucesso');
    setLocation('/');
  };

  const handleTicketCreated = () => {
    setShowCreateModal(false);
    refetch();
    toast.success('Chamado criado com sucesso!');
  };

  const handleTicketUpdated = () => {
    refetch();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003366] to-[#0059b3]">
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
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setLocation('/dashboard')}>
              <img src="/neosul-logo.png" alt="Neosul Logo" className="h-10 w-auto" />
              <div>
                <h1 className="text-xl font-bold text-white">NEROS</h1>
                <p className="text-xs text-blue-200">Help Desk</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-blue-100">
              <span className="text-sm">Bem-vindo,</span>
              <span className="font-semibold text-cyan-400">{user?.name || 'Usuário'}</span>
            </div>
            <NotificationBell />
            <button
              onClick={() => setLocation('/dashboard')}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-blue-100 text-sm transition border border-white/10"
            >
              Voltar ao Portal
            </button>
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
            {user?.role === 'admin' && (
              <a href="#" className="block px-4 py-2 rounded-lg text-blue-100 hover:bg-blue-500/20 transition">
                Administrador
              </a>
            )}
          </nav>

          {/* Announcements */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-4">Avisos</div>
            <div className="space-y-3">
              {announcements.length > 0 ? (
                announcements.slice(0, 4).map((announcement) => {
                  const colorMap: Record<string, string> = {
                    info: 'blue',
                    warning: 'yellow',
                    success: 'green',
                    error: 'red',
                  };
                  const color = colorMap[announcement.type] || 'blue';
                  return (
                    <div key={announcement.id} className={`p-3 rounded-lg bg-${color}-500/10 border border-${color}-500/30`}>
                      <p className={`text-xs text-${color}-200`}>{announcement.title}</p>
                    </div>
                  );
                })
              ) : (
                <>
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <p className="text-xs text-yellow-200">Manutenção programada para amanhã às 22h</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <p className="text-xs text-blue-200">Novo sistema de backup implementado</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <p className="text-xs text-green-200">Todos os sistemas operacionais</p>
                  </div>
                </>
              )}
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
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#0059b3] to-[#00D4FF] text-white font-semibold hover:from-[#003366] hover:to-[#0099CC] transition flex items-center gap-2"
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
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/20 text-white focus:outline-none focus:border-cyan-400 transition"
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
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/20 text-white focus:outline-none focus:border-cyan-400 transition"
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
                      value={filters.departmentId?.toString() || ""}
                      onChange={(e) => setFilters({ ...filters, departmentId: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/20 text-white focus:outline-none focus:border-cyan-400 transition"
                    >
                      <option value="">Todos</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tickets List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              </div>
            ) : (
              <>
                <TicketsList tickets={tickets} onSelectTicket={setSelectedTicket} />

                {tickets.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-blue-200 text-lg">Nenhum chamado encontrado</p>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </main>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateTicketModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleTicketCreated}
        />
      )}

      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onUpdate={handleTicketUpdated}
        />
      )}

      {/* Floating Chat Button */}
      {!showChat && (
        <button
          onClick={() => setShowChat(true)}
          className="fixed bottom-6 right-6 z-50 bg-cyan-500 hover:bg-cyan-600 text-white p-4 rounded-full shadow-lg hover:scale-105 transition-all"
          title="Abrir Chat de Suporte"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/>
          </svg>
        </button>
      )}

      {/* Chat Box */}
      {showChat && (
        <div className="fixed bottom-6 right-6 z-50">
          <ChatBox
            onClose={() => setShowChat(false)}
            minimized={chatMinimized}
            onToggleMinimize={() => setChatMinimized(!chatMinimized)}
            className="shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
