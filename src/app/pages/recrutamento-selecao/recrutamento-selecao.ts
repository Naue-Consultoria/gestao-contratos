import { Component, OnInit, LOCALE_ID, inject } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb.component';
import { BreadcrumbService } from '../../services/breadcrumb.service';
import { VagaService } from '../../services/vaga.service';
import { firstValueFrom } from 'rxjs';
import localePt from '@angular/common/locales/pt';

// Registrar locale pt-BR
registerLocaleData(localePt);

interface Vaga {
  id: number;
  codigo: string;
  clienteId: number;
  clienteNome: string;
  clienteTradeName?: string;
  clienteCompanyName?: string;
  clienteType?: string;
  usuarioId: number;
  usuarioNome: string;
  cargo: string;
  tipoCargo: 'administrativo' | 'comercial' | 'estagio' | 'gestao' | 'operacional' | 'jovem_aprendiz';
  tipoAbertura: 'nova' | 'reposicao';
  status: 'aberta' | 'divulgacao_prospec' | 'entrevista_nc' | 'entrevista_empresa' | 'testes' |
          'fechada' | 'fechada_rep' | 'cancelada_cliente' | 'standby' | 'nao_cobrada' | 'encerramento_cont';
  fonteRecrutamento: 'catho' | 'email' | 'indicacao' | 'linkedin' | 'whatsapp' | 'trafego' | 'outros';
  statusEntrevista?: 'realizada' | 'desistiu' | 'remarcou';
  salario: number;
  pretensaoSalarial?: number;
  dataAbertura: Date;
  dataFechamentoCancelamento?: Date;
  observacoes?: string;
  candidatoAprovado?: string;
  contatoCandidato?: string;
  totalCandidatos: number;
  porcentagemFaturamento?: number;  // Porcentagem sobre o salário
  valorFaturamento?: number;  // Valor calculado: salario * (porcentagemFaturamento / 100)
  sigilosa: boolean;
  impostoEstado: number;
}


@Component({
  selector: 'app-recrutamento-selecao',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  providers: [{ provide: LOCALE_ID, useValue: 'pt-BR' }],
  templateUrl: './recrutamento-selecao.html',
  styleUrl: './recrutamento-selecao.css'
})
export class RecrutamentoSelecao implements OnInit {
  isLoading: boolean = false;
  searchTerm: string = '';
  statusFilter: string = '';
  departmentFilter: string = '';
  tipoCargoFilter: string = '';
  fonteRecrutamentoFilter: string = '';
  openDropdownId: number | null = null;
  activeTab: string = 'geral';
  selectedMonth: string = '';  // Formato: '1' a '12' (mês)
  selectedYear: string = '';   // Formato: 'YYYY' (ano)
  consultoraFilter: string = '';
  showFecharVagaModal: boolean = false;
  selectedVagaToClose: Vaga | null = null;

  // Cache for months and years
  cachedMonths: { value: string; label: string }[] = [];
  cachedYears: { value: string; label: string }[] = [];

  private vagaService = inject(VagaService);

  constructor(
    private router: Router,
    private breadcrumbService: BreadcrumbService
  ) {}

  // Mapeamentos para labels
  tipoCargoLabels: Record<string, string> = {
    'administrativo': 'Administrativo',
    'comercial': 'Comercial',
    'estagio': 'Estágio',
    'gestao': 'Gestão',
    'operacional': 'Operacional',
    'jovem_aprendiz': 'Jovem Aprendiz'
  };

  tipoAberturaLabels: Record<string, string> = {
    'nova': 'Nova Vaga',
    'reposicao': 'Reposição'
  };

  statusLabels: Record<string, string> = {
    'aberta': 'Aberta',
    'divulgacao_prospec': 'Divulgação/Prospecção',
    'entrevista_nc': 'Entrevista NC',
    'entrevista_empresa': 'Entrevista Empresa',
    'testes': 'Testes',
    'fechada': 'Fechada',
    'cancelada_cliente': 'Cancelada pelo Cliente',
    'standby': 'Standby',
    'nao_cobrada': 'Não Cobrada',
    'encerramento_cont': 'Encerramento de Contrato'
  };

  fonteRecrutamentoLabels: Record<string, string> = {
    'catho': 'Catho',
    'email': 'E-mail',
    'indicacao': 'Indicação',
    'linkedin': 'LinkedIn',
    'whatsapp': 'WhatsApp',
    'trafego': 'Tráfego',
    'outros': 'Outros'
  };

  statusEntrevistaLabels: Record<string, string> = {
    'realizada': 'Realizada',
    'desistiu': 'Desistiu',
    'remarcou': 'Remarcou'
  };

  // Stats
  totalVagasAbertas: number = 0;
  totalVagasFechadas: number = 0;
  vagasFechadasMes: number = 0;
  tempoMedioFechamento: number = 0;

  // Data arrays
  vagas: Vaga[] = [];

  // Filtered arrays
  filteredVagas: Vaga[] = [];

  ngOnInit() {
    this.setBreadcrumb();
    this.initializeFilters();
    this.loadData();
  }

  private initializeFilters() {
    // Initialize cached months
    this.cachedMonths = this.generateMonths();
  }

  private generateMonths(): { value: string; label: string }[] {
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    return monthNames.map((name, index) => ({
      value: (index + 1).toString(),
      label: name
    }));
  }

  private setBreadcrumb() {
    this.breadcrumbService.setBreadcrumbs([
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Recrutamento e Seleção' }
    ]);
  }

  async loadData() {
    try {
      this.isLoading = true;

      // Carregar vagas do backend
      const response = await firstValueFrom(this.vagaService.getAll());

      // Mapear dados do backend para o formato esperado pelo componente
      this.vagas = response.data.map((vaga: any) => {
        // Extrair nome do cliente de acordo com a estrutura do banco
        let clienteNome = 'Cliente não informado';
        let clienteTradeName = '';
        let clienteCompanyName = '';
        let clienteType = '';

        if (vaga.client) {
          // Para PJ (empresas) - Supabase retorna como objeto, não array
          if (vaga.client.clients_pj) {
            clienteType = 'PJ';
            clienteTradeName = vaga.client.clients_pj.trade_name || '';
            clienteCompanyName = vaga.client.clients_pj.company_name || '';
            // Priorizar trade_name sobre company_name
            clienteNome = clienteTradeName || clienteCompanyName || 'Cliente não informado';
          }
          // Para PF (pessoas físicas) - Supabase retorna como objeto, não array
          else if (vaga.client.clients_pf) {
            clienteType = 'PF';
            clienteNome = vaga.client.clients_pf.full_name || 'Cliente não informado';
          }
        }

        // Buscar candidato aprovado dos candidatos vinculados
        let candidatoAprovadoNome = vaga.candidato_aprovado?.nome;
        if (vaga.vaga_candidatos && Array.isArray(vaga.vaga_candidatos)) {
          const candidatoAprovado = vaga.vaga_candidatos.find((vc: any) =>
            vc.candidato && vc.candidato.status === 'aprovado'
          );
          if (candidatoAprovado) {
            candidatoAprovadoNome = candidatoAprovado.candidato.nome;
          }
        }

        return {
          id: vaga.id,
          codigo: vaga.codigo,
          clienteId: vaga.client_id,
          clienteNome: clienteNome,
          clienteTradeName: clienteTradeName,
          clienteCompanyName: clienteCompanyName,
          clienteType: clienteType,
          usuarioId: vaga.user_id,
          usuarioNome: vaga.user?.name || 'Não atribuído',
          cargo: vaga.cargo,
          tipoCargo: vaga.tipo_cargo,
          tipoAbertura: vaga.tipo_abertura,
          status: vaga.status,
          fonteRecrutamento: vaga.fonte_recrutamento,
          salario: parseFloat(vaga.salario || 0),
          pretensaoSalarial: vaga.pretensao_salarial ? parseFloat(vaga.pretensao_salarial) : undefined,
          dataAbertura: new Date(vaga.data_abertura),
          dataFechamentoCancelamento: vaga.data_fechamento_cancelamento ? new Date(vaga.data_fechamento_cancelamento) : undefined,
          observacoes: vaga.observacoes,
          candidatoAprovado: candidatoAprovadoNome,
          totalCandidatos: Array.isArray(vaga.vaga_candidatos) ? vaga.vaga_candidatos.length : 0,
          porcentagemFaturamento: parseFloat(vaga.porcentagem_faturamento || 100),
          valorFaturamento: parseFloat(vaga.valor_faturamento || 0),
          sigilosa: vaga.sigilosa || false,
          impostoEstado: parseFloat(vaga.imposto_estado || 0)
        };
      });

      // Carregar estatísticas
      const stats = await firstValueFrom(this.vagaService.getStatistics());
      this.totalVagasAbertas = stats.totalVagasAbertas || 0;
      this.totalVagasFechadas = stats.totalVagasFechadas || 0;
      this.vagasFechadasMes = stats.vagasFechadasMes || 0;
      this.tempoMedioFechamento = stats.tempoMedioFechamento || 0;

      // Initialize cached years after loading data
      this.updateCachedYears();
      this.applyFilters();
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      this.vagas = [];
    } finally {
      this.isLoading = false;
    }
  }

