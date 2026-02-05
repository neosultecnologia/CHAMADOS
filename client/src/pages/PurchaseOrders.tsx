import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Plus, Eye, CheckCircle, XCircle, Clock, Package } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PurchasingLayout from '@/components/PurchasingLayout';

export default function PurchaseOrders() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const { data: orders = [], refetch } = trpc.purchaseOrders.list.useQuery();

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Rascunho': 'bg-gray-500/20 text-gray-300',
      'Pendente': 'bg-yellow-500/20 text-yellow-300',
      'Aprovado': 'bg-green-500/20 text-green-300',
      'Enviado': 'bg-blue-500/20 text-blue-300',
      'Recebido Parcial': 'bg-orange-500/20 text-orange-300',
      'Recebido': 'bg-green-500/20 text-green-300',
      'Cancelado': 'bg-red-500/20 text-red-300',
    };
    return colors[status] || 'bg-gray-500/20 text-gray-300';
  };

  return (
    <PurchasingLayout 
      title="Pedidos de Compra" 
      description="Gerencie os pedidos de compra da distribuidora"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-end mb-8">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 transition"
          >
            <Plus size={20} />
            Novo Pedido
          </button>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:bg-white/15 transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-cyan-500/20 rounded-lg">
                    <Package size={24} className="text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{order.orderNumber}</h3>
                    <p className="text-sm text-slate-300">{order.supplierName}</p>
                    <p className="text-xs text-slate-400">
                      {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                  <p className="text-xl font-bold text-white mt-2">
                    R$ {(order.totalAmount / 100).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-300">
                <div>
                  <span className="text-slate-500">Criado por:</span> {order.createdByName}
                </div>
                {order.approvedByName && (
                  <div>
                    <span className="text-slate-500">Aprovado por:</span> {order.approvedByName}
                  </div>
                )}
                {order.expectedDelivery && (
                  <div>
                    <span className="text-slate-500">Entrega prevista:</span>{' '}
                    {new Date(order.expectedDelivery).toLocaleDateString('pt-BR')}
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
                <button
                  onClick={() => setSelectedOrder(order)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition"
                >
                  <Eye size={16} />
                  Ver Detalhes
                </button>
                {order.status === 'Pendente' && (
                  <ApproveButton orderId={order.id} onSuccess={refetch} />
                )}
              </div>
            </div>
          ))}
        </div>

        {orders.length === 0 && (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400">Nenhum pedido de compra cadastrado</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreatePurchaseOrderModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            refetch();
            setShowCreateModal(false);
          }}
        />
      )}

      {/* Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onSuccess={refetch}
        />
      )}
    </PurchasingLayout>
  );
}

function ApproveButton({ orderId, onSuccess }: { orderId: number; onSuccess: () => void }) {
  const updateStatusMutation = trpc.purchaseOrders.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('Pedido aprovado com sucesso');
      onSuccess();
    },
    onError: (error) => {
      toast.error('Erro ao aprovar pedido: ' + error.message);
    },
  });

  return (
    <button
      onClick={() => updateStatusMutation.mutate({ id: orderId, status: 'Aprovado' })}
      disabled={updateStatusMutation.isPending}
      className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition disabled:opacity-50"
    >
      <CheckCircle size={16} />
      Aprovar
    </button>
  );
}

function CreatePurchaseOrderModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { data: suppliers = [] } = trpc.suppliers.list.useQuery();
  const { data: products = [] } = trpc.products.list.useQuery();

  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(null);
  const [items, setItems] = useState<Array<{
    productId: number;
    quantity: number;
    unitPrice: number;
  }>>([]);
  const [currentItem, setCurrentItem] = useState({
    productId: 0,
    quantity: 1,
    unitPrice: 0,
  });

  const createMutation = trpc.purchaseOrders.create.useMutation({
    onSuccess: () => {
      toast.success('Pedido criado com sucesso');
      onSuccess();
    },
    onError: (error) => {
      toast.error('Erro ao criar pedido: ' + error.message);
    },
  });

  const addItem = () => {
    if (!currentItem.productId || currentItem.quantity <= 0 || currentItem.unitPrice <= 0) {
      toast.error('Preencha todos os campos do item');
      return;
    }

    const product = products.find(p => p.id === currentItem.productId);
    if (!product) return;

    setItems([...items, currentItem]);
    setCurrentItem({ productId: 0, quantity: 1, unitPrice: 0 });
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSupplier) {
      toast.error('Selecione um fornecedor');
      return;
    }

    if (items.length === 0) {
      toast.error('Adicione pelo menos um item');
      return;
    }

    const supplier = suppliers.find(s => s.id === selectedSupplier);
    if (!supplier) return;

    const itemsWithDetails = items.map(item => {
      const product = products.find(p => p.id === item.productId)!;
      return {
        productId: item.productId,
        productCode: product.code,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      };
    });

    createMutation.mutate({
      supplierId: supplier.id,
      supplierName: supplier.name,
      items: itemsWithDetails,
    });
  };

  const total = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-white mb-6">Novo Pedido de Compra</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Supplier Selection */}
          <div>
            <label className="block text-sm font-medium text-blue-100 mb-2">Fornecedor *</label>
            <select
              required
              value={selectedSupplier || ''}
              onChange={(e) => setSelectedSupplier(parseInt(e.target.value))}
              className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-white/20 text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="">Selecione um fornecedor</option>
              {suppliers.filter(s => s.status === 'Ativo').map(supplier => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </div>

          {/* Add Item Section */}
          <div className="border border-white/20 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Adicionar Item</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-2">
                <label className="block text-sm text-blue-100 mb-2">Produto</label>
                <select
                  value={currentItem.productId}
                  onChange={(e) => setCurrentItem({ ...currentItem, productId: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-white/20 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="0">Selecione um produto</option>
                  {products.filter(p => p.status === 'Ativo').map(product => (
                    <option key={product.id} value={product.id}>{product.code} - {product.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-blue-100 mb-2">Quantidade</label>
                <input
                  type="number"
                  min="1"
                  value={currentItem.quantity}
                  onChange={(e) => setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-white/20 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-sm text-blue-100 mb-2">Preço Unit. (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={currentItem.unitPrice / 100}
                  onChange={(e) => setCurrentItem({ ...currentItem, unitPrice: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-white/20 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={addItem}
              className="mt-4 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition"
            >
              Adicionar Item
            </button>
          </div>

          {/* Items List */}
          {items.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Itens do Pedido</h3>
              <div className="space-y-2">
                {items.map((item, index) => {
                  const product = products.find(p => p.id === item.productId);
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex-1">
                        <p className="text-white font-medium">{product?.name}</p>
                        <p className="text-sm text-slate-400">
                          {item.quantity} x R$ {(item.unitPrice / 100).toFixed(2)} = R$ {((item.quantity * item.unitPrice) / 100).toFixed(2)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition"
                      >
                        <XCircle size={20} />
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-white/20 text-right">
                <p className="text-2xl font-bold text-white">
                  Total: R$ {(total / 100).toFixed(2)}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 py-2 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:from-cyan-600 hover:to-blue-600 transition disabled:opacity-50"
            >
              {createMutation.isPending ? 'Criando...' : 'Criar Pedido'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={createMutation.isPending}
              className="flex-1 py-2 px-4 rounded-lg border border-blue-400 text-blue-400 font-semibold hover:bg-blue-400/10 transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OrderDetailModal({
  order,
  onClose,
  onSuccess,
}: {
  order: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { data: items = [] } = trpc.purchaseOrders.getItems.useQuery({ purchaseOrderId: order.id });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-white mb-6">{order.orderNumber}</h2>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-sm text-slate-400">Fornecedor</p>
            <p className="text-lg text-white font-semibold">{order.supplierName}</p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Status</p>
            <p className="text-lg text-white">{order.status}</p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Total</p>
            <p className="text-2xl text-white font-bold">R$ {(order.totalAmount / 100).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Criado por</p>
            <p className="text-lg text-white">{order.createdByName}</p>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-white mb-4">Itens do Pedido</h3>
        <div className="space-y-2 mb-6">
          {items.map((item) => (
            <div key={item.id} className="p-4 bg-white/5 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white font-medium">{item.productName}</p>
                  <p className="text-sm text-slate-400">Código: {item.productCode}</p>
                </div>
                <div className="text-right">
                  <p className="text-white">{item.quantity} x R$ {(item.unitPrice / 100).toFixed(2)}</p>
                  <p className="text-lg text-white font-semibold">R$ {(item.totalPrice / 100).toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 px-4 rounded-lg border border-blue-400 text-blue-400 font-semibold hover:bg-blue-400/10 transition"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
