import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { MentoriaService } from '../../services/mentoria.service';
import { ScrollAnimationDirective } from '../../directives/scroll-animation';

interface MentoriaPublica {
  id: number;
  client_id: number;
  contract_id: number;
  numero_encontros: number;
  status: string;
  unique_token?: string;
  foto_url?: string;
  testes?: any;
  mentorado_idade?: number;
  mentorado_profissao?: string;
  mentorado_email?: string;
  created_at: string;
  updated_at: string;
  contract?: any;
  client?: any;
  encontros?: any[];
}

@Component({
  selector: 'app-public-mentoria-hub',
  standalone: true,
  imports: [CommonModule, ScrollAnimationDirective],
  templateUrl: './public-mentoria-hub.html',
  styleUrl: './public-mentoria-hub.css'
})
export class PublicMentoriaHub implements OnInit {
  mentoria: MentoriaPublica | null = null;
  token: string = '';

  // Estados
  isLoading = true;
  notFound = false;

  // Controle de visualização
  showAllEncontros = false;
  maxEncontrosInicial = 6;

  // Modal de imagem
  modalImageSrc: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mentoriaService: MentoriaService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';

    if (!this.token) {
      this.notFound = true;
      this.isLoading = false;
      return;
    }

    this.carregarMentoria();
  }

  carregarMentoria(): void {
    this.isLoading = true;

    this.mentoriaService.obterMentoriaPublica(this.token).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.mentoria = response.data;

          // Parse testes field if it's a string
          if (this.mentoria?.testes) {
            if (typeof this.mentoria.testes === 'string') {
              try {
                this.mentoria.testes = JSON.parse(this.mentoria.testes);
              } catch (e) {
                console.error('Erro ao parsear testes:', e);
                this.mentoria.testes = [];
              }
            }
            // Ensure it's an array
            if (!Array.isArray(this.mentoria.testes)) {
              this.mentoria.testes = [];
            }
          }

          // Ordenar encontros por número
          if (this.mentoria?.encontros) {
            this.mentoria.encontros.sort((a, b) =>
              (a.numero_encontro || 0) - (b.numero_encontro || 0)
            );
          }
        } else {
          this.notFound = true;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar mentoria:', error);
        this.notFound = true;
        this.isLoading = false;

        if (error.status === 404) {
          this.toastr.error('Mentoria não encontrada ou link inválido');
        } else {
          this.toastr.error('Erro ao carregar mentoria');
        }
      }
    });
  }

  // Navegação para encontro individual
  navegarParaEncontro(token: string): void {
    // Abrir em nova aba para manter o hub aberto
    window.open(`/mentoria/${token}`, '_blank');
  }

  // Helpers
  getClientName(): string {
    if (!this.mentoria?.client) {
      console.log('Mentoria ou client não disponível');
      return '';
    }

    const client = this.mentoria.client;
    console.log('Client data:', client);

    if (client.clients_pf) {
      return client.clients_pf.full_name || '';
    } else if (client.clients_pj) {
      return client.clients_pj.company_name || client.clients_pj.trade_name || '';
    }
    return '';
  }

  formatDate(date: string | Date): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR');
  }

  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'ativa': 'status-active',
      'pausada': 'status-paused',
      'concluida': 'status-completed',
      'cancelada': 'status-cancelled'
    };
    return statusClasses[status] || 'status-default';
  }

  getStatusText(status: string): string {
    const statusTexts: { [key: string]: string } = {
      'ativa': 'Ativa',
      'pausada': 'Pausada',
      'concluida': 'Concluída',
      'cancelada': 'Cancelada'
    };
    return statusTexts[status] || status;
  }

  getEncontroStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'published': 'encontro-published',
      'draft': 'encontro-draft',
      'archived': 'encontro-archived'
    };
    return statusClasses[status] || 'encontro-default';
  }

  getEncontroStatusText(status: string): string {
    const statusTexts: { [key: string]: string } = {
      'published': 'Publicado',
      'draft': 'Rascunho',
      'archived': 'Arquivado'
    };
    return statusTexts[status] || status;
  }

  isEncontroAccessible(encontro: any): boolean {
    return encontro.status === 'published' && encontro.unique_token;
  }

  get encontrosVisiveis(): any[] {
    if (!this.mentoria?.encontros) return [];

    if (this.showAllEncontros) {
      return this.mentoria.encontros;
    }

    return this.mentoria.encontros.slice(0, this.maxEncontrosInicial);
  }

  get temMaisEncontros(): boolean {
    return (this.mentoria?.encontros?.length || 0) > this.maxEncontrosInicial;
  }

  toggleMostrarEncontros(): void {
    this.showAllEncontros = !this.showAllEncontros;
  }

  // Modal de imagem
  openImageModal(src: string): void {
    this.modalImageSrc = src;
    document.body.style.overflow = 'hidden';
  }

  closeImageModal(): void {
    this.modalImageSrc = null;
    document.body.style.overflow = 'auto';
  }

  getCurrentYear(): number {
    return new Date().getFullYear();
  }

  // Calcular progresso
  getProgresso(): number {
    if (!this.mentoria?.encontros) return 0;

    const total = this.mentoria.encontros.length;
    const publicados = this.mentoria.encontros.filter(e => e.status === 'published').length;

    return total > 0 ? Math.round((publicados / total) * 100) : 0;
  }

  getEncontrosPublicados(): number {
    if (!this.mentoria?.encontros) return 0;
    return this.mentoria.encontros.filter(e => e.status === 'published').length;
  }

  getMentoradoName(): string {
    if (!this.mentoria?.encontros || this.mentoria.encontros.length === 0) {
      return 'Não definido';
    }

    // Pega o nome do primeiro encontro
    const primeiroEncontro = this.mentoria.encontros.find(e => e.numero_encontro === 1) || this.mentoria.encontros[0];
    return primeiroEncontro?.mentorado_nome || 'Não definido';
  }
}
