import { ContentType } from './types';

export const PROJECT_TYPE_LABELS: Record<string, string> = {
  ebook: 'E-BOOK / PDF',
  guide: 'GUIA PRÁTICO',
  manual: 'MANUAL',
  lesson_plan: 'PLANO DE AULA',
  presentation: 'APRESENTAÇÃO',
  slides: 'SLIDES',
  images: 'IMAGENS / ARTES',
};

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  generating: 'Gerando...',
  completed: 'Concluído',
  error: 'Erro',
  pending: 'Pendente',
};

export const CONTENT_TYPES: { id: ContentType; label: string; desc: string; agentEnv: string }[] = [
  {
    id: 'ebook',
    label: 'E-BOOK / PDF',
    desc: 'Publicações digitais estruturadas com capítulos, seções e conteúdo pedagógico completo.',
    agentEnv: 'TESS_AGENT_EBOOK',
  },
  {
    id: 'lesson_plan',
    label: 'PLANO DE AULA',
    desc: 'Estruturas educacionais com objetivos, metodologia e avaliação organizados.',
    agentEnv: 'TESS_AGENT_PLANO',
  },
  {
    id: 'slides',
    label: 'SLIDES',
    desc: 'Apresentações visuais de alto impacto com roteiro e estrutura para cada slide.',
    agentEnv: 'TESS_AGENT_SLIDES',
  },
  {
    id: 'images',
    label: 'IMAGENS / ARTES',
    desc: 'Geração de prompts descritivos para criação de imagens e artes educacionais.',
    agentEnv: 'TESS_AGENT_IMAGENS',
  },
];
