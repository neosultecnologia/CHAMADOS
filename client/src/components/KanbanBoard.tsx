import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Project = {
  id: number;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  startDate: number | null;
  endDate: number | null;
  createdByName: string;
};

type KanbanBoardProps = {
  projects: Project[];
  onStatusChange: (projectId: number, newStatus: string) => void;
  onProjectClick: (project: Project) => void;
};

const statusColumns = [
  { id: 'Planejamento', title: 'Planejamento', color: 'bg-blue-500' },
  { id: 'Em Andamento', title: 'Em Andamento', color: 'bg-yellow-500' },
  { id: 'Concluído', title: 'Concluído', color: 'bg-green-500' },
  { id: 'Cancelado', title: 'Cancelado', color: 'bg-red-500' },
];

const priorityColors = {
  baixa: 'bg-gray-500',
  media: 'bg-blue-500',
  alta: 'bg-orange-500',
  urgente: 'bg-red-500',
};

function ProjectCard({ project, isDragging }: { project: Project; isDragging?: boolean }) {
  return (
    <Card
      className={`p-4 mb-3 cursor-pointer hover:shadow-lg transition-shadow ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-sm line-clamp-2">{project.name}</h4>
        <button className="text-gray-400 hover:text-gray-600">
          <MoreVertical size={16} />
        </button>
      </div>

      {project.description && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">{project.description}</p>
      )}

      <div className="flex items-center gap-2 mb-2">
        <Badge className={`text-xs ${priorityColors[project.priority as keyof typeof priorityColors]}`}>
          {project.priority}
        </Badge>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <User size={12} />
          <span className="truncate max-w-[100px]">{project.createdByName}</span>
        </div>
        {project.endDate && (
          <div className="flex items-center gap-1">
            <Calendar size={12} />
            <span>{format(project.endDate, 'dd/MM', { locale: ptBR })}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

function SortableProjectCard({ project, onProjectClick }: { project: Project; onProjectClick: (project: Project) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onProjectClick(project)}
    >
      <ProjectCard project={project} isDragging={isDragging} />
    </div>
  );
}

function KanbanColumn({
  column,
  projects,
  onProjectClick,
}: {
  column: typeof statusColumns[0];
  projects: Project[];
  onProjectClick: (project: Project) => void;
}) {
  return (
    <div className="flex-1 min-w-[280px] max-w-[350px]">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-3 h-3 rounded-full ${column.color}`} />
          <h3 className="font-semibold text-sm">{column.title}</h3>
          <Badge variant="secondary" className="ml-auto">
            {projects.length}
          </Badge>
        </div>
        <div className="h-1 bg-gray-200 rounded-full">
          <div className={`h-full ${column.color} rounded-full`} style={{ width: '100%' }} />
        </div>
      </div>

      <SortableContext items={projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-0">
          {projects.map((project) => (
            <SortableProjectCard
              key={project.id}
              project={project}
              onProjectClick={onProjectClick}
            />
          ))}
        </div>
      </SortableContext>

      {projects.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">
          Nenhum projeto
        </div>
      )}
    </div>
  );
}

export default function KanbanBoard({ projects, onStatusChange, onProjectClick }: KanbanBoardProps) {
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const project = projects.find(p => p.id === event.active.id);
    setActiveProject(project || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveProject(null);
      return;
    }

    const projectId = active.id as number;
    const newStatus = over.id as string;

    // Check if dropped on a different column
    const project = projects.find(p => p.id === projectId);
    if (project && project.status !== newStatus) {
      onStatusChange(projectId, newStatus);
    }

    setActiveProject(null);
  };

  const projectsByStatus = statusColumns.reduce((acc, column) => {
    acc[column.id] = projects.filter(p => p.status === column.id);
    return acc;
  }, {} as Record<string, Project[]>);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 overflow-x-auto pb-4">
        {statusColumns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            projects={projectsByStatus[column.id] || []}
            onProjectClick={onProjectClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeProject ? <ProjectCard project={activeProject} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
