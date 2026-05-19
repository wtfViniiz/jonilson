'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  DollarSign,
  FileText,
  History,
  Lock,
  Minus,
  Plus,
  PlusCircle,
  Save,
  Search,
  Send,
  ShoppingCart,
  Trash2,
  TrendingDown
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { AppSettings, Client, OrderRecord, PaymentLog, Product } from './types';
import { WHATSAPP_NUMBER } from './constants';

type View = 'order' | 'review' | 'history' | 'admin-login' | 'admin' | 'view-order';
type AdminTab = 'balance' | 'products' | 'settings' | 'orders';
type AppMode = 'client' | 'admin';
const ADMIN_AUTH_STORAGE_KEY = 'temperossistem.admin.authenticated';
const SEARCH_STOP_WORDS = ['de', 'do', 'da', 'dos', 'das', 'para', 'em'];

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ãƒ|â|Ã|ƒ|œ|‡||“/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeProductName = (value: string) =>
  normalizeText(
    value
      .replace(/aÃ‡afrÃƒo|aÃ‡afrÃ£o|aÃ‡afrao|açafrao|acafrao/gi, 'acafrao')
      .replace(/grÃƒo|grão|grao/gi, 'grao')
      .replace(/moÃda|moida/gi, 'moida')
      .replace(/pÃprica|paprica/gi, 'paprica')
      .replace(/cravinho/gi, 'cravo')
      .replace(/lemon peppe/gi, 'lemon pepper')
  );

const compactText = (value: string) => value.replace(/\s+/g, '');

const levenshteinDistance = (a: string, b: string) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
};

const buildSearchTerms = (product: Product) => {
  const normalizedName = normalizeProductName(product.name);
  const tokens = normalizedName.split(' ').filter(Boolean);
  const trimmedTokens = tokens.filter(token => !SEARCH_STOP_WORDS.includes(token));
  const searchTerms = new Set<string>([
    normalizedName,
    trimmedTokens.join(' '),
    compactText(normalizedName),
  ]);

  if (normalizedName.includes('milho de pipoca')) {
    const weight = tokens.find(token => token.endsWith('g')) || '';
    searchTerms.add(`pipoca ${weight}`.trim());
    searchTerms.add(`milho pipoca ${weight}`.trim());
  }

  if (normalizedName.includes('pimenta do reino moida')) {
    const weight = tokens.find(token => token.endsWith('g')) || '';
    searchTerms.add(`pimenta moida ${weight}`.trim());
    searchTerms.add(`reino moida ${weight}`.trim());
  }

  if (normalizedName.includes('pimenta em grao')) {
    const weight = tokens.find(token => token.endsWith('g')) || '';
    searchTerms.add(`pimenta grao ${weight}`.trim());
  }

  if (normalizedName.includes('cominho em grao')) {
    const weight = tokens.find(token => token.endsWith('g')) || '';
    searchTerms.add(`cominho grao ${weight}`.trim());
  }

  if (normalizedName.includes('pimenta com cominho')) {
    const weight = tokens.find(token => token.endsWith('g')) || '';
    searchTerms.add(`pimenta com c ${weight}`.trim());
    searchTerms.add(`pimenta c cominho ${weight}`.trim());
  }

  if (normalizedName.includes('tempero ana maria braga')) {
    const weight = tokens.find(token => token.endsWith('g')) || '';
    searchTerms.add(`tempero ana ${weight}`.trim());
    searchTerms.add(`tempero da ana ${weight}`.trim());
    searchTerms.add(`ana maria ${weight}`.trim());
  }

  if (normalizedName.includes('tempero do chefe')) {
    const weight = tokens.find(token => token.endsWith('g')) || '';
    searchTerms.add(`tempero chef ${weight}`.trim());
    searchTerms.add(`chef ${weight}`.trim());
  }

  if (normalizedName.includes('confeito de chocolate')) {
    const weight = tokens.find(token => token.endsWith('g')) || '';
    searchTerms.add(`confeito ${weight}`.trim());
    searchTerms.add(`confeito ad ${weight}`.trim());
  }

  if (normalizedName.includes('canela em casca')) {
    const weight = tokens.find(token => token.endsWith('g')) || '';
    searchTerms.add(`canela ${weight}`.trim());
  }

  if (normalizedName.includes('lemon pepper')) {
    searchTerms.add('lemon peppe 20g');
  }

  if (normalizedName.includes('acafrao')) {
    searchTerms.add(normalizedName.replace(/acafrao/g, 'acafrao'));
  }

  return [...searchTerms].filter(Boolean);
};

