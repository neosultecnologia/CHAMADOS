import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, User, Tag } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type PurchasingTask = {
  id: number;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  assignedToId?: number | null;
  tags: string[];
  dueDate?: string | null;
  position: number;
  createdById: number;
  createdAt: Date;
  updatedAt: Date;
};

const COLUMNS = [
  { id: "todo", title: "A Fazer", color: "bg-gray-500" },
  { id: "quoting", title: "Cotando", color: "bg-blue-500" },
  { id: "awaiting_approval", title: "Aguardando Aprovação", color: "bg-yellow-500" },
  { id: "ordered", title: "Pedido Realizado", color: "bg-purple-500" },
  { id: "received", title: "Recebido", color: "bg-green-500" },
  { id: "completed", title: "Concluído", color: "bg-emerald-600" },
];

const PRIORITY_COLORS = {
  low: "bg-gray-200 text-gray-800",
  medium: "bg-blue-200 text-blue-800",
  high: "bg-orange-200 text-orange-800",
  urgent: "bg-red-200 text-red-800",
};

const PRIORITY_LABELS = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

interface TaskCardProps {
  task: PurchasingTask;
  onClick: (task: PurchasingTask) => void;
}

function TaskCard({ task, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(task)}
      className="mb-2 cursor-pointer"
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-3">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">{task.title}</h4>
            
            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {task.description}
              </p>
            )}

            <div className="flex flex-wrap gap-1">
              <Badge className={PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS]}>
                {PRIORITY_LABELS[task.priority as keyof typeof PRIORITY_LABELS]}
              </Badge>
              
              {task.tags && task.tags.length > 0 && task.tags.map((tag, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {task.dueDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(task.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                </div>
              )}
              
              {task.assignedToId && (
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  ID: {task.assignedToId}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface PurchasingKanbanProps {
  tasks: PurchasingTask[];
  onTaskMove: (taskId: number, newStatus: string) => void;
  onTaskClick: (task: PurchasingTask) => void;
  onCreateTask: (status: string) => void;
}

export function PurchasingKanban({
  tasks,
  onTaskMove,
  onTaskClick,
  onCreateTask,
}: PurchasingKanbanProps) {
  const [activeId, setActiveId] = useState<number | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const taskId = active.id as number;
    const newStatus = over.id as string;

    // Check if dropped on a column
    if (COLUMNS.some(col => col.id === newStatus)) {
      onTaskMove(taskId, newStatus);
    }

    setActiveId(null);
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {COLUMNS.map((column) => {
          const columnTasks = tasks.filter(task => task.status === column.id);
          
          return (
            <div key={column.id} className="flex flex-col min-h-[500px]">
              <Card className="flex-1">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${column.color}`} />
                      {column.title}
                      <Badge variant="secondary" className="ml-1">
                        {columnTasks.length}
                      </Badge>
                    </CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onCreateTask(column.id)}
                      className="h-6 w-6 p-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <SortableContext
                    items={columnTasks.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                    id={column.id}
                  >
                    <div
                      className="min-h-[400px] space-y-2"
                      data-column-id={column.id}
                    >
                      {columnTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onClick={onTaskClick}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {activeTask && (
          <Card className="w-64 rotate-3 shadow-lg">
            <CardContent className="p-3">
              <h4 className="font-medium text-sm">{activeTask.title}</h4>
            </CardContent>
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  );
}
