import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { MentoriaService, Mentoria, MentoriaEncontro } from '../../services/mentoria.service';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { BreadcrumbService } from '../../services/breadcrumb.service';
import { DeleteConfirmationModalComponent } from '../delete-confirmation-modal/delete-confirmation-modal.component';

@Component({
  selector: 'app-mentoria-view',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent, DeleteConfirmationModalComponent],
  templateUrl: './mentoria-view.html',
  styleUrl: './mentoria-view.css'
})
export class MentoriaView implements OnInit {
  mentoria: Mentoria | null = null;
  isLoading = false;
  mentoriaId: number | null = null;

  // Modal de expiração de mentoria
  showExpirarMentoriaModal = false;
  isExpirandoMentoria = false;

  // Modal de expiração de encontro
  showExpirarEncontroModal = false;
  encontroParaExpirar: MentoriaEncontro | null = null;
  isExpirandoEncontro = false;

  // Modal de observações do encontro
  showObservacoesModal = false;
  encontroParaObservacoes: MentoriaEncontro | null = null;
  observacoesTexto = '';
  isSalvandoObservacoes = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mentoriaService: MentoriaService,
    private toastr: ToastrService,
    private breadcrumbService: BreadcrumbService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = +params['id'];
      if (id) {
        this.mentoriaId = id;
        this.carregarMentoria(id);
      }
    });
  }

  carregarMentoria(id: number): void {
    this.isLoading = true;

    this.mentoriaService.obterMentoria(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.mentoria = response.data;
          this.configurarBreadcrumb();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar mentoria:', error);
        this.toastr.error('Erro ao carregar mentoria');
        this.isLoading = false;
        this.router.navigate(['/home/mentorias']);
      }
    });
  }

  private configurarBreadcrumb(): void {
    const clienteNome = this.mentoria?.client?.clients_pj?.trade_name ||
                        this.mentoria?.client?.clients_pj?.company_name ||
                        this.mentoria?.client?.clients_pf?.full_name ||
                        'Mentoria';

    this.breadcrumbService.setBreadcrumbs([
      {
        label: 'Home',
        url: '/home/dashboard',
        icon: 'fas fa-home'
      },
      {
        label: 'Mentorias',
        url: '/home/mentorias',
        icon: 'fas fa-chalkboard-teacher'
      },
      {
        label: clienteNome,
        icon: 'fas fa-building'
      }
    ]);
  }

  getClienteNome(): string {
    if (!this.mentoria?.client) return 'N/A';
    return this.mentoria.client.clients_pj?.trade_name ||
           this.mentoria.client.clients_pj?.company_name ||
           this.mentoria.client.clients_pf?.full_name ||
           'Cliente não informado';
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

  getStatusBadgeClass(status: string): string {
    return status;
  }

  formatarData(data: string): string {
    if (!data) return 'Data não definida';

    // Extrair ano, mês e dia da string YYYY-MM-DD sem conversão de timezone
    const [year, month, day] = data.split('T')[0].split('-');

    // Criar data usando componentes locais (sem timezone UTC)
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  editarEncontro(encontroId: number): void {
    this.router.navigate(['/home/mentorias/editar-encontro', encontroId]);
  }

  editarConteudo(encontroId: number): void {
    this.router.navigate(['/home/mentorias', encontroId, 'conteudo']);
  }

  publicarEncontro(encontro: MentoriaEncontro): void {
    if (!encontro.id) return;

    this.mentoriaService.publicarEncontro(encontro.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success('Encontro publicado com sucesso!');
          if (this.mentoriaId) {
            this.carregarMentoria(this.mentoriaId);
          }
        }
      },
      error: (error) => {
        console.error('Erro ao publicar encontro:', error);
        this.toastr.error('Erro ao publicar encontro');
      }
    });
  }

  visualizarEncontro(encontro: MentoriaEncontro): void {
    if (encontro.unique_token) {
      const url = `${window.location.origin}/mentoria/${encontro.unique_token}`;
      window.open(url, '_blank');
    }
  }

  copiarLink(encontro: MentoriaEncontro): void {
    if (encontro.unique_token) {
      const url = `${window.location.origin}/mentoria/${encontro.unique_token}`;
      navigator.clipboard.writeText(url).then(() => {
        this.toastr.success('Link copiado para a área de transferência!');
      }).catch(() => {
        this.toastr.error('Erro ao copiar link');
      });
    }
  }

  isTokenExpirado(encontro: MentoriaEncontro): boolean {
    if (!encontro.token_expira_em) return false;
    return new Date(encontro.token_expira_em) < new Date();
  }

  adicionarEncontros(): void {
    if (!this.mentoria) return;

    const quantidade = prompt('Quantos encontros deseja adicionar?', '1');

    if (!quantidade || isNaN(parseInt(quantidade))) {
      return;
    }

    const qtd = parseInt(quantidade);
    if (qtd < 1 || qtd > 20) {
      this.toastr.error('Quantidade deve estar entre 1 e 20');
      return;
    }

    this.mentoriaService.adicionarEncontros(this.mentoria.id, qtd).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success(`${qtd} encontro(s) adicionado(s) com sucesso!`);
          if (this.mentoriaId) {
            this.carregarMentoria(this.mentoriaId);
          }
        }
      },
      error: (error) => {
        console.error('Erro ao adicionar encontros:', error);
        this.toastr.error('Erro ao adicionar encontros');
      }
    });
  }

  voltarParaLista(): void {
    this.router.navigate(['/home/mentorias']);
  }

  getEncontrosPublicados(): number {
    return this.mentoria?.encontros?.filter(e => e.status === 'published').length || 0;
  }

  getEncontrosRascunho(): number {
    return this.mentoria?.encontros?.filter(e => e.status === 'draft').length || 0;
  }

  editarMentoria(): void {
    if (!this.mentoria) return;
    this.router.navigate(['/home/mentorias/editar', this.mentoria.id]);
  }

  excluirMentoria(): void {
    if (!this.mentoria) return;

    const clienteNome = this.getClienteNome();
    const confirmacao = confirm(
      `Tem certeza que deseja excluir a mentoria de "${clienteNome}"?\n\n` +
      `Esta ação irá excluir TODOS os ${this.mentoria.numero_encontros} encontros associados.\n\n` +
      `Esta ação NÃO pode ser desfeita!`
    );

    if (!confirmacao) return;

    const confirmacaoFinal = confirm(
      `ATENÇÃO: Esta é sua última confirmação!\n\n` +
      `Você está prestes a excluir permanentemente a mentoria e todos os seus encontros.\n\n` +
      `Deseja realmente continuar?`
    );

    if (!confirmacaoFinal) return;

    this.mentoriaService.excluirMentoria(this.mentoria.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success('Mentoria excluída com sucesso!');
          this.router.navigate(['/home/mentorias']);
        }
      },
      error: (error) => {
        console.error('Erro ao excluir mentoria:', error);
        this.toastr.error('Erro ao excluir mentoria');
      }
    });
  }

  expirarMentoria(): void {
    this.showExpirarMentoriaModal = true;
  }

  confirmarExpiracaoMentoria(): void {
    if (!this.mentoria) return;

    this.isExpirandoMentoria = true;
    this.mentoriaService.expirarMentoria(this.mentoria.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success('Mentoria expirada com sucesso!');
          if (this.mentoriaId) {
            this.carregarMentoria(this.mentoriaId);
          }
          this.fecharModalExpiracaoMentoria();
        }
      },
      error: (error) => {
        console.error('Erro ao expirar mentoria:', error);
        this.toastr.error('Erro ao expirar mentoria');
        this.isExpirandoMentoria = false;
      }
    });
  }

  fecharModalExpiracaoMentoria(): void {
    this.showExpirarMentoriaModal = false;
    this.isExpirandoMentoria = false;
  }

  getMensagemExpiracaoMentoria(): string {
    if (!this.mentoria) return '';

    const clienteNome = this.getClienteNome();
    return `Tem certeza que deseja expirar a mentoria de "${clienteNome}"?\n\n` +
           `Isso irá expirar TODOS os ${this.mentoria.numero_encontros} encontros associados.\n\n` +
           `Os links públicos deixarão de funcionar.`;
  }

  excluirEncontro(encontro: MentoriaEncontro): void {
    if (!encontro.id) return;

    const confirmacao = confirm(
      `Tem certeza que deseja excluir o Encontro ${encontro.numero_encontro}?\n\n` +
      `Mentorado: ${encontro.mentorado_nome}\n` +
      `Data: ${this.formatarData(encontro.data_encontro)}\n\n` +
      `Esta ação NÃO pode ser desfeita!`
    );

    if (!confirmacao) return;

    this.mentoriaService.excluirEncontro(encontro.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success('Encontro excluído com sucesso!');
          if (this.mentoriaId) {
            this.carregarMentoria(this.mentoriaId);
          }
        }
      },
      error: (error) => {
        console.error('Erro ao excluir encontro:', error);
        this.toastr.error('Erro ao excluir encontro');
      }
    });
  }

  expirarEncontro(encontro: MentoriaEncontro): void {
    this.encontroParaExpirar = encontro;
    this.showExpirarEncontroModal = true;
  }

  confirmarExpiracaoEncontro(): void {
    if (!this.encontroParaExpirar || !this.encontroParaExpirar.id) return;

    this.isExpirandoEncontro = true;
    this.mentoriaService.expirarEncontro(this.encontroParaExpirar.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success('Encontro expirado com sucesso!');
          if (this.mentoriaId) {
            this.carregarMentoria(this.mentoriaId);
          }
          this.fecharModalExpiracaoEncontro();
        }
      },
      error: (error) => {
        console.error('Erro ao expirar encontro:', error);
        this.toastr.error('Erro ao expirar encontro');
        this.isExpirandoEncontro = false;
      }
    });
  }

  fecharModalExpiracaoEncontro(): void {
    this.showExpirarEncontroModal = false;
    this.encontroParaExpirar = null;
    this.isExpirandoEncontro = false;
  }

  getMensagemExpiracaoEncontro(): string {
    if (!this.encontroParaExpirar) return '';

    return `Tem certeza que deseja expirar o Encontro ${this.encontroParaExpirar.numero_encontro}?\n\n` +
           `Mentorado: ${this.encontroParaExpirar.mentorado_nome}\n\n` +
           `O link público deste encontro deixará de funcionar.`;
  }

  visualizarHub(): void {
    if (!this.mentoria || !this.mentoria.unique_token) {
      this.toastr.warning('Esta mentoria não possui um link de acesso público');
      return;
    }

    const url = `${window.location.origin}/mentoria-hub/${this.mentoria.unique_token}`;
    window.open(url, '_blank');
  }

  copiarLinkHub(): void {
    if (!this.mentoria || !this.mentoria.unique_token) {
      this.toastr.warning('Esta mentoria não possui um link de acesso público');
      return;
    }

    const url = `${window.location.origin}/mentoria-hub/${this.mentoria.unique_token}`;
    navigator.clipboard.writeText(url).then(() => {
      this.toastr.success('Link do hub copiado para a área de transferência!');
    }).catch(() => {
      this.toastr.error('Erro ao copiar link');
    });
  }

  // ===== MODAL DE OBSERVAÇÕES =====

  abrirObservacoes(encontro: MentoriaEncontro): void {
    this.encontroParaObservacoes = encontro;
    this.observacoesTexto = encontro.observacoes || '';
    this.showObservacoesModal = true;
  }

  fecharObservacoesModal(): void {
    this.showObservacoesModal = false;
    this.encontroParaObservacoes = null;
    this.observacoesTexto = '';
    this.isSalvandoObservacoes = false;
  }

  salvarObservacoes(): void {
    if (!this.encontroParaObservacoes || !this.encontroParaObservacoes.id) return;

    this.isSalvandoObservacoes = true;

    this.mentoriaService.atualizarEncontro(this.encontroParaObservacoes.id, {
      observacoes: this.observacoesTexto
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success('Observações salvas com sucesso!');
          // Atualizar o encontro localmente
          if (this.mentoria?.encontros) {
            const encontroIndex = this.mentoria.encontros.findIndex(
              e => e.id === this.encontroParaObservacoes?.id
            );
            if (encontroIndex !== -1) {
              this.mentoria.encontros[encontroIndex].observacoes = this.observacoesTexto;
            }
          }
          this.fecharObservacoesModal();
        }
      },
      error: (error) => {
        console.error('Erro ao salvar observações:', error);
        this.toastr.error('Erro ao salvar observações');
        this.isSalvandoObservacoes = false;
      }
    });
  }

  temObservacoes(encontro: MentoriaEncontro): boolean {
    return !!encontro.observacoes && encontro.observacoes.trim().length > 0;
  }
}
