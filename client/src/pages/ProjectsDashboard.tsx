import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ArrowLeft,
  Zap,
  Target,
  Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GanttChart } from '@/components/GanttChart';

export default function ProjectsDashboard() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const { data: analytics, isLoading: loadingAnalytics } = trpc.projects.getAnalytics.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: todayTasks, isLoading: loadingTasks } = trpc.projects.getTodayTasks.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: todayDailyTasks = [] } = trpc.dailyTasks.getToday.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: allProjects = [] } = trpc.projects.list.useQuery(
    {},
    { enabled: isAuthenticated }
  );

  if (authLoading || loadingAnalytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#003366] to-[#0059b3] flex items-center justify-center">
        <div className="text-white text-xl">Carregando dashboard...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#003366] to-[#0059b3] flex items-center justify-center">
        <div className="text-white text-xl">Erro ao carregar dados</div>
      </div>
    );
  }

  const statusColors = {
    planejamento: 'bg-blue-500',
    emAndamento: 'bg-yellow-500',
    emPausa: 'bg-orange-500',
    concluido: 'bg-green-500',
    cancelado: 'bg-gray-500',
  };

  const priorityColors = {
    baixa: 'bg-gray-400',
    media: 'bg-blue-400',
    alta: 'bg-orange-400',
    critica: 'bg-red-500',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003366] to-[#0059b3]">
      {/* Header */}
      <header className="bg-[#002244]/50 backdrop-blur-sm border-b border-blue-400/20 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLocation('/dashboard')}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Voltar ao Portal</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-cyan-400" />
              <h1 className="text-xl font-bold text-white">Dashboard de Projetos</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-blue-400/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Target className="w-6 h-6 text-blue-400" />
              </div>
              <span className="text-3xl font-bold text-white">{analytics.total}</span>
            </div>
            <h3 className="text-blue-200 font-medium">Total de Projetos</h3>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-blue-400/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <Zap className="w-6 h-6 text-yellow-400" />
              </div>
              <span className="text-3xl font-bold text-white">{analytics.byStatus.emAndamento}</span>
            </div>
            <h3 className="text-blue-200 font-medium">Em Andamento</h3>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-blue-400/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-500/20 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <span className="text-3xl font-bold text-white">{analytics.overdue}</span>
            </div>
            <h3 className="text-blue-200 font-medium">Atrasados</h3>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-blue-400/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              </div>
              <span className="text-3xl font-bold text-white">{analytics.byStatus.concluido}</span>
            </div>
            <h3 className="text-blue-200 font-medium">Concluídos</h3>
          </motion.div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Status Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-blue-400/20"
          >
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              Distribuição por Status
            </h3>
            <div className="space-y-4">
              {Object.entries(analytics.byStatus).map(([status, count]) => {
                const percentage = analytics.total > 0 ? (count / analytics.total) * 100 : 0;
                const statusLabels: Record<string, string> = {
                  planejamento: 'Planejamento',
                  emAndamento: 'Em Andamento',
                  emPausa: 'Em Pausa',
                  concluido: 'Concluído',
                  cancelado: 'Cancelado',
                };
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-blue-200 font-medium">{statusLabels[status]}</span>
                      <span className="text-white font-bold">{count}</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        className={`h-full ${statusColors[status as keyof typeof statusColors]}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Priority Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-blue-400/20"
          >
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-cyan-400" />
              Distribuição por Prioridade
            </h3>
            <div className="space-y-4">
              {Object.entries(analytics.byPriority).map(([priority, count]) => {
                const percentage = analytics.total > 0 ? (count / analytics.total) * 100 : 0;
                const priorityLabels: Record<string, string> = {
                  baixa: 'Baixa',
                  media: 'Média',
                  alta: 'Alta',
                  critica: 'Crítica',
                };
                return (
                  <div key={priority}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-blue-200 font-medium">{priorityLabels[priority]}</span>
                      <span className="text-white font-bold">{count}</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5, delay: 0.6 }}
                        className={`h-full ${priorityColors[priority as keyof typeof priorityColors]}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Today's Tasks & Critical Projects */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Tasks */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-blue-400/20"
          >
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-400" />
              Tarefas de Hoje
            </h3>
            {loadingTasks ? (
              <div className="text-blue-200">Carregando...</div>
            ) : (todayTasks && todayTasks.length > 0) || todayDailyTasks.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {/* Project Phases */}
                {todayTasks && todayTasks.map((task: any) => (
                  <div
                    key={`phase-${task.id}`}
                    className="bg-white/5 rounded-lg p-4 border border-blue-400/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded">Fase</span>
                          <h4 className="text-white font-medium">{task.name}</h4>
                        </div>
                        <p className="text-blue-200 text-sm">{task.projectName}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        task.priority === 'Crítica' ? 'bg-red-500/20 text-red-300' :
                        task.priority === 'Alta' ? 'bg-orange-500/20 text-orange-300' :
                        task.priority === 'Média' ? 'bg-blue-500/20 text-blue-300' :
                        'bg-gray-500/20 text-gray-300'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))}
                {/* Daily Tasks */}
                {todayDailyTasks.map((task: any) => (
                  <div
                    key={`daily-${task.id}`}
                    className="bg-white/5 rounded-lg p-4 border border-cyan-400/20 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded">Tarefa</span>
                          <h4 className="text-white font-medium">{task.title}</h4>
                        </div>
                        {task.description && (
                          <p className="text-blue-200 text-sm">{task.description}</p>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        task.priority === 'Crítica' ? 'bg-red-500/20 text-red-300' :
                        task.priority === 'Alta' ? 'bg-orange-500/20 text-orange-300' :
                        task.priority === 'Média' ? 'bg-blue-500/20 text-blue-300' :
                        'bg-gray-500/20 text-gray-300'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-blue-200">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma tarefa para hoje</p>
              </div>
            )}
          </motion.div>

          {/* Critical Projects */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-blue-400/20"
          >
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              Projetos Críticos
            </h3>
            {analytics.criticalProjects && analytics.criticalProjects.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {analytics.criticalProjects.map((project: any) => (
                  <div
                    key={project.id}
                    className="bg-white/5 rounded-lg p-4 border border-red-400/20 hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() => setLocation(`/projetos`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-white font-medium">{project.name}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        project.priority === 'Crítica' ? 'bg-red-500/20 text-red-300' :
                        project.priority === 'Alta' ? 'bg-orange-500/20 text-orange-300' :
                        'bg-blue-500/20 text-blue-300'
                      }`}>
                        {project.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-blue-200">
                      <span>Prazo: {project.endDate ? format(new Date(project.endDate), 'dd/MM/yyyy', { locale: ptBR }) : 'Sem prazo'}</span>
                      <span>Progresso: {project.progress || 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-blue-200">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum projeto crítico</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Gantt Chart Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-blue-400/20"
        >
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            Linha do Tempo (Gantt)
          </h3>
          <GanttChart projects={allProjects} />
        </motion.div>
      </main>
    </div>
  );
}
