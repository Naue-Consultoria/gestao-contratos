import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { MentoriaService, Mentoria, MentoriaEncontro } from '../../services/mentoria.service';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { BreadcrumbService } from '../../services/breadcrumb.service';
import { DeleteConfirmationModalComponent } from '../delete-confirmation-modal/delete-confirmation-modal.component';

@Component({
  selector: 'app-mentoria-list',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent, DeleteConfirmationModalComponent],
  templateUrl: './mentoria-list.html',
  styleUrl: './mentoria-list.css'
})
export class MentoriaList implements OnInit {
  mentorias: Mentoria[] = [];
  mentoriasFiltradas: Mentoria[] = [];
  isLoading = false;

  // Filtros
  filtroCliente: string = 'all';
  filtroBusca: string = '';
  filtroStatus: string = 'all';
  clientesUnicos: any[] = [];

  // Dropdown
  dropdownAberto: number | null = null;

  // Estatísticas
  totalMentorias = 0;
  mentoriasAtivas = 0;
  totalEncontros = 0;

  // Mentoria expandida
  mentoriaExpandida: number | null = null;

  // Modal de expiração
  showExpirarModal = false;
  mentoriaParaExpirar: Mentoria | null = null;
  isExpirando = false;

  constructor(
    private mentoriaService: MentoriaService,
    private router: Router,
    private toastr: ToastrService,
    private breadcrumbService: BreadcrumbService
  ) {}

  ngOnInit(): void {
    this.configurarBreadcrumb();
    this.carregarMentorias();
  }

  private configurarBreadcrumb(): void {
    this.breadcrumbService.setBreadcrumbs([
      {
        label: 'Home',
        url: '/home/dashboard',
        icon: 'fas fa-home'
      },
      {
        label: 'Gestão de Mentorias',
        icon: 'fas fa-chalkboard-teacher'
      }
    ]);
  }

