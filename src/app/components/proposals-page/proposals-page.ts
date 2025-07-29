import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { ProposalService, Proposal, ProposalFilters } from '../../services/proposal';
import { CompanyService, ApiCompany } from '../../services/company';

@Component({
  selector: 'app-proposals-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './proposals-page.html',
  styleUrls: ['./proposals-page.css']
})
export class ProposalsPageComponent implements OnInit, OnDestroy {
  proposals: Proposal[] = [];
  companies: ApiCompany[] = [];
  isLoading = false;
  
  // Filtros
  filters: ProposalFilters = {
    is_active: true,
    status: '',
    company_id: undefined,
    search: '',
    expired_only: false
  };

  // Ordenação
  sortField = 'created_at';
  sortDirection: 'asc' | 'desc' = 'desc';

  // Paginação
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private proposalService: ProposalService,
    private companyService: CompanyService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadCompanies();
    this.loadProposals();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCompanies(): void {
    this.companyService.getCompanies({ is_active: true })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.companies = response.companies || [];
        },
        error: (error) => {
          console.error('Erro ao carregar empresas:', error);
        }
      });
  }

  loadProposals(): void {
    this.isLoading = true;
    
    const cleanFilters = { ...this.filters };
    Object.keys(cleanFilters).forEach(key => {
      if (cleanFilters[key as keyof ProposalFilters] === '' || 
          cleanFilters[key as keyof ProposalFilters] === undefined) {
        delete cleanFilters[key as keyof ProposalFilters];
      }
    });

    this.proposalService.getProposals(cleanFilters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.proposals = this.sortProposals(response.data || []);
            this.totalItems = response.total || 0;
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erro ao carregar propostas:', error);
          this.toastr.error('Erro ao carregar propostas');
          this.isLoading = false;
        }
      });
  }

  private sortProposals(proposals: Proposal[]): Proposal[] {
    return proposals.sort((a, b) => {
      let aValue: any = a[this.sortField as keyof Proposal];
      let bValue: any = b[this.sortField as keyof Proposal];

      // Tratamento especial para campos aninhados
      if (this.sortField === 'company_name') {
        aValue = a.company?.name || '';
        bValue = b.company?.name || '';
      }

      if (aValue < bValue) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  onSort(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.proposals = this.sortProposals(this.proposals);
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadProposals();
  }

  clearFilters(): void {
    this.filters = {
      is_active: true,
      status: '',
      company_id: undefined,
      search: '',
      expired_only: false
    };
    this.loadProposals();
  }

  createProposal(): void {
    this.router.navigate(['/home/proposals/new']);
  }

  editProposal(proposal: Proposal): void {
    this.router.navigate(['/home/proposals/edit', proposal.id]);
  }

  viewProposal(proposal: Proposal): void {
    this.router.navigate(['/home/proposals/view', proposal.id]);
  }

  duplicateProposal(proposal: Proposal): void {
    if (confirm('Deseja duplicar esta proposta?')) {
      this.proposalService.duplicateProposal(proposal.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.toastr.success('Proposta duplicada com sucesso');
              this.loadProposals();
            }
          },
          error: (error) => {
            console.error('Erro ao duplicar proposta:', error);
            this.toastr.error('Erro ao duplicar proposta');
          }
        });
    }
  }

  deleteProposal(proposal: Proposal): void {
    if (confirm(`Deseja excluir a proposta "${proposal.title}"?`)) {
      this.proposalService.deleteProposal(proposal.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.toastr.success('Proposta excluída com sucesso');
              this.loadProposals();
            }
          },
          error: (error) => {
            console.error('Erro ao excluir proposta:', error);
            this.toastr.error('Erro ao excluir proposta');
          }
        });
    }
  }

  updateStatus(proposal: Proposal, newStatus: string): void {
    this.proposalService.updateProposalStatus(proposal.id, newStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toastr.success('Status atualizado com sucesso');
            this.loadProposals();
          }
        },
        error: (error) => {
          console.error('Erro ao atualizar status:', error);
          this.toastr.error('Erro ao atualizar status');
        }
      });
  }

  sendProposal(proposal: Proposal): void {
    // Implementar modal de envio de email
    const email = prompt('Digite o email para envio da proposta:');
    if (email) {
      this.proposalService.sendProposal(proposal.id, { email })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.toastr.success('Proposta enviada com sucesso');
              this.loadProposals();
            }
          },
          error: (error) => {
            console.error('Erro ao enviar proposta:', error);
            this.toastr.error('Erro ao enviar proposta');
          }
        });
    }
  }

  generatePDF(proposal: Proposal): void {
    this.proposalService.generateProposalPDF(proposal.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `proposta-${proposal.title.replace(/\s+/g, '-').toLowerCase()}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Erro ao gerar PDF:', error);
          this.toastr.error('Erro ao gerar PDF');
        }
      });
  }

  formatCurrency(value: number | null | undefined): string {
    return this.proposalService.formatCurrency(value || 0);
  }

  getStatusColor(status: string): string {
    return this.proposalService.getStatusColor(status);
  }

  getStatusText(status: string): string {
    return this.proposalService.getStatusText(status);
  }

  canEditProposal(proposal: Proposal): boolean {
    return this.proposalService.canEditProposal(proposal);
  }

  canSendProposal(proposal: Proposal): boolean {
    return this.proposalService.canSendProposal(proposal);
  }

  isProposalExpired(proposal: Proposal): boolean {
    return this.proposalService.isProposalExpired(proposal);
  }

  getDaysUntilExpiration(proposal: Proposal): number | null {
    return this.proposalService.getDaysUntilExpiration(proposal);
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR');
  }

  // Paginação
  get paginatedProposals(): Proposal[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.proposals.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    const startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    const endPage = Math.min(this.totalPages, startPage + maxVisible - 1);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  // TrackBy function for better performance
  trackByProposalId(index: number, proposal: Proposal): number {
    return proposal.id;
  }

  // Getter for pagination display
  get displayedItemsEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  // Handle status change
  onStatusChange(event: Event, proposal: Proposal): void {
    const target = event.target as HTMLSelectElement;
    if (target && target.value) {
      this.updateStatus(proposal, target.value);
    }
  }

  // Handle include inactive change
  onIncludeInactiveChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target) {
      this.filters.is_active = !target.checked;
      this.onFilterChange();
    }
  }
}