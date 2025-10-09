import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb.component';
import { BreadcrumbService } from '../../services/breadcrumb.service';
import { VagaService } from '../../services/vaga.service';
import { ClientService } from '../../services/client.service';
import { UserService } from '../../services/user.service';
import { ContractService } from '../../services/contract.service';
import { CurrencyMaskDirective } from '../../directives/currency-mask.directive';

@Component({
  selector: 'app-nova-vaga',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, BreadcrumbComponent, CurrencyMaskDirective],
  templateUrl: './nova-vaga.component.html',
  styleUrl: './nova-vaga.component.css'
})
export class NovaVagaComponent implements OnInit {
  vagaForm: FormGroup;
  isSubmitting = false;
  showSuccessMessage = false;

  // Lists for dropdowns
  clientes: any[] = [];
  usuarios: any[] = [];
  contratos: any[] = [];

  tipoCargoOptions = [
    { value: 'administrativo', label: 'Administrativo' },
    { value: 'comercial', label: 'Comercial' },
    { value: 'estagio', label: 'Estágio' },
    { value: 'gestao', label: 'Gestão' },
    { value: 'operacional', label: 'Operacional' },
    { value: 'jovem_aprendiz', label: 'Jovem Aprendiz' }
  ];

  tipoAberturaOptions = [
    { value: 'nova', label: 'Nova Vaga' },
    { value: 'reposicao', label: 'Reposição' }
  ];

  statusOptions = [
    { value: 'aberta', label: 'Aberta' },
    { value: 'divulgacao_prospec', label: 'Divulgação/Prospecção' },
    { value: 'entrevista_nc', label: 'Entrevista NC' },
    { value: 'entrevista_empresa', label: 'Entrevista Empresa' },
    { value: 'testes', label: 'Testes' },
    { value: 'fechada', label: 'Fechada' },
    { value: 'fechada_rep', label: 'Fechada/Reposição' },
    { value: 'cancelada_cliente', label: 'Cancelada pelo Cliente' },
    { value: 'standby', label: 'Standby' },
    { value: 'nao_cobrada', label: 'Não Cobrada' },
    { value: 'encerramento_cont', label: 'Encerramento de Contrato' }
  ];

  fonteRecrutamentoOptions = [
    { value: 'catho', label: 'Catho' },
    { value: 'email', label: 'E-mail' },
    { value: 'indicacao', label: 'Indicação' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'trafego', label: 'Tráfego' },
    { value: 'outros', label: 'Outros' }
  ];

