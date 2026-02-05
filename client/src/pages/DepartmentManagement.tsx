import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";
import CreateDepartmentModal from "@/components/CreateDepartmentModal";
import EditDepartmentModal from "@/components/EditDepartmentModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Link } from "wouter";

export default function DepartmentManagement() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<any>(null);

  const { data: departments, isLoading, refetch } = trpc.departments.list.useQuery();
  const deleteDepartment = trpc.departments.delete.useMutation({
    onSuccess: () => {
      toast.success("Setor excluído com sucesso");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir setor: ${error.message}`);
    },
  });

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o setor "${name}"? Os usuários deste setor não serão excluídos.`)) {
      deleteDepartment.mutate({ id });
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" fullScreen text="Carregando setores..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003366] via-[#004080] to-[#0059b3] p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard">
              <Button variant="outline" className="mb-4 bg-white/10 border-white/20 text-white hover:bg-white/20">
                ← Voltar ao Portal
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Building2 className="h-8 w-8" />
              Gerenciamento de Setores
            </h1>
            <p className="text-white/80 mt-2">
              Crie e gerencie os setores da empresa
            </p>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Setor
          </Button>
        </div>
      </div>

      {/* Departments Grid */}
      <div className="max-w-7xl mx-auto">
        {departments && departments.length === 0 ? (
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Building2 className="h-16 w-16 text-white/40 mx-auto mb-4" />
                <p className="text-white/80 text-lg mb-4">
                  Nenhum setor cadastrado ainda
                </p>
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Setor
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments?.map((department) => (
              <Card
                key={department.id}
                className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-cyan-400" />
                      <CardTitle className="text-white">{department.name}</CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingDepartment(department)}
                        className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(department.id, department.name)}
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {department.description && (
                    <CardDescription className="text-white/70 mt-2">
                      {department.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-white/60">
                    Criado em: {new Date(department.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateDepartmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          refetch();
        }}
      />

      {editingDepartment && (
        <EditDepartmentModal
          isOpen={!!editingDepartment}
          department={editingDepartment}
          onClose={() => setEditingDepartment(null)}
          onSuccess={() => {
            setEditingDepartment(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