  private updateCachedYears() {
    const years = new Set<string>();

    this.vagas.forEach(vaga => {
      // Add year from data de abertura
      const aberturaDate = new Date(vaga.dataAbertura);
      years.add(aberturaDate.getFullYear().toString());

      // Add year from data de fechamento if exists
      if (vaga.dataFechamentoCancelamento) {
        const fechamentoDate = new Date(vaga.dataFechamentoCancelamento);
        years.add(fechamentoDate.getFullYear().toString());
      }
    });

    this.cachedYears = Array.from(years)
      .sort((a, b) => b.localeCompare(a))
      .map(year => ({
        value: year,
        label: year
      }));
  }

  getSearchPlaceholder(): string {
    return 'Buscar por código, cliente, cargo ou responsável...';
  }

  getNewButtonText(): string {
    return 'Nova Vaga';
  }

  onSearch() {
    this.applyFilters();
  }

  clearSearch() {
    this.searchTerm = '';
    this.applyFilters();
  }

  applyFilters() {
    const searchLower = this.searchTerm.toLowerCase();

    // Filter vagas
    this.filteredVagas = this.vagas.filter(vaga => {
      const matchesSearch = !this.searchTerm ||
        vaga.cargo.toLowerCase().includes(searchLower) ||
        vaga.codigo.toLowerCase().includes(searchLower) ||
        vaga.clienteNome.toLowerCase().includes(searchLower) ||
        vaga.usuarioNome.toLowerCase().includes(searchLower) ||
        (vaga.candidatoAprovado && vaga.candidatoAprovado.toLowerCase().includes(searchLower));

      const matchesStatus = !this.statusFilter || vaga.status === this.statusFilter;
      const matchesTipoCargo = !this.tipoCargoFilter || vaga.tipoCargo === this.tipoCargoFilter;
      const matchesFonte = !this.fonteRecrutamentoFilter || vaga.fonteRecrutamento === this.fonteRecrutamentoFilter;

      // Apply month and year filters based on data de abertura
      let matchesMonthYear = true;
      if (this.selectedMonth || this.selectedYear) {
        const aberturaDate = new Date(vaga.dataAbertura);
        const year = aberturaDate.getFullYear().toString();
        const month = (aberturaDate.getMonth() + 1).toString();

        const matchesMonth = !this.selectedMonth || month === this.selectedMonth;
        const matchesYear = !this.selectedYear || year === this.selectedYear;

        matchesMonthYear = matchesMonth && matchesYear;
      }

      return matchesSearch && matchesStatus && matchesTipoCargo && matchesFonte && matchesMonthYear;
    });

  }

  onMonthYearChange() {
    // Trigger change detection for month/year filters
    // The methods getVagasFechamento() and getVagasComissoes() will automatically use the updated values
    // Also apply filters for the "Visão Geral" tab
    this.applyFilters();
    console.log('Month/Year changed:', this.selectedMonth, this.selectedYear);
  }

  clearFilters() {
    this.searchTerm = '';
    this.statusFilter = '';
    this.departmentFilter = '';
    this.tipoCargoFilter = '';
    this.fonteRecrutamentoFilter = '';
    this.selectedMonth = '';
    this.selectedYear = '';
    this.consultoraFilter = '';
    this.applyFilters();
  }

  hasFilters(): boolean {
    return !!(this.searchTerm || this.statusFilter || this.departmentFilter || this.tipoCargoFilter || this.fonteRecrutamentoFilter || this.selectedMonth || this.selectedYear || this.consultoraFilter);
  }