  carregarMentorias(): void {
    this.isLoading = true;

    this.mentoriaService.listarMentorias().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.mentorias = response.data;

          // Carregar encontros de todas as mentorias para mostrar nome do mentorado
          this.mentorias.forEach(mentoria => {
            if (!mentoria.encontros) {
              this.mentoriaService.obterMentoria(mentoria.id).subscribe({
                next: (detailResponse) => {
                  if (detailResponse.success && detailResponse.data && detailResponse.data.encontros) {
                    mentoria.encontros = detailResponse.data.encontros;
                  }
                },
                error: (error) => {
                  console.error(`Erro ao carregar encontros da mentoria ${mentoria.id}:`, error);
                }
              });
            }
          });

          this.calcularEstatisticas();
          this.extrairClientesUnicos();
          this.aplicarFiltros();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar mentorias:', error);
        this.toastr.error('Erro ao carregar mentorias');
        this.isLoading = false;
      }
    });
  }

  extrairClientesUnicos(): void {
    const clientesMap = new Map();

    this.mentorias.forEach(mentoria => {
      if (mentoria.client) {
        const client = mentoria.client;
        const clientId = client.id;

        if (!clientesMap.has(clientId)) {
          clientesMap.set(clientId, {
            id: clientId,
            nome: client.clients_pj?.company_name ||
                  client.clients_pf?.full_name ||
                  'Cliente sem nome'
          });
        }
      }
    });

    this.clientesUnicos = Array.from(clientesMap.values())
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }

  calcularEstatisticas(): void {
    this.totalMentorias = this.mentorias.length;
    this.mentoriasAtivas = this.mentorias.filter(m => m.status === 'ativa').length;
    this.totalEncontros = this.mentorias.reduce((sum, m) => sum + m.numero_encontros, 0);
  }

  aplicarFiltros(): void {
    let resultado = [...this.mentorias];

    // Filtro por cliente
    if (this.filtroCliente !== 'all') {
      resultado = resultado.filter(m =>
        m.client?.id === parseInt(this.filtroCliente)
      );
    }

    // Filtro por status
    if (this.filtroStatus !== 'all') {
      resultado = resultado.filter(m => m.status === this.filtroStatus);
    }

    // Filtro por busca
    if (this.filtroBusca.trim()) {
      const busca = this.filtroBusca.toLowerCase();
      resultado = resultado.filter(m =>
        (m.contract?.contract_number?.toLowerCase().includes(busca)) ||
        (m.client?.clients_pf?.full_name?.toLowerCase().includes(busca)) ||
        (m.client?.clients_pj?.company_name?.toLowerCase().includes(busca))
      );
    }

    this.mentoriasFiltradas = resultado;
  }

  onFiltroChange(): void {
    this.aplicarFiltros();
  }

  novaMentoria(): void {
    this.router.navigate(['/home/mentorias/nova']);
  }

  visualizarMentoria(mentoriaId: number): void {
    this.router.navigate(['/home/mentorias/visualizar', mentoriaId]);
  }

  editarMentoria(mentoria: Mentoria): void {
    this.router.navigate(['/home/mentorias/editar', mentoria.id]);
  }

  editarEncontro(encontroId: number): void {
    this.router.navigate(['/home/mentorias/editar-encontro', encontroId]);
  }

  adicionarEncontros(mentoria: Mentoria): void {
    const quantidade = prompt('Quantos encontros deseja adicionar?', '1');

    if (!quantidade || isNaN(parseInt(quantidade))) {
      return;
    }

    const qtd = parseInt(quantidade);
    if (qtd < 1 || qtd > 20) {
      this.toastr.error('Quantidade deve estar entre 1 e 20');
      return;
    }

    this.mentoriaService.adicionarEncontros(mentoria.id, qtd).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success(`${qtd} encontro(s) adicionado(s) com sucesso!`);
          this.carregarMentorias();
        }
      },
      error: (error) => {
        console.error('Erro ao adicionar encontros:', error);
        this.toastr.error('Erro ao adicionar encontros');
      }
    });
  }

  visualizarEncontro(encontro: MentoriaEncontro): void {
    const url = this.mentoriaService.gerarLinkPublico(encontro.unique_token);
    window.open(url, '_blank');
  }

  copiarLink(encontro: MentoriaEncontro): void {
    const url = this.mentoriaService.gerarLinkPublico(encontro.unique_token);

    navigator.clipboard.writeText(url).then(() => {
      this.toastr.success('Link copiado para a área de transferência!');
    }).catch(() => {
      this.toastr.error('Erro ao copiar link');
    });
  }

  publicarEncontro(encontro: MentoriaEncontro): void {
    if (encontro.status === 'published') {
      this.toastr.info('Este encontro já está publicado');
      return;
    }

    if (!confirm(`Deseja publicar o encontro #${encontro.numero_encontro}?`)) {
      return;
    }

    this.mentoriaService.publicarEncontro(encontro.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success('Encontro publicado com sucesso!');
          this.carregarMentorias();
        }
      },
      error: (error) => {
        console.error('Erro ao publicar encontro:', error);
        this.toastr.error('Erro ao publicar encontro');
      }
    });
  }

  updateEncontroStatus(encontro: any): void {
    this.mentoriaService.atualizarEncontro(encontro.id, {
      encontro_status: encontro.encontro_status
    }).subscribe({
      next: (response) => {
        if (response.success) {
          const statusLabel = encontro.encontro_status === 'em_andamento' ? 'Em andamento' : 'Finalizado';
          this.toastr.success(`Status atualizado para: ${statusLabel}`);
        }
      },
      error: (error) => {
        console.error('Erro ao atualizar status do encontro:', error);
        this.toastr.error('Erro ao atualizar status do encontro');
        // Recarregar para voltar ao estado anterior
        this.carregarMentorias();
      }
    });
  }

  deletarMentoria(mentoria: Mentoria): void {
    const nomeCliente = mentoria.client?.clients_pj?.company_name ||
                        mentoria.client?.clients_pf?.full_name ||
                        'Cliente';

    const confirmacao = confirm(
      `Tem certeza que deseja deletar a mentoria do cliente "${nomeCliente}"?\n\n` +
      `Isso irá deletar TODOS os ${mentoria.numero_encontros} encontros associados.\n\n` +
      `Esta ação não pode ser desfeita.`
    );

    if (!confirmacao) return;

    this.mentoriaService.deletarMentoria(mentoria.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success('Mentoria deletada com sucesso');
          this.carregarMentorias();
        }
      },
      error: (error) => {
        console.error('Erro ao deletar mentoria:', error);
        this.toastr.error('Erro ao deletar mentoria');
      }
    });
  }

  expirarMentoria(mentoria: Mentoria): void {
    this.mentoriaParaExpirar = mentoria;
    this.showExpirarModal = true;
  }

  confirmarExpiracao(): void {
    if (!this.mentoriaParaExpirar) return;

    this.isExpirando = true;
    this.mentoriaService.expirarMentoria(this.mentoriaParaExpirar.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success('Mentoria expirada com sucesso');
          this.carregarMentorias();
          this.fecharModalExpiracao();
        }
      },
      error: (error) => {
        console.error('Erro ao expirar mentoria:', error);
        this.toastr.error('Erro ao expirar mentoria');
        this.isExpirando = false;
      }
    });
  }

  fecharModalExpiracao(): void {
    this.showExpirarModal = false;
    this.mentoriaParaExpirar = null;
    this.isExpirando = false;
  }

  getMensagemExpiracao(): string {
    if (!this.mentoriaParaExpirar) return '';

    const nomeCliente = this.mentoriaParaExpirar.client?.clients_pj?.company_name ||
                        this.mentoriaParaExpirar.client?.clients_pf?.full_name ||
                        'Cliente';

    return `Tem certeza que deseja expirar a mentoria do cliente "${nomeCliente}"?\n\n` +
           `Isso irá expirar TODOS os ${this.mentoriaParaExpirar.numero_encontros} encontros associados.\n\n` +
           `Os links públicos deixarão de funcionar.`;
  }

  toggleExpandirMentoria(mentoriaId: number): void {
    if (this.mentoriaExpandida === mentoriaId) {
      this.mentoriaExpandida = null;
    } else {
      this.mentoriaExpandida = mentoriaId;

      // Carregar detalhes da mentoria com encontros
      const mentoria = this.mentoriasFiltradas.find(m => m.id === mentoriaId);
      if (mentoria && !mentoria.encontros) {
        this.mentoriaService.obterMentoria(mentoriaId).subscribe({
          next: (response) => {
            if (response.success && response.data) {
              const index = this.mentoriasFiltradas.findIndex(m => m.id === mentoriaId);
              if (index !== -1) {
                this.mentoriasFiltradas[index] = response.data;
              }
            }
          },
          error: (error) => {
            console.error('Erro ao carregar detalhes da mentoria:', error);
          }
        });
      }
    }
  }

  getStatusBadgeClass(status: string): string {
    const classes: { [key: string]: string } = {
      'ativa': 'badge-active',
      'concluida': 'badge-completed',
      'cancelada': 'badge-cancelled',
      'draft': 'badge-draft',
      'published': 'badge-published',
      'archived': 'badge-archived'
    };
    return classes[status] || 'badge-default';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'ativa': 'Ativa',
      'concluida': 'Concluída',
      'cancelada': 'Cancelada',
      'draft': 'Rascunho',
      'published': 'Publicado',
      'archived': 'Arquivado'
    };
    return labels[status] || status;
  }

  formatarData(data: string): string {
    return new Date(data).toLocaleDateString('pt-BR');
  }

  isTokenExpirado(encontro: MentoriaEncontro): boolean {
    return this.mentoriaService.isTokenExpirado(encontro);
  }

  toggleDropdown(mentoriaId: number): void {
    if (this.dropdownAberto === mentoriaId) {
      this.dropdownAberto = null;
    } else {
      this.dropdownAberto = mentoriaId;
    }
  }

  closeDropdown(): void {
    this.dropdownAberto = null;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-menu-container')) {
      this.closeDropdown();
    }
  }

  getEncontrosPublicados(mentoria: Mentoria): number {
    if (!mentoria.encontros) return 0;
    return mentoria.encontros.filter(e => e.status === 'published').length;
  }

  getEncontrosRascunho(mentoria: Mentoria): number {
    if (!mentoria.encontros) return 0;
    return mentoria.encontros.filter(e => e.status === 'draft').length;
  }

  visualizarHub(mentoria: Mentoria): void {
    if (!mentoria.unique_token) {
      this.toastr.warning('Esta mentoria não possui um link de acesso público');
      return;
    }

    const url = `${window.location.origin}/mentoria-hub/${mentoria.unique_token}`;
    window.open(url, '_blank');
  }

  copiarLinkHub(mentoria: Mentoria): void {
    if (!mentoria.unique_token) {
      this.toastr.warning('Esta mentoria não possui um link de acesso público');
      return;
    }

    const url = `${window.location.origin}/mentoria-hub/${mentoria.unique_token}`;
    navigator.clipboard.writeText(url).then(() => {
      this.toastr.success('Link do hub copiado para a área de transferência!');
    }).catch(() => {
      this.toastr.error('Erro ao copiar link');
    });
  }
}
