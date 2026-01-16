import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb.component';
import { BreadcrumbService } from '../../services/breadcrumb.service';
import { VagaService } from '../../services/vaga.service';
import { ClientService } from '../../services/client.service';
import { UserService } from '../../services/user.service';
import { CurrencyMaskDirective } from '../../directives/currency-mask.directive';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-editar-vaga',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, BreadcrumbComponent, CurrencyMaskDirective],
  templateUrl: './editar-vaga.component.html',
  styleUrl: './editar-vaga.component.css'
})
export class EditarVagaComponent implements OnInit {
  vagaForm: FormGroup;
  isSubmitting = false;
  showSuccessMessage = false;
  isLoading = true;
  vagaId: number;

  // Lists for dropdowns
  clientes: any[] = [];
  usuarios: any[] = [];

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

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private breadcrumbService: BreadcrumbService,
    private vagaService: VagaService,
    private clientService: ClientService,
    private userService: UserService
  ) {
    this.vagaId = 0;
    this.vagaForm = this.fb.group({
      clienteId: ['', Validators.required],
      usuarioId: ['', Validators.required],
      cargo: ['', Validators.required],
      tipoCargo: ['', Validators.required],
      tipoAbertura: ['', Validators.required],
      status: ['aberta', Validators.required],
      fonteRecrutamento: ['', Validators.required],
      salario: [''],
      pretensaoSalarial: [''],
      dataAbertura: ['', Validators.required],
      dataFechamentoCancelamento: [''],
      observacoes: [''],
      porcentagemFaturamento: [100, [Validators.min(0), Validators.max(200)]],
      valorFaturamento: [{ value: 0, disabled: true }],
      sigilosa: [false],
      impostoEstado: [0, [Validators.min(0), Validators.max(100)]]
    });
  }

  async ngOnInit() {
    this.vagaId = Number(this.route.snapshot.paramMap.get('id'));

    this.setBreadcrumb();
    this.loadClientes();
    this.loadUsuarios();
    this.setupFormListeners();
    this.setupFaturamentoCalculation();

    await this.loadVagaData();
  }

  private setBreadcrumb() {
    this.breadcrumbService.setBreadcrumbs([
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Recrutamento e Seleção', url: '/home/recrutamento-selecao' },
      { label: 'Editar Vaga' }
    ]);
  }

  async loadVagaData() {
    try {
      this.isLoading = true;
      const vagaData = await firstValueFrom(this.vagaService.getById(this.vagaId));

      // Populate form with existing data
      this.vagaForm.patchValue({
        clienteId: vagaData.client_id,
        usuarioId: vagaData.user_id,
        cargo: vagaData.cargo,
        tipoCargo: vagaData.tipo_cargo,
        tipoAbertura: vagaData.tipo_abertura,
        status: vagaData.status,
        fonteRecrutamento: vagaData.fonte_recrutamento,
        salario: vagaData.salario,
        pretensaoSalarial: vagaData.pretensao_salarial || '',
        dataAbertura: vagaData.data_abertura,
        dataFechamentoCancelamento: vagaData.data_fechamento_cancelamento || '',
        observacoes: vagaData.observacoes || '',
        porcentagemFaturamento: vagaData.porcentagem_faturamento || 100,
        sigilosa: vagaData.sigilosa || false,
        impostoEstado: vagaData.imposto_estado || 0
      });

      this.isLoading = false;
    } catch (error) {
      console.error('Erro ao carregar dados da vaga:', error);
      alert('Erro ao carregar dados da vaga');
      this.router.navigate(['/home/recrutamento-selecao']);
    }
  }

  loadClientes() {
    this.clientService.getAll().subscribe({
      next: (response: any) => {
        const clientsList = response.clients || response || [];
        this.clientes = clientsList.map((client: any) => ({
          id: client.id,
          nome: client.name ||
                client.company_name ||
                client.trade_name ||
                client.full_name ||
                'Cliente sem nome'
        }));
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
        const usersList = response.users || response || [];
        this.usuarios = usersList.map((user: any) => ({
          id: user.id,
          nome: user.name
        }));
      },
      error: (error: any) => {
        console.error('Erro ao carregar usuários:', error);
        this.usuarios = [];
      }
    });
  }

  setupFormListeners() {
    this.vagaForm.get('status')?.valueChanges.subscribe(status => {
      const isFechado = ['fechada', 'fechada_rep', 'cancelada_cliente'].includes(status);

      if (!isFechado) {
        this.vagaForm.patchValue({
          dataFechamentoCancelamento: ''
        });
      }
    });
  }

  setupFaturamentoCalculation() {
    this.vagaForm.get('salario')?.valueChanges.subscribe(() => this.calculateFaturamento());
    this.vagaForm.get('porcentagemFaturamento')?.valueChanges.subscribe(() => this.calculateFaturamento());
  }

  calculateFaturamento() {
    const salario = this.vagaForm.get('salario')?.value || 0;
    const porcentagem = this.vagaForm.get('porcentagemFaturamento')?.value || 100;
    const valorFaturamento = salario * (porcentagem / 100);

    this.vagaForm.get('valorFaturamento')?.setValue(valorFaturamento, { emitEvent: false });
  }

  async onSubmit() {
    if (this.vagaForm.valid) {
      this.isSubmitting = true;

      const vagaData: any = {
        client_id: this.vagaForm.value.clienteId,
        user_id: this.vagaForm.value.usuarioId,
        cargo: this.vagaForm.value.cargo,
        tipo_cargo: this.vagaForm.value.tipoCargo,
        tipo_abertura: this.vagaForm.value.tipoAbertura,
        status: this.vagaForm.value.status,
        fonte_recrutamento: this.vagaForm.value.fonteRecrutamento,
        salario: this.vagaForm.value.salario ? parseFloat(this.vagaForm.value.salario) : null,
        pretensao_salarial: this.vagaForm.value.pretensaoSalarial ? parseFloat(this.vagaForm.value.pretensaoSalarial) : null,
        data_abertura: this.vagaForm.value.dataAbertura,
        data_fechamento_cancelamento: this.vagaForm.value.dataFechamentoCancelamento || null,
        observacoes: this.vagaForm.value.observacoes || null,
        porcentagem_faturamento: this.vagaForm.value.porcentagemFaturamento ? parseFloat(this.vagaForm.value.porcentagemFaturamento) : 100,
        sigilosa: this.vagaForm.value.sigilosa || false,
        imposto_estado: this.vagaForm.value.impostoEstado ? parseFloat(this.vagaForm.value.impostoEstado) : 0
      };

      try {
        await firstValueFrom(this.vagaService.update(this.vagaId, vagaData));
        this.showSuccessMessage = true;

        setTimeout(() => {
          this.router.navigate(['/home/recrutamento-selecao']);
        }, 2000);
      } catch (error: any) {
        console.error('Erro ao atualizar vaga:', error);
        this.isSubmitting = false;
        alert('Erro ao atualizar vaga. Por favor, tente novamente.');
      }
    } else {
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
