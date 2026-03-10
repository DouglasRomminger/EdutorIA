import React, { useState } from 'react';
import { Briefing, ContentType } from '../types';
import { api } from '../api';
import { CONTENT_TYPES } from '../constants';
import {
  BookOpen,
  FileText,
  Presentation,
  Image as ImageIcon,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const TYPE_ICONS: Record<ContentType, React.ElementType> = {
  ebook: BookOpen,
  lesson_plan: FileText,
  slides: Presentation,
  images: ImageIcon,
};

interface WizardProps {
  contentType: ContentType;
  onCancel: () => void;
  onComplete: (projectId: string) => void;
}

export const Wizard: React.FC<WizardProps> = ({ contentType, onCancel, onComplete }) => {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<Briefing>({
    material_type: contentType,
    main_topic: '',
    target_audience: '',
    objective: '',
    tone: 'Didático',
    language: 'Português',
    length: 'medium',
    extras: [],
    references: '',
  });

  const typeInfo = CONTENT_TYPES.find(t => t.id === contentType)!;
  const TypeIcon = TYPE_ICONS[contentType];

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenError(null);
    try {
      const { outline } = await api.generate(contentType, briefing);

      const project = await api.createProject({
        type: contentType,
        title: briefing.main_topic,
        briefing: { ...briefing, material_type: contentType },
      });

      // Update project with the generated outline
      await api.updateProject(project.id, { outline, status: 'completed' });

      onComplete(project.id);
    } catch (err: any) {
      setGenError(err.message || 'Erro na geração. Verifique o agente Tess configurado.');
    } finally {
      setIsGenerating(false);
    }
  };

  const stepTitles = ['DEFINA O NÚCLEO', 'MAPEIE O PÚBLICO', 'SINTETIZAR'];

  return (
    <div className="max-w-5xl mx-auto py-12">
      <div className="glass-card p-16 relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-neon-cyan/10 rounded-full blur-[100px] animate-pulse-slow" />

        {/* Header */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-2 h-2 bg-neon-cyan rounded-full" />
            <span className="text-[10px] font-mono tracking-[0.5em] text-white/30 uppercase">
              {typeInfo.label} // Passo 0{step}
            </span>
            <div className="flex items-center gap-2 ml-auto px-4 py-2 bg-neon-cyan/5 border border-neon-cyan/20 rounded-full">
              <TypeIcon className="w-3.5 h-3.5 text-neon-cyan" />
              <span className="text-[9px] font-mono tracking-widest text-neon-cyan uppercase">{typeInfo.label}</span>
            </div>
          </div>
          <h2 className="text-5xl lg:text-7xl font-bold tracking-tighter">{stepTitles[step - 1]}</h2>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              <div className="space-y-4">
                <label className="text-[10px] font-mono tracking-[0.4em] text-white/20 uppercase">
                  {contentType === 'images' ? 'Tema / Conceito Visual' : 'Tópico Principal'}
                </label>
                <input
                  type="text"
                  placeholder={
                    contentType === 'images'
                      ? 'Descreva o tema ou conceito visual...'
                      : contentType === 'lesson_plan'
                      ? 'Ex: Revolução Francesa, Álgebra Linear...'
                      : contentType === 'slides'
                      ? 'Ex: Introdução ao React, Liderança...'
                      : 'Digite o assunto central do seu material...'
                  }
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-8 py-6 text-xl font-light placeholder:text-white/10 focus:outline-none focus:border-neon-cyan/40 transition-all"
                  value={briefing.main_topic}
                  onChange={(e) => setBriefing({ ...briefing, main_topic: e.target.value })}
                />
              </div>

              {contentType !== 'images' && (
                <div className="grid grid-cols-3 gap-4">
                  {(['short', 'medium', 'long'] as const).map(len => (
                    <button
                      key={len}
                      onClick={() => setBriefing({ ...briefing, length: len })}
                      className={`p-5 rounded-2xl border text-left transition-all duration-300 ${
                        briefing.length === len
                          ? 'bg-neon-cyan/5 border-neon-cyan/40'
                          : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                      }`}
                    >
                      <p className={`text-[10px] font-mono tracking-widest uppercase ${briefing.length === len ? 'text-neon-cyan' : 'text-white/40'}`}>
                        {len === 'short' ? 'CURTO' : len === 'medium' ? 'MÉDIO' : 'LONGO'}
                      </p>
                      <p className="text-[9px] text-white/20 mt-1">
                        {len === 'short' ? '~5 seções' : len === 'medium' ? '~10 seções' : '~20 seções'}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center">
                <button
                  onClick={onCancel}
                  className="text-[10px] font-mono tracking-widest text-white/20 hover:text-white uppercase transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!briefing.main_topic}
                  className="group flex items-center gap-4 bg-white text-obsidian px-10 py-5 rounded-full font-bold hover:bg-neon-cyan transition-all duration-500 disabled:opacity-20"
                >
                  CONTINUAR
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4">
                  <label className="text-[10px] font-mono tracking-[0.4em] text-white/20 uppercase">Público-Alvo</label>
                  <input
                    type="text"
                    placeholder="Para quem é este material?"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-8 py-6 text-lg font-light placeholder:text-white/10 focus:outline-none focus:border-neon-cyan/40 transition-all"
                    value={briefing.target_audience}
                    onChange={(e) => setBriefing({ ...briefing, target_audience: e.target.value })}
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-mono tracking-[0.4em] text-white/20 uppercase">Tom de Comunicação</label>
                  <select
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-8 py-6 text-lg font-light focus:outline-none focus:border-neon-cyan/40 transition-all appearance-none"
                    value={briefing.tone}
                    onChange={(e) => setBriefing({ ...briefing, tone: e.target.value })}
                  >
                    <option value="Didático" className="bg-obsidian">Didático / Educacional</option>
                    <option value="Profissional" className="bg-obsidian">Profissional / Corporativo</option>
                    <option value="Descontraído" className="bg-obsidian">Casual / Amigável</option>
                    <option value="Acadêmico" className="bg-obsidian">Acadêmico / Formal</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-mono tracking-[0.4em] text-white/20 uppercase">Objetivo Central</label>
                <textarea
                  placeholder="Qual é o objetivo final deste conteúdo?"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-8 py-6 text-lg font-light placeholder:text-white/10 focus:outline-none focus:border-neon-cyan/40 transition-all h-40 resize-none"
                  value={briefing.objective}
                  onChange={(e) => setBriefing({ ...briefing, objective: e.target.value })}
                />
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={() => setStep(1)}
                  className="text-[10px] font-mono tracking-widest text-white/20 hover:text-white uppercase transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!briefing.target_audience || !briefing.objective}
                  className="group flex items-center gap-4 bg-white text-obsidian px-10 py-5 rounded-full font-bold hover:bg-neon-cyan transition-all duration-500 disabled:opacity-20"
                >
                  REVISAR SÍNTESE
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              <div className="glass-card p-12 border-neon-cyan/10 bg-neon-cyan/[0.02]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  <div>
                    <p className="text-[9px] font-mono tracking-widest text-white/20 uppercase mb-2">Tipo de Material</p>
                    <p className="text-2xl font-medium text-neon-cyan">{typeInfo.label}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-mono tracking-widest text-white/20 uppercase mb-2">Tópico Principal</p>
                    <p className="text-2xl font-medium">{briefing.main_topic}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-mono tracking-widest text-white/20 uppercase mb-2">Tom Alvo</p>
                    <p className="text-2xl font-medium">{briefing.tone}</p>
                  </div>
                </div>
              </div>

              {genError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs font-mono">
                  {genError}
                </div>
              )}

              <div className="flex flex-col gap-6">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full bg-neon-cyan text-obsidian py-8 rounded-full font-bold text-xl hover:scale-[1.02] transition-all duration-500 disabled:opacity-50 flex items-center justify-center gap-4 shadow-[0_0_50px_rgba(0,240,255,0.3)]"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-6 h-6 animate-spin" />
                      SINTETIZANDO VIA TESS IA...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-6 h-6" />
                      INICIALIZAR GERAÇÃO
                    </>
                  )}
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={isGenerating}
                  className="text-[10px] font-mono tracking-widest text-white/20 hover:text-white uppercase transition-colors text-center"
                >
                  Modificar Parâmetros
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
