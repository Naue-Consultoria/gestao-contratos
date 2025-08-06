import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ContractService, ApiContract } from '../../services/contract';
import { ContractServicesManagerComponent } from '../contract-services-manager/contract-services-manager';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-contract-view-page',
  standalone: true,
  imports: [CommonModule, ContractServicesManagerComponent],
  templateUrl: './contract-view-page.html',
  styleUrls: ['./contract-view-page.css']
})
export class ContractViewPageComponent implements OnInit {
  contract: ApiContract | null = null;
  isLoading = true;
  canEdit = false;
  currentUserId: number;
  isAdmin = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private contractService: ContractService,
    private toastr: ToastrService,
    private authService: AuthService
  ) {
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
    const contractId = this.route.snapshot.paramMap.get('id');
    if (contractId) {
      this.loadContract(parseInt(contractId));
    }
  }

  loadContract(contractId: number) {
    this.isLoading = true;
    this.contractService.getContract(contractId).subscribe({
      next: (response) => {
        console.log('📄 Contract received from API:', response.contract);
        console.log('👤 Client data:', response.contract?.client);
        this.contract = response.contract;
        this.checkEditPermissions();
        this.isLoading = false;
      },
      error: (error) => {
        this.toastr.error('Erro ao carregar contrato');
        this.isLoading = false;
        this.router.navigate(['/home/contracts']);
      }
    });
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

  formatValue(value: number): string {
    return this.contractService.formatValue(value);
  }

  formatDate(date: string | null): string {
    return this.contractService.formatDate(date);
  }

  getStatusColor(status: string): string {
    return this.contractService.getStatusColor(status);
  }

  getStatusText(status: string): string {
    return this.contractService.getStatusText(status);
  }

  getTypeIcon(type: string): string {
    return this.contractService.getTypeIcon(type);
  }

  goBack() {
    this.router.navigate(['/home/contracts']);
  }

  editContract() {
    if (this.contract) {
      this.router.navigate(['/home/contracts/edit', this.contract.id]);
    }
  }

  getClientName(): string {
    console.log('🏷️ Getting client name for contract:', this.contract?.id);
    console.log('🏷️ Client data available:', this.contract?.client);
    
    if (!this.contract?.client) {
      console.log('❌ No client data found');
      return 'Cliente não informado';
    }
    
    const client = this.contract.client as any;
    
    // Check if client has a name property (from backend transformation)
    if (client.name) {
      console.log('✅ Client name found:', client.name);
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

  onServiceUpdated() {
    // Recarregar o contrato quando um serviço for atualizado
    if (this.contract) {
      this.loadContract(this.contract.id);
    }
  }
}