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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Package, ShoppingCart, Clock, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function StockCatalog() {
  const [, setLocation] = useLocation();
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const { data: availableItems = [] } = trpc.stock.listAvailable.useQuery();
  const { data: myRequests = [] } = trpc.stockRequests.listMine.useQuery();

  const requestMutation = trpc.stockRequests.create.useMutation({
    onSuccess: () => {
      toast.success("Solicitação enviada com sucesso! Um chamado será criado automaticamente.");
      setRequestDialogOpen(false);
      setSelectedItem(null);
    },
    onError: (error) => {
      toast.error("Erro ao criar solicitação: " + error.message);
    },
  });

  const handleRequest = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    requestMutation.mutate({
      stockItemId: selectedItem.id,
      requestedQuantity: parseInt(formData.get("quantity") as string),
      justification: formData.get("justification") as string,
    });
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

  const getStatusBadge = (status: string) => {
    const config: Record<string, { icon: any; color: string; label: string }> = {
      Pendente: { icon: Clock, color: "bg-yellow-500", label: "Pendente" },
      Aprovado: { icon: CheckCircle, color: "bg-green-500", label: "Aprovado" },
      Rejeitado: { icon: XCircle, color: "bg-red-500", label: "Rejeitado" },
      Entregue: { icon: CheckCircle, color: "bg-blue-500", label: "Entregue" },
    };
    const { icon: Icon, color, label } = config[status] || config.Pendente;
    return (
      <Badge className={color}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
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
              <h1 className="text-3xl font-bold text-white">Estoque de TI</h1>
              <p className="text-white/80">Solicite equipamentos e periféricos</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="catalog" className="space-y-6">
          <TabsList className="bg-white/10">
            <TabsTrigger value="catalog" className="data-[state=active]:bg-white">
              <Package className="h-4 w-4 mr-2" />
              Catálogo
            </TabsTrigger>
            <TabsTrigger value="requests" className="data-[state=active]:bg-white">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Minhas Solicitações ({myRequests.length})
            </TabsTrigger>
          </TabsList>

          {/* Catalog Tab */}
          <TabsContent value="catalog">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableItems.map((item: any) => (
                <Card key={item.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        <Badge className={`${getCategoryColor(item.category)} mt-2`}>
                          {item.category}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          {item.quantity}
                        </div>
                        <div className="text-xs text-gray-500">disponíveis</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {item.description && (
                      <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                    )}
                    <div className="space-y-2 text-sm mb-4">
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
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => {
                        setSelectedItem(item);
                        setRequestDialogOpen(true);
                      }}
                      disabled={item.quantity === 0}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Solicitar
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {availableItems.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">Nenhum item disponível no momento.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* My Requests Tab */}
          <TabsContent value="requests">
            <div className="space-y-4">
              {myRequests.map((request: any) => {
                const item = availableItems.find((i: any) => i.id === request.stockItemId);
                return (
                  <Card key={request.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">
                            {item?.name || `Item #${request.stockItemId}`}
                          </CardTitle>
                          <div className="flex gap-2 mt-2">
                            {getStatusBadge(request.status)}
                            <Badge variant="outline">
                              Qtd: {request.requestedQuantity}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          {format(new Date(request.createdAt), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-semibold">Justificativa:</span>
                          <p className="text-gray-600 mt-1">{request.justification}</p>
                        </div>
                        {request.approvedByName && (
                          <div>
                            <span className="font-semibold">
                              {request.status === "Aprovado" ? "Aprovado" : "Rejeitado"} por:
                            </span>{" "}
                            {request.approvedByName}
                            {request.approvedAt && (
                              <span className="text-gray-500 ml-2">
                                em{" "}
                                {format(new Date(request.approvedAt), "dd/MM/yyyy HH:mm", {
                                  locale: ptBR,
                                })}
                              </span>
                            )}
                          </div>
                        )}
                        {request.deliveredAt && (
                          <div>
                            <span className="font-semibold">Entregue em:</span>{" "}
                            {format(new Date(request.deliveredAt), "dd/MM/yyyy HH:mm", {
                              locale: ptBR,
                            })}
                          </div>
                        )}
                        {request.ticketId && (
                          <div>
                            <span className="font-semibold">Chamado criado:</span>{" "}
                            <Badge variant="outline">#{request.ticketId}</Badge>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {myRequests.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <ShoppingCart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">Você ainda não fez nenhuma solicitação.</p>
                  <Button
                    onClick={() => {
                      // Switch to catalog tab
                      const catalogTab = document.querySelector('[value="catalog"]') as HTMLElement;
                      catalogTab?.click();
                    }}
                    className="mt-4"
                  >
                    Ver Catálogo
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Request Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Item</DialogTitle>
            <DialogDescription>
              {selectedItem && `${selectedItem.name} (${selectedItem.quantity} disponíveis)`}
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <form onSubmit={handleRequest}>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="quantity">Quantidade *</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="1"
                    max={selectedItem.quantity}
                    defaultValue="1"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Máximo: {selectedItem.quantity} unidades
                  </p>
                </div>
                <div>
                  <Label htmlFor="justification">Justificativa *</Label>
                  <Textarea
                    id="justification"
                    name="justification"
                    placeholder="Explique o motivo da solicitação (mínimo 10 caracteres)..."
                    rows={4}
                    required
                    minLength={10}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Um chamado será criado automaticamente após o envio da solicitação.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRequestDialogOpen(false);
                    setSelectedItem(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={requestMutation.isPending}>
                  {requestMutation.isPending ? "Enviando..." : "Enviar Solicitação"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
