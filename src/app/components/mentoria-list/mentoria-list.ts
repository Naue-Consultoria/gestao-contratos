import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { MentoriaService, MentoriaEncontro } from '../../services/mentoria.service';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { BreadcrumbService } from '../../services/breadcrumb.service';

@Component({
  selector: 'app-mentoria-list',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './mentoria-list.html',
  styleUrl: './mentoria-list.css'
})
export class MentoriaList implements OnInit {
  encontros: MentoriaEncontro[] = [];
  encontrosFiltrados: MentoriaEncontro[] = [];
  encontrosAgrupados: Map<number, {
    contract: any;
    client: any;
    encontros: MentoriaEncontro[];
  }> = new Map();
  isLoading = false;

  // Filtros
  filtroCliente: string = 'all';
  filtroBusca: string = '';
  clientesUnicos: any[] = [];

  // Dropdown
  dropdownAberto: number | null = null;

  // Estatísticas
  totalEncontros = 0;
  encontrosPublicados = 0;
  encontrosRascunho = 0;

  constructor(
    private mentoriaService: MentoriaService,
    private router: Router,
    private toastr: ToastrService,
    private breadcrumbService: BreadcrumbService
  ) {}

  ngOnInit(): void {
    this.configurarBreadcrumb();
    this.carregarEncontros();
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

  carregarEncontros(): void {
    this.isLoading = true;

    this.mentoriaService.listarEncontros().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.encontros = response.data;
          this.calcularEstatisticas();
          this.extrairClientesUnicos();
          this.aplicarFiltros();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar encontros:', error);
        this.toastr.error('Erro ao carregar encontros de mentoria');
        this.isLoading = false;
      }
    });
  }

  extrairClientesUnicos(): void {
    const clientesMap = new Map();

    this.encontros.forEach(encontro => {
      if (encontro.contract?.client) {
        const client = encontro.contract.client;
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
    this.totalEncontros = this.encontros.length;
    this.encontrosPublicados = this.encontros.filter(e => e.status === 'published').length;
    this.encontrosRascunho = this.encontros.filter(e => e.status === 'draft').length;
  }

  aplicarFiltros(): void {
    let resultado = [...this.encontros];

    // Filtro por cliente
    if (this.filtroCliente !== 'all') {
      resultado = resultado.filter(e =>
        e.contract?.client?.id === parseInt(this.filtroCliente)
      );
    }

    // Filtro por busca
    if (this.filtroBusca.trim()) {
      const busca = this.filtroBusca.toLowerCase();
      resultado = resultado.filter(e =>
        e.mentorado_nome.toLowerCase().includes(busca) ||
        (e.numero_encontro && e.numero_encontro.toString().includes(busca)) ||
        (e.visao_geral && e.visao_geral.toLowerCase().includes(busca)) ||
        (e.contract?.contract_number?.toLowerCase().includes(busca)) ||
        (e.contract?.client?.clients_pf?.full_name?.toLowerCase().includes(busca)) ||
        (e.contract?.client?.clients_pj?.company_name?.toLowerCase().includes(busca))
      );
    }

    this.encontrosFiltrados = resultado;
    this.agruparEncontrosPorContrato();
  }

  agruparEncontrosPorContrato(): void {
    this.encontrosAgrupados.clear();

    this.encontrosFiltrados.forEach(encontro => {
      const contractId = encontro.contract_id;

      if (!this.encontrosAgrupados.has(contractId)) {
        this.encontrosAgrupados.set(contractId, {
          contract: encontro.contract,
          client: encontro.contract?.client, // O cliente já está aninhado dentro de contract
          encontros: []
        });
      }

      const grupo = this.encontrosAgrupados.get(contractId);
      if (grupo) {
        grupo.encontros.push(encontro);
      }
    });

    // Ordenar encontros dentro de cada grupo por número do encontro
    this.encontrosAgrupados.forEach(grupo => {
      grupo.encontros.sort((a, b) => {
        if (a.numero_encontro && b.numero_encontro) {
          return a.numero_encontro - b.numero_encontro;
        }
        // Se não tiver número, ordenar por data
        return new Date(a.data_encontro).getTime() - new Date(b.data_encontro).getTime();
      });
    });
  }

  onFiltroChange(): void {
    this.aplicarFiltros();
  }

  novoEncontro(): void {
    this.router.navigate(['/home/mentorias/novo']);
  }

  editarEncontro(id: number): void {
    this.router.navigate(['/home/mentorias/editar', id]);
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

    if (!confirm(`Deseja publicar o encontro "${encontro.mentorado_nome}"?`)) {
      return;
    }

    this.mentoriaService.publicarEncontro(encontro.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success('Encontro publicado com sucesso!');
          this.carregarEncontros();
        }
      },
      error: (error) => {
        console.error('Erro ao publicar encontro:', error);
        this.toastr.error('Erro ao publicar encontro');
      }
    });
  }

  deletarEncontro(encontro: MentoriaEncontro): void {
    const confirmacao = confirm(
      `Tem certeza que deseja deletar o encontro "${encontro.mentorado_nome}"?\n\nEsta ação não pode ser desfeita.`
    );

    if (!confirmacao) return;

    this.mentoriaService.deletarEncontro(encontro.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success('Encontro deletado com sucesso');
          this.carregarEncontros();
        }
      },
      error: (error) => {
        console.error('Erro ao deletar encontro:', error);
        this.toastr.error('Erro ao deletar encontro');
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    const classes: { [key: string]: string } = {
      'draft': 'badge-draft',
      'published': 'badge-published',
      'archived': 'badge-archived'
    };
    return classes[status] || 'badge-default';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
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

  toggleDropdown(encontroId: number): void {
    if (this.dropdownAberto === encontroId) {
      this.dropdownAberto = null;
    } else {
      this.dropdownAberto = encontroId;
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
}
