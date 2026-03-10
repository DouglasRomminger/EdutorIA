import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Project, ContentType } from '../types';
import { api } from '../api';
import { PROJECT_TYPE_LABELS, CONTENT_TYPES } from '../constants';
import {
  BookOpen,
  Image as ImageIcon,
  FileText,
  Presentation,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { motion } from 'motion/react';

const TYPE_ICONS: Record<ContentType, React.ElementType> = {
  ebook: BookOpen,
  lesson_plan: FileText,
  slides: Presentation,
  images: ImageIcon,
};

interface DashboardProps {
  onNewProject: (type: ContentType) => void;
  onSelectProject: (id: string) => void;
  onAdmin: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNewProject, onSelectProject, onAdmin }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;
      try {
        const data = await api.getProjects();
        setProjects(data);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [user]);

  return (
    <div className="h-full flex flex-col gap-12 py-8">
      {/* Header Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-4"
          >
            <div className="w-2 h-2 bg-neon-cyan rounded-full animate-pulse" />
            <span className="text-[10px] font-mono tracking-[0.4em] text-white/40 uppercase">Hub de Criação Neural</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-5xl lg:text-6xl font-bold tracking-tighter leading-none"
          >
            Olá, <span className="text-neon-cyan neon-text-glow">{user?.displayName?.split(' ')[0]}</span>
          </motion.h1>
          <p className="text-white/30 mt-4 font-light max-w-md">
            O que vamos sintetizar hoje? Escolha um módulo abaixo para iniciar sua jornada criativa.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Projetos Ativos', value: projects.length, icon: BookOpen },
              { label: 'Créditos', value: user?.credits, icon: Sparkles },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card px-8 py-5 flex flex-col gap-1 min-w-[140px] border-white/5"
              >
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className="w-4 h-4 text-neon-cyan/60" />
                  <div className="w-1.5 h-1.5 bg-neon-cyan/40 rounded-full" />
                </div>
                <p className="text-[9px] font-mono tracking-widest text-white/20 uppercase">{stat.label}</p>
                <p className="text-2xl font-bold tracking-tighter">{stat.value}</p>
              </motion.div>
            ))}
          </div>

          {user?.role === 'admin' && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={onAdmin}
              className="glass-card px-6 py-5 flex flex-col items-center gap-2 border-neon-cyan/20 hover:border-neon-cyan/40 transition-all"
            >
              <Shield className="w-5 h-5 text-neon-cyan" />
              <span className="text-[9px] font-mono tracking-widest text-neon-cyan uppercase">ADM</span>
            </motion.button>
          )}
        </div>
      </section>

      {/* Content Type Grid */}
      <section>
        <div className="flex items-center gap-4 mb-8">
          <div className="w-1 h-4 bg-neon-cyan rounded-full" />
          <h2 className="text-[10px] font-mono tracking-[0.5em] text-white/30 uppercase">Tipos de Conteúdo</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {CONTENT_TYPES.map((type, i) => {
            const Icon = TYPE_ICONS[type.id];
            return (
              <motion.button
                key={type.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ scale: 1.02, translateY: -5 }}
                onClick={() => onNewProject(type.id)}
                className="glass-card p-8 text-left group relative overflow-hidden neo-brutalist-border flex flex-col h-full"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Icon className="w-32 h-32 -mr-12 -mt-12 rotate-12" />
                </div>

                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-8 group-hover:bg-neon-cyan group-hover:text-obsidian transition-all duration-500">
                    <Icon className="w-6 h-6" />
                  </div>

                  <h3 className="text-xl font-bold tracking-tight mb-3 group-hover:text-neon-cyan transition-colors">
                    {type.label}
                  </h3>
                  <p className="text-xs text-white/40 font-light leading-relaxed mb-8 flex-1">{type.desc}</p>

                  <div className="flex items-center justify-between pt-6 border-t border-white/5">
                    <div className="flex items-center gap-2 text-neon-cyan text-[9px] font-mono tracking-widest uppercase">
                      <span>Criar</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <Sparkles className="w-3 h-3 text-white/10 group-hover:text-neon-cyan transition-colors" />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Recent Projects */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-1 h-4 bg-neon-purple rounded-full" />
            <h2 className="text-[10px] font-mono tracking-[0.5em] text-white/30 uppercase">Atividade Recente</h2>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="glass-card p-12 text-center border-white/5">
              <p className="text-white/20 font-mono text-xs uppercase tracking-widest animate-pulse">Carregando...</p>
            </div>
          ) : projects.length > 0 ? (
            projects.slice(0, 5).map((project) => (
              <button
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className="glass-card p-6 flex items-center justify-between group hover:bg-white/[0.04] transition-all border-white/5"
              >
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-neon-purple/20 transition-colors">
                    <FileText className="w-6 h-6 text-white/20 group-hover:text-neon-purple" />
                  </div>
                  <div>
                    <h4 className="text-lg font-medium group-hover:text-neon-cyan transition-colors">{project.title}</h4>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-[9px] font-mono tracking-widest text-white/20 uppercase px-2 py-1 bg-white/5 rounded-md">
                        {PROJECT_TYPE_LABELS[project.type] || project.type}
                      </span>
                      <span className="text-[9px] font-mono tracking-widest text-white/20 uppercase">
                        {new Date(project.updatedAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center group-hover:border-neon-cyan/40 transition-all">
                  <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-neon-cyan" />
                </div>
              </button>
            ))
          ) : (
            <div className="glass-card p-12 text-center border-dashed border-white/10">
              <p className="text-white/20 font-mono text-xs uppercase tracking-widest">Nenhum projeto criado ainda.</p>
              <button
                onClick={() => onNewProject('ebook')}
                className="mt-4 text-neon-cyan text-[10px] font-mono tracking-widest uppercase hover:underline"
              >
                Criar Primeiro Projeto
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
