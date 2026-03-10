import React, { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { User, ContentType } from './types';
import { api } from './api';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Wizard } from './components/Wizard';
import { ProjectEditor } from './components/ProjectEditor';
import { Admin } from './components/Admin';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type View = 'dashboard' | 'wizard' | 'editor' | 'admin';

const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}>({
  user: null,
  loading: true,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [wizardType, setWizardType] = useState<ContentType>('ebook');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Session may already exist; try fetching user from backend
          const sessionUser = await api.getMe();
          if (sessionUser) {
            setUser(sessionUser);
          } else {
            // Create/update session via backend
            const idToken = await firebaseUser.getIdToken();
            const backendUser = await api.loginWithFirebase(idToken);
            setUser(backendUser);
          }
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogin = async (idToken: string) => {
    const backendUser = await api.loginWithFirebase(idToken);
    setUser(backendUser);
  };

  const logout = async () => {
    try {
      await api.logout();
      await signOut(auth);
    } catch {
      // ignore
    } finally {
      setUser(null);
      setView('dashboard');
    }
  };

  const handleNewProject = (type: ContentType) => {
    setWizardType(type);
    setView('wizard');
  };

  if (loading) {
    return (
      <div className="min-h-screen cosmic-bg flex items-center justify-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border border-white/5 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
          </div>
          <div className="absolute inset-0 bg-neon-cyan/10 rounded-full blur-2xl animate-pulse" />
          <p className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-[10px] font-mono tracking-[0.5em] text-white/30 uppercase whitespace-nowrap">
            Sincronizando Rede Neural...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Admin route protection
  if (view === 'admin' && user.role !== 'admin') {
    setView('dashboard');
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      <Layout setView={setView} currentView={view}>
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <Dashboard
              key="dashboard"
              onNewProject={handleNewProject}
              onSelectProject={(id) => {
                setSelectedProjectId(id);
                setView('editor');
              }}
              onAdmin={() => setView('admin')}
            />
          )}
          {view === 'wizard' && (
            <Wizard
              key="wizard"
              contentType={wizardType}
              onCancel={() => setView('dashboard')}
              onComplete={(id) => {
                setSelectedProjectId(id);
                setView('editor');
              }}
            />
          )}
          {view === 'editor' && selectedProjectId && (
            <ProjectEditor
              key="editor"
              projectId={selectedProjectId}
              onBack={() => setView('dashboard')}
            />
          )}
          {view === 'admin' && user.role === 'admin' && (
            <Admin key="admin" />
          )}
        </AnimatePresence>
      </Layout>
    </AuthContext.Provider>
  );
}
