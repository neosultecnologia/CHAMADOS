import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Home, Edit, Trash2, AlertCircle, Info, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type AnnouncementType = "info" | "warning" | "success" | "error";

export default function Announcements() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "info" as AnnouncementType,
    expiresAt: "",
  });

  const { data: announcements = [], refetch } = trpc.announcements.list.useQuery();
  const createMutation = trpc.announcements.create.useMutation({
    onSuccess: () => {
      toast.success("Notícia criada com sucesso!");
      refetch();
      resetForm();
    },
    onError: () => toast.error("Erro ao criar notícia"),
  });
  const updateMutation = trpc.announcements.update.useMutation({
    onSuccess: () => {
      toast.success("Notícia atualizada com sucesso!");
      refetch();
      resetForm();
    },
    onError: () => toast.error("Erro ao atualizar notícia"),
  });
  const deleteMutation = trpc.announcements.delete.useMutation({
    onSuccess: () => {
      toast.success("Notícia excluída com sucesso!");
      refetch();
    },
    onError: () => toast.error("Erro ao excluir notícia"),
  });

  const resetForm = () => {
    setFormData({ title: "", content: "", type: "info", expiresAt: "" });
    setShowCreateModal(false);
    setEditingId(null);
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    const data = {
      title: formData.title,
      content: formData.content || undefined,
      type: formData.type,
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt).getTime() : undefined,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (announcement: any) => {
    setEditingId(announcement.id);
    setFormData({
      title: announcement.title,
      content: announcement.content || "",
      type: announcement.type,
      expiresAt: announcement.expiresAt 
        ? format(new Date(announcement.expiresAt), "yyyy-MM-dd'T'HH:mm")
        : "",
    });
    setShowCreateModal(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta notícia?")) {
      deleteMutation.mutate({ id });
    }
  };

  const getTypeIcon = (type: AnnouncementType) => {
    switch (type) {
      case "info": return <Info className="h-4 w-4" />;
      case "warning": return <AlertCircle className="h-4 w-4" />;
      case "success": return <CheckCircle className="h-4 w-4" />;
      case "error": return <XCircle className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: AnnouncementType) => {
    const styles = {
      info: "bg-blue-100 text-blue-800 border-blue-300",
      warning: "bg-yellow-100 text-yellow-800 border-yellow-300",
      success: "bg-green-100 text-green-800 border-green-300",
      error: "bg-red-100 text-red-800 border-red-300",
    };
    return styles[type];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003366] via-[#004080] to-[#0059b3] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Gerenciamento de Notícias</h1>
            <p className="text-blue-100">Gerencie os avisos exibidos na página inicial</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => window.location.href = '/dashboard'}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Home className="h-4 w-4 mr-2" />
              Voltar ao Início
            </Button>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-white text-[#003366] hover:bg-blue-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Notícia
            </Button>
          </div>
        </div>

        {/* Announcements List */}
        <div className="space-y-4">
          {announcements.length === 0 ? (
            <Card className="bg-white/95 backdrop-blur border-none">
              <CardContent className="py-12 text-center">
                <Info className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nenhuma notícia cadastrada</p>
                <Button onClick={() => setShowCreateModal(true)} className="mt-4 bg-[#003366] hover:bg-[#004080]">
                  Criar Primeira Notícia
                </Button>
              </CardContent>
            </Card>
          ) : (
            announcements.map((announcement: any) => (
              <Card key={announcement.id} className="bg-white/95 backdrop-blur border-none shadow-lg">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${getTypeBadge(announcement.type)}`}>
                        {getTypeIcon(announcement.type)}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{announcement.title}</CardTitle>
                        {announcement.content && (
                          <p className="text-gray-600 text-sm">{announcement.content}</p>
                        )}
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                          <span>
                            Criado em {format(new Date(announcement.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                          {announcement.expiresAt && (
                            <span>
                              Expira em {format(new Date(announcement.expiresAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(announcement)}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(announcement.id)}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>

        {/* Create/Edit Modal */}
        <Dialog open={showCreateModal} onOpenChange={(open) => !open && resetForm()}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Notícia" : "Nova Notícia"}</DialogTitle>
              <DialogDescription>
                Preencha as informações da notícia que será exibida na página inicial
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Título *</label>
                <Input
                  placeholder="Digite o título da notícia"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Conteúdo</label>
                <Textarea
                  placeholder="Digite o conteúdo da notícia (opcional)"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={4}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Tipo</label>
                <Select value={formData.type} onValueChange={(value: AnnouncementType) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Informação</SelectItem>
                    <SelectItem value="warning">Aviso</SelectItem>
                    <SelectItem value="success">Sucesso</SelectItem>
                    <SelectItem value="error">Erro/Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Data de Expiração (opcional)</label>
                <Input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Deixe em branco para que a notícia não expire
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-[#003366] hover:bg-[#004080]"
                >
                  {editingId ? "Salvar Alterações" : "Criar Notícia"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
