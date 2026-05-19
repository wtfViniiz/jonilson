'use client';

import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, DollarSign, History, Minus, Plus, Send, Search, Trash2 } from 'lucide-react';
import type { Client, OrderRecord, Product, StoredOrderItem } from '@/src/types';
import { formatSignedCurrency } from '@/src/lib/ui';

type View = 'order' | 'review' | 'history' | 'admin-login' | 'admin' | 'view-order';
type AppMode = 'client' | 'admin';

type ClientWorkspaceProps = {
  mode: AppMode;
  view: View;
  client: Client | null;
  orderToView: OrderRecord | null;
  customerOrders: OrderRecord[];
  filteredProducts: Product[];
  orderItems: Array<{ product: Product; quantity: number; price: number; subtotal: number }>;
  totalQty: number;
  calculateTotal: () => number;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  order: Record<string, number>;
  updateQuantity: (id: string, delta: number) => void;
  setQuantity: (id: string, value: number) => void;
  onSetView: (view: View) => void;
  onSetOrderToView: (order: OrderRecord | null) => void;
  onRequestOrderDeletion: (id: string) => Promise<void>;
  onConfirmOrder: () => Promise<void>;
  onOpenAdminLogin?: () => void;
};

const formatOrderItems = (items: StoredOrderItem[]) => items.map(item => `${item.quantity}x ${item.name}`).join(', ');

