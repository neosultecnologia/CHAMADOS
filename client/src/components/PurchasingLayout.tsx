import { ReactNode } from 'react';
import { useLocation } from 'wouter';
import { Home, ShoppingCart, Building2, Package, Kanban, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PurchasingLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export default function PurchasingLayout({ children, title, description }: PurchasingLayoutProps) {
  const [location, setLocation] = useLocation();

  const navItems = [
    { name: 'Tarefas Diárias', path: '/compras/tarefas', icon: Kanban },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 min-h-screen bg-slate-900/50 backdrop-blur-sm border-r border-white/10 p-4">
          <div className="mb-6">
            <Button
              variant="ghost"
              className="w-full justify-start text-white hover:bg-white/10"
              onClick={() => setLocation('/dashboard')}
            >
              <ArrowLeft className="mr-2" size={20} />
              Voltar ao Portal
            </Button>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <button
                  key={item.path}
                  onClick={() => setLocation(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">{title}</h1>
            {description && <p className="text-xl text-blue-200">{description}</p>}
          </div>
          
          {children}
        </div>
      </div>
    </div>
  );
}
