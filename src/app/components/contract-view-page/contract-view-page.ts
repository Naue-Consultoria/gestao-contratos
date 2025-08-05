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
    this.currentUserId = parseInt(localStorage.getItem('userId') || '0');
    this.isAdmin = localStorage.getItem('userRole') === 'admin';
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

  onServiceUpdated() {
    // Recarregar o contrato quando um serviço for atualizado
    if (this.contract) {
      this.loadContract(this.contract.id);
    }
  }
}