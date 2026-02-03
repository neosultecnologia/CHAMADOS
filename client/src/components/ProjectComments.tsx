import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

interface ProjectCommentsProps {
  projectId: number;
}

export default function ProjectComments({ projectId }: ProjectCommentsProps) {
  const [newComment, setNewComment] = useState("");
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: comments = [] } = trpc.projectComments.listByProject.useQuery({ projectId });

  const createMutation = trpc.projectComments.create.useMutation({
    onSuccess: () => {
      utils.projectComments.listByProject.invalidate({ projectId });
      setNewComment("");
      toast.success("Comentário adicionado");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao adicionar comentário");
    },
  });

  const deleteMutation = trpc.projectComments.delete.useMutation({
    onSuccess: () => {
      utils.projectComments.listByProject.invalidate({ projectId });
      toast.success("Comentário removido");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao remover comentário");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    createMutation.mutate({
      projectId,
      content: newComment,
    });
  };

  const handleDelete = (commentId: number) => {
    if (confirm("Deseja realmente excluir este comentário?")) {
      deleteMutation.mutate({ id: commentId });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4">
      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          placeholder="Adicione um comentário..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[80px]"
        />
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={!newComment.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? "Enviando..." : "Comentar"}
          </Button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4 mt-6">
        {comments.length === 0 ? (
          <p className="text-center text-gray-500 py-4">Nenhum comentário ainda</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 p-4 bg-gray-50 rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-blue-500 text-white text-sm">
                  {getInitials(comment.authorName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{comment.authorName}</span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(comment.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  {user && user.id === comment.authorId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(comment.id)}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
