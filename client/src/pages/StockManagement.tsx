import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Edit2, Trash2, Package, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  "Computador",
  "Monitor",
  "Teclado",
  "Mouse",
  "Impressora",
  "Notebook",
  "Headset",
  "Webcam",
  "Hub USB",
  "Cabo",
  "Adaptador",
  "Outro",
];

const STATUS_OPTIONS = ["Disponível", "Reservado", "Em Manutenção", "Descartado"];

export default function StockManagement() {
  const [, setLocation] = useLocation();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const { data: items = [], refetch } = trpc.stock.listAll.useQuery();
  const { data: lowStockItems = [] } = trpc.stock.getLowStock.useQuery();

  const createMutation = trpc.stock.create.useMutation({
    onSuccess: () => {
      toast.success("Item adicionado com sucesso!");
      setCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao adicionar item: " + error.message);
    },
  });

  const updateMutation = trpc.stock.update.useMutation({
    onSuccess: () => {
      toast.success("Item atualizado com sucesso!");
      setEditDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar item: " + error.message);
    },
  });

  const deleteMutation = trpc.stock.delete.useMutation({
    onSuccess: () => {
      toast.success("Item excluído com sucesso!");
      setDeleteDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao excluir item: " + error.message);
    },
  });

  const adjustMutation = trpc.stock.adjustQuantity.useMutation({
    onSuccess: () => {
      toast.success("Quantidade ajustada com sucesso!");
      setAdjustDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao ajustar quantidade: " + error.message);
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      name: formData.get("name") as string,
      description: formData.get("description") as string || undefined,
      category: formData.get("category") as any,
      brand: formData.get("brand") as string || undefined,
      model: formData.get("model") as string || undefined,
      serialNumber: formData.get("serialNumber") as string || undefined,
      quantity: parseInt(formData.get("quantity") as string) || 0,
      minQuantity: parseInt(formData.get("minQuantity") as string) || 5,
      location: formData.get("location") as string || undefined,
      status: formData.get("status") as any || "Disponível",
      unitPrice: formData.get("unitPrice") as string || undefined,
      notes: formData.get("notes") as string || undefined,
    });
  };

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: selectedItem.id,
      name: formData.get("name") as string,
      description: formData.get("description") as string || undefined,
      category: formData.get("category") as any,
      brand: formData.get("brand") as string || undefined,
      model: formData.get("model") as string || undefined,
      serialNumber: formData.get("serialNumber") as string || undefined,
      quantity: parseInt(formData.get("quantity") as string),
      minQuantity: parseInt(formData.get("minQuantity") as string),
      location: formData.get("location") as string || undefined,
      status: formData.get("status") as any,
      unitPrice: formData.get("unitPrice") as string || undefined,
      notes: formData.get("notes") as string || undefined,
    });
  };

  const handleAdjust = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    adjustMutation.mutate({
      itemId: selectedItem.id,
      newQuantity: parseInt(formData.get("newQuantity") as string),
      reason: formData.get("reason") as string,
    });
  };

  const handleDelete = () => {
    deleteMutation.mutate({ id: selectedItem.id });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Computador: "bg-blue-500",
      Monitor: "bg-purple-500",
      Teclado: "bg-green-500",
      Mouse: "bg-yellow-500",
      Impressora: "bg-red-500",
      Notebook: "bg-indigo-500",
      Headset: "bg-pink-500",
      Webcam: "bg-orange-500",
    };
    return colors[category] || "bg-gray-500";
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Disponível: "bg-green-500",
      Reservado: "bg-yellow-500",
      "Em Manutenção": "bg-orange-500",
      Descartado: "bg-red-500",
    };
    return colors[status] || "bg-gray-500";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003366] via-[#004080] to-[#0059b3] p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/dashboard")}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Portal
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Gestão de Estoque de TI</h1>
              <p className="text-white/80">Gerenciamento completo de periféricos e equipamentos</p>
            </div>
          </div>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Item
          </Button>
        </div>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <Card className="mb-6 border-orange-500 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <AlertTriangle className="h-5 w-5" />
                Alertas de Estoque Baixo ({lowStockItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {lowStockItems.map((item: any) => (
                  <Badge key={item.id} variant="outline" className="border-orange-500 text-orange-700">
                    {item.name}: {item.quantity} unidades
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item: any) => (
            <Card key={item.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge className={getCategoryColor(item.category)}>
                        {item.category}
                      </Badge>
                      <Badge className={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedItem(item);
                        setEditDialogOpen(true);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedItem(item);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {item.description && (
                  <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                )}
                <div className="space-y-2 text-sm">
                  {item.brand && (
                    <div>
                      <span className="font-semibold">Marca:</span> {item.brand}
                    </div>
                  )}
                  {item.model && (
                    <div>
                      <span className="font-semibold">Modelo:</span> {item.model}
                    </div>
                  )}
                  {item.location && (
                    <div>
                      <span className="font-semibold">Localização:</span> {item.location}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div>
                      <Package className="h-4 w-4 inline mr-1" />
                      <span className="font-bold text-lg">{item.quantity}</span>
                      <span className="text-gray-500 text-xs ml-1">
                        (mín: {item.minQuantity})
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedItem(item);
                        setAdjustDialogOpen(true);
                      }}
                    >
                      Ajustar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {items.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Nenhum item no estoque ainda.</p>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="mt-4"
              >
                Adicionar Primeiro Item
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Item</DialogTitle>
            <DialogDescription>
              Preencha os dados do item para adicionar ao estoque
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome *</Label>
                  <Input id="name" name="name" required />
                </div>
                <div>
                  <Label htmlFor="category">Categoria *</Label>
                  <Select name="category" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" name="description" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="brand">Marca</Label>
                  <Input id="brand" name="brand" />
                </div>
                <div>
                  <Label htmlFor="model">Modelo</Label>
                  <Input id="model" name="model" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="serialNumber">Número de Série</Label>
                  <Input id="serialNumber" name="serialNumber" />
                </div>
                <div>
                  <Label htmlFor="location">Localização</Label>
                  <Input id="location" name="location" placeholder="Ex: Sala 101" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantidade *</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="0"
                    defaultValue="0"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="minQuantity">Qtd. Mínima *</Label>
                  <Input
                    id="minQuantity"
                    name="minQuantity"
                    type="number"
                    min="0"
                    defaultValue="5"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="unitPrice">Preço Unit.</Label>
                  <Input
                    id="unitPrice"
                    name="unitPrice"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue="Disponível">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea id="notes" name="notes" rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Item</DialogTitle>
            <DialogDescription>
              Atualize os dados do item no estoque
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <form onSubmit={handleEdit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-name">Nome *</Label>
                    <Input
                      id="edit-name"
                      name="name"
                      defaultValue={selectedItem.name}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-category">Categoria *</Label>
                    <Select name="category" defaultValue={selectedItem.category}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-description">Descrição</Label>
                  <Textarea
                    id="edit-description"
                    name="description"
                    defaultValue={selectedItem.description || ""}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-brand">Marca</Label>
                    <Input
                      id="edit-brand"
                      name="brand"
                      defaultValue={selectedItem.brand || ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-model">Modelo</Label>
                    <Input
                      id="edit-model"
                      name="model"
                      defaultValue={selectedItem.model || ""}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-serialNumber">Número de Série</Label>
                    <Input
                      id="edit-serialNumber"
                      name="serialNumber"
                      defaultValue={selectedItem.serialNumber || ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-location">Localização</Label>
                    <Input
                      id="edit-location"
                      name="location"
                      defaultValue={selectedItem.location || ""}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="edit-quantity">Quantidade *</Label>
                    <Input
                      id="edit-quantity"
                      name="quantity"
                      type="number"
                      min="0"
                      defaultValue={selectedItem.quantity}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-minQuantity">Qtd. Mínima *</Label>
                    <Input
                      id="edit-minQuantity"
                      name="minQuantity"
                      type="number"
                      min="0"
                      defaultValue={selectedItem.minQuantity}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-unitPrice">Preço Unit.</Label>
                    <Input
                      id="edit-unitPrice"
                      name="unitPrice"
                      defaultValue={selectedItem.unitPrice || ""}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-status">Status</Label>
                  <Select name="status" defaultValue={selectedItem.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-notes">Observações</Label>
                  <Textarea
                    id="edit-notes"
                    name="notes"
                    defaultValue={selectedItem.notes || ""}
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Adjust Quantity Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Quantidade</DialogTitle>
            <DialogDescription>
              {selectedItem && `Item: ${selectedItem.name} (Atual: ${selectedItem.quantity})`}
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <form onSubmit={handleAdjust}>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="newQuantity">Nova Quantidade *</Label>
                  <Input
                    id="newQuantity"
                    name="newQuantity"
                    type="number"
                    min="0"
                    defaultValue={selectedItem.quantity}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="reason">Motivo do Ajuste *</Label>
                  <Textarea
                    id="reason"
                    name="reason"
                    placeholder="Ex: Entrada de novos itens, correção de inventário..."
                    rows={3}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAdjustDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={adjustMutation.isPending}>
                  {adjustMutation.isPending ? "Ajustando..." : "Ajustar"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o item "{selectedItem?.name}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