const getSearchScore = (product: Product, rawTerm: string) => {
  const term = normalizeProductName(rawTerm);
  if (!term) return 1;

  const compactTerm = compactText(term);
  const queryTokens = term.split(' ').filter(Boolean);
  const searchTerms = buildSearchTerms(product);
  let bestScore = 0;

  for (const candidate of searchTerms) {
    if (!candidate) continue;
    if (candidate === term) return 200;
    if (candidate.startsWith(term)) bestScore = Math.max(bestScore, 170);
    if (candidate.includes(term)) bestScore = Math.max(bestScore, 150);

    const compactCandidate = compactText(candidate);
    if (compactCandidate.includes(compactTerm)) {
      bestScore = Math.max(bestScore, 145);
    }

    const candidateTokens = candidate.split(' ').filter(Boolean);
    const matchedTokens = queryTokens.filter(token =>
      candidateTokens.some(candidateToken => candidateToken.includes(token) || token.includes(candidateToken))
    ).length;

    if (matchedTokens > 0) {
      bestScore = Math.max(bestScore, 90 + matchedTokens * 15);
    }

    if (compactTerm.length >= 4) {
      const distance = levenshteinDistance(compactTerm, compactCandidate.slice(0, compactTerm.length + 2));
      if (distance <= 2) {
        bestScore = Math.max(bestScore, 115 - distance * 10);
      }
    }
  }

  return bestScore;
};

const formatSignedCurrency = (value: number) => {
  const formatted = Math.abs(value).toFixed(2).replace('.', ',');
  return value < 0 ? `-R$ ${formatted}` : `R$ ${formatted}`;
};

const formatMoneyInput = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const amount = Number(digits) / 100;
  return amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const parseMoneyInput = (value: string) => {
  if (!value) return NaN;
  return Number(value.replace(/\./g, '').replace(',', '.'));
};

const requestJson = async <T,>(input: RequestInfo | URL, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, {
    cache: 'no-store',
    ...init,
  });
  let payload: any = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error || 'Request failed';
    throw new Error(message);
  }

  return payload as T;
};

