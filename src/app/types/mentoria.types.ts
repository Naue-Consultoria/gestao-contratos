/**
 * Tipos e interfaces para o sistema de Mentorias
 */

export type BlocoTipo =
  | 'titulo'
  | 'texto'
  | 'lista'
  | 'tabela'
  | 'imagem'
  | 'video_link'
  | 'pergunta'
  | 'secao_perguntas'
  | 'checkbox_lista'
  | 'destaque'
  | 'grafico';

export type TipoInteracao = 'resposta' | 'checkbox' | 'comentario';

export type StatusEncontro = 'draft' | 'published' | 'archived';

export type EncontroStatus = 'em_andamento' | 'finalizado';

// ===== CONFIGURAÇÕES DE BLOCOS =====

export interface BlocoTituloConfig {
  texto: string;
  nivel: 1 | 2 | 3;
  cor: string;
}

export interface BlocoTextoConfig {
  conteudo: string; // HTML rico
}

export interface ListaItem {
  principal: string;
  descricao?: string;
  destaque?: 'yellow' | 'green' | 'orange' | null;
}

export interface BlocoListaConfig {
  titulo?: string;
  itens: ListaItem[];
}

export interface BlocoTabelaConfig {
  titulo?: string;
  colunas: string[];
  linhas: string[][];
}

export interface BlocoImagemConfig {
  url: string;
  legenda?: string;
  largura: 'small' | 'medium' | 'large' | 'full';
}

export interface BlocoVideoLinkConfig {
  titulo: string;
  url: string;
  autor?: string;
  thumbnail_url?: string;
}

export interface BlocoPerguntaConfig {
  id: string;
  pergunta: string;
  placeholder?: string;
  resposta_exemplo?: string;
  tipo_resposta: 'texto' | 'texto_longo' | 'multipla_escolha';
}

export interface PerguntaItem {
  id: string;
  texto: string;
  resposta?: string;
}

export interface BlocoSecaoPerguntasConfig {
  titulo: string;
  perguntas: PerguntaItem[];
}

export interface CheckboxItem {
  id: string;
  texto: string;
  checked: boolean;
}

export interface BlocoCheckboxListaConfig {
  titulo: string;
  itens: CheckboxItem[];
}

export interface BlocoDestaqueConfig {
  titulo: string;
  subtitulo?: string;
  cor: string;
  imagem_fundo?: string;
}

export interface BlocoGraficoConfig {
  titulo: string;
  subtitulo?: string;
  imagem_url: string;
  tipo_grafico: 'imagem' | 'chart_js';
}

// Union type de todas as configurações
export type BlocoConfig =
  | BlocoTituloConfig
  | BlocoTextoConfig
  | BlocoListaConfig
  | BlocoTabelaConfig
  | BlocoImagemConfig
  | BlocoVideoLinkConfig
  | BlocoPerguntaConfig
  | BlocoSecaoPerguntasConfig
  | BlocoCheckboxListaConfig
  | BlocoDestaqueConfig
  | BlocoGraficoConfig;

// ===== TIPOS DISPONÍVEIS PARA O EDITOR =====

export interface TipoBlocoDisponivel {
  tipo: BlocoTipo;
  icone: string;
  label: string;
  descricao?: string;
  categoria: 'conteudo' | 'interacao' | 'midia' | 'visual';
}

export const TIPOS_BLOCOS_DISPONIVEIS: TipoBlocoDisponivel[] = [
  {
    tipo: 'titulo',
    icone: 'fa-heading',
    label: 'Título',
    descricao: 'Adicionar um título de seção',
    categoria: 'conteudo'
  },
  {
    tipo: 'texto',
    icone: 'fa-paragraph',
    label: 'Texto',
    descricao: 'Editor de texto com formatação',
    categoria: 'conteudo'
  },
  {
    tipo: 'lista',
    icone: 'fa-list',
    label: 'Lista',
    descricao: 'Lista com itens e destaques',
    categoria: 'conteudo'
  },
  {
    tipo: 'tabela',
    icone: 'fa-table',
    label: 'Tabela',
    descricao: 'Tabela de dados',
    categoria: 'conteudo'
  },
  {
    tipo: 'pergunta',
    icone: 'fa-question-circle',
    label: 'Pergunta',
    descricao: 'Pergunta para o mentorado responder',
    categoria: 'interacao'
  },
  {
    tipo: 'secao_perguntas',
    icone: 'fa-clipboard-list',
    label: 'Perguntas',
    descricao: 'Grupo de perguntas relacionadas',
    categoria: 'interacao'
  },
  {
    tipo: 'checkbox_lista',
    icone: 'fa-tasks',
    label: 'Tarefas',
    descricao: 'Checkboxes para tarefas/ações',
    categoria: 'interacao'
  },
  {
    tipo: 'imagem',
    icone: 'fa-image',
    label: 'Imagem',
    descricao: 'Upload e exibição de imagem',
    categoria: 'midia'
  },
  {
    tipo: 'video_link',
    icone: 'fa-video',
    label: 'Vídeo',
    descricao: 'Link para YouTube ou vídeo externo',
    categoria: 'midia'
  },
  {
    tipo: 'destaque',
    icone: 'fa-star',
    label: 'Destaque',
    descricao: 'Card colorido de destaque',
    categoria: 'visual'
  },
  {
    tipo: 'grafico',
    icone: 'fa-chart-bar',
    label: 'Gráfico',
    descricao: 'Exibir gráficos e indicadores',
    categoria: 'visual'
  }
];

// ===== HELPERS =====

export class MentoriaHelpers {
  /**
   * Gera um ID único para itens (perguntas, checkboxes, etc)
   */
  static gerarIdUnico(prefixo: string = 'item'): string {
    return `${prefixo}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Valida se uma configuração está completa para um tipo de bloco
   */
  static validarConfiguracao(tipo: BlocoTipo, config: any): boolean {
    switch (tipo) {
      case 'titulo':
        return !!(config.texto && config.nivel && config.cor);
      case 'texto':
        return !!config.conteudo;
      case 'lista':
        return !!(config.itens && config.itens.length > 0);
      case 'tabela':
        return !!(config.colunas && config.linhas);
      case 'imagem':
        return !!config.url;
      case 'video_link':
        return !!(config.titulo && config.url);
      case 'pergunta':
        return !!(config.id && config.pergunta);
      case 'secao_perguntas':
        return !!(config.titulo && config.perguntas && config.perguntas.length > 0);
      case 'checkbox_lista':
        return !!(config.titulo && config.itens && config.itens.length > 0);
      case 'destaque':
        return !!(config.titulo && config.cor);
      case 'grafico':
        return !!(config.titulo && config.imagem_url);
      default:
        return false;
    }
  }

  /**
   * Obtém o nome de exibição de um tipo de bloco
   */
  static getNomeTipo(tipo: BlocoTipo): string {
    const tipo_obj = TIPOS_BLOCOS_DISPONIVEIS.find(t => t.tipo === tipo);
    return tipo_obj?.label || tipo;
  }

  /**
   * Obtém o ícone de um tipo de bloco
   */
  static getIconeTipo(tipo: BlocoTipo): string {
    const tipo_obj = TIPOS_BLOCOS_DISPONIVEIS.find(t => t.tipo === tipo);
    return tipo_obj?.icone || 'fa-file';
  }
}
