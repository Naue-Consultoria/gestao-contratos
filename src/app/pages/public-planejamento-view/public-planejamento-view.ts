import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import {
  PlanejamentoEstrategicoService,
  PlanejamentoEstrategico,
  Departamento,
  UpdateMatrizRequest
} from '../../services/planejamento-estrategico.service';
import { firstValueFrom } from 'rxjs';
import { NewlineToBrPipe } from '../../pipes/newline-to-br.pipe';

@Component({
  selector: 'app-public-planejamento-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NewlineToBrPipe
  ],
  templateUrl: './public-planejamento-view.html',
  styleUrls: ['./public-planejamento-view.css'],
})
export class PublicPlanejamentoViewComponent implements OnInit {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private planejamentoService = inject(PlanejamentoEstrategicoService);
  private toastr = inject(ToastrService);

  planejamento: PlanejamentoEstrategico | null = null;
  departamentos: Departamento[] = [];
  token: string = '';

  isLoading = true;
  isSaving = false;
  error = '';

  // Departamento selecionado para edição
  selectedDepartamento: Departamento | null = null;
  showEditModal = false;

  // Form data da matriz
  matrizForm = {
    vulnerabilidades: '',
    conquistas: '',
    licoes_aprendidas: '',
    compromissos: ''
  };

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.token = params['token'];
      if (this.token) {
        this.loadPlanejamento();
      }
    });
  }

  async loadPlanejamento(): Promise<void> {
    this.isLoading = true;
    this.error = '';

    try {
      const response = await firstValueFrom(
        this.planejamentoService.obterPlanejamentoPublico(this.token)
      );

      if (response.success && response.data) {
        this.planejamento = response.data;
        this.departamentos = response.data.departamentos || [];
      }
    } catch (err: any) {
      console.error('Erro ao carregar planejamento:', err);
      this.error = 'Não foi possível carregar o planejamento estratégico.';
      this.toastr.error('Planejamento não encontrado', 'Erro');
    } finally {
      this.isLoading = false;
    }
  }

  getClientName(): string {
    if (!this.planejamento?.client) return 'N/A';

    const clientPF = this.planejamento.client.clients_pf?.[0];
    const clientPJ = this.planejamento.client.clients_pj?.[0];

    if (clientPF) {
      return clientPF.full_name || 'N/A';
    } else if (clientPJ) {
      return clientPJ.company_name || clientPJ.trade_name || 'N/A';
    }

    return 'N/A';
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  }

  formatDateTime(dateTimeString: string | null | undefined): string {
    if (!dateTimeString) return 'N/A';
    const date = new Date(dateTimeString);
    return date.toLocaleString('pt-BR');
  }

  isPrazoVencido(): boolean {
    if (!this.planejamento?.prazo_preenchimento) return false;
    return new Date(this.planejamento.prazo_preenchimento) < new Date();
  }

  isMatrizPreenchida(departamento: Departamento): boolean {
    return !!departamento.matriz?.preenchido_em;
  }

  getMatrizPreenchimentoPercentage(): number {
    if (this.departamentos.length === 0) return 0;
    const preenchidos = this.departamentos.filter(d => this.isMatrizPreenchida(d)).length;
    return Math.round((preenchidos / this.departamentos.length) * 100);
  }

  openEditModal(departamento: Departamento): void {
    if (this.isPrazoVencido()) {
      this.toastr.warning('O prazo para edição desta matriz expirou', 'Atenção');
      return;
    }

    this.selectedDepartamento = departamento;

    // Preencher formulário com dados existentes ou vazios
    this.matrizForm = {
      vulnerabilidades: departamento.matriz?.vulnerabilidades || '',
      conquistas: departamento.matriz?.conquistas || '',
      licoes_aprendidas: departamento.matriz?.licoes_aprendidas || '',
      compromissos: departamento.matriz?.compromissos || ''
    };

    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedDepartamento = null;
    this.matrizForm = {
      vulnerabilidades: '',
      conquistas: '',
      licoes_aprendidas: '',
      compromissos: ''
    };
  }

  async saveMatriz(): Promise<void> {
    if (!this.selectedDepartamento) return;

    this.isSaving = true;

    try {
      const updateData: UpdateMatrizRequest = {
        vulnerabilidades: this.matrizForm.vulnerabilidades,
        conquistas: this.matrizForm.conquistas,
        licoes_aprendidas: this.matrizForm.licoes_aprendidas,
        compromissos: this.matrizForm.compromissos
      };

      const response = await firstValueFrom(
        this.planejamentoService.atualizarMatrizPublico(
          this.selectedDepartamento.id,
          updateData
        )
      );

      if (response.success) {
        this.toastr.success('Matriz salva com sucesso', 'Sucesso');
        this.closeEditModal();
        this.loadPlanejamento(); // Recarregar para mostrar dados atualizados
      }
    } catch (err: any) {
      console.error('Erro ao salvar matriz:', err);
      this.toastr.error(
        err.error?.message || 'Erro ao salvar matriz',
        'Erro'
      );
    } finally {
      this.isSaving = false;
    }
  }

  // Helpers para visualização da matriz completa
  getMatrizColuna(departamento: Departamento, coluna: 'vulnerabilidades' | 'conquistas' | 'licoes_aprendidas' | 'compromissos'): string {
    if (!departamento.matriz) return '-';
    const valor = departamento.matriz[coluna];
    return valor || '-';
  }

  hasAnyMatrizPreenchida(): boolean {
    return this.departamentos.some(d => this.isMatrizPreenchida(d));
  }

  getCurrentYear(): number {
    return new Date().getFullYear();
  }
}