const App: React.FC<{ mode?: AppMode }> = ({ mode = 'client' }) => {
  const [view, setView] = useState<View>(mode === 'admin' ? 'admin-login' : 'order');
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

  const fetchData = async () => {
    try {
      const [prods, cli, sett, ordersData] = await Promise.all([
        requestJson<Product[]>('/api/products'),
        requestJson<Client>('/api/client'),
        requestJson<AppSettings>('/api/settings'),
        requestJson<OrderRecord[]>('/api/orders')
      ]);

      setProducts(prods.sort((a: Product, b: Product) => a.name.localeCompare(b.name)));
      setClient(cli);
      setSettings(sett);
      setCustomerOrders(ordersData.slice().reverse());
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Nao foi possivel carregar os dados do sistema.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (typeof window === 'undefined') {
      return;
    }

    if (mode === 'admin') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');
    if (orderId) {
      requestJson<OrderRecord | { error: string }>(`/api/orders/${orderId}`)
        .then((data: OrderRecord | { error: string }) => {
          if ('error' in data) return;
          setOrderToView(data);
          setView('view-order');
        })
        .catch(error => {
          console.error('Error loading order:', error);
        });
    }
  }, []);

  useEffect(() => {
    if (mode !== 'admin' || !settings || typeof window === 'undefined') {
      return;
    }

    const isAuthenticated = window.localStorage.getItem(ADMIN_AUTH_STORAGE_KEY) === 'true';
    setView(isAuthenticated ? 'admin' : 'admin-login');
  }, [mode, settings]);

  const filteredProducts = useMemo(() => {
    return products
      .filter(product => product.active)
      .map(product => ({
        product,
        score: getSearchScore(product, searchTerm),
      }))
      .filter(({ score }) => !searchTerm.trim() || score >= 90)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.product.name.localeCompare(b.product.name);
      })
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
        return {
          product,
          quantity: Number(qty),
          price,
          subtotal: price * Number(qty)
        };
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
        doc.text(`Cliente: Jonilson`, 20, 32);
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

      const { order: savedOrder } = await requestJson<{ order: OrderRecord }>(
        '/api/checkout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: payloadItems,
            total
          })
        }
      );

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
      alert('Nao foi possivel confirmar o pedido. Verifique o deploy e tente novamente.');
    }
  };

  const requestOrderDeletion = async (id: string) => {
    if (!confirm('Solicitar exclusao deste pedido para o administrador?')) return;
    await fetch(`/api/orders/${id}/request-deletion`, { method: 'PATCH' });
    await fetchData();
    if (orderToView?.id === id) {
      setOrderToView({
        ...orderToView,
        deletionRequested: true,
        deletionRequestedAt: new Date().toISOString()
      });
    }
  };

  const checkAdminPassword = () => {
    if (settings && adminPassInput === settings.adminPassword) {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, 'true');
      }
      setView('admin');
      return;
    }
    alert('Senha incorreta');
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center text-emerald-600 font-medium">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-24">
      <header className="bg-emerald-700 text-white p-6 sticky top-0 z-20 shadow-md">
        <div className="flex justify-between items-center max-w-lg mx-auto gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ShoppingCart className="w-6 h-6" /> Pedir   Temperos
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
              onClick={() => setView(view === 'history' ? 'order' : 'history')}
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
                  onClick={() => {
                    setView('order');
                    window.history.replaceState({}, '', '/');
                  }}
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
                  onClick={() => requestOrderDeletion(orderToView.id)}
                  className="w-full bg-amber-500 text-white font-bold py-3 rounded-xl"
                >
                  Solicitar exclusao ao administrador
                </button>
              )}
            </motion.div>
          )}

          {view === 'admin-login' && (
            <motion.div
              key="admin-login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-20 bg-white p-6 rounded-2xl shadow-xl border border-slate-200"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="bg-emerald-100 p-3 rounded-full">
                  <Lock className="w-6 h-6 text-emerald-700" />
                </div>
                <h2 className="text-xl font-bold">Acesso Administrativo</h2>
                <input
                  type="password"
                  placeholder="Senha"
                  className="w-full p-3 border border-slate-200 rounded-xl"
                  value={adminPassInput}
                  onChange={e => setAdminPassInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && checkAdminPassword()}
                />
                <div className="flex gap-2 w-full">
                  <button onClick={() => { if (typeof window !== 'undefined') window.location.href = '/'; }} className="flex-1 p-3 text-slate-500 font-medium">
                    Voltar
                  </button>
                  <button onClick={checkAdminPassword} className="flex-1 p-3 bg-emerald-700 text-white rounded-xl font-bold">
                    Entrar
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'admin' && settings && client && (
            <AdminView
              settings={settings}
              client={client}
              products={products}
              onBack={() => {
                if (typeof window !== 'undefined') {
                  window.localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
                }
                if (typeof window !== 'undefined') {
                  window.location.href = '/';
                }
                setAdminPassInput('');
              }}
              onUpdate={fetchData}
              generatePDF={generatePDF}
              tab={adminTab}
              onTabChange={setAdminTab}
            />
          )}

          {mode === 'client' && view === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Historico de Pedidos</h2>
                <button onClick={() => setView('order')} className="text-emerald-700 font-bold text-sm">
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
                  <div className="text-xs text-slate-500">
                    {o.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setOrderToView(o);
                        setView('view-order');
                      }}
                      className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold"
                    >
                      Ver pedido
                    </button>
                    <button
                      onClick={() => requestOrderDeletion(o.id)}
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
            <motion.div
              key="review"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3">
                <button onClick={() => setView('order')} className="p-2 bg-white rounded-full shadow-sm">
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
                <button onClick={() => setView('order')} className="flex-1 py-3 bg-white border border-slate-200 rounded-xl font-bold">
                  Voltar e ajustar
                </button>
                <button onClick={handleConfirmOrder} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Confirmar pedido
                </button>
              </div>
            </motion.div>
          )}

          {mode === 'client' && view === 'order' && (
            <motion.div
              key="order"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
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
              onClick={() => setView('review')}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 uppercase tracking-wide"
            >
              <Send className="w-5 h-5" /> Revisar pedido
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

const AdminView: React.FC<{
  settings: AppSettings;
  client: Client;
  products: Product[];
  onBack: () => void;
  onUpdate: () => Promise<void>;
  generatePDF: (order: OrderRecord) => jsPDF;
  tab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}> = ({ settings, client, products, onBack, onUpdate, generatePDF, tab, onTabChange }) => {
  const [payAmount, setPayAmount] = useState('');
  const [financeAdvancedUnlocked, setFinanceAdvancedUnlocked] = useState(false);
  const [financeUnlockTaps, setFinanceUnlockTaps] = useState(0);
  const [registerDebt, setRegisterDebt] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdType, setNewProdType] = useState<'comum' | 'adesivo'>('comum');
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [uuidSearch, setUuidSearch] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.sessionStorage.getItem('temperossistem.finance.advanced') === 'true';
    setFinanceAdvancedUnlocked(stored);
  }, []);

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
      const signedAmount = registerDebt ? -Math.abs(amount) : Math.abs(amount);
      await requestJson('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: signedAmount })
      });
      setPayAmount('');
      await onUpdate();
      await loadPaymentLogs();
      alert('Saldo atualizado.');
    } catch (error) {
      console.error('Error updating balance:', error);
      alert('Nao foi possivel registrar o pagamento.');
    }
  };

  const handleFinanceTitleTap = () => {
    // Hidden unlock: 7 taps in a row on the "Dar Baixa" title.
    setFinanceUnlockTaps(prev => {
      const next = prev + 1;
      if (next >= 7) {
        setFinanceAdvancedUnlocked(true);
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('temperossistem.finance.advanced', 'true');
        }
        return 0;
      }
      window.setTimeout(() => setFinanceUnlockTaps(0), 1200);
      return next;
    });
  };

  const undoPayment = async (log: PaymentLog) => {
    if (log.reversed) return;
    if (!confirm(`Desfazer o pagamento de ${formatSignedCurrency(log.amount)}?`)) return;
    const res = await fetch(`/api/payment-logs/${log.id}/undo`, {
      method: 'PATCH',
    });
    if (!res.ok) {
      alert('Nao foi possivel desfazer esse pagamento.');
      return;
    }
    await onUpdate();
    await loadPaymentLogs();
    alert('Pagamento desfeito.');
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
      alert('Produto adicionado.');
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Nao foi possivel adicionar o produto.');
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
      alert('Nao foi possivel atualizar o produto.');
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
      alert('Precos atualizados.');
    } catch (error) {
      console.error('Error updating prices:', error);
      alert('Nao foi possivel atualizar os precos.');
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
      alert('Nao foi possivel excluir o pedido.');
    }
  };

  const printOrder = (order: OrderRecord) => {
    const doc = generatePDF(order);
    doc.autoPrint({ variant: 'non-conform' });
    const printUrl = doc.output('bloburl');
    const printWindow = window.open(printUrl, '_blank', 'noopener,noreferrer');

    if (!printWindow) {
      alert('O navegador bloqueou a janela de impressao. Libere pop-ups e tente novamente.');
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
            <h4 className="font-bold select-none touch-manipulation" onClick={handleFinanceTitleTap}>
              Dar Baixa
            </h4>
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

            {financeAdvancedUnlocked && (
              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-600 font-medium">Modo ajuste (lancar divida)</span>
                  <input
                    type="checkbox"
                    checked={registerDebt}
                    onChange={e => setRegisterDebt(e.target.checked)}
                    className="h-5 w-5 accent-red-600"
                  />
                </label>
                <p className="text-xs text-slate-400 mt-1">
                  Quando ativo, o valor sera registrado como negativo (aumenta o que esta devendo).
                </p>
              </div>
            )}
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
};

export default App;
