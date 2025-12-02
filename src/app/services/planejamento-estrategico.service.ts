import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ===== INTERFACES =====

export interface PlanejamentoEstrategico {
  id: number;
  client_id: number;
  contract_id: number;
  titulo: string;
  descricao?: string | null;
  status: 'ativo' | 'concluido' | 'cancelado';
  data_inicio?: string | null;
  data_fim?: string | null;
  prazo_preenchimento?: string | null;
  unique_token: string;
  created_at: string;
  updated_at: string;
  created_by?: number | null;
  client?: any;
  contract?: any;
  criador?: any;
  departamentos?: Departamento[];
}

export interface Departamento {
  id: number;
  planejamento_id: number;
  nome_departamento: string;
  responsavel_nome?: string | null;
  responsavel_email?: string | null;
  ordem: number;
  unique_token: string;
  created_at: string;
  updated_at: string;
  matriz?: MatrizEvolucao | null;
  planejamento?: any; // Para quando vem do endpoint público
}

export interface Grupo {
  id: number;
  planejamento_id: number;
  nome_grupo: string;
  integrantes?: string | null;
  unique_token: string;
  created_at: string;
  updated_at: string;
  matriz_swot?: MatrizSwot | null;
  planejamento?: any; // Para quando vem do endpoint público
}

export interface MatrizSwot {
  id: number;
  grupo_id: number;
  forcas?: string | null;
  fraquezas?: string | null;
  oportunidades?: string | null;
  ameacas?: string | null;
  forcas_classificacao?: { [key: string]: string } | null;
  fraquezas_classificacao?: { [key: string]: string } | null;
  oportunidades_classificacao?: { [key: string]: string } | null;
  ameacas_classificacao?: { [key: string]: string } | null;
  preenchido_em?: string | null;
  atualizado_em?: string | null;
}

export interface MatrizSwotFinal {
  id: number;
  planejamento_id: number;
  forcas?: string | null;
  fraquezas?: string | null;
  oportunidades?: string | null;
  ameacas?: string | null;
  observacoes?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: number | null;
  updated_by?: number | null;
  criador?: any;
  atualizador?: any;
}

export interface MatrizEvolucao {
  id: number;
  departamento_id: number;
  vulnerabilidades?: string | null;
  conquistas?: string | null;
  licoes_aprendidas?: string | null;
  compromissos?: string | null;
  preenchido_em?: string | null;
  atualizado_em: string;
}

export interface CreatePlanejamentoRequest {
  client_id: number;
  contract_id: number;
  titulo: string;
  descricao?: string;
  data_inicio?: string;
  data_fim?: string;
  prazo_preenchimento?: string;
}

export interface UpdatePlanejamentoRequest {
  titulo?: string;
  descricao?: string;
  status?: 'ativo' | 'concluido' | 'cancelado';
  data_inicio?: string;
  data_fim?: string;
  prazo_preenchimento?: string;
}

export interface CreateDepartamentoRequest {
  nome_departamento: string;
  responsavel_nome?: string;
  responsavel_email?: string;
  ordem?: number;
}

export interface UpdateDepartamentoRequest {
  nome_departamento?: string;
  responsavel_nome?: string;
  responsavel_email?: string;
}

export interface CreateGrupoRequest {
  nome_grupo: string;
  integrantes?: string;
}

export interface UpdateGrupoRequest {
  nome_grupo?: string;
  integrantes?: string;
}

export interface UpdateMatrizSwotRequest {
  forcas?: string;
  fraquezas?: string;
  oportunidades?: string;
  ameacas?: string;
  forcas_classificacao?: { [key: string]: string };
  fraquezas_classificacao?: { [key: string]: string };
  oportunidades_classificacao?: { [key: string]: string };
  ameacas_classificacao?: { [key: string]: string };
}

export interface UpdateMatrizSwotFinalRequest {
  forcas?: string;
  fraquezas?: string;
  oportunidades?: string;
  ameacas?: string;
  observacoes?: string;
}

export interface MatrizSwotCruzamento {
  id: number;
  planejamento_id: number;
  alavancas: number[][]; // Oportunidades × Forças (array 2D)
  defesas: number[][]; // Ameaças × Forças (array 2D)
  restricoes: number[][]; // Oportunidades × Fraquezas (array 2D)
  problemas: number[][]; // Ameaças × Fraquezas (array 2D)
  created_at: string;
  updated_at: string;
  created_by?: number | null;
  updated_by?: number | null;
  criador?: any;
  atualizador?: any;
}

export interface UpdateMatrizCruzamentoRequest {
  alavancas: number[][];
  defesas: number[][];
  restricoes: number[][];
  problemas: number[][];
}

// ===== CLASSIFICAÇÃO DE RISCOS =====

