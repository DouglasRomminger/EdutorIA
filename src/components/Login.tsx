import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  onLogin: (idToken: string) => Promise<void>;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      await onLogin(idToken);
    } catch (err: any) {
      setError(err.message || 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen cosmic-bg flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-neon-purple/10 rounded-full blur-[120px] animate-pulse-slow" />
      <div className="absolute bottom-[-10%] left-[10%] w-[30%] h-[30%] bg-neon-cyan/10 rounded-full blur-[100px] animate-pulse-slow" />

      <motion.div
        initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-md w-full glass-card p-12 text-center relative z-10"
      >
        <div className="w-20 h-20 rounded-3xl border border-neon-cyan/30 flex items-center justify-center mx-auto mb-8 relative group">
          <div className="absolute inset-0 bg-neon-cyan/5 rounded-3xl blur-xl group-hover:bg-neon-cyan/10 transition-all duration-500" />
          <span className="text-neon-cyan text-4xl font-bold tracking-tighter relative z-10">E</span>
        </div>

        <h1 className="text-5xl font-sans font-bold tracking-tighter text-white mb-4 neon-text-glow">
          EDUTORIA
        </h1>

        <div className="flex items-center justify-center gap-4 mb-10">
          <div className="h-px w-8 bg-white/10" />
          <p className="text-[10px] font-mono tracking-[0.4em] text-white/40 uppercase">
            Neural Content Engine
          </p>
          <div className="h-px w-8 bg-white/10" />
        </div>

        <p className="text-lg font-serif italic text-white/60 mb-12 leading-relaxed">
          "Sintetizando o futuro da educação através da inteligência neural."
        </p>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs font-mono tracking-wider uppercase"
          >
            Erro de Acesso: {error}
          </motion.div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full group relative overflow-hidden bg-white text-obsidian px-8 py-5 rounded-2xl font-bold tracking-widest uppercase text-xs transition-all duration-500 hover:tracking-[0.3em] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
        >
          <div className="absolute inset-0 bg-neon-cyan opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          <span className="relative z-10">
            {loading ? 'Autenticando...' : 'Entrar com Google'}
          </span>
        </button>

        <div className="mt-12 pt-8 border-t border-white/5">
          <p className="text-[9px] font-mono tracking-[0.2em] text-white/20 uppercase">
            Protocolo de Segurança Ativo // Firebase Auth
          </p>
        </div>
      </motion.div>
    </div>
  );
};
