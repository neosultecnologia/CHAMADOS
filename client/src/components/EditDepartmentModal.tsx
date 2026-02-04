import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface EditDepartmentModalProps {
  isOpen: boolean;
  department: {
    id: number;
    name: string;
    description: string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditDepartmentModal({ isOpen, department, onClose, onSuccess }: EditDepartmentModalProps) {
  const [name, setName] = useState(department.name);
  const [description, setDescription] = useState(department.description || "");

  useEffect(() => {
    setName(department.name);
    setDescription(department.description || "");
  }, [department]);

  const updateDepartment = trpc.departments.update.useMutation({
    onSuccess: () => {
      toast.success("Setor atualizado com sucesso");
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar setor: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("O nome do setor é obrigatório");
      return;
    }
    updateDepartment.mutate({
      id: department.id,
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-slate-900 to-slate-800 border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl">Editar Setor</DialogTitle>
          <DialogDescription className="text-white/70">
            Atualize as informações do setor
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="name" className="text-white">
              Nome do Setor *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Tecnologia da Informação"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              required
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-white">
              Descrição (opcional)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva as responsabilidades deste setor..."
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[100px]"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={updateDepartment.isPending}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
            >
              {updateDepartment.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
