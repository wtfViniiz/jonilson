import crypto from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const SOURCE_DB_FILE = path.join(/* turbopackIgnore: true */ process.cwd(), 'db.json');
const DATA_DIR = process.env.DATA_DIR || path.join(os.tmpdir(), 'temperossistem');
const DB_FILE = process.env.DB_FILE_PATH || path.join(DATA_DIR, 'db.json');
const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_TABLE = process.env.SUPABASE_TABLE || 'app_state';
const SUPABASE_ROW_ID = Number(process.env.SUPABASE_ROW_ID || 1);
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

export const INITIAL_DATA = {
  products: [
    { id: '1', name: 'AÃ‡AFRÃƒO 20G', type: 'comum', active: true },
    { id: '2', name: 'ALECRIM 10G', type: 'comum', active: true },
    { id: '3', name: 'ALFAZEMA 10G', type: 'comum', active: true },
    { id: '4', name: 'ALHO 100G', type: 'comum', active: true },
    { id: '5', name: 'ALHO FRITO 20G', type: 'comum', active: true },
    { id: '6', name: 'AMACIANTE DE CARNE 20G', type: 'comum', active: true },
    { id: '7', name: 'AMENDOIM 20G', type: 'comum', active: true },
    { id: '8', name: 'ANIS ESTRELADO 20G', type: 'comum', active: true },
    { id: '9', name: 'BICARBONATO 25G', type: 'comum', active: true },
    { id: '10', name: 'BOLDO 10G', type: 'comum', active: true },
    { id: '11', name: 'CAMOMILA 10G', type: 'comum', active: true },
    { id: '12', name: 'CANELA EM CASCA 10G', type: 'comum', active: true },
    { id: '13', name: 'CASTANHA DE CAJU 25G', type: 'comum', active: true },
    { id: '14', name: 'CHIA 100G ADESIVO', type: 'adesivo', active: true },
    { id: '15', name: 'CHIMICHURRI 10G', type: 'comum', active: true },
    { id: '16', name: 'COLORAU 50G', type: 'comum', active: true },
    { id: '17', name: 'COLORAU 80G', type: 'comum', active: true },
    { id: '18', name: 'COLORAU 150G', type: 'comum', active: true },
    { id: '19', name: 'COLORAU 300G ADESIVO', type: 'adesivo', active: true },
    { id: '20', name: 'COMINHO EM GRÃƒO 20G', type: 'comum', active: true },
    { id: '21', name: 'COMINHO MOÃDO 25G', type: 'comum', active: true },
    { id: '22', name: 'COMINHO MOÃDO 40G', type: 'comum', active: true },
    { id: '23', name: 'CONFEITO DE CHOCOLATE 25G', type: 'comum', active: true },
    { id: '24', name: 'CONFEITO DE CHOCOLATE 70G ADESIVO', type: 'adesivo', active: true },
    { id: '25', name: 'CONFEITO PARA BOLO 25G', type: 'comum', active: true },
    { id: '26', name: 'CONFEITO PARA BOLO 70G ADESIVO', type: 'adesivo', active: true },
    { id: '27', name: 'CRAVINHO 10G', type: 'comum', active: true },
    { id: '28', name: 'CURRY 20G', type: 'comum', active: true },
    { id: '29', name: 'ENXOFRE 20G', type: 'comum', active: true },
    { id: '30', name: 'ERVA CIDREIRA 20G', type: 'comum', active: true },
    { id: '31', name: 'ERVA-DOCE 10G', type: 'comum', active: true },
    { id: '32', name: 'FARINHA DE ROSCA 100G', type: 'comum', active: true },
    { id: '33', name: 'FARINHA DE TAPIOCA ADESIVO 200G', type: 'adesivo', active: true },
    { id: '34', name: 'GENGIBRE 20G', type: 'comum', active: true },
    { id: '35', name: 'HIBISCO 10G', type: 'comum', active: true },
    { id: '36', name: 'LEMON PEPPER 20G', type: 'comum', active: true },
    { id: '37', name: 'LINHAÃ‡A DOURADA 20G', type: 'comum', active: true },
    { id: '38', name: 'LINHAÃ‡A MARROM 20G', type: 'comum', active: true },
    { id: '39', name: 'LOURO 10G', type: 'comum', active: true },
    { id: '40', name: 'MACA PERUANA 20G', type: 'comum', active: true },
    { id: '41', name: 'MILHO BRANCO 300G ADESIVO', type: 'adesivo', active: true },
    { id: '42', name: 'MILHO DE PIPOCA 80G', type: 'comum', active: true },
    { id: '43', name: 'MILHO DE PIPOCA 150G', type: 'comum', active: true },
    { id: '44', name: 'MILHO DE PIPOCA 300G ADESIVO', type: 'adesivo', active: true },
    { id: '45', name: 'OREGANO 10G', type: 'comum', active: true },
    { id: '46', name: 'PÃPRICA DEFUMADA 20G', type: 'comum', active: true },
    { id: '47', name: 'PÃPRICA DOCE 20G', type: 'comum', active: true },
    { id: '48', name: 'PÃPRICA PICANTE 20G', type: 'comum', active: true },
    { id: '49', name: 'PICADINHO DE SOJA ADESIVO 200G', type: 'adesivo', active: true },
    { id: '50', name: 'PIMENTA CALABRESA', type: 'comum', active: true },
    { id: '51', name: 'PIMENTA COM COMINHO 25G', type: 'comum', active: true },
    { id: '52', name: 'PIMENTA COM COMINHO 40G', type: 'comum', active: true },
    { id: '53', name: 'PIMENTA DO REINO MOÃDA 20G', type: 'comum', active: true },
    { id: '54', name: 'PIMENTA DO REINO MOÃDA 40G', type: 'comum', active: true },
    { id: '55', name: 'PIMENTA EM GRÃƒO 20G', type: 'comum', active: true },
    { id: '56', name: 'PISTACHE 20G', type: 'comum', active: true },
    { id: '57', name: 'SAL GROSSO 20G', type: 'comum', active: true },
    { id: '58', name: 'SEMENTE DE ABÃ“BORA 20G', type: 'comum', active: true },
    { id: '59', name: 'SEMENTE DE GIRASSOL', type: 'comum', active: true },
    { id: '60', name: 'SENE 10G', type: 'comum', active: true },
    { id: '61', name: 'TEMPERO ANA MARIA BRAGA 20G', type: 'comum', active: true },
    { id: '62', name: 'TEMPERO BAIANO 20G', type: 'comum', active: true },
    { id: '63', name: 'TEMPERO CHEIRO VERDE ADESIVO 200G', type: 'adesivo', active: true },
    { id: '64', name: 'TEMPERO COMPLETO AÃ‡AFRÃƒO ADESIVO 200G', type: 'adesivo', active: true },
    { id: '65', name: 'TEMPERO COMPLETO COLORAL ADESIVO 200G', type: 'adesivo', active: true },
    { id: '66', name: 'TEMPERO COMPLETO DE CHURRASCO ADESIVO 200G', type: 'adesivo', active: true },
    { id: '67', name: 'TEMPERO DO CHEFE 20G', type: 'comum', active: true },
    { id: '68', name: 'TEMPERO PARA CHURRASCO 500G', type: 'comum', active: true },
    { id: '69', name: 'UVA PASSA ADESIVO', type: 'adesivo', active: true },
  ],
  client: { name: 'Jonilson', balance: 0 },
  orders: [],
  paymentLogs: [],
  settings: {
    commonPrice: 0.95,
    adhesivePrice: 2.5,
    adminPassword: 'Barbosa05183104.',
  },
};

