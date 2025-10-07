import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { MentoriaService, Mentoria, MentoriaEncontro } from '../../services/mentoria.service';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { BreadcrumbService } from '../../services/breadcrumb.service';

@Component({
  selector: 'app-mentoria-view',
  standalone: true,
  imports: [CommonModule, BreadcrumbComponent],
  templateUrl: './mentoria-view.html',
  styleUrl: './mentoria-view.css'
})
export class MentoriaView implements OnInit {
  mentoria: Mentoria | null = null;
  isLoading = false;
  mentoriaId: number | null = null;

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
    const clienteNome = this.mentoria?.client?.clients_pj?.company_name ||
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
    return this.mentoria.client.clients_pj?.company_name ||
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
    const date = new Date(data);
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
}
