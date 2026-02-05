import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';
import { 
  MessageSquare, 
  User, 
  Globe, 
  ShoppingBag, 
  Zap, 
  Search, 
  LogOut, 
  Sun, 
  UserCircle,
  Settings,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Package
} from 'lucide-react';
import { motion } from 'framer-motion';
import { hasModulePermission, MODULES } from '@shared/permissions';

export default function PortalDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch announcements from database
  const { data: announcements = [] } = trpc.announcements.list.useQuery();

  const handleLogout = async () => {
    await logout();
    setLocation('/');
  };

  const allModules = [
    { 
      id: 'chamados', 
      name: 'Chamados', 
      icon: <MessageSquare size={32} />, 
      path: '/chamados',
      description: 'Suporte Técnico'
    },
    { 
      id: 'projetos', 
      name: 'Projetos', 
      icon: <Zap size={32} />, 
      path: '/projetos',
      description: 'Gerenciamento de Projetos'
    },
    { 
      id: 'rh', 
      name: 'RH', 
      icon: <User size={32} />, 
      path: '/modulo/rh',
      description: 'Recursos Humanos'
    },
    { 
      id: 'ecommerce', 
      name: 'E-commerce', 
      icon: <Globe size={32} />, 
      path: '/modulo/ecommerce',
      description: 'Loja Virtual'
    },
    { 
      id: 'marketing', 
      name: 'Marketing', 
      icon: <ShoppingBag size={32} />, 
      path: '/modulo/marketing',
      description: 'Campanhas e Mídia'
    },
    { 
      id: 'tecnologia', 
      name: 'Tecnologia', 
      icon: <Zap size={32} />, 
      path: '/modulo/tecnologia',
      description: 'Infraestrutura'
    },
    { 
      id: 'estoque', 
      name: 'Estoque de TI', 
      icon: <Package size={32} />, 
      path: user?.role === 'admin' ? '/estoque/admin' : '/estoque',
      description: 'Gerenciamento de Equipamentos'
    },
  ];

  // Filter modules based on user permissions
  const modules = allModules.filter(module => {
    const moduleKey = module.id.toUpperCase() as keyof typeof MODULES;
    const modulePermission = MODULES[moduleKey];
    return modulePermission ? hasModulePermission(user, modulePermission) : true;
  });

  // Default notices if no announcements
  const defaultNotices = [
    "Manutenção programada - 18/06 as 22h",
    "Nova política interna disponível",
    "Indicadores atualizados do mês"
  ];

  const getNoticeIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="text-yellow-400" size={14} />;
      case 'error': return <AlertCircle className="text-red-400" size={14} />;
      case 'success': return <CheckCircle className="text-green-400" size={14} />;
      default: return <Info className="text-cyan-400" size={14} />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0047AB] relative overflow-hidden flex flex-col">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#003366] via-[#0059b3] to-[#00D4FF] opacity-100"></div>
        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-blue-400/20 rounded-full blur-[120px] mix-blend-overlay"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[80%] h-[80%] bg-cyan-400/20 rounded-full blur-[120px] mix-blend-overlay"></div>
      </div>

      {/* Header */}
      <header className="relative z-20 w-full px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/neosul-logo.png" alt="Neosul Logo" className="h-10 w-auto" />
          <h1 className="text-xl font-bold text-white tracking-wider">NEROS JL</h1>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-blue-100">
          <button onClick={() => setLocation('/dashboard')} className="text-white hover:text-white transition">Início</button>
          <button className="hover:text-white transition opacity-80">Ouvidoria</button>
          <button className="hover:text-white transition opacity-80">Documentos e Políticas</button>
          {user?.role === 'admin' && (
            <>
              <button 
                onClick={() => setLocation('/admin/usuarios')}
                className="hover:text-white transition opacity-80 flex items-center gap-1"
              >
                <Settings size={14} /> Usuários
              </button>
              <button 
                onClick={() => setLocation('/admin/noticias')}
                className="hover:text-white transition opacity-80 flex items-center gap-1"
              >
                <Info size={14} /> Notícias
              </button>
            </>
          )}
        </nav>

        <div className="flex items-center gap-4 text-white">
          <span className="text-sm text-blue-100 hidden md:block">
            {user?.name || 'Usuário'}
          </span>
          <button className="p-2 hover:bg-white/10 rounded-full transition opacity-80 hover:opacity-100">
            <UserCircle size={20} />
          </button>
          <button className="p-2 hover:bg-white/10 rounded-full transition opacity-80 hover:opacity-100">
            <Sun size={20} />
          </button>
          <button 
            onClick={handleLogout}
            className="p-2 hover:bg-white/10 rounded-full transition opacity-80 hover:opacity-100"
            title="Sair"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 container mx-auto px-8 py-12 flex flex-col">
        
        {/* Hero Section */}
        <div className="mb-16 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Central de Sistemas Neosul
          </h1>
          <p className="text-lg text-blue-100 opacity-90 font-light">
            Acesse os sistemas, ferramentas e informações disponíveis para o seu perfil.
          </p>
        </div>

        {/* Search Bar */}
        <div className="w-full max-w-4xl mb-20 relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="text-blue-200" size={20} />
          </div>
          <input 
            type="text" 
            placeholder="Pesquise aqui o que você necessita" 
            className="w-full py-4 pl-12 pr-6 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-blue-200 focus:outline-none focus:bg-white/20 focus:border-white/40 transition-all shadow-lg"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Modules Grid */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-white mb-8">Acessos rápidos</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-12">
              {modules.map((module, index) => (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => module.path !== '#' && setLocation(module.path)}
                  className={`flex flex-col items-center group cursor-pointer ${module.path === '#' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="w-16 h-16 mb-4 rounded-2xl border border-white/20 flex items-center justify-center text-white group-hover:bg-white/10 group-hover:scale-110 transition-all duration-300 shadow-lg shadow-blue-900/20">
                    {module.icon}
                  </div>
                  <span className="text-white font-medium text-sm tracking-wide">{module.name}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Notices Panel */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-bold text-white mb-8">Avisos Importantes</h2>
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
              <ul className="space-y-4">
                {announcements.length > 0 ? (
                  announcements.map((announcement) => (
                    <li key={announcement.id} className="flex items-start gap-3 text-sm text-blue-50 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                      {getNoticeIcon(announcement.type)}
                      <div className="flex-1">
                        <span className="font-medium">{announcement.title}</span>
                        {announcement.content && (
                          <p className="text-xs text-blue-200 mt-1 opacity-80">{announcement.content}</p>
                        )}
                      </div>
                    </li>
                  ))
                ) : (
                  defaultNotices.map((notice, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-blue-50 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0"></span>
                      <span className="opacity-90 font-light">{notice}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 w-full px-8 py-6 border-t border-white/5 text-[10px] text-blue-200/60 flex flex-col md:flex-row justify-between gap-4">
        <div className="max-w-2xl">
          <p>Outras formas de contato fale com nossa equipe pelo telefone 0800 770 4466 ou visite nossas unidades em funcionamento no CEIP - Centro Empresarial e Industrial Palhoça.</p>
        </div>
        <div className="max-w-xl text-right">
          <p>Os serviços de distribuição, logística e atendimento Neosu S.A. Distribuidora Farmacêutica e suas unidades operacionais no Sul do Brasil.</p>
        </div>
      </footer>
    </div>
  );
}