  statusEntrevistaOptions = [
    { value: '', label: 'Nenhum' },
    { value: 'realizada', label: 'Realizada' },
    { value: 'desistiu', label: 'Desistiu' },
    { value: 'remarcou', label: 'Remarcou' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private breadcrumbService: BreadcrumbService,
    private vagaService: VagaService,
    private clientService: ClientService,
    private userService: UserService,
    private contractService: ContractService
  ) {
    this.vagaForm = this.fb.group({
      clienteId: ['', Validators.required],
      contratoId: [''],
      usuarioId: ['', Validators.required],
      cargo: ['', Validators.required],
      tipoCargo: ['', Validators.required],
      tipoAbertura: ['', Validators.required],
      status: ['aberta', Validators.required],
      salario: ['', [Validators.required, Validators.min(0)]],
      dataAbertura: [this.getToday(), Validators.required],
      dataFechamentoCancelamento: [''],
      observacoes: [''],
      candidatoAprovado: [''],
      emailCandidato: [''],
      telefoneCandidato: [''],
      porcentagemFaturamento: [100, [Validators.min(0), Validators.max(200)]],
      valorFaturamento: [{ value: 0, disabled: true }],
      sigilosa: [false],
      impostoEstado: [0, [Validators.min(0), Validators.max(100)]]
    });
  }

  ngOnInit() {
    this.setBreadcrumb();
    this.loadClientes();
    this.loadUsuarios();
    this.setupFormListeners();
    this.setupFaturamentoCalculation();
  }

  private setBreadcrumb() {
    this.breadcrumbService.setBreadcrumbs([
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Recrutamento e Seleção', url: '/home/recrutamento-selecao' },
      { label: 'Nova Vaga' }
    ]);
  }

  loadClientes() {
    this.clientService.getAll().subscribe({
      next: (response: any) => {
        // O backend retorna { success: true, clients: [], total: number }
        const clientsList = response.clients || response || [];
        this.clientes = clientsList.map((client: any) => ({
          id: client.id,
          nome: client.name ||
                client.company_name ||
                client.trade_name ||
                client.full_name ||
                'Cliente sem nome'
        }));
        console.log('Clientes carregados:', this.clientes);
      },
      error: (error: any) => {
        console.error('Erro ao carregar clientes:', error);
        this.clientes = [];
      }
    });
  }

  loadUsuarios() {
    this.userService.getAll().subscribe({
      next: (response: any) => {
        // O backend retorna { users: [] }
        const usersList = response.users || response || [];
        this.usuarios = usersList.map((user: any) => ({
          id: user.id,
          nome: user.name
        }));
        console.log('Usuários carregados:', this.usuarios);
      },
      error: (error: any) => {
        console.error('Erro ao carregar usuários:', error);
        this.usuarios = [];
      }
    });
  }

  setupFormListeners() {
    // Listener para o status - limpa campos de fechamento se não estiver fechado
    this.vagaForm.get('status')?.valueChanges.subscribe(status => {
      const isFechado = ['fechada', 'fechada_rep', 'cancelada_cliente'].includes(status);

      if (!isFechado) {
        this.vagaForm.patchValue({
          dataFechamentoCancelamento: '',
          candidatoAprovado: '',
          emailCandidato: '',
          telefoneCandidato: ''
        });
      }
    });

    // Listener para o cliente - carrega contratos quando cliente mudar
    this.vagaForm.get('clienteId')?.valueChanges.subscribe(clientId => {
      if (clientId) {
        this.loadContratos(clientId);
      } else {
        this.contratos = [];
        this.vagaForm.patchValue({ contratoId: '' });
      }
    });

    // Removido o listener do candidato aprovado - campos aparecem junto com status fechada
  }

  loadContratos(clientId: number) {
    this.contractService.getContractsByClient(clientId).subscribe({
      next: (response: any) => {
        this.contratos = response.contracts || [];
        console.log('Contratos carregados:', this.contratos);
      },
      error: (error: any) => {
        console.error('Erro ao carregar contratos:', error);
        this.contratos = [];
      }
    });
  }

  setupFaturamentoCalculation() {
    // Atualizar valor de faturamento quando salário ou porcentagem mudar
    this.vagaForm.get('salario')?.valueChanges.subscribe(() => this.calculateFaturamento());
    this.vagaForm.get('porcentagemFaturamento')?.valueChanges.subscribe(() => this.calculateFaturamento());
  }

  calculateFaturamento() {
    const salario = this.vagaForm.get('salario')?.value || 0;
    const porcentagem = this.vagaForm.get('porcentagemFaturamento')?.value || 100;
    const valorFaturamento = salario * (porcentagem / 100);

    this.vagaForm.get('valorFaturamento')?.setValue(valorFaturamento, { emitEvent: false });
  }

  getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  onSubmit() {
    if (this.vagaForm.valid) {
      this.isSubmitting = true;

      // Preparar dados para envio
      const vagaData = {
        client_id: this.vagaForm.value.clienteId,
        contract_id: this.vagaForm.value.contratoId || null,
        user_id: this.vagaForm.value.usuarioId,
        cargo: this.vagaForm.value.cargo,
        tipo_cargo: this.vagaForm.value.tipoCargo,
        tipo_abertura: this.vagaForm.value.tipoAbertura,
        status: this.vagaForm.value.status,
        salario: this.vagaForm.value.salario,
        data_abertura: this.vagaForm.value.dataAbertura,
        data_fechamento_cancelamento: this.vagaForm.value.dataFechamentoCancelamento || null,
        observacoes: this.vagaForm.value.observacoes || null,
        porcentagem_faturamento: this.vagaForm.value.porcentagemFaturamento || 100,
        sigilosa: this.vagaForm.value.sigilosa || false,
        imposto_estado: this.vagaForm.value.impostoEstado || 0
      };

      // Enviar para o backend
      this.vagaService.create(vagaData).subscribe({
        next: (response) => {
          console.log('Vaga criada com sucesso:', response);
          this.showSuccessMessage = true;

          // Redirecionar após 2 segundos
          setTimeout(() => {
            this.router.navigate(['/home/recrutamento-selecao']);
          }, 2000);
        },
        error: (error: any) => {
          console.error('Erro ao criar vaga:', error);
          this.isSubmitting = false;
          alert('Erro ao criar vaga. Por favor, tente novamente.');
        }
      });
    } else {
      // Marcar todos os campos como touched para mostrar erros
      Object.keys(this.vagaForm.controls).forEach(key => {
        const control = this.vagaForm.get(key);
        control?.markAsTouched();
      });
    }
  }

  onCancel() {
    if (confirm('Tem certeza que deseja cancelar? Todas as alterações serão perdidas.')) {
      this.router.navigate(['/home/recrutamento-selecao']);
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.vagaForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getErrorMessage(fieldName: string): string {
    const field = this.vagaForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) {
        return 'Este campo é obrigatório';
      }
      if (field.errors['min']) {
        return 'O valor deve ser maior que zero';
      }
    }
    return '';
  }

  calcularValorFaturamento(): number {
    const salario = this.vagaForm.get('salario')?.value || 0;
    const porcentagem = this.vagaForm.get('porcentagemFaturamento')?.value || 100;
    return salario * (porcentagem / 100);
  }
}