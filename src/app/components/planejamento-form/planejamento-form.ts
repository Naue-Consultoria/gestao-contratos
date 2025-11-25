import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { PlanejamentoEstrategicoService, PlanejamentoEstrategico, CreatePlanejamentoRequest, UpdatePlanejamentoRequest } from '../../services/planejamento-estrategico.service';
import { ClientService } from '../../services/client';
import { ContractService } from '../../services/contract';
import { AuthService } from '../../services/auth';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-planejamento-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BreadcrumbComponent
  ],
  templateUrl: './planejamento-form.html',
  styleUrls: ['./planejamento-form.css'],
})
export class PlanejamentoFormComponent implements OnInit, OnDestroy {

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private planejamentoService = inject(PlanejamentoEstrategicoService);
  private clientService = inject(ClientService);
  private contractService = inject(ContractService);
  public authService = inject(AuthService);
  private toastr = inject(ToastrService);

  isEditMode = false;
  planejamentoId: number | null = null;
  isLoading = true;
  isSaving = false;
  error = '';

  // Form data
  formData = {
    client_id: 0,
    contract_id: 0,
    titulo: '',
    descricao: '',
    data_inicio: '',
    data_fim: '',
    prazo_preenchimento: '',
    status: 'ativo' as 'ativo' | 'concluido' | 'cancelado'
  };

  // Dropdowns data
  clients: any[] = [];
  contracts: any[] = [];
  filteredContracts: any[] = [];

  // Departamentos
  departamentos: {
    nome_departamento: string;
    error?: string;
  }[] = [];

