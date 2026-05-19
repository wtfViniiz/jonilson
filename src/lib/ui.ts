export const formatSignedCurrency = (value: number) => {
  const formatted = Math.abs(value).toFixed(2).replace('.', ',');
  return value < 0 ? `-R$ ${formatted}` : `R$ ${formatted}`;
};

export const formatMoneyInput = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const amount = Number(digits) / 100;
  return amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const parseMoneyInput = (value: string) => {
  if (!value) return NaN;
  return Number(value.replace(/\./g, '').replace(',', '.'));
};

export const requestJson = async <T,>(input: RequestInfo | URL, init?: RequestInit): Promise<T> => {
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