const normalizeArray = <T,>(value: unknown, fallback: T[]) => (Array.isArray(value) ? value : fallback);

const normalizeDb = (value: any) => ({
  products: normalizeArray(value?.products, INITIAL_DATA.products),
  client: {
    ...INITIAL_DATA.client,
    ...(value?.client || {}),
    balance: Number(value?.client?.balance ?? INITIAL_DATA.client.balance) || 0,
  },
  orders: normalizeArray(value?.orders, []).map((order: any) => ({
    ...order,
    uuid: order?.uuid || crypto.randomUUID(),
    deletionRequested: Boolean(order?.deletionRequested),
  })),
  paymentLogs: normalizeArray(value?.paymentLogs, []).map((log: any) => ({
    ...log,
    reversed: Boolean(log?.reversed),
  })),
  settings: {
    ...INITIAL_DATA.settings,
    ...(value?.settings || {}),
    commonPrice: Number(value?.settings?.commonPrice ?? INITIAL_DATA.settings.commonPrice) || INITIAL_DATA.settings.commonPrice,
    adhesivePrice: Number(value?.settings?.adhesivePrice ?? INITIAL_DATA.settings.adhesivePrice) || INITIAL_DATA.settings.adhesivePrice,
    adminPassword: value?.settings?.adminPassword || INITIAL_DATA.settings.adminPassword,
  },
});

const getSupabaseHeaders = (prefer?: string) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase env vars are missing');
  }

  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: prefer } : {}),
  };
};

const getSupabaseStateUrl = () => {
  if (!SUPABASE_URL) {
    throw new Error('Supabase URL is missing');
  }

  return `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`;
};

const readSupabaseDb = async () => {
  const url = `${getSupabaseStateUrl()}?id=eq.${SUPABASE_ROW_ID}&select=data`;
  const response = await fetch(url, {
    headers: getSupabaseHeaders(),
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase read failed: ${response.status} ${body}`);
  }

  const rows = (await response.json()) as Array<{ data?: unknown }>;
  if (rows.length > 0 && rows[0]?.data) {
    return normalizeDb(rows[0].data);
  }

  const seed = normalizeDb(INITIAL_DATA);
  await writeSupabaseDb(seed);
  return seed;
};

const writeSupabaseDb = async (data: unknown) => {
  const response = await fetch(`${getSupabaseStateUrl()}?on_conflict=id`, {
    method: 'POST',
    headers: getSupabaseHeaders('resolution=merge-duplicates,return=representation'),
    body: JSON.stringify([{ id: SUPABASE_ROW_ID, data }]),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase write failed: ${response.status} ${body}`);
  }
};

export async function readDb() {
  if (USE_SUPABASE) {
    return readSupabaseDb();
  }

  try {
    await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
    try {
      const data = await fs.readFile(DB_FILE, 'utf-8');
      return normalizeDb(JSON.parse(data));
    } catch {
      const sourceData = await fs.readFile(SOURCE_DB_FILE, 'utf-8');
      const normalized = normalizeDb(JSON.parse(sourceData));
      await fs.writeFile(DB_FILE, JSON.stringify(normalized, null, 2), 'utf-8');
      return normalized;
    }
  } catch {
    const normalized = normalizeDb(INITIAL_DATA);
    await fs.writeFile(DB_FILE, JSON.stringify(normalized, null, 2), 'utf-8');
    return normalized;
  }
}

export async function writeDb(data: unknown) {
  if (USE_SUPABASE) {
    await writeSupabaseDb(data);
    return;
  }

  await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}