export function ClientWorkspace({
  mode,
  view,
  client,
  orderToView,
  customerOrders,
  filteredProducts,
  orderItems,
  totalQty,
  calculateTotal,
  searchTerm,
  setSearchTerm,
  order,
  updateQuantity,
  setQuantity,
  onSetView,
  onSetOrderToView,
  onRequestOrderDeletion,
  onConfirmOrder,
}: ClientWorkspaceProps) {
  return (
    <>
      <header className="bg-emerald-700 text-white p-6 sticky top-0 z-20 shadow-md">
        <div className="flex justify-between items-center max-w-lg mx-auto gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Send className="w-6 h-6" /> Pedir Temperos
            </h1>
            {client && (
              <p className="text-sm opacity-90 flex items-center gap-1 mt-1 text-emerald-100">
                <DollarSign className="w-3 h-3" />
                Saldo: <span className={client.balance < 0 ? 'text-red-300 font-semibold' : 'font-semibold'}>{formatSignedCurrency(client.balance)}</span>
              </p>
            )}
          </div>
          {mode === 'client' && (
            <button
              onClick={() => onSetView(view === 'history' ? 'order' : 'history')}
              className="bg-white/10 hover:bg-white/20 rounded-xl px-3 py-2 text-sm font-bold flex items-center gap-2"
            >
              <History className="w-4 h-4" /> Historico
            </button>
          )}
        </div>
      </header>

      <main className={`max-w-lg mx-auto p-4 ${mode === 'client' && view === 'order' && totalQty > 0 ? 'pb-56' : ''}`}>
        <AnimatePresence mode="wait">
          {view === 'view-order' && orderToView && (
            <motion.div
              key="view-order"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 mt-4 space-y-5"
            >
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-bold">Pedido Confirmado</h2>
                  <p className="text-xs text-slate-400">UUID: {orderToView.uuid}</p>
                </div>
                <button
                  onClick={() => onSetView('order')}
                  className="p-2 bg-slate-100 rounded-lg"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {orderToView.items.map((item, idx) => (
                  <div key={`${item.name}-${idx}`} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                    <div>
                      <p className="font-bold text-sm">{item.name}</p>
                      <p className="text-[10px] uppercase font-bold text-emerald-600">{item.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">{item.quantity}x R$ {item.price.toFixed(2)}</p>
                      <p className="font-bold">R$ {(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total do pedido</span>
                  <span className="font-mono font-bold">R$ {orderToView.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Data</span>
                  <span>{new Date(orderToView.createdAt).toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Solicitacao de exclusao</span>
                  <span className={orderToView.deletionRequested ? 'text-amber-600 font-bold' : 'text-slate-400'}>
                    {orderToView.deletionRequested ? 'Pendente' : 'Nao solicitada'}
                  </span>
                </div>
              </div>

              {!orderToView.deletionRequested && (
                <button
                  onClick={() => onRequestOrderDeletion(orderToView.id)}
                  className="w-full bg-amber-500 text-white font-bold py-3 rounded-xl"
                >
                  Solicitar exclusao ao administrador
                </button>
              )}
            </motion.div>
          )}

          {view === 'history' && mode === 'client' && (
            <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Historico de Pedidos</h2>
                <button onClick={() => onSetView('order')} className="text-emerald-700 font-bold text-sm">
                  Novo pedido
                </button>
              </div>

              {customerOrders.map(o => (
                <div key={o.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-bold text-sm">UUID: {o.uuid}</p>
                      <p className="text-xs text-slate-400">{new Date(o.createdAt).toLocaleString('pt-BR')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600">R$ {o.total.toFixed(2)}</p>
                      {o.deletionRequested && <p className="text-[10px] text-amber-600 font-bold">Exclusao solicitada</p>}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">{formatOrderItems(o.items)}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onSetOrderToView(o);
                        onSetView('view-order');
                      }}
                      className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold"
                    >
                      Ver pedido
                    </button>
                    <button
                      onClick={() => onRequestOrderDeletion(o.id)}
                      disabled={o.deletionRequested}
                      className="flex-1 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      {o.deletionRequested ? 'Solicitado' : 'Solicitar exclusao'}
                    </button>
                  </div>
                </div>
              ))}

              {customerOrders.length === 0 && (
                <div className="text-center text-slate-400 py-10">Nenhum pedido encontrado.</div>
              )}
            </motion.div>
          )}

          {view === 'review' && (
            <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="flex items-center gap-3">
                <button onClick={() => onSetView('order')} className="p-2 bg-white rounded-full shadow-sm">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl font-bold">Revisar Pedido</h2>
                  <p className="text-sm text-slate-500">Confira antes de confirmar e enviar ao WhatsApp.</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                {orderItems.map(item => (
                  <div key={item.product.id} className="flex justify-between items-center border-b border-slate-100 pb-3 last:border-b-0 last:pb-0 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="min-w-16 h-16 rounded-2xl bg-emerald-600 text-white flex flex-col items-center justify-center shadow-sm">
                        <span className="text-[10px] uppercase font-bold tracking-wide">Qtd</span>
                        <span className="text-2xl font-black leading-none">{item.quantity}</span>
                      </div>
                      <div>
                        <p className="font-bold text-sm">{item.product.name}</p>
                        <p className="text-[10px] uppercase font-bold text-emerald-600 mt-1">{item.product.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">R$ {item.price.toFixed(2)} por unidade</p>
                      <p className="font-bold">R$ {item.subtotal.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Itens</span>
                  <span className="text-2xl font-black text-emerald-700">{totalQty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total</span>
                  <span className="font-mono font-bold text-lg">R$ {calculateTotal().toFixed(2)}</span>
                </div>
                {client && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Saldo apos pedido</span>
                    <span className="font-mono text-red-500 font-bold">{formatSignedCurrency(client.balance - calculateTotal())}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => onSetView('order')} className="flex-1 py-3 bg-white border border-slate-200 rounded-xl font-bold">
                  Voltar e ajustar
                </button>
                <button onClick={onConfirmOrder} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Confirmar pedido
                </button>
              </div>
            </motion.div>
          )}

          {mode === 'client' && view === 'order' && (
            <motion.div key="order" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar: pipoca 300g, tempero da ana, pimenta moida..."
                  className="w-full pl-10 pr-4 py-3 bg-white rounded-lg shadow-sm border border-slate-200 text-sm touch-manipulation"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="grid gap-3">
                {filteredProducts.map(p => (
                  <motion.div key={p.id} layout className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex gap-2 items-center flex-wrap">
                          <h3 className="font-bold text-slate-900 leading-tight">{p.name}</h3>
                          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${p.type === 'adesivo' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                            {p.type}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => p.id && updateQuantity(p.id, -1)}
                          className={`p-2 rounded-lg transition-all ${order[p.id!] ? 'bg-slate-100 border border-slate-200 text-slate-600' : 'text-slate-200 cursor-default'}`}
                          disabled={!order[p.id!]}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className={`min-w-12 h-12 rounded-xl flex items-center justify-center text-center font-black text-lg border ${order[p.id!] ? 'text-slate-900 bg-emerald-50 border-emerald-200' : 'text-slate-300 bg-slate-50 border-slate-100'}`}>
                          {order[p.id!] || 0}
                        </span>
                        <button onClick={() => p.id && updateQuantity(p.id, 1)} className="p-2 bg-emerald-600 text-white rounded-lg">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[5, 10, 15, 20].map(val => (
                        <button
                          key={val}
                          onClick={() => p.id && setQuantity(p.id, val)}
                          className={`min-h-10 rounded-lg border text-xs font-bold touch-manipulation ${order[p.id!] === val ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-300'}`}
                        >
                          Qtd: {val}
                        </button>
                      ))}
                    </div>
                    {order[p.id!] > 0 && (
                      <button
                        onClick={() => p.id && setQuantity(p.id, 0)}
                        className="w-full min-h-10 text-red-500 hover:bg-red-50 rounded-lg border border-red-100 touch-manipulation flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {mode === 'client' && view === 'order' && totalQty > 0 && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-slate-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-30"
          style={{ padding: '1rem 1.25rem max(1rem, env(safe-area-inset-bottom))' }}
        >
          <div className="max-w-lg mx-auto">
            <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Geral</p>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tighter">R$ {calculateTotal().toFixed(2)}</p>
              </div>
              <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase shrink-0">
                {totalQty} Itens
              </span>
            </div>

            <button
              onClick={() => onSetView('review')}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 uppercase tracking-wide"
            >
              <Send className="w-5 h-5" /> Revisar pedido
            </button>
          </div>
        </motion.div>
      )}
    </>
  );
}
