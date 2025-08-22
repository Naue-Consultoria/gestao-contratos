import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { ContractService, ApiContract } from '../../services/contract';
import { ContractServicesManagerComponent } from '../contract-services-manager/contract-services-manager';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { ModalService } from '../../services/modal.service';
import { jsPDF } from 'jspdf';

@Component({
  selector: 'app-routine-view-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ContractServicesManagerComponent, BreadcrumbComponent],
  templateUrl: './routine-view-page.html',
  styleUrls: ['./routine-view-page.css']
})
export class RoutineViewPageComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private contractService = inject(ContractService);
  private toastr = inject(ToastrService);
  private authService = inject(AuthService);
  private modalService = inject(ModalService);
  private subscriptions = new Subscription();

  contract: ApiContract | null = null;
  contractId: number = 0;
  isLoading = true;
  error = '';
  canEdit = false;
  currentUserId: number;
  isAdmin = false;

  constructor() {
    // Recuperar informações do usuário do localStorage
    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        this.currentUserId = user.id || 0;
        this.isAdmin = user.role === 'admin';
      } catch (error) {
        this.currentUserId = 0;
        this.isAdmin = false;
      }
    } else {
      this.currentUserId = 0;
      this.isAdmin = false;
    }
  }

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    if (!id) {
      this.error = 'ID da rotina não fornecido';
      this.isLoading = false;
      return;
    }

    this.contractId = parseInt(id, 10);
    this.loadContract();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  async loadContract() {
    this.isLoading = true;
    this.error = '';
    
    try {
      const response = await firstValueFrom(this.contractService.getContract(this.contractId));
      
      if (response && response.contract) {
        this.contract = response.contract;
        console.log('🔍 Routine data received:', this.contract);
        
        // Garantir que contract_services seja um array
        if (!this.contract.contract_services) {
          this.contract.contract_services = [];
        }
        
        // Garantir que assigned_users seja um array
        if (!this.contract.assigned_users) {
          this.contract.assigned_users = [];
        }
        
        this.checkEditPermissions();
      } else {
        this.error = 'Rotina não encontrada';
      }
    } catch (error: any) {
      console.error('❌ Error loading routine:', error);
      
      if (error?.status === 404) {
        this.error = 'Rotina não encontrada';
      } else if (error?.status === 500) {
        this.error = 'Erro interno do servidor';
      } else {
        this.error = 'Erro ao carregar rotina';
      }
    } finally {
      this.isLoading = false;
    }
  }

  checkEditPermissions() {
    if (!this.contract) return;

    if (this.isAdmin) {
      this.canEdit = true;
      return;
    }

    // Verificar se o usuário tem role de owner ou editor
    const userAssignment = (this.contract as any).assigned_users?.find(
      (assignment: any) => assignment.user.id === this.currentUserId
    );

    this.canEdit = userAssignment && ['owner', 'editor'].includes(userAssignment.role || '');
  }

  formatDate(date: string | null): string {
    return this.contractService.formatDate(date);
  }

  getStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'active': '#047857',
      'completed': '#0369a1',
      'cancelled': '#dc2626',
      'suspended': '#ca8a04'
    };
    return colorMap[status] || '#6b7280';
  }

  getStatusText(status: string): string {
    return this.contractService.getStatusText(status);
  }

  editRoutine() {
    if (this.contract) {
      // Redirecionar para edição de contrato, mas mantendo contexto de rotina
      this.router.navigate(['/home/contratos/editar', this.contract.id], { 
        queryParams: { returnTo: 'rotinas' } 
      });
    }
  }

  backToRoutines() {
    this.router.navigate(['/home/rotinas']);
  }

  getClientName(): string {
    if (!this.contract?.client) {
      return 'Cliente não informado';
    }
    
    const client = this.contract.client as any;
    
    // Check if client has a name property (from backend transformation)
    if (client.name) {
      return client.name;
    }
    
    // Fallback: try to get name from the client data structure directly
    // For PF (Pessoa Física)
    if (client.clients_pf && client.clients_pf.length > 0) {
      const pfName = client.clients_pf[0].full_name || 'Nome não informado';
      console.log('✅ PF name found:', pfName);
      return pfName;
    }
    
    // For PJ (Pessoa Jurídica)  
    if (client.clients_pj && client.clients_pj.length > 0) {
      const pjName = client.clients_pj[0].company_name || client.clients_pj[0].trade_name || 'Empresa não informada';
      console.log('✅ PJ name found:', pjName);
      return pjName;
    }
    
    // Final fallback
    console.log('❌ Client not identified');
    return 'Cliente não identificado';
  }

  getContractDuration(): string {
    if (!this.contract?.start_date || !this.contract?.end_date) return '-';
    
    const start = new Date(this.contract.start_date);
    const end = new Date(this.contract.end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays} dias`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} ${months === 1 ? 'mês' : 'meses'}`;
    } else {
      const years = Math.floor(diffDays / 365);
      const remainingMonths = Math.floor((diffDays % 365) / 30);
      if (remainingMonths > 0) {
        return `${years} ${years === 1 ? 'ano' : 'anos'} e ${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'}`;
      }
      return `${years} ${years === 1 ? 'ano' : 'anos'}`;
    }
  }

  getRoleText(role: string): string {
    const roleMap: { [key: string]: string } = {
      'owner': 'Proprietário',
      'editor': 'Editor',
      'viewer': 'Visualizador'
    };
    return roleMap[role] || role;
  }

  getStatusIcon(status: string): string {
    const iconMap: { [key: string]: string } = {
      'active': 'fas fa-play-circle',
      'completed': 'fas fa-check-circle',
      'cancelled': 'fas fa-times-circle', 
      'suspended': 'fas fa-pause-circle'
    };
    return iconMap[status] || 'fas fa-circle';
  }

  async generatePDF() {
    if (!this.contract) {
      this.modalService.showError('Nenhuma rotina carregada para gerar PDF.');
      return;
    }

    try {
      const doc = new jsPDF();
      
      // Configurações básicas
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 25;
      let currentY = margin;

      // === CABEÇALHO PRINCIPAL ===
      doc.setFillColor(0, 59, 43);
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('ROTINA DE TRABALHO', margin, 22);
      
      currentY = 50;
      doc.setTextColor(0, 0, 0);

      // === INFO BOX ===
      doc.setFillColor(248, 249, 250);
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 25, 3, 3, 'FD');
      
      currentY += 8;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Rotina: ${this.contract.contract_number}`, margin + 8, currentY);
      
      currentY += 7;
      doc.setFont('helvetica', 'normal');
      doc.text(`Data de geração: ${new Date().toLocaleDateString('pt-BR')}`, margin + 8, currentY);
      
      currentY += 7;
      doc.setTextColor(0, 59, 43);
      doc.setFont('helvetica', 'bold');
      doc.text(`STATUS: ${this.getStatusText(this.contract.status).toUpperCase()}`, margin + 8, currentY);
      doc.setTextColor(0, 0, 0);

      currentY += 25;

      // === DADOS DO CLIENTE ===
      this.addSectionHeader(doc, 'DADOS DO CLIENTE', currentY, margin, pageWidth);
      currentY += 15;

      const clientName = this.getClientName();
      if (clientName) {
        this.addInfoRow(doc, 'Cliente:', clientName, currentY, margin);
        currentY += 10;
      }

      // === DADOS DA ROTINA ===
      currentY += 10;
      this.addSectionHeader(doc, 'DADOS DA ROTINA', currentY, margin, pageWidth);
      currentY += 15;

      this.addInfoRow(doc, 'Tipo:', this.contract.type, currentY, margin);
      currentY += 10;
      
      this.addInfoRow(doc, 'Data de Início:', this.formatDate(this.contract.start_date), currentY, margin);
      currentY += 10;
      
      if (this.contract.end_date) {
        this.addInfoRow(doc, 'Data de Término:', this.formatDate(this.contract.end_date), currentY, margin);
        currentY += 10;
      }

      this.addInfoRow(doc, 'Duração:', this.getContractDuration(), currentY, margin);
      currentY += 10;

      // === SERVIÇOS/TAREFAS ===
      if (this.contract.contract_services && this.contract.contract_services.length > 0) {
        currentY += 10;
        this.addSectionHeader(doc, 'TAREFAS DA ROTINA', currentY, margin, pageWidth);
        currentY += 15;

        this.contract.contract_services.forEach((contractService, index) => {
          const serviceHeight = 30;

          if (currentY + serviceHeight > pageHeight - 40) {
            doc.addPage();
            currentY = margin + 20;
          }

          // Box para cada tarefa
          doc.setFillColor(252, 253, 254);
          doc.setDrawColor(229, 231, 235);
          doc.roundedRect(margin, currentY, pageWidth - (margin * 2), serviceHeight, 2, 2, 'FD');

          // Nome da tarefa
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 59, 43);
          doc.text(`${index + 1}. ${contractService.service.name}`, margin + 5, currentY + 8);
          
          // Status da tarefa
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.text(`Status: ${this.getTaskStatusText(contractService.status || 'not_started')}`, margin + 5, currentY + 15);
          
          // Data agendada se existir
          if (contractService.scheduled_start_date) {
            doc.text(`Agendado para: ${this.formatDate(contractService.scheduled_start_date)}`, margin + 5, currentY + 22);
          }
          
          currentY += serviceHeight + 8;
          doc.setTextColor(0, 0, 0);
        });
      }

      // === EQUIPE RESPONSÁVEL ===
      if (this.contract.assigned_users && this.contract.assigned_users.length > 0) {
        currentY += 10;
        this.addSectionHeader(doc, 'EQUIPE RESPONSÁVEL', currentY, margin, pageWidth);
        currentY += 15;

        this.contract.assigned_users.forEach((assignment) => {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(`• ${assignment.user.name} (${this.getRoleText(assignment.role)})`, margin + 5, currentY);
          currentY += 8;
        });
      }

      // === RODAPÉ ===
      currentY = pageHeight - 20;
      doc.setTextColor(128, 128, 128);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('NAUE Consultoria - Documento gerado automaticamente', margin, currentY);
      doc.text(`Página 1 de ${doc.getNumberOfPages()}`, pageWidth - margin - 20, currentY);
      
      // Salvar o PDF
      const fileName = `rotina-${this.contract.contract_number.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      doc.save(fileName);
      
      this.modalService.showSuccess('PDF gerado com sucesso!');

    } catch (error: any) {
      console.error('❌ Error generating PDF:', error);
      this.modalService.showError('Erro ao gerar o PDF da rotina.');
    }
  }

  private addSectionHeader(doc: any, title: string, y: number, margin: number, pageWidth: number): void {
    doc.setFillColor(240, 242, 245);
    doc.rect(margin, y - 3, pageWidth - (margin * 2), 12, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 59, 43);
    doc.text(title, margin + 5, y + 5);
    
    doc.setTextColor(0, 0, 0);
  }

  private addInfoRow(doc: any, label: string, value: string, y: number, margin: number): void {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin + 5, y);
    
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 35, y);
  }

  getTaskStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'not_started': 'Não iniciada',
      'scheduled': 'Agendada',
      'in_progress': 'Em andamento',
      'completed': 'Concluída'
    };
    return statusMap[status] || status;
  }

  formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  canEditRoutine(): boolean {
    return this.canEdit;
  }

  onServiceUpdated() {
    // Recarregar a rotina quando um serviço for atualizado
    console.log('🔄 Service updated, reloading routine...');
    if (this.contract && this.contract.id) {
      this.contractId = this.contract.id;
      this.loadContract();
    } else {
      console.error('❌ Cannot reload: no routine or routine ID');
    }
  }
}