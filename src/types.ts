export interface Product {
  id?: string;
  name: string;
  type: 'comum' | 'adesivo';
  active: boolean;
}

export interface Client {
  id: string;
  name: string;
  balance: number;
}

export interface AppSettings {
  commonPrice: number;
  adhesivePrice: number;
  adminPassword: string;
}

export interface OrderItem {
  product: Product;
  quantity: number;
}

export interface StoredOrderItem {
  name: string;
  type: 'comum' | 'adesivo';
  quantity: number;
  price: number;
}

export interface OrderRecord {
  id: string;
  uuid: string;
  createdAt: string;
  total: number;
  balance: number;
  status: 'active' | 'canceled';
  items: StoredOrderItem[];
  isEdited?: boolean;
  editedAt?: string;
  originalTotal?: number;
  deletionRequested?: boolean;
  deletionRequestedAt?: string;
}

export interface PaymentLog {
  id: string;
  amount: number;
  previousBalance: number;
  newBalance: number;
  createdAt: string;
  reversed?: boolean;
  reversedAt?: string;
  reversedBalance?: number;
}
