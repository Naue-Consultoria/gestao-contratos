import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { MentoriaService, Mentoria } from '../../services/mentoria.service';
import { ClientService } from '../../services/client';
import { ContractService } from '../../services/contract';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { BreadcrumbService } from '../../services/breadcrumb.service';

@Component({
  selector: 'app-mentoria-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, BreadcrumbComponent],
  templateUrl: './mentoria-edit.html',
  styleUrl: './mentoria-edit.css'
})
export class MentoriaEdit implements OnInit {
  mentoriaForm!: FormGroup;
  mentoriaId: number | null = null;
  mentoria: Mentoria | null = null;

  clientes: any[] = [];
  contratos: any[] = [];
  contratosFiltrados: any[] = [];

  isLoading = false;
  isSaving = false;
  loadingClientes = false;
  loadingContratos = false;

  // Upload de foto
  isUploadingFoto = false;
  fotoSelecionada: File | null = null;
  fotoSelecionadaPreview: string | null = null;
  fotoAtualUrl: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private mentoriaService: MentoriaService,
    private clientService: ClientService,
    private contractService: ContractService,
    private toastr: ToastrService,
    private breadcrumbService: BreadcrumbService
  ) {}

  async ngOnInit(): Promise<void> {
    this.initForm();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.mentoriaId = parseInt(id, 10);
      // Carregar dados primeiro, depois a mentoria
      await this.carregarDados();
      this.carregarMentoria();
    } else {
      this.router.navigate(['/home/mentorias']);
    }
  }

  private initForm(): void {
    this.mentoriaForm = this.fb.group({
      client_id: ['', Validators.required],
      contract_id: ['', Validators.required],
      status: ['ativa', Validators.required],
      mentorado_data_nascimento: [''], // Data de nascimento do mentorado (opcional)
      mentorado_profissao: [''], // Profissão do mentorado (opcional)
      mentorado_email: [''] // Email do mentorado (opcional)
    });
  }

  private async carregarDados(): Promise<void> {
    await Promise.all([
      this.carregarClientesPromise(),
      this.carregarContratosPromise()
    ]);
  }

  private carregarClientesPromise(): Promise<void> {
    return new Promise((resolve) => {
      this.loadingClientes = true;
      this.mentoriaForm.get('client_id')?.disable();

      this.clientService.getClients().subscribe({
        next: (response) => {
          this.clientes = response.clients || [];

          // Ordenar clientes alfabeticamente
          this.clientes.sort((a, b) => {
            const nomeA = this.getClienteNome(a);
            const nomeB = this.getClienteNome(b);
            return nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' });
          });

          this.loadingClientes = false;
          this.mentoriaForm.get('client_id')?.enable();
          resolve();
        },
        error: (error) => {
          console.error('Erro ao carregar clientes:', error);
          this.toastr.error('Erro ao carregar clientes');
          this.loadingClientes = false;
          this.mentoriaForm.get('client_id')?.enable();
          resolve();
        }
      });
    });
  }

  private carregarContratosPromise(): Promise<void> {
    return new Promise((resolve) => {
      this.loadingContratos = true;
      this.mentoriaForm.get('contract_id')?.disable();

      this.contractService.getContracts().subscribe({
        next: (response) => {
          this.contratos = response.contracts || [];
          this.loadingContratos = false;
          this.mentoriaForm.get('contract_id')?.enable();
          resolve();
        },
        error: (error) => {
          console.error('Erro ao carregar contratos:', error);
          this.toastr.error('Erro ao carregar contratos');
          this.loadingContratos = false;
          this.mentoriaForm.get('contract_id')?.enable();
          resolve();
        }
      });
    });
  }

  private carregarMentoria(): void {
    if (!this.mentoriaId) return;

    this.isLoading = true;
    this.mentoriaService.obterMentoria(this.mentoriaId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.mentoria = response.data;
          this.preencherFormulario();
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

  private preencherFormulario(): void {
    if (!this.mentoria) return;

    console.log('🔍 Preenchendo formulário:', this.mentoria);
    console.log('📋 Contratos disponíveis:', this.contratos.length);

    // Filtrar contratos do cliente PRIMEIRO
    this.onClienteChange(this.mentoria.client_id);

    console.log('📋 Contratos filtrados:', this.contratosFiltrados.length);
    console.log('📋 Contract_id da mentoria:', this.mentoria.contract_id);

    // Depois preencher o formulário com os valores
    this.mentoriaForm.patchValue({
      client_id: this.mentoria.client_id,
      contract_id: this.mentoria.contract_id,
      status: this.mentoria.status,
      mentorado_data_nascimento: this.mentoria.mentorado_data_nascimento || '',
      mentorado_profissao: this.mentoria.mentorado_profissao || '',
      mentorado_email: this.mentoria.mentorado_email || ''
    });

    // Carregar foto atual da mentoria se existir
    if (this.mentoria.foto_url) {
      this.fotoAtualUrl = this.mentoria.foto_url;
    }

    console.log('✅ Formulário preenchido:', this.mentoriaForm.value);
  }

  onClienteChange(clientId: number): void {
    if (!clientId) {
      this.contratosFiltrados = [];
      this.mentoriaForm.patchValue({ contract_id: '' });
      return;
    }

    this.contratosFiltrados = this.contratos.filter(c => c.client_id === clientId);
  }

  getClienteNome(cliente: any): string {
    if (!cliente) return '';

    // Tenta pegar do formato com relacionamento (clients_pj/clients_pf)
    if (cliente.clients_pj) {
      return cliente.clients_pj.trade_name || cliente.clients_pj.company_name;
    }
    if (cliente.clients_pf) {
      return cliente.clients_pf.full_name;
    }

    // Tenta pegar do formato direto (trade_name, company_name, full_name)
    return cliente.trade_name ||
           cliente.company_name ||
           cliente.full_name ||
           'Cliente sem nome';
  }

  async salvar(): Promise<void> {
    if (this.mentoriaForm.invalid || !this.mentoriaId) {
      this.toastr.warning('Preencha todos os campos obrigatórios');
      return;
    }

    this.isSaving = true;

    try {
      // 1. Atualizar dados da mentoria
      const dados = this.mentoriaForm.getRawValue();
      const response = await this.mentoriaService.atualizarMentoria(this.mentoriaId, dados).toPromise();

      if (response?.success) {
        // 2. Se houver foto selecionada, fazer upload para a mentoria
        if (this.fotoSelecionada) {
          await this.uploadFotoMentoria();
        }

        this.toastr.success('Mentoria atualizada com sucesso!');
        this.router.navigate(['/home/mentorias/visualizar', this.mentoriaId]);
      }
    } catch (error: any) {
      console.error('Erro ao atualizar mentoria:', error);
      const errorMessage = error?.error?.message || error?.message || 'Erro desconhecido';
      this.toastr.error(`Erro ao atualizar mentoria: ${errorMessage}`);
    } finally {
      this.isSaving = false;
    }
  }

  cancelar(): void {
    if (this.mentoriaId) {
      this.router.navigate(['/home/mentorias/visualizar', this.mentoriaId]);
    } else {
      this.router.navigate(['/home/mentorias']);
    }
  }

  onFotoSelecionada(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.toastr.error('Apenas imagens são permitidas (JPEG, PNG, GIF, WEBP)');
      return;
    }

    // Validar tamanho (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      this.toastr.error('A imagem deve ter no máximo 10MB');
      return;
    }

    // Guardar arquivo e criar preview
    this.fotoSelecionada = file;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.fotoSelecionadaPreview = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  removerFotoSelecionada(): void {
    this.fotoSelecionada = null;
    this.fotoSelecionadaPreview = null;
  }

  async uploadFotoMentoria(): Promise<void> {
    if (!this.fotoSelecionada || !this.mentoriaId) return;

    this.isUploadingFoto = true;
    const formData = new FormData();
    formData.append('foto', this.fotoSelecionada);

    try {
      const response: any = await this.mentoriaService.uploadFotoMentoria(this.mentoriaId, formData).toPromise();

      if (response?.success) {
        this.toastr.success('Foto da mentoria atualizada!');
        // Atualizar a URL da foto
        if (response.data?.foto?.url) {
          this.fotoAtualUrl = response.data.foto.url;
        }
      }
    } catch (error: any) {
      console.error('Erro ao fazer upload da foto:', error);
      this.toastr.error('Erro ao enviar foto da mentoria');
    } finally {
      this.isUploadingFoto = false;
    }
  }

  async removerFotoAtual(): Promise<void> {
    if (!this.mentoriaId) return;

    if (!confirm('Deseja realmente remover a foto da mentoria?')) {
      return;
    }

    this.isUploadingFoto = true;

    try {
      // Atualizar mentoria removendo a URL da foto
      const response = await this.mentoriaService.atualizarMentoria(this.mentoriaId, {
        foto_url: undefined
      }).toPromise();

      if (response?.success) {
        this.fotoAtualUrl = null;
        this.toastr.success('Foto removida com sucesso!');
      }
    } catch (error: any) {
      console.error('Erro ao remover foto:', error);
      this.toastr.error('Erro ao remover foto');
    } finally {
      this.isUploadingFoto = false;
    }
  }

  private configurarBreadcrumb(): void {
    const clienteNome = this.mentoria?.client?.clients_pj?.trade_name ||
                        this.mentoria?.client?.clients_pj?.company_name ||
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
        url: this.mentoriaId ? `/home/mentorias/visualizar/${this.mentoriaId}` : '/home/mentorias',
        icon: 'fas fa-building'
      },
      {
        label: 'Editar',
        icon: 'fas fa-edit'
      }
    ]);
  }
}
