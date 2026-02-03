import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Search, Calendar, User, Target, Clock } from "lucide-react";
import CreateProjectModal from "@/components/CreateProjectModal";
import EditProjectModal from "@/components/EditProjectModal";
import ProjectComments from "@/components/ProjectComments";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Projects() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<number | null>(null);

  const { data: projects = [], isLoading } = trpc.projects.list.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
    priority: priorityFilter !== "all" ? priorityFilter : undefined,
    search: searchTerm || undefined,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Planejamento": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "Em Andamento": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "Em Pausa": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "Concluído": return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      case "Cancelado": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Crítica": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "Alta": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "Média": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "Baixa": return "bg-green-500/10 text-green-500 border-green-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003366] via-[#004080] to-[#0059b3] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Gerenciamento de Projetos</h1>
          <p className="text-blue-100">Acompanhe o andamento de todos os projetos</p>
        </div>

        {/* Filters */}
        <Card className="mb-6 bg-white/95 backdrop-blur border-none shadow-xl">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar projetos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="Planejamento">Planejamento</SelectItem>
                  <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                  <SelectItem value="Em Pausa">Em Pausa</SelectItem>
                  <SelectItem value="Concluído">Concluído</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Prioridades</SelectItem>
                  <SelectItem value="Crítica">Crítica</SelectItem>
                  <SelectItem value="Alta">Alta</SelectItem>
                  <SelectItem value="Média">Média</SelectItem>
                  <SelectItem value="Baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={() => setShowCreateModal(true)} className="whitespace-nowrap bg-[#003366] hover:bg-[#004080] text-white">
                <Plus className="h-4 w-4 mr-2" />
                Novo Projeto
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-white border-r-transparent"></div>
            <p className="mt-4 text-white">Carregando projetos...</p>
          </div>
        ) : projects.length === 0 ? (
          <Card className="bg-white/95 backdrop-blur border-none">
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum projeto encontrado</p>
              <Button onClick={() => setShowCreateModal(true)} className="mt-4 bg-[#003366] hover:bg-[#004080]">
                Criar Primeiro Projeto
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer bg-white/95 backdrop-blur border-none"
                onClick={() => setSelectedProject(project.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="outline" className={getStatusColor(project.status)}>
                      {project.status}
                    </Badge>
                    <Badge variant="outline" className={getPriorityColor(project.priority)}>
                      {project.priority}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {project.description || "Sem descrição"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="h-4 w-4 mr-2" />
                      <span>{project.ownerName}</span>
                    </div>
                    
                    {project.endDate && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>Prazo: {format(new Date(project.endDate), "dd/MM/yyyy", { locale: ptBR })}</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Progresso</span>
                        <span className="font-semibold">{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Project Detail Modal */}
        {selectedProject && (
          <ProjectDetailModal
            projectId={selectedProject}
            onClose={() => setSelectedProject(null)}
            onEdit={() => {
              setEditingProject(selectedProject);
              setSelectedProject(null);
            }}
          />
        )}

        {/* Create Project Modal */}
        {showCreateModal && (
          <CreateProjectModal 
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => setShowCreateModal(false)}
          />
        )}

        {/* Edit Project Modal */}
        {editingProject && (
          <EditProjectModal
            open={true}
            onOpenChange={(open) => !open && setEditingProject(null)}
            projectId={editingProject}
            onSuccess={() => setEditingProject(null)}
          />
        )}
      </div>
    </div>
  );
}

// Project Detail Modal Component
function ProjectDetailModal({ projectId, onClose, onEdit }: { projectId: number; onClose: () => void; onEdit: () => void }) {
  const { data: project } = trpc.projects.getById.useQuery({ id: projectId });
  const { data: phases = [] } = trpc.projectPhases.listByProject.useQuery({ projectId });

  if (!project) return null;

  const getPhaseStatusColor = (status: string) => {
    switch (status) {
      case "Pendente": return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      case "Em Andamento": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "Concluída": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "Atrasada": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">{project.name}</DialogTitle>
              <DialogDescription className="mt-2">
                {project.description || "Sem descrição"}
              </DialogDescription>
            </div>
            <div className="flex gap-2 items-center">
              <Button size="sm" variant="outline" onClick={onEdit}>
                Editar Projeto
              </Button>
              <Badge variant="outline" className={`${project.status === "Planejamento" ? "bg-blue-500/10 text-blue-500" : project.status === "Em Andamento" ? "bg-green-500/10 text-green-500" : project.status === "Em Pausa" ? "bg-yellow-500/10 text-yellow-500" : project.status === "Concluído" ? "bg-gray-500/10 text-gray-500" : "bg-red-500/10 text-red-500"}`}>
                {project.status}
              </Badge>
              <Badge variant="outline" className={`${project.priority === "Crítica" ? "bg-red-500/10 text-red-500" : project.priority === "Alta" ? "bg-orange-500/10 text-orange-500" : project.priority === "Média" ? "bg-yellow-500/10 text-yellow-500" : "bg-green-500/10 text-green-500"}`}>
                {project.priority}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Project Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações do Projeto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2 text-gray-500" />
                <span className="text-sm text-gray-600 mr-2">Responsável:</span>
                <span className="font-medium">{project.ownerName}</span>
              </div>
              <div className="flex items-center">
                <Target className="h-4 w-4 mr-2 text-gray-500" />
                <span className="text-sm text-gray-600 mr-2">Setor:</span>
                <span className="font-medium">{project.sector}</span>
              </div>
              {project.startDate && (
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="text-sm text-gray-600 mr-2">Início:</span>
                  <span className="font-medium">{format(new Date(project.startDate), "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
              )}
              {project.endDate && (
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="text-sm text-gray-600 mr-2">Prazo:</span>
                  <span className="font-medium">{format(new Date(project.endDate), "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
              )}
              <div className="pt-2">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">Progresso Geral</span>
                  <span className="font-semibold">{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="h-3" />
              </div>
            </CardContent>
          </Card>

          {/* Project Phases Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fases do Projeto</CardTitle>
            </CardHeader>
            <CardContent>
              {phases.length === 0 ? (
                <p className="text-center text-gray-500 py-4">Nenhuma fase cadastrada</p>
              ) : (
                <div className="space-y-4">
                  {phases.map((phase, index) => (
                    <div key={phase.id} className="relative pl-8 pb-4 border-l-2 border-gray-200 last:border-l-0">
                      <div className="absolute left-0 top-0 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-blue-500"></div>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{phase.name}</h4>
                            <Badge variant="outline" className={getPhaseStatusColor(phase.status)}>
                              {phase.status}
                            </Badge>
                          </div>
                          {phase.description && (
                            <p className="text-sm text-gray-600 mb-2">{phase.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            {phase.startDate && (
                              <span>Início: {format(new Date(phase.startDate), "dd/MM/yyyy", { locale: ptBR })}</span>
                            )}
                            {phase.endDate && (
                              <span>Fim: {format(new Date(phase.endDate), "dd/MM/yyyy", { locale: ptBR })}</span>
                            )}
                            {phase.completedAt && (
                              <span className="text-green-600">✓ Concluída em {format(new Date(phase.completedAt), "dd/MM/yyyy", { locale: ptBR })}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comentários</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectComments projectId={projectId} />
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}