  // Helper method to get Object.keys in template
  get Object() {
    return Object;
  }

  openNewModal() {
    this.router.navigate(['/home/recrutamento-selecao/nova-vaga']);
  }

  // Helper method to format currency
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  // Vaga actions
  viewVaga(vaga: Vaga, event?: MouseEvent) {
    // Se event foi fornecido, verificar se clicou em botões de ação
    if (event) {
      const target = event.target as HTMLElement;

      if (target.closest('.action-buttons-cell') ||
          target.closest('.dropdown-container') ||
          target.closest('.dropdown-menu') ||
          target.classList.contains('dropdown-toggle') ||
          target.classList.contains('action-btn')) {
        return;
      }

      event.stopPropagation();
      this.openDropdownId = null;
    }

    this.router.navigate(['/home/recrutamento-selecao/visualizar', vaga.id]);
  }

  editVaga(vaga: Vaga) {
    this.router.navigate(['/home/recrutamento-selecao/editar', vaga.id]);
  }

  async deleteVaga(vaga: Vaga) {
    if (confirm('Tem certeza que deseja excluir esta vaga?')) {
      try {
        await firstValueFrom(this.vagaService.delete(vaga.id));
        await this.loadData();
      } catch (error) {
        console.error('Erro ao excluir vaga:', error);
        alert('Erro ao excluir vaga. Tente novamente.');
      }
    }
  }

  fecharVaga(vaga: Vaga) {
    this.selectedVagaToClose = vaga;
    this.showFecharVagaModal = true;
  }

  closeFecharVagaModal() {
    this.showFecharVagaModal = false;
    this.selectedVagaToClose = null;
  }

  onModalBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.closeFecharVagaModal();
    }
  }

  async confirmFecharVaga() {
    if (!this.selectedVagaToClose) return;

    try {
      await firstValueFrom(this.vagaService.updateStatus(this.selectedVagaToClose.id, 'fechada'));
      this.closeFecharVagaModal();
      await this.loadData();
    } catch (error) {
      console.error('Erro ao fechar vaga:', error);
      alert('Erro ao fechar vaga. Tente novamente.');
    }
  }

  // Dropdown management
  toggleDropdown(vagaId: number, event: Event) {
    event.stopPropagation();
    const wasOpen = this.openDropdownId === vagaId;
    this.openDropdownId = wasOpen ? null : vagaId;

    if (!wasOpen) {
      setTimeout(() => this.positionDropdown(event.target as HTMLElement), 0);
    }
  }

  positionDropdown(button: HTMLElement) {
    const dropdown = button.nextElementSibling as HTMLElement;
    if (!dropdown) return;

    const buttonRect = button.getBoundingClientRect();
    const dropdownHeight = dropdown.offsetHeight || 150;

    // Posicionar acima do botão
    dropdown.style.top = `${buttonRect.top - dropdownHeight - 5}px`;
    dropdown.style.left = `${buttonRect.left}px`;
  }

  closeDropdown(event: Event) {
    event.stopPropagation();
    this.openDropdownId = null;
  }

  // SLA calculation methods
  calculateSla(vaga: Vaga): number {
    if (!vaga.dataFechamentoCancelamento) {
      return 0;
    }
    const start = new Date(vaga.dataAbertura);
    const end = new Date(vaga.dataFechamentoCancelamento);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  calculateActiveSla(vaga: Vaga): number {
    const start = new Date(vaga.dataAbertura);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  getSlaClass(days: number): string {
    if (days <= 7) {
      return 'sla-excellent';
    } else if (days <= 15) {
      return 'sla-good';
    } else if (days <= 30) {
      return 'sla-warning';
    } else {
      return 'sla-danger';
    }
  }

  // Tab management
  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  // Get vagas for fechamento tab (only closed)
  getVagasFechamento(): Vaga[] {
    let vagasFechadas = this.vagas.filter(vaga =>
      (vaga.status === 'fechada' || vaga.status === 'fechada_rep') &&
      vaga.dataFechamentoCancelamento
    );

    // Apply month and year filters if set
    if (this.selectedMonth || this.selectedYear) {
      vagasFechadas = vagasFechadas.filter(vaga => {
        if (vaga.dataFechamentoCancelamento) {
          const fechamentoDate = new Date(vaga.dataFechamentoCancelamento);
          const year = fechamentoDate.getFullYear().toString();
          const month = (fechamentoDate.getMonth() + 1).toString();

          const matchesMonth = !this.selectedMonth || month === this.selectedMonth;
          const matchesYear = !this.selectedYear || year === this.selectedYear;

          return matchesMonth && matchesYear;
        }
        return false;
      });
    }

    return vagasFechadas;
  }

  // Get available months (1-12)
  getAvailableMonths(): { value: string; label: string }[] {
    return this.cachedMonths;
  }

  // Get available years from closed vagas
  getAvailableYears(): { value: string; label: string }[] {
    return this.cachedYears;
  }

  // Get available consultoras from vagas
  getAvailableConsultoras(): string[] {
    const consultoras = new Set<string>();

    this.vagas
      .filter(vaga => vaga.status === 'fechada' || vaga.status === 'fechada_rep')
      .forEach(vaga => {
        if (vaga.usuarioNome) {
          consultoras.add(vaga.usuarioNome);
        }
      });

    return Array.from(consultoras).sort();
  }

  // Métodos para a aba de Comissões
  getVagasComissoes(): Vaga[] {
    let filteredVagas = this.vagas.filter(vaga =>
      vaga.status === 'fechada' || vaga.status === 'fechada_rep'
    );

    // Apply consultora filter if selected
    if (this.consultoraFilter) {
      filteredVagas = filteredVagas.filter(vaga =>
        vaga.usuarioNome === this.consultoraFilter
      );
    }

    // Apply month and year filters if set
    if (this.selectedMonth || this.selectedYear) {
      filteredVagas = filteredVagas.filter(vaga => {
        if (vaga.dataFechamentoCancelamento) {
          const fechamentoDate = new Date(vaga.dataFechamentoCancelamento);
          const year = fechamentoDate.getFullYear().toString();
          const month = (fechamentoDate.getMonth() + 1).toString();

          const matchesMonth = !this.selectedMonth || month === this.selectedMonth;
          const matchesYear = !this.selectedYear || year === this.selectedYear;

          return matchesMonth && matchesYear;
        }
        return false;
      });
    }

    // Apply search term if present
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filteredVagas = filteredVagas.filter(vaga =>
        vaga.cargo.toLowerCase().includes(searchLower) ||
        vaga.clienteNome.toLowerCase().includes(searchLower) ||
        vaga.usuarioNome?.toLowerCase().includes(searchLower)
      );
    }

    return filteredVagas;
  }

  calcularValorFaturamento(vaga: Vaga): number {
    const porcentagem = vaga.porcentagemFaturamento || 100;
    return vaga.salario * (porcentagem / 100);
  }

  calcularValorImposto(vaga: Vaga): number {
    const valorFaturamento = this.calcularValorFaturamento(vaga);
    const impostoEstado = vaga.impostoEstado || 0;
    return valorFaturamento * (impostoEstado / 100);
  }

  calcularLucro(vaga: Vaga): number {
    const valorFaturamento = this.calcularValorFaturamento(vaga);
    const valorImposto = this.calcularValorImposto(vaga);
    return valorFaturamento - valorImposto;
  }

  calcularComissao(vaga: Vaga): number {
    // Calcula 5% do lucro como comissão da consultora
    const lucro = this.calcularLucro(vaga);
    return lucro * 0.05; // 5% do lucro
  }

  calcularTotalFaturamento(): number {
    return this.getVagasComissoes().reduce((total, vaga) => {
      return total + this.calcularValorFaturamento(vaga);
    }, 0);
  }

  calcularTotalImpostos(): number {
    return this.getVagasComissoes().reduce((total, vaga) => {
      return total + this.calcularValorImposto(vaga);
    }, 0);
  }

  calcularTotalLucro(): number {
    return this.getVagasComissoes().reduce((total, vaga) => {
      return total + this.calcularLucro(vaga);
    }, 0);
  }

  calcularTotalComissao(): number {
    return this.getVagasComissoes().reduce((total, vaga) => {
      return total + this.calcularComissao(vaga);
    }, 0);
  }

}