export type ClassificacaoOportunidade = 'explorar' | 'melhorar' | 'compartilhar' | 'aceitar';
export type ClassificacaoAmeaca = 'evitar' | 'transferir' | 'mitigar' | 'aceitar';

export interface ItemRiscoOportunidade {
  item: string;
  classificacao: ClassificacaoOportunidade | null;
  tratativa: string;
}

export interface ItemRiscoAmeaca {
  item: string;
  classificacao: ClassificacaoAmeaca | null;
  tratativa: string;
}

export interface ClassificacaoRiscos {
  id: number;
  planejamento_id: number;
  oportunidades: ItemRiscoOportunidade[];
  ameacas: ItemRiscoAmeaca[];
  created_at: string;
  updated_at: string;
  created_by?: number | null;
  updated_by?: number | null;
}

export interface UpdateClassificacaoRiscosRequest {
  oportunidades: ItemRiscoOportunidade[];
  ameacas: ItemRiscoAmeaca[];
}

export interface UpdateMatrizRequest {
  vulnerabilidades?: string;
  conquistas?: string;
  licoes_aprendidas?: string;
  compromissos?: string;
}

// ===== INTERFACES OKR =====

export interface OkrTarefa {
  id: number;
  key_result_id: number;
  titulo: string;
  descricao?: string | null;
  data_limite?: string | null;
  responsavel?: string | null;
  concluida: boolean;
  created_at: string;
  updated_at: string;
}

export interface OkrKeyResult {
  id: number;
  objetivo_id: number;
  titulo: string;
  descricao?: string | null;
  status: 'pendente' | 'em_progresso' | 'concluido' | 'cancelado';
  created_at: string;
  updated_at: string;
  tarefas?: OkrTarefa[];
}

export interface OkrObjetivo {
  id: number;
  departamento_id: number;
  titulo: string;
  descricao?: string | null;
  objetivo_estrategico_id?: number | null;
  objetivo_estrategico?: {
    id: number;
    objetivo: string;
    parent_id?: number | null;
  } | null;
  created_at: string;
  updated_at: string;
  key_results?: OkrKeyResult[];
}

export interface DepartamentoComOkr {
  id: number;
  nome_departamento: string;
  unique_token?: string;
  objetivos: OkrObjetivo[];
}

export interface CreateOkrObjetivoRequest {
  titulo: string;
  descricao?: string;
  objetivo_estrategico_id?: number | null;
}

export interface UpdateOkrObjetivoRequest {
  titulo?: string;
  descricao?: string;
  objetivo_estrategico_id?: number | null;
}

export interface CreateKeyResultRequest {
  titulo: string;
  descricao?: string;
  status?: 'pendente' | 'em_progresso' | 'concluido' | 'cancelado';
}

export interface UpdateKeyResultRequest {
  titulo?: string;
  descricao?: string;
  status?: 'pendente' | 'em_progresso' | 'concluido' | 'cancelado';
}

export interface CreateTarefaRequest {
  titulo: string;
  descricao?: string;
  data_limite?: string;
  responsavel?: string;
  concluida?: boolean;
}

export interface UpdateTarefaRequest {
  titulo?: string;
  descricao?: string;
  data_limite?: string;
  responsavel?: string;
  concluida?: boolean;
}

// ===== INTERFACES OBJETIVOS ESTRATÉGICOS =====

export interface ObjetivoEstrategico {
  id: number;
  planejamento_id: number;
  objetivo: string;
  parent_id?: number | null;
  ordem?: number;
  created_at: string;
  updated_at?: string;
  sub_objetivos?: ObjetivoEstrategico[];
}

@Injectable({
  providedIn: 'root'
})
export class PlanejamentoEstrategicoService {
  private apiUrl = `${environment.apiUrl}/planejamento-estrategico`;

  constructor(private http: HttpClient) {}

  // ===== PLANEJAMENTOS ESTRATÉGICOS =====

  /**
   * Listar todos os planejamentos estratégicos
   */
  listarPlanejamentos(params?: {
    client_id?: number;
    status?: string;
    contract_id?: number;
  }): Observable<{ success: boolean; data: PlanejamentoEstrategico[] }> {
    return this.http.get<{ success: boolean; data: PlanejamentoEstrategico[] }>(
      this.apiUrl,
      { params: params as any }
    );
  }

  /**
   * Obter detalhes de um planejamento com departamentos
   */
  obterPlanejamento(id: number): Observable<{ success: boolean; data: PlanejamentoEstrategico }> {
    return this.http.get<{ success: boolean; data: PlanejamentoEstrategico }>(
      `${this.apiUrl}/${id}`
    );
  }