  formSubmitted = false;

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.planejamentoId = +params['id'];
        this.loadPlanejamento();
      } else {
        this.isLoading = false;
      }
    });

    this.loadClients();
    this.loadContracts();
  }

  ngOnDestroy(): void {
    // Cleanup
  }

  async loadClients(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.clientService.getClients({ is_active: true })
      );

      if (response.clients) {
        this.clients = response.clients
          .map((client: any) => ({
            id: client.id,
            name: (client.name || client.full_name || client.company_name || client.trade_name || 'N/A').toUpperCase(),
            email: client.email
          }))
          .sort((a: any, b: any) => a.name.localeCompare(b.name, 'pt-BR'));
      }
    } catch (err: any) {
      console.error('Erro ao carregar clientes:', err);
      this.toastr.error('Erro ao carregar clientes', 'Erro');
    }
  }

  async loadContracts(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.contractService.getContracts()
      );

      if (response.contracts) {
        this.contracts = response.contracts.map((contract: any) => ({
          id: contract.id,
          contract_number: contract.contract_number,
          client_id: contract.client_id,
          type: contract.type,
          status: contract.status
        }));

        this.filterContractsByClient();
      }
    } catch (err: any) {
      console.error('Erro ao carregar contratos:', err);
      this.toastr.error('Erro ao carregar contratos', 'Erro');
    }
  }

  async loadPlanejamento(): Promise<void> {
    if (!this.planejamentoId) return;

    this.isLoading = true;
    this.error = '';

    try {
      const response = await firstValueFrom(
        this.planejamentoService.obterPlanejamento(this.planejamentoId)
      );

      if (response.success && response.data) {
        const planejamento = response.data;

        this.formData = {
          client_id: planejamento.client_id,
          contract_id: planejamento.contract_id,
          titulo: planejamento.titulo,
          descricao: planejamento.descricao || '',
          data_inicio: planejamento.data_inicio ? this.formatDateForInput(planejamento.data_inicio) : '',
          data_fim: planejamento.data_fim ? this.formatDateForInput(planejamento.data_fim) : '',
          prazo_preenchimento: planejamento.prazo_preenchimento ? this.formatDateTimeForInput(planejamento.prazo_preenchimento) : '',
          status: planejamento.status
        };

        this.filterContractsByClient();
      }
    } catch (err: any) {
      console.error('Erro ao carregar planejamento:', err);
      this.error = 'Não foi possível carregar o planejamento.';
      this.toastr.error('Erro ao carregar planejamento', 'Erro');
    } finally {
      this.isLoading = false;
    }
  }

  onClientChange(): void {
    this.formData.client_id = Number(this.formData.client_id);
    this.formData.contract_id = 0;
    this.filterContractsByClient();
  }

  filterContractsByClient(): void {
    if (this.formData.client_id) {
      this.filteredContracts = this.contracts.filter(
        contract => Number(contract.client_id) === Number(this.formData.client_id) && contract.status === 'active'
      );
    } else {
      this.filteredContracts = [];
    }
  }

  async onSubmit(): Promise<void> {
    this.formSubmitted = true;

    if (!this.validateForm()) return;

    this.isSaving = true;

    try {
      if (this.isEditMode && this.planejamentoId) {
        // Atualizar planejamento existente (não altera departamentos)
        const updateData: UpdatePlanejamentoRequest = {
          titulo: this.formData.titulo,
          descricao: this.formData.descricao || undefined,
          status: this.formData.status,
          data_inicio: this.formData.data_inicio || undefined,
          data_fim: this.formData.data_fim || undefined,
          prazo_preenchimento: this.formData.prazo_preenchimento || undefined
        };

        const response = await firstValueFrom(
          this.planejamentoService.atualizarPlanejamento(this.planejamentoId, updateData)
        );

        if (response.success) {
          this.toastr.success('Planejamento atualizado com sucesso', 'Sucesso');
          this.router.navigate(['/home/planejamento-estrategico/visualizar', this.planejamentoId]);
        }
      } else {
        // Criar novo planejamento com departamentos
        const response = await firstValueFrom(
          this.planejamentoService.criarPlanejamentoComDepartamentos({
            planejamento: {
              client_id: this.formData.client_id,
              contract_id: this.formData.contract_id,
              titulo: this.formData.titulo,
              descricao: this.formData.descricao || undefined,
              data_inicio: this.formData.data_inicio || undefined,
              data_fim: this.formData.data_fim || undefined,
              prazo_preenchimento: this.formData.prazo_preenchimento || undefined
            },
            departamentos: this.departamentos.map(d => ({
              nome_departamento: d.nome_departamento
            }))
          })
        );

        if (response.success) {
          this.toastr.success('Planejamento criado com sucesso', 'Sucesso');
          this.router.navigate(['/home/planejamento-estrategico/visualizar', response.data.id]);
        }
      }
    } catch (err: any) {
      console.error('Erro ao salvar planejamento:', err);
      this.toastr.error(
        err.error?.message || 'Erro ao salvar planejamento',
        'Erro'
      );
    } finally {
      this.isSaving = false;
    }
  }

  validateForm(): boolean {
    if (!this.formData.titulo.trim()) {
      this.toastr.warning('Por favor, informe o título', 'Atenção');
      return false;
    }

    if (!this.isEditMode) {
      if (!this.formData.client_id) {
        this.toastr.warning('Por favor, selecione um cliente', 'Atenção');
        return false;
      }

      if (!this.formData.contract_id) {
        this.toastr.warning('Por favor, selecione um contrato', 'Atenção');
        return false;
      }

      // Validar departamentos
      if (this.departamentos.length === 0) {
        this.toastr.warning('Adicione pelo menos um departamento', 'Atenção');
        return false;
      }

      let hasError = false;
      this.departamentos.forEach(dep => {
        delete dep.error;
        if (!dep.nome_departamento.trim()) {
          dep.error = 'Nome do departamento é obrigatório';
          hasError = true;
        }
      });

      if (hasError) {
        this.toastr.warning('Preencha todos os nomes dos departamentos', 'Atenção');
        return false;
      }
    }

    // Validar datas
    if (this.formData.data_inicio && this.formData.data_fim) {
      const inicio = new Date(this.formData.data_inicio);
      const fim = new Date(this.formData.data_fim);

      if (fim < inicio) {
        this.toastr.warning('A data de término deve ser posterior à data de início', 'Atenção');
        return false;
      }
    }

    return true;
  }

  // Funções para gerenciar departamentos
  addDepartamento(): void {
    this.departamentos.push({
      nome_departamento: ''
    });
  }

  removeDepartamento(index: number): void {
    this.departamentos.splice(index, 1);
  }

  cancel(): void {
    if (this.isEditMode && this.planejamentoId) {
      this.router.navigate(['/home/planejamento-estrategico/visualizar', this.planejamentoId]);
    } else {
      this.router.navigate(['/home/planejamento-estrategico']);
    }
  }

  formatDateForInput(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  }

  formatDateTimeForInput(dateTimeString: string): string {
    const date = new Date(dateTimeString);
    return date.toISOString().slice(0, 16);
  }
}
