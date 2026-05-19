'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, FileText, PlusCircle, Save } from 'lucide-react';
import type { AppSettings, Client, OrderRecord, PaymentLog, Product } from '@/src/types';
import { formatMoneyInput, formatSignedCurrency, parseMoneyInput, requestJson } from '@/src/lib/ui';
import { pushToast } from '@/src/components/toast/ToastProvider';
import type { jsPDF } from 'jspdf';

type AdminTab = 'balance' | 'products' | 'settings' | 'orders';

type AdminViewProps = {
  settings: AppSettings;
  client: Client;
  products: Product[];
  onBack: () => void;
  onUpdate: () => Promise<void>;
  generatePDF: (order: OrderRecord) => jsPDF;
  tab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
};

export function AdminView({ settings, client, products, onBack, onUpdate, generatePDF, tab, onTabChange }: AdminViewProps) {
  const [payAmount, setPayAmount] = useState('');
  const [newProdName, setNewProdName] = useState('');
  const [newProdType, setNewProdType] = useState<'comum' | 'adesivo'>('comum');
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [uuidSearch, setUuidSearch] = useState('');

  const loadOrders = async () => {
    const data = await requestJson<OrderRecord[]>('/api/orders');
    setOrders(data.slice().reverse());
  };

  const loadPaymentLogs = async () => {
    const data = await requestJson<PaymentLog[]>('/api/payment-logs');
    setPaymentLogs(data.slice().reverse());
  };

  useEffect(() => {
    if (tab === 'orders') {
      loadOrders();
    }
    if (tab === 'balance') {
      loadPaymentLogs();
    }
  }, [tab]);

  useEffect(() => {
    if (tab !== 'orders' || typeof window === 'undefined') {
      return;
    }

    const refreshOrders = () => {
      loadOrders().catch(error => {
        console.error('Error refreshing orders:', error);
      });
    };

    refreshOrders();
    const intervalId = window.setInterval(refreshOrders, 10000);
    const handleFocus = () => refreshOrders();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshOrders();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [tab]);

  const filteredOrders = useMemo(() => {
    if (!uuidSearch.trim()) return orders;
    const term = uuidSearch.trim().toLowerCase();
    return orders.filter(order => order.uuid.toLowerCase().includes(term));
  }, [orders, uuidSearch]);

  const updateBalance = async () => {
    const amount = parseMoneyInput(payAmount);
    if (isNaN(amount)) return;

    try {
      await requestJson('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.abs(amount) })
      });
      setPayAmount('');
      await onUpdate();
      await loadPaymentLogs();
      pushToast({ kind: 'success', title: 'Saldo atualizado.' });
    } catch (error) {
      console.error('Error updating balance:', error);
      pushToast({
        kind: 'error',
        title: 'Nao foi possivel registrar o pagamento.'
      });
    }
  };

  const undoPayment = async (log: PaymentLog) => {
    if (log.reversed) return;
    if (!confirm(`Desfazer o pagamento de ${formatSignedCurrency(log.amount)}?`)) return;
    const res = await fetch(`/api/payment-logs/${log.id}/undo`, {
      method: 'PATCH',
    });
    if (!res.ok) {
      pushToast({
        kind: 'error',
        title: 'Nao foi possivel desfazer esse pagamento.'
      });
      return;
    }
    await onUpdate();
    await loadPaymentLogs();
    pushToast({ kind: 'success', title: 'Pagamento desfeito.' });
  };

  const addProduct = async () => {
    if (!newProdName) return;
    try {
      await requestJson('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProdName,
          type: newProdType,
          active: true
        })
      });
      setNewProdName('');
      await onUpdate();
      pushToast({ kind: 'success', title: 'Produto adicionado.' });
    } catch (error) {
      console.error('Error adding product:', error);
      pushToast({
        kind: 'error',
        title: 'Nao foi possivel adicionar o produto.'
      });
    }
  };

  const toggleProduct = async (product: Product) => {
    try {
      await requestJson(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !product.active })
      });
      await onUpdate();
    } catch (error) {
      console.error('Error toggling product:', error);
      pushToast({
        kind: 'error',
        title: 'Nao foi possivel atualizar o produto.'
      });
    }
  };

  const updatePrices = async (common: number, adhesive: number) => {
    try {
      await requestJson('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commonPrice: common,
          adhesivePrice: adhesive
        })
      });
      await onUpdate();
      pushToast({ kind: 'success', title: 'Precos atualizados.' });
    } catch (error) {
      console.error('Error updating prices:', error);
      pushToast({
        kind: 'error',
        title: 'Nao foi possivel atualizar os precos.'
      });
    }
  };

  const deleteOrder = async (id: string) => {
    if (!confirm('Excluir definitivamente este pedido?')) return;
    try {
      await requestJson(`/api/orders/${id}/permanent`, { method: 'DELETE' });
      await onUpdate();
      await loadOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
      pushToast({
        kind: 'error',
        title: 'Nao foi possivel excluir o pedido.'
      });
    }
  };

  const printOrder = (order: OrderRecord) => {
    const doc = generatePDF(order);
    doc.autoPrint({ variant: 'non-conform' });
    const printUrl = doc.output('bloburl');
    const printWindow = window.open(printUrl, '_blank', 'noopener,noreferrer');

    if (!printWindow) {
      pushToast({
        kind: 'error',
        title: 'Janela de impressao bloqueada',
        description: 'Libere pop-ups e tente novamente.'
      });
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 bg-white rounded-full shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold">Painel Admin</h2>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['orders', 'balance', 'products', 'settings'] as const).map(t => (
          <button
            key={t}
            onClick={() => onTabChange(t)}
            className={`px-4 py-2 rounded-full font-bold whitespace-nowrap text-sm ${tab === t ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500'}`}
          >
            {t === 'orders' ? 'Pedidos' : t === 'balance' ? 'Financeiro' : t === 'products' ? 'Produtos' : 'Config'}
          </button>
        ))}
      </div>

      {tab === 'orders' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h4 className="font-bold">Buscar PDF pelo UUID</h4>
            <input
              type="text"
              placeholder="Cole o UUID recebido no WhatsApp"
              className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200"
              value={uuidSearch}
              onChange={e => setUuidSearch(e.target.value)}
            />
          </div>

          {filteredOrders.map(order => (
            <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
              <div className="flex justify-between gap-4">
                <div>
                  <p className="font-bold text-sm">UUID: {order.uuid}</p>
                  <p className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleString('pt-BR')}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-600">R$ {order.total.toFixed(2)}</p>
                  {order.deletionRequested && <p className="text-[10px] text-amber-600 font-bold">Cliente pediu exclusao</p>}
                </div>
              </div>

              <div className="text-xs text-slate-500">
                {order.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => generatePDF(order).save(`Pedido-${order.uuid}.pdf`)}
                  className="py-2 bg-emerald-600 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1"
                >
                  <FileText className="w-3 h-3" /> Baixar PDF
                </button>
                <button
                  onClick={() => printOrder(order)}
                  className="py-2 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold"
                >
                  Preparar impressao
                </button>
                <button
                  onClick={() => deleteOrder(order.id)}
                  className="py-2 bg-red-50 text-red-600 rounded-lg text-[11px] font-bold"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}

          {filteredOrders.length === 0 && (
            <p className="text-center text-slate-400 py-10">Nenhum pedido encontrado para esse UUID.</p>
          )}
        </div>
      )}

      {tab === 'balance' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center">
            <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Saldo Atual</p>
            <h3 className={`text-4xl font-black mt-2 font-mono ${client.balance < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
              {formatSignedCurrency(client.balance)}
            </h3>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h4 className="font-bold">Dar Baixa</h4>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                placeholder="0,00"
                className="flex-1 p-3 bg-slate-50 rounded-lg border border-slate-200"
                value={payAmount}
                onChange={e => setPayAmount(formatMoneyInput(e.target.value))}
              />
              <button onClick={updateBalance} className="bg-emerald-600 text-white p-3 rounded-lg">
                <Save className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h4 className="font-bold">Logs de Pagamentos</h4>
            <div className="space-y-3">
              {paymentLogs.map(log => (
                <div key={log.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-bold text-sm text-emerald-700">{formatSignedCurrency(log.amount)}</p>
                      <p className="text-xs text-slate-400">{new Date(log.createdAt).toLocaleString('pt-BR')}</p>
                      {log.reversed && (
                        <p className="text-xs text-red-600 font-bold mt-1">
                          Desfeito em {log.reversedAt ? new Date(log.reversedAt).toLocaleString('pt-BR') : '-'}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-xs">
                      <p className="text-slate-500">Antes: {formatSignedCurrency(log.previousBalance)}</p>
                      <p className="font-bold text-slate-700">Depois: {formatSignedCurrency(log.newBalance)}</p>
                      {log.reversed && log.reversedBalance !== undefined && (
                        <p className="text-red-600 font-bold">Revertido para: {formatSignedCurrency(log.reversedBalance)}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => undoPayment(log)}
                      disabled={log.reversed}
                      className="rounded-lg px-3 py-2 text-xs font-bold bg-red-50 text-red-600 disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      {log.reversed ? 'Pagamento desfeito' : 'Desfazer pagamento'}
                    </button>
                  </div>
                </div>
              ))}
              {paymentLogs.length === 0 && <p className="text-sm text-slate-400">Nenhum pagamento registrado.</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'products' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            <h4 className="font-bold text-slate-700">Novo Produto</h4>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nome do tempero"
                className="w-full p-4 bg-slate-50 rounded-2xl"
                value={newProdName}
                onChange={e => setNewProdName(e.target.value)}
              />
              <div className="flex gap-2">
                <button onClick={() => setNewProdType('comum')} className={`flex-1 p-3 rounded-xl font-bold ${newProdType === 'comum' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  Comum
                </button>
                <button onClick={() => setNewProdType('adesivo')} className={`flex-1 p-3 rounded-xl font-bold ${newProdType === 'adesivo' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  Adesivo
                </button>
              </div>
              <button onClick={addProduct} className="w-full p-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2">
                <PlusCircle className="w-5 h-5" /> Adicionar
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 px-1">Lista de Produtos</h4>
            {products.map(product => (
              <div key={product.id} className="bg-white p-3 rounded-xl flex items-center justify-between shadow-sm border border-slate-200">
                <div>
                  <p className={`font-bold text-sm ${product.active ? 'text-slate-900' : 'text-slate-300'}`}>{product.name}</p>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-tight">{product.type}</p>
                </div>
                <button
                  onClick={() => toggleProduct(product)}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border ${product.active ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}
                >
                  {product.active ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2">Precos Base</h4>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Papel Comum (R$)</label>
              <input
                type="number"
                step="0.01"
                defaultValue={settings.commonPrice}
                onBlur={e => updatePrices(parseFloat(e.target.value), settings.adhesivePrice)}
                className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Papel Adesivo (R$)</label>
              <input
                type="number"
                step="0.01"
                defaultValue={settings.adhesivePrice}
                onBlur={e => updatePrices(settings.commonPrice, parseFloat(e.target.value))}
                className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-mono"
              />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
