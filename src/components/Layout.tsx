import React from 'react';
import { useAuth } from '../App';
import { Home, PlusCircle, BookOpen, LogOut, Settings, Shield } from 'lucide-react';
import { motion } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  setView: (view: 'dashboard' | 'wizard' | 'editor' | 'admin') => void;
  currentView: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, setView, currentView }) => {
  const { user, logout } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'INÍCIO', icon: Home },
    { id: 'wizard', label: 'GERAR', icon: PlusCircle },
    ...(user?.role === 'admin' ? [{ id: 'admin', label: 'ADMIN', icon: Shield }] : []),
  ];

  return (
    <div className="min-h-screen cosmic-bg flex font-sans text-white/90 overflow-hidden selection:bg-neon-cyan/30">
      {/* Floating Sidebar */}
      <aside className="w-24 lg:w-32 flex flex-col items-center py-12 border-r border-white/5 relative z-50 bg-obsidian/40 backdrop-blur-3xl">
        <div className="mb-16 relative group cursor-pointer" onClick={() => setView('dashboard')}>
          <div className="w-12 h-12 rounded-full border border-neon-cyan/30 flex items-center justify-center group-hover:border-neon-cyan transition-colors duration-500">
            <div className="w-2 h-2 bg-neon-cyan rounded-full animate-pulse" />
          </div>
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <span className="text-[10px] font-mono tracking-[0.3em] text-neon-cyan uppercase">Home</span>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-12">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id as any)}
              className="relative group"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                currentView === item.id 
                  ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20' 
                  : 'text-white/20 hover:text-white/60'
              }`}>
                <item.icon className="w-5 h-5" />
              </div>
              <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-[-10px] group-hover:translate-x-0 pointer-events-none">
                <span className="text-[10px] font-mono tracking-[0.4em] text-neon-cyan uppercase whitespace-nowrap">{item.label}</span>
              </div>
              {currentView === item.id && (
                <motion.div 
                  layoutId="active-pill"
                  className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-neon-cyan rounded-full shadow-[0_0_15px_rgba(0,240,255,0.8)]"
                />
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-8 items-center">
          <button className="text-white/20 hover:text-neon-cyan transition-colors duration-500">
            <Settings className="w-5 h-5" />
          </button>
          <button 
            onClick={logout}
            className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center hover:border-red-500/40 hover:text-red-500 transition-all duration-500"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-neon-purple/5 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] left-[10%] w-[30%] h-[30%] bg-neon-cyan/5 rounded-full blur-[100px] animate-pulse-slow" />

        {/* Top Navigation / Status */}
        <header className="h-24 flex items-center justify-between px-12 relative z-10">
          <div className="flex items-center gap-8">
            <div className="h-px w-12 bg-white/10" />
            <div className="font-mono text-[10px] tracking-[0.5em] text-white/30 uppercase">
              Status do Sistema: <span className="text-neon-cyan">Otimizado</span>
            </div>
          </div>

          <div className="flex items-center gap-12">
            <div className="flex gap-8">
              {[
                { label: 'Créditos', value: user?.credits },
                { label: 'Uptime', value: '99.9%' }
              ].map(stat => (
                <div key={stat.label} className="text-right">
                  <p className="text-[9px] font-mono tracking-widest text-white/20 uppercase mb-1">{stat.label}</p>
                  <p className="text-sm font-medium tracking-tighter">{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden p-0.5">
              <img 
                src={user?.photoURL || ''} 
                className="w-full h-full rounded-full grayscale hover:grayscale-0 transition-all duration-700" 
                alt="Profile"
              />
            </div>
          </div>
        </header>

        {/* Content Viewport */}
        <div className="flex-1 overflow-y-auto px-12 pb-12 relative z-10 scrollbar-hide">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="h-full"
          >
            {children}
          </motion.div>
        </div>

        {/* Bottom Rail */}
        <footer className="h-12 border-t border-white/5 flex items-center justify-between px-12 relative z-10 bg-obsidian/20 backdrop-blur-md">
          <div className="font-mono text-[8px] tracking-[0.4em] text-white/20 uppercase">
            © 2026 EDUTORIA // NEURAL ENGINE V4.2
          </div>
          <div className="flex gap-6">
            {['Terminal', 'Rede', 'Segurança'].map(item => (
              <button key={item} className="font-mono text-[8px] tracking-[0.3em] text-white/20 hover:text-neon-cyan uppercase transition-colors">
                {item}
              </button>
            ))}
          </div>
        </footer>
      </main>
    </div>
  );
};
