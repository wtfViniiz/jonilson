'use client';

import { motion } from 'motion/react';
import { Lock } from 'lucide-react';

type AdminLoginViewProps = {
  password: string;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
};

export function AdminLoginView({ password, onPasswordChange, onSubmit, onBack }: AdminLoginViewProps) {
  return (
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
          value={password}
          onChange={e => onPasswordChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSubmit()}
        />
        <div className="flex gap-2 w-full">
          <button onClick={onBack} className="flex-1 p-3 text-slate-500 font-medium">
            Voltar
          </button>
          <button onClick={onSubmit} className="flex-1 p-3 bg-emerald-700 text-white rounded-xl font-bold">
            Entrar
          </button>
        </div>
      </div>
    </motion.div>
  );
}
