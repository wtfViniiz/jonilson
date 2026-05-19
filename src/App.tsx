'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import { ClientWorkspace } from './components/client/ClientWorkspace';
import { AdminView } from './components/admin/AdminView';
import { AdminLoginView } from './components/admin/AdminLoginView';
import { ToastProvider, pushToast } from './components/toast/ToastProvider';
import { getSearchScore } from './lib/search';
import { formatSignedCurrency, requestJson } from './lib/ui';
import { WHATSAPP_NUMBER } from './constants';
import type { AppSettings, Client, OrderRecord, Product } from './types';
import type { AdminTab, AppMode, AppView } from './lib/views';

const ADMIN_AUTH_STORAGE_KEY = 'temperossistem.admin.authenticated';

const App: React.FC<{ mode?: AppMode }> = ({ mode = 'client' }) => {
  const [view, setView] = useState<AppView>(mode === 'admin' ? 'admin-login' : 'order');
  const [products, setProducts] = useState<Product[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [order, setOrder] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [adminPassInput, setAdminPassInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [orderToView, setOrderToView] = useState<OrderRecord | null>(null);
  const [customerOrders, setCustomerOrders] = useState<OrderRecord[]>([]);
  const [adminTab, setAdminTab] = useState<AdminTab>('orders');
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);

  const fetchData = async () => {
    try {
      const [prods, cli, sett, ordersData] = await Promise.all([
        requestJson<Product[]>('/api/products'),
        requestJson<Client>('/api/client'),
        requestJson<AppSettings>('/api/settings'),
        requestJson<OrderRecord[]>('/api/orders')
      ]);

      setProducts(prods.sort((a, b) => a.name.localeCompare(b.name)));
      setClient(cli);
      setSettings(sett);
      setCustomerOrders(ordersData.slice().reverse());
    } catch (error) {
      console.error('Error fetching data:', error);
      pushToast({
        kind: 'error',
        title: 'Falha ao carregar dados',
        description: 'Nao foi possivel carregar os dados do sistema.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (typeof window === 'undefined') return;
    if (mode === 'admin') return;

    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');
    if (orderId) {
      requestJson<OrderRecord>(`/api/orders/${orderId}`)
        .then(data => {
          setOrderToView(data);
          setView('view-order');
        })
        .catch(error => {
          console.error('Error loading order:', error);
        });
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== 'admin' || typeof window === 'undefined') return;
    const isAuthenticated = window.localStorage.getItem(ADMIN_AUTH_STORAGE_KEY) === 'true';
    setAdminAuthenticated(isAuthenticated);
    setView(isAuthenticated ? 'admin' : 'admin-login');
  }, [mode]);

  const filteredProducts = useMemo(() => {
    return products
      .filter(product => product.active)
      .map(product => ({ product, score: getSearchScore(product, searchTerm) }))
      .filter(({ score }) => !searchTerm.trim() || score >= 90)
      .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.product.name.localeCompare(b.product.name)))
      .map(({ product }) => product);
  }, [products, searchTerm]);

  const orderItems = useMemo(() => {
    if (!settings) return [];
    return Object.entries(order)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([id, qty]) => {
        const product = products.find(p => p.id === id);
        if (!product) return null;
        const price = product.type === 'adesivo' ? settings.adhesivePrice : settings.commonPrice;
        return { product, quantity: Number(qty), price, subtotal: price * Number(qty) };
      })
      .filter(Boolean) as Array<{ product: Product; quantity: number; price: number; subtotal: number }>;
  }, [order, products, settings]);

  const calculateTotal = () => orderItems.reduce((acc, item) => acc + item.subtotal, 0);
  const totalQty = useMemo(() => Object.values(order).reduce((a, b) => Number(a) + Number(b), 0), [order]);

  const updateQuantity = (id: string, delta: number) => {
    setOrder(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: next };
    });
  };

  const setQuantity = (id: string, value: number) => {
    if (value <= 0) {
      setOrder(prev => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
      return;
    }
    setOrder(prev => ({ ...prev, [id]: value }));
  };

  const generatePDF = (orderData: OrderRecord) => {
    const doc = new jsPDF();
    const date = new Date(orderData.createdAt).toLocaleDateString('pt-BR');
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const footerY = pageHeight - 10;
    const contentLimitY = pageHeight - 30;

    const drawHeader = (isNewPage = false) => {
      let startY = 20;
      if (!isNewPage) {
        doc.setFontSize(20);
        doc.text('Orcamento de Temperos', 20, startY);
        doc.setFontSize(12);
        doc.text('Cliente: Jonilson', 20, 32);
        doc.text(`Data: ${date}`, 20, 39);
        doc.text(`UUID: ${orderData.uuid}`, 20, 46);
        startY = 58;
      } else {
        doc.setFontSize(14);
        doc.text('Continuacao do pedido', 20, startY);
        startY = 32;
      }

      doc.setFontSize(11);
      doc.text('Item', 20, startY);
      doc.text('Tipo', 118, startY);
      doc.text('Qtd', 148, startY);
      doc.text('Valor', 170, startY);
      doc.line(20, startY + 2, 190, startY + 2);
      return startY + 10;
    };

    let y = drawHeader();
    orderData.items.forEach(item => {
      const lines = doc.splitTextToSize(item.name, 90);
      const blockHeight = lines.length * 7 + 2;
      if (y + blockHeight > contentLimitY) {
        doc.addPage();
        y = drawHeader(true);
      }
      doc.text(lines, 20, y);
      doc.text(item.type.toUpperCase(), 118, y);
      doc.text(String(item.quantity), 148, y);
      doc.text(`R$ ${(item.price * item.quantity).toFixed(2)}`, 170, y);
      y += blockHeight;
    });

    if (y + 24 > contentLimitY) {
      doc.addPage();
      y = drawHeader(true);
    }

    doc.line(20, y, 190, y);
    y += 10;
    doc.setFontSize(14);
    doc.text(`Total: R$ ${orderData.total.toFixed(2)}`, 140, y);
    y += 10;
    doc.setFontSize(10);
    doc.text(`Saldo atual: ${formatSignedCurrency(orderData.balance)}`, 126, y);

    const totalPages = doc.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page);
      doc.setFontSize(9);
      doc.text(`Pagina ${page} de ${totalPages}`, 20, footerY);
      doc.text(orderData.uuid, pageWidth - 20, footerY, { align: 'right' });
    }

    return doc;
  };

  const handleConfirmOrder = async () => {
    if (!client || orderItems.length === 0) return;

    try {
      const total = calculateTotal();
      const payloadItems = orderItems.map(item => ({
        name: item.product.name,
        type: item.product.type,
        quantity: item.quantity,
        price: item.price
      }));

      const { order: savedOrder } = await requestJson<{ order: OrderRecord }>('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payloadItems, total })
      });

      await fetchData();

      const date = new Date(savedOrder.createdAt).toLocaleDateString('pt-BR');
      const msg = [
        'Novo pedido',
        `Data: ${date}`,
        `Valor: R$ ${savedOrder.total.toFixed(2)}`,
        `UUID: ${savedOrder.uuid}`
      ].join('\n');

      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
      setOrder({});
      setView('history');
    } catch (error) {
      console.error('Error confirming order:', error);
      pushToast({
        kind: 'error',
        title: 'Nao foi possivel confirmar o pedido',
        description: 'Verifique o deploy e tente novamente.'
      });
    }
  };

  const requestOrderDeletion = async (id: string) => {
    if (!confirm('Solicitar exclusao deste pedido para o administrador?')) return;
    try {
      await requestJson(`/api/orders/${id}/request-deletion`, { method: 'PATCH' });
      await fetchData();
      if (orderToView?.id === id) {
        setOrderToView({
          ...orderToView,
          deletionRequested: true,
          deletionRequestedAt: new Date().toISOString()
        });
      }
      pushToast({
        kind: 'success',
        title: 'Solicitacao enviada',
        description: 'O administrador foi notificado.'
      });
    } catch (error) {
      console.error('Error requesting order deletion:', error);
      pushToast({
        kind: 'error',
        title: 'Nao foi possivel solicitar exclusao',
        description: 'Tente novamente em instantes.'
      });
    }
  };

  const checkAdminPassword = () => {
    if (settings && adminPassInput === settings.adminPassword) {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, 'true');
      }
      setAdminAuthenticated(true);
      setView('admin');
      return;
    }
    pushToast({
      kind: 'error',
      title: 'Senha incorreta'
    });
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center text-emerald-600 font-medium">Carregando...</div>;
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-24">
        {mode === 'admin' && view === 'admin-login' && !adminAuthenticated && (
          <div className="max-w-lg mx-auto p-4">
            <AdminLoginView
              password={adminPassInput}
              onPasswordChange={setAdminPassInput}
              onSubmit={checkAdminPassword}
              onBack={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = '/';
                }
              }}
            />
          </div>
        )}

        {view === 'admin' && settings && client && (
          <div className="max-w-lg mx-auto p-4">
            <AdminView
              settings={settings}
              client={client}
              products={products}
              onBack={() => {
                if (typeof window !== 'undefined') {
                  window.localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
                  window.location.href = '/';
                }
                setAdminAuthenticated(false);
                setAdminPassInput('');
              }}
              onUpdate={fetchData}
              generatePDF={generatePDF}
              tab={adminTab}
              onTabChange={setAdminTab}
            />
          </div>
        )}

        {mode === 'client' && (
          <ClientWorkspace
            mode={mode}
            view={view}
            client={client}
            orderToView={orderToView}
            customerOrders={customerOrders}
            filteredProducts={filteredProducts}
            orderItems={orderItems}
            totalQty={totalQty}
            calculateTotal={calculateTotal}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            order={order}
            updateQuantity={updateQuantity}
            setQuantity={setQuantity}
            onSetView={setView}
            onSetOrderToView={setOrderToView}
            onRequestOrderDeletion={requestOrderDeletion}
            onConfirmOrder={handleConfirmOrder}
          />
        )}
      </div>
    </ToastProvider>
  );
};

export default App;
