import { useLocation } from 'wouter';
import { Package, Building2, ShoppingCart, TrendingUp, Kanban } from 'lucide-react';

export default function PurchasingHub() {
  const [, setLocation] = useLocation();

  const modules = [
    {
      name: 'Pedidos de Compra',
      icon: <ShoppingCart size={48} />,
      path: '/compras',
      description: 'Gerencie pedidos de compra e aprovações',
      color: 'from-cyan-500 to-blue-500',
    },
    {
      name: 'Fornecedores',
      icon: <Building2 size={48} />,
      path: '/compras/fornecedores',
      description: 'Cadastro e gestão de fornecedores',
      color: 'from-blue-500 to-indigo-500',
    },
    {
      name: 'Produtos',
      icon: <Package size={48} />,
      path: '/compras/produtos',
      description: 'Catálogo de medicamentos e produtos',
      color: 'from-indigo-500 to-purple-500',
    },
    {
      name: 'Tarefas Diárias',
      icon: <Kanban size={48} />,
      path: '/compras/tarefas',
      description: 'Kanban para gestão de tarefas do setor',
      color: 'from-purple-500 to-pink-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Módulo de Compras</h1>
          <p className="text-xl text-blue-200">Gestão completa de compras para distribuidora de medicamentos</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {modules.map((module) => (
            <button
              key={module.path}
              onClick={() => setLocation(module.path)}
              className="group relative bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20 hover:bg-white/15 transition-all hover:scale-105"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-10 rounded-xl transition-opacity`} />
              
              <div className="relative">
                <div className={`inline-flex p-4 rounded-lg bg-gradient-to-br ${module.color} mb-4`}>
                  {module.icon}
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-2">{module.name}</h3>
                <p className="text-slate-300">{module.description}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-green-400" size={24} />
              <h4 className="text-lg font-semibold text-white">Controle de Estoque</h4>
            </div>
            <p className="text-slate-300 text-sm">Monitore níveis de estoque e receba alertas automáticos</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <ShoppingCart className="text-cyan-400" size={24} />
              <h4 className="text-lg font-semibold text-white">Fluxo de Aprovação</h4>
            </div>
            <p className="text-slate-300 text-sm">Sistema de aprovação de pedidos com rastreamento completo</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="text-blue-400" size={24} />
              <h4 className="text-lg font-semibold text-white">Gestão de Fornecedores</h4>
            </div>
            <p className="text-slate-300 text-sm">Cadastro completo com histórico de compras</p>
          </div>
        </div>
      </div>
    </div>
  );
}