  /**
   * Criar novo planejamento estratégico
   */
  criarPlanejamento(data: CreatePlanejamentoRequest): Observable<{
    success: boolean;
    message: string;
    data: PlanejamentoEstrategico;
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
      data: PlanejamentoEstrategico;
    }>(this.apiUrl, data);
  }

  /**
   * Criar novo planejamento estratégico com departamentos
   */
  criarPlanejamentoComDepartamentos(data: {
    planejamento: CreatePlanejamentoRequest;
    departamentos: {
      nome_departamento: string;
    }[];
  }): Observable<{
    success: boolean;
    message: string;
    data: PlanejamentoEstrategico;
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
      data: PlanejamentoEstrategico;
    }>(`${this.apiUrl}/com-departamentos`, data);
  }

  /**
   * Atualizar planejamento estratégico
   */
  atualizarPlanejamento(
    id: number,
    data: UpdatePlanejamentoRequest
  ): Observable<{
    success: boolean;
    message: string;
    data: PlanejamentoEstrategico;
  }> {
    return this.http.put<{
      success: boolean;
      message: string;
      data: PlanejamentoEstrategico;
    }>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Deletar planejamento estratégico
   */
  deletarPlanejamento(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.apiUrl}/${id}`
    );
  }

  // ===== DEPARTAMENTOS =====

  /**
   * Listar departamentos de um planejamento
   */
  listarDepartamentos(planejamentoId: number): Observable<{
    success: boolean;
    data: Departamento[];
  }> {
    return this.http.get<{ success: boolean; data: Departamento[] }>(
      `${this.apiUrl}/${planejamentoId}/departamentos`
    );
  }

  /**
   * Adicionar departamento a um planejamento
   */
  adicionarDepartamento(
    planejamentoId: number,
    data: CreateDepartamentoRequest
  ): Observable<{
    success: boolean;
    message: string;
    data: Departamento;
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
      data: Departamento;
    }>(`${this.apiUrl}/${planejamentoId}/departamentos`, data);
  }

  /**
   * Atualizar dados de um departamento
   */
  atualizarDepartamento(
    departamentoId: number,
    data: UpdateDepartamentoRequest
  ): Observable<{
    success: boolean;
    message: string;
    data: Departamento;
  }> {
    return this.http.put<{
      success: boolean;
      message: string;
      data: Departamento;
    }>(`${this.apiUrl}/departamentos/${departamentoId}`, data);
  }

  /**
   * Deletar um departamento
   */
  deletarDepartamento(departamentoId: number): Observable<{
    success: boolean;
    message: string;
  }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.apiUrl}/departamentos/${departamentoId}`
    );
  }

  /**
   * Atualizar ordem de exibição do departamento
   */
  atualizarOrdemDepartamento(
    departamentoId: number,
    ordem: number
  ): Observable<{
    success: boolean;
    message: string;
    data: Departamento;
  }> {
    return this.http.put<{
      success: boolean;
      message: string;
      data: Departamento;
    }>(`${this.apiUrl}/departamentos/${departamentoId}/ordem`, { ordem });
  }

  // ===== MATRIZ DE EVOLUÇÃO CONSCIENTE =====

  /**
   * Obter todas as matrizes de um planejamento
   */
  obterTodasMatrizes(planejamentoId: number): Observable<{
    success: boolean;
    data: Departamento[];
  }> {
    return this.http.get<{ success: boolean; data: Departamento[] }>(
      `${this.apiUrl}/${planejamentoId}/matriz`
    );
  }

  /**
   * Obter matriz de um departamento específico
   */
  obterMatriz(departamentoId: number): Observable<{
    success: boolean;
    data: MatrizEvolucao | null;
  }> {
    return this.http.get<{ success: boolean; data: MatrizEvolucao | null }>(
      `${this.apiUrl}/matriz/${departamentoId}`
    );
  }

  /**
   * Atualizar matriz de evolução consciente (acesso admin)
   */
  atualizarMatriz(
    departamentoId: number,
    data: UpdateMatrizRequest
  ): Observable<{
    success: boolean;
    message: string;
    data: MatrizEvolucao;
  }> {
    return this.http.put<{
      success: boolean;
      message: string;
      data: MatrizEvolucao;
    }>(`${this.apiUrl}/matriz/${departamentoId}`, data);
  }

  // ===== ROTAS PÚBLICAS =====

  /**
   * Obter planejamento via token público (para departamentos preencherem)
   */
  obterPlanejamentoPublico(token: string): Observable<{
    success: boolean;
    data: PlanejamentoEstrategico;
  }> {
    return this.http.get<{ success: boolean; data: PlanejamentoEstrategico }>(
      `${this.apiUrl}/publico/${token}`
    );
  }

  /**
   * Atualizar matriz via link público
   */
  atualizarMatrizPublico(
    departamentoId: number,
    data: UpdateMatrizRequest
  ): Observable<{
    success: boolean;
    message: string;
    data: MatrizEvolucao;
  }> {
    return this.http.put<{
      success: boolean;
      message: string;
      data: MatrizEvolucao;
    }>(`${this.apiUrl}/publico/matriz/${departamentoId}`, data);
  }

  /**
   * Gerar URL pública para preenchimento da Matriz Consciente (planejamento completo)
   */
  gerarUrlPublica(token: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/planejamento-estrategico/${token}`;
  }

  /**
   * Gerar URL pública para preenchimento da Matriz Consciente (por departamento)
   */
  gerarUrlPublicaDepartamento(departamentoToken: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/matriz-consciente/${departamentoToken}`;
  }

  /**
   * Gerar URL pública para preenchimento da Matriz SWOT (por grupo)
   */
  gerarUrlPublicaSwot(grupoToken: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/matriz-swot/${grupoToken}`;
  }

  /**
   * Gerar URL pública para visualização dos OKRs de um departamento
   */
  gerarUrlPublicaOkr(departamentoToken: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/okr/${departamentoToken}`;
  }

  /**
   * Obter departamento via token público
   */
  obterDepartamentoPublico(token: string): Observable<{ success: boolean; data: Departamento }> {
    return this.http.get<{ success: boolean; data: Departamento }>(
      `${this.apiUrl}/publico/departamento/${token}`
    );
  }

  /**
   * Atualizar matriz via token de departamento (link público)
   */
  atualizarMatrizDepartamentoPublico(
    token: string,
    data: UpdateMatrizRequest
  ): Observable<{
    success: boolean;
    message: string;
    data: MatrizEvolucao;
  }> {
    return this.http.put<{
      success: boolean;
      message: string;
      data: MatrizEvolucao;
    }>(`${this.apiUrl}/publico/departamento/${token}/matriz`, data);
  }

  /**
   * Obter OKRs do departamento via token público
   */
  obterOkrDepartamentoPublico(token: string): Observable<{
    success: boolean;
    data: {
      departamento: {
        id: number;
        nome_departamento: string;
        unique_token: string;
      };
      planejamento: any;
      objetivos: OkrObjetivo[];
    };
  }> {
    return this.http.get<{
      success: boolean;
      data: {
        departamento: {
          id: number;
          nome_departamento: string;
          unique_token: string;
        };
        planejamento: any;
        objetivos: OkrObjetivo[];
      };
    }>(`${this.apiUrl}/publico/departamento/${token}/okr`);
  }

  /**
   * Salvar OKRs do departamento via token público
   */
  salvarOkrDepartamentoPublico(token: string, objetivos: OkrObjetivo[]): Observable<{
    success: boolean;
    message?: string;
    data?: {
      objetivos: OkrObjetivo[];
    };
  }> {
    return this.http.put<{
      success: boolean;
      message?: string;
      data?: {
        objetivos: OkrObjetivo[];
      };
    }>(`${this.apiUrl}/publico/departamento/${token}/okr`, { objetivos });
  }

  /**
   * Obter grupo via token público
   */
  obterGrupoPublico(token: string): Observable<{ success: boolean; data: Grupo }> {
    return this.http.get<{ success: boolean; data: Grupo }>(
      `${this.apiUrl}/publico/grupo/${token}`
    );
  }

  /**
   * Obter nome do cliente formatado
   */
  getClientName(client: any): string {
    const clientPF = client?.clients_pf?.[0];
    const clientPJ = client?.clients_pj?.[0];

    if (clientPF) {
      return clientPF.full_name || 'N/A';
    } else if (clientPJ) {
      return clientPJ.company_name || clientPJ.trade_name || 'N/A';
    }

    return 'N/A';
  }

  // ===== GRUPOS (MATRIZ SWOT) =====

  /**
   * Listar grupos de um planejamento
   */
  listarGrupos(planejamentoId: number): Observable<{ success: boolean; data: Grupo[] }> {
    return this.http.get<{ success: boolean; data: Grupo[] }>(
      `${this.apiUrl}/${planejamentoId}/grupos`
    );
  }

  /**
   * Adicionar grupo a um planejamento
   */
  adicionarGrupo(planejamentoId: number, data: CreateGrupoRequest): Observable<{
    success: boolean;
    message: string;
    data: Grupo;
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
      data: Grupo;
    }>(`${this.apiUrl}/${planejamentoId}/grupos`, data);
  }

  /**
   * Atualizar grupo
   */
  atualizarGrupo(grupoId: number, data: UpdateGrupoRequest): Observable<{
    success: boolean;
    message: string;
    data: Grupo;
  }> {
    return this.http.put<{
      success: boolean;
      message: string;
      data: Grupo;
    }>(`${this.apiUrl}/grupos/${grupoId}`, data);
  }

  /**
   * Deletar grupo
   */
  deletarGrupo(grupoId: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.apiUrl}/grupos/${grupoId}`
    );
  }

  /**
   * Obter planejamento com grupos e matrizes SWOT
   */
  obterPlanejamentoComSwot(planejamentoId: number): Observable<{
    success: boolean;
    data: PlanejamentoEstrategico & { grupos?: Grupo[] };
  }> {
    return this.http.get<{
      success: boolean;
      data: PlanejamentoEstrategico & { grupos?: Grupo[] };
    }>(`${this.apiUrl}/${planejamentoId}/swot`);
  }

  /**
   * Atualizar matriz SWOT via link público
   */
  atualizarMatrizSwotPublico(grupoId: number, data: UpdateMatrizSwotRequest): Observable<{
    success: boolean;
    message: string;
    data: MatrizSwot;
  }> {
    return this.http.put<{
      success: boolean;
      message: string;
      data: MatrizSwot;
    }>(`${this.apiUrl}/publico/matriz-swot/${grupoId}`, data);
  }

  // ===== MATRIZ SWOT FINAL (CONSOLIDADA) =====

  /**
   * Obter matriz SWOT final consolidada
   */
  obterMatrizSwotFinal(planejamentoId: number): Observable<{
    success: boolean;
    data: MatrizSwotFinal | null;
  }> {
    return this.http.get<{
      success: boolean;
      data: MatrizSwotFinal | null;
    }>(`${this.apiUrl}/${planejamentoId}/swot-final`);
  }

  /**
   * Salvar matriz SWOT final consolidada
   */
  salvarMatrizSwotFinal(planejamentoId: number, data: UpdateMatrizSwotFinalRequest): Observable<{
    success: boolean;
    message: string;
    data: MatrizSwotFinal;
  }> {
    return this.http.put<{
      success: boolean;
      message: string;
      data: MatrizSwotFinal;
    }>(`${this.apiUrl}/${planejamentoId}/swot-final`, data);
  }

  /**
   * Obter matriz SWOT consolidada via token público
   */
  obterSwotConsolidadoPublico(token: string): Observable<{
    success: boolean;
    data: {
      planejamento: any;
      grupos: any[];
      matrizFinal: any;
    };
  }> {
    return this.http.get<{
      success: boolean;
      data: {
        planejamento: any;
        grupos: any[];
        matrizFinal: any;
      };
    }>(`${this.apiUrl}/publico/swot-consolidado/${token}`);
  }

  /**
   * Salvar matriz SWOT consolidada via token público
   */
  salvarSwotConsolidadoPublico(token: string, data: UpdateMatrizSwotFinalRequest): Observable<{
    success: boolean;
    message: string;
    data: any;
  }> {
    return this.http.put<{
      success: boolean;
      message: string;
      data: any;
    }>(`${this.apiUrl}/publico/swot-consolidado/${token}`, data);
  }

  /**
   * Gerar URL pública para matriz SWOT consolidada
   */
  gerarUrlPublicaSwotConsolidado(token: string): string {
    return `${window.location.origin}/swot-consolidado/${token}`;
  }

  // ===== MATRIZ DE CRUZAMENTO SWOT =====

  /**
   * Obter matriz de cruzamento SWOT
   */
  obterMatrizCruzamento(planejamentoId: number): Observable<{
    success: boolean;
    data: MatrizSwotCruzamento | null;
  }> {
    return this.http.get<{
      success: boolean;
      data: MatrizSwotCruzamento | null;
    }>(`${this.apiUrl}/${planejamentoId}/swot-cruzamento`);
  }

  /**
   * Salvar matriz de cruzamento SWOT
   */
  salvarMatrizCruzamento(planejamentoId: number, data: UpdateMatrizCruzamentoRequest): Observable<{
    success: boolean;
    message: string;
    data: MatrizSwotCruzamento;
  }> {
    return this.http.put<{
      success: boolean;
      message: string;
      data: MatrizSwotCruzamento;
    }>(`${this.apiUrl}/${planejamentoId}/swot-cruzamento`, data);
  }

  // ===== OBJETIVOS ESTRATÉGICOS =====

  /**
   * Listar objetivos estratégicos de um planejamento (com hierarquia de sub-objetivos)
   */
  listarOkrs(planejamentoId: number): Observable<{
    success: boolean;
    data: ObjetivoEstrategico[];
  }> {
    return this.http.get<{
      success: boolean;
      data: ObjetivoEstrategico[];
    }>(`${this.apiUrl}/${planejamentoId}/okrs`);
  }

  /**
   * Adicionar objetivo estratégico a um planejamento
   * @param parent_id - Se fornecido, cria como sub-objetivo do objetivo especificado
   */
  adicionarOkr(planejamentoId: number, data: { objetivo: string; parent_id?: number }): Observable<{
    success: boolean;
    message: string;
    data: ObjetivoEstrategico;
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
      data: ObjetivoEstrategico;
    }>(`${this.apiUrl}/${planejamentoId}/okrs`, data);
  }

  /**
   * Atualizar objetivo estratégico
   */
  atualizarOkr(okrId: number, data: { objetivo: string }): Observable<{
    success: boolean;
    message: string;
    data: ObjetivoEstrategico;
  }> {
    return this.http.put<{
      success: boolean;
      message: string;
      data: ObjetivoEstrategico;
    }>(`${this.apiUrl}/okrs/${okrId}`, data);
  }

  /**
   * Deletar objetivo estratégico (também deleta sub-objetivos em cascata)
   */
  deletarOkr(okrId: number): Observable<{
    success: boolean;
    message: string;
  }> {
    return this.http.delete<{
      success: boolean;
      message: string;
    }>(`${this.apiUrl}/okrs/${okrId}`);
  }

  // ===== ÁRVORE DE PROBLEMAS =====

  // Métodos de Árvores (container)
  /**
   * Listar árvores de um planejamento
   */
  listarArvores(planejamentoId: number): Observable<{
    success: boolean;
    data: any[];
  }> {
    return this.http.get<{
      success: boolean;
      data: any[];
    }>(`${this.apiUrl}/${planejamentoId}/arvores`);
  }

  /**
   * Criar nova árvore de problemas
   */
  criarArvore(planejamentoId: number, data: { nome_arvore: string }): Observable<{
    success: boolean;
    message: string;
    data: any;
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
      data: any;
    }>(`${this.apiUrl}/${planejamentoId}/arvores`, data);
  }

  /**
   * Criar árvores padrão (Cliente, Pessoas, Regulamentação, Financeiro)
   */
  criarArvoresPadrao(planejamentoId: number): Observable<{
    success: boolean;
    message: string;
    data: any[];
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
      data: any[];
    }>(`${this.apiUrl}/${planejamentoId}/arvores/criar-padrao`, {});
  }

  /**
   * Obter árvores de problemas via token público (para visualização pública)
   */
  obterArvoresPublico(token: string): Observable<{
    success: boolean;
    data: {
      planejamento: any;
      arvores: any[];
    };
  }> {
    return this.http.get<{
      success: boolean;
      data: {
        planejamento: any;
        arvores: any[];
      };
    }>(`${this.apiUrl}/publico/arvores/${token}`);
  }

  /**
   * Gerar URL pública para árvores de problemas
   */
  gerarUrlPublicaArvores(token: string): string {
    return `${window.location.origin}/arvores-problemas/${token}`;
  }

  /**
   * Salvar itens das árvores via token público
   */
  salvarItensArvorePublico(token: string, arvores: any[]): Observable<{
    success: boolean;
    message: string;
  }> {
    return this.http.put<{
      success: boolean;
      message: string;
    }>(`${this.apiUrl}/publico/arvores/${token}/itens`, { arvores });
  }

  /**
   * Atualizar nome de uma árvore
   */
  atualizarArvore(arvoreId: number, data: { nome_arvore: string }): Observable<{
    success: boolean;
    message: string;
    data: any;
  }> {
    return this.http.put<{
      success: boolean;
      message: string;
      data: any;
    }>(`${this.apiUrl}/arvores/${arvoreId}`, data);
  }

  /**
   * Deletar uma árvore
   */
  deletarArvore(arvoreId: number): Observable<{
    success: boolean;
    message: string;
  }> {
    return this.http.delete<{
      success: boolean;
      message: string;
    }>(`${this.apiUrl}/arvores/${arvoreId}`);
  }

  // Métodos de Itens (dentro de cada árvore)
  /**
   * Listar itens de uma árvore
   */
  listarItensArvore(arvoreId: number): Observable<{
    success: boolean;
    data: any[];
  }> {
    return this.http.get<{
      success: boolean;
      data: any[];
    }>(`${this.apiUrl}/arvores/${arvoreId}/itens`);
  }

  /**
   * Adicionar item à árvore de problemas
   */
  adicionarItemArvore(arvoreId: number, data: any): Observable<{
    success: boolean;
    message: string;
    data: any;
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
      data: any;
    }>(`${this.apiUrl}/arvores/${arvoreId}/itens`, data);
  }

  /**
   * Atualizar item da árvore de problemas
   */
  atualizarItemArvore(itemId: number, data: any): Observable<{
    success: boolean;
    message: string;
    data: any;
  }> {
    return this.http.put<{
      success: boolean;
      message: string;
      data: any;
    }>(`${this.apiUrl}/arvore-problemas/${itemId}`, data);
  }

  /**
   * Deletar item da árvore de problemas
   */
  deletarItemArvore(itemId: number): Observable<{
    success: boolean;
    message: string;
  }> {
    return this.http.delete<{
      success: boolean;
      message: string;
    }>(`${this.apiUrl}/arvore-problemas/${itemId}`);
  }

  /**
   * Gerar URL para exportar árvores de problemas em PDF
   */
  gerarUrlPdfArvores(planejamentoId: number): string {
    return `${this.apiUrl}/${planejamentoId}/arvores/pdf`;
  }

  /**
   * Gerar URL para exportar objetivos estratégicos em PDF
   */
  gerarUrlPdfOkrs(planejamentoId: number): string {
    return `${this.apiUrl}/${planejamentoId}/okrs/pdf`;
  }

  /**
   * Gerar URL para exportar matriz SWOT consolidada em PDF
   */
  gerarUrlPdfMatrizConsolidada(planejamentoId: number): string {
    return `${this.apiUrl}/${planejamentoId}/swot-final/pdf`;
  }

  /**
   * Gerar URL para exportar todas as matrizes de evolução em PDF
   */
  gerarUrlPdfTodasMatrizes(planejamentoId: number): string {
    return `${this.apiUrl}/${planejamentoId}/matrizes/pdf`;
  }

  /**
   * Gerar URL para exportar Definição de Impacto (Matriz de Cruzamento SWOT) em PDF
   */
  gerarUrlPdfDefinicaoImpacto(planejamentoId: number): string {
    return `${this.apiUrl}/${planejamentoId}/swot-cruzamento/pdf`;
  }

  /**
   * Gerar URL para exportar Definição de Impacto (Matriz de Cruzamento SWOT) em Excel
   */
  gerarUrlExcelDefinicaoImpacto(planejamentoId: number): string {
    return `${this.apiUrl}/${planejamentoId}/swot-cruzamento/excel`;
  }

  // ===== OKR - OBJECTIVES AND KEY RESULTS =====

  // --- OBJETIVOS ---

  /**
   * Listar objetivos OKR de um departamento
   */
  listarOkrObjetivos(departamentoId: number): Observable<{
    success: boolean;
    data: OkrObjetivo[];
  }> {
    return this.http.get<{
      success: boolean;
      data: OkrObjetivo[];
    }>(`${this.apiUrl}/departamentos/${departamentoId}/okr-objetivos`);
  }

  /**
   * Criar novo objetivo OKR
   */
  criarOkrObjetivo(departamentoId: number, data: CreateOkrObjetivoRequest): Observable<{
    success: boolean;
    message: string;
    data: OkrObjetivo;
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
      data: OkrObjetivo;
    }>(`${this.apiUrl}/departamentos/${departamentoId}/okr-objetivos`, data);
  }

  /**
   * Atualizar objetivo OKR
   */
  atualizarOkrObjetivo(objetivoId: number, data: UpdateOkrObjetivoRequest): Observable<{
    success: boolean;
    message: string;
    data: OkrObjetivo;
  }> {
    return this.http.put<{
      success: boolean;
      message: string;
      data: OkrObjetivo;
    }>(`${this.apiUrl}/okr-objetivos/${objetivoId}`, data);
  }

  /**
   * Deletar objetivo OKR
   */
  deletarOkrObjetivo(objetivoId: number): Observable<{
    success: boolean;
    message: string;
  }> {
    return this.http.delete<{
      success: boolean;
      message: string;
    }>(`${this.apiUrl}/okr-objetivos/${objetivoId}`);
  }

  // --- KEY RESULTS ---

  /**
   * Listar Key Results de um objetivo
   */
  listarKeyResults(objetivoId: number): Observable<{
    success: boolean;
    data: OkrKeyResult[];
  }> {
    return this.http.get<{
      success: boolean;
      data: OkrKeyResult[];
    }>(`${this.apiUrl}/okr-objetivos/${objetivoId}/key-results`);
  }

  /**
   * Criar novo Key Result
   */
  criarKeyResult(objetivoId: number, data: CreateKeyResultRequest): Observable<{
    success: boolean;
    message: string;
    data: OkrKeyResult;
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
      data: OkrKeyResult;
    }>(`${this.apiUrl}/okr-objetivos/${objetivoId}/key-results`, data);
  }

  /**
   * Atualizar Key Result
   */
  atualizarKeyResult(keyResultId: number, data: UpdateKeyResultRequest): Observable<{
    success: boolean;
    message: string;
    data: OkrKeyResult;
  }> {
    return this.http.put<{
      success: boolean;
      message: string;
      data: OkrKeyResult;
    }>(`${this.apiUrl}/key-results/${keyResultId}`, data);
  }

  /**
   * Deletar Key Result
   */
  deletarKeyResult(keyResultId: number): Observable<{
    success: boolean;
    message: string;
  }> {
    return this.http.delete<{
      success: boolean;
      message: string;
    }>(`${this.apiUrl}/key-results/${keyResultId}`);
  }

  // --- TAREFAS ---

  /**
   * Listar tarefas de um Key Result
   */
  listarTarefas(keyResultId: number): Observable<{
    success: boolean;
    data: OkrTarefa[];
  }> {
    return this.http.get<{
      success: boolean;
      data: OkrTarefa[];
    }>(`${this.apiUrl}/key-results/${keyResultId}/tarefas`);
  }

  /**
   * Criar nova tarefa
   */
  criarTarefa(keyResultId: number, data: CreateTarefaRequest): Observable<{
    success: boolean;
    message: string;
    data: OkrTarefa;
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
      data: OkrTarefa;
    }>(`${this.apiUrl}/key-results/${keyResultId}/tarefas`, data);
  }

  /**
   * Atualizar tarefa
   */
  atualizarTarefa(tarefaId: number, data: UpdateTarefaRequest): Observable<{
    success: boolean;
    message: string;
    data: OkrTarefa;
  }> {
    return this.http.put<{
      success: boolean;
      message: string;
      data: OkrTarefa;
    }>(`${this.apiUrl}/tarefas/${tarefaId}`, data);
  }

  /**
   * Deletar tarefa
   */
  deletarTarefa(tarefaId: number): Observable<{
    success: boolean;
    message: string;
  }> {
    return this.http.delete<{
      success: boolean;
      message: string;
    }>(`${this.apiUrl}/tarefas/${tarefaId}`);
  }

  /**
   * Alternar status de conclusão de uma tarefa
   */
  toggleTarefa(tarefaId: number): Observable<{
    success: boolean;
    message: string;
    data: OkrTarefa;
  }> {
    return this.http.put<{
      success: boolean;
      message: string;
      data: OkrTarefa;
    }>(`${this.apiUrl}/tarefas/${tarefaId}/toggle`, {});
  }

  // --- ESTRUTURA COMPLETA ---

  /**
   * Obter estrutura completa de OKRs de um planejamento
   */
  obterOkrCompleto(planejamentoId: number): Observable<{
    success: boolean;
    data: DepartamentoComOkr[];
  }> {
    return this.http.get<{
      success: boolean;
      data: DepartamentoComOkr[];
    }>(`${this.apiUrl}/${planejamentoId}/okr-completo`);
  }

  // ===== CLASSIFICAÇÃO DE RISCOS =====

  /**
   * Obter classificação de riscos de um planejamento
   */
  obterClassificacaoRiscos(planejamentoId: number): Observable<{
    success: boolean;
    data: ClassificacaoRiscos | null;
  }> {
    return this.http.get<{
      success: boolean;
      data: ClassificacaoRiscos | null;
    }>(`${this.apiUrl}/${planejamentoId}/classificacao-riscos`);
  }

  /**
   * Salvar classificação de riscos
   */
  salvarClassificacaoRiscos(planejamentoId: number, data: UpdateClassificacaoRiscosRequest): Observable<{
    success: boolean;
    message: string;
    data: ClassificacaoRiscos;
  }> {
    return this.http.put<{
      success: boolean;
      message: string;
      data: ClassificacaoRiscos;
    }>(`${this.apiUrl}/${planejamentoId}/classificacao-riscos`, data);
  }

  /**
   * Obter classificação de riscos via token público
   */
  obterClassificacaoRiscosPublico(token: string): Observable<{
    success: boolean;
    data: {
      planejamento: any;
      matrizFinal: any;
      classificacao: ClassificacaoRiscos | null;
    };
  }> {
    return this.http.get<{
      success: boolean;
      data: {
        planejamento: any;
        matrizFinal: any;
        classificacao: ClassificacaoRiscos | null;
      };
    }>(`${this.apiUrl}/publico/classificacao-riscos/${token}`);
  }

  /**
   * Salvar classificação de riscos via token público
   */
  salvarClassificacaoRiscosPublico(token: string, data: UpdateClassificacaoRiscosRequest): Observable<{
    success: boolean;
    message: string;
    data: ClassificacaoRiscos;
  }> {
    return this.http.put<{
      success: boolean;
      message: string;
      data: ClassificacaoRiscos;
    }>(`${this.apiUrl}/publico/classificacao-riscos/${token}`, data);
  }

  /**
   * Exportar classificação de riscos para PDF
   */
  exportarClassificacaoRiscosPDF(token: string): void {
    const url = `${this.apiUrl}/publico/classificacao-riscos/${token}/pdf`;
    window.open(url, '_blank');
  }

  /**
   * Gerar URL pública para classificação de riscos
   */
  gerarUrlPublicaClassificacaoRiscos(token: string): string {
    return `${window.location.origin}/classificacao-riscos/${token}`;
  }
}
