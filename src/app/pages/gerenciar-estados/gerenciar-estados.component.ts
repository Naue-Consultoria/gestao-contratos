import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb.component';
import { DeleteConfirmationModalComponent } from '../../components/delete-confirmation-modal/delete-confirmation-modal.component';
import { BreadcrumbService } from '../../services/breadcrumb.service';
import {
  EstadoAtuacaoService,
  EstadoAtuacao,
  CreateEstadoRequest
} from '../../services/estado-atuacao.service';

interface EstadoRow {
  id?: number;
  numero: number;
  estado: string;
  sigla: string;
  ordem: number;
  isNew?: boolean;
  isEdited?: boolean;
}

@Component({
  selector: 'app-gerenciar-estados',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, BreadcrumbComponent, DeleteConfirmationModalComponent],
  templateUrl: './gerenciar-estados.component.html',
  styleUrls: ['./gerenciar-estados.component.css']
})
export class GerenciarEstadosComponent implements OnInit, OnDestroy {
  estadosRows: EstadoRow[] = [];
  isLoading = false;
  isSaving = false;

  showDeleteModal = false;
  isDeleting = false;
  private deleteIndex: number | null = null;

  private destroy$ = new Subject<void>();
  private originalEstados: EstadoAtuacao[] = [];

  readonly todosEstadosBrasil: { estado: string; sigla: string }[] = [
    { estado: 'Acre', sigla: 'AC' },
    { estado: 'Alagoas', sigla: 'AL' },
    { estado: 'Amapá', sigla: 'AP' },
    { estado: 'Amazonas', sigla: 'AM' },
    { estado: 'Bahia', sigla: 'BA' },
    { estado: 'Ceará', sigla: 'CE' },
    { estado: 'Distrito Federal', sigla: 'DF' },
    { estado: 'Espírito Santo', sigla: 'ES' },
    { estado: 'Goiás', sigla: 'GO' },
    { estado: 'Maranhão', sigla: 'MA' },
    { estado: 'Mato Grosso', sigla: 'MT' },
    { estado: 'Mato Grosso do Sul', sigla: 'MS' },
    { estado: 'Minas Gerais', sigla: 'MG' },
    { estado: 'Pará', sigla: 'PA' },
    { estado: 'Paraíba', sigla: 'PB' },
    { estado: 'Paraná', sigla: 'PR' },
    { estado: 'Pernambuco', sigla: 'PE' },
    { estado: 'Piauí', sigla: 'PI' },
    { estado: 'Rio de Janeiro', sigla: 'RJ' },
    { estado: 'Rio Grande do Norte', sigla: 'RN' },
    { estado: 'Rio Grande do Sul', sigla: 'RS' },
    { estado: 'Rondônia', sigla: 'RO' },
    { estado: 'Roraima', sigla: 'RR' },
    { estado: 'Santa Catarina', sigla: 'SC' },
    { estado: 'São Paulo', sigla: 'SP' },
    { estado: 'Sergipe', sigla: 'SE' },
    { estado: 'Tocantins', sigla: 'TO' }
  ];

  constructor(
    private estadoAtuacaoService: EstadoAtuacaoService,
    private toastr: ToastrService,
    private breadcrumbService: BreadcrumbService
  ) {}

  ngOnInit(): void {
    this.breadcrumbService.setBreadcrumbs([
      { label: 'Início', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Estados de Atuação', url: '/home/estados-atuacao', icon: 'fas fa-map-marked-alt' }
    ]);
    this.loadEstados();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadEstados(): void {
    this.isLoading = true;
    this.estadoAtuacaoService.getEstados({ ativo: true })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.originalEstados = response.estados;
          this.estadosRows = response.estados.map(e => ({
            id: e.id,
            numero: e.numero,
            estado: e.estado,
            sigla: e.sigla,
            ordem: e.ordem,
            isNew: false,
            isEdited: false
          }));
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erro ao carregar estados:', error);
          this.toastr.error('Erro ao carregar estados de atuação');
          this.isLoading = false;
        }
      });
  }

  addNewRow(): void {
    const nextNumero = this.getNextNumero();
    const nextOrdem = this.estadosRows.length + 1;

    this.estadosRows.push({
      numero: nextNumero,
      estado: '',
      sigla: '',
      ordem: nextOrdem,
      isNew: true,
      isEdited: false
    });
  }

  removeRow(index: number): void {
    const row = this.estadosRows[index];

    if (row.isNew) {
      this.estadosRows.splice(index, 1);
      this.updateOrdens();
    } else {
      this.deleteIndex = index;
      this.showDeleteModal = true;
    }
  }

  async confirmDelete(): Promise<void> {
    if (this.deleteIndex === null) return;

    const row = this.estadosRows[this.deleteIndex];
    this.isDeleting = true;

    try {
      await this.estadoAtuacaoService.deleteEstado(row.id!).toPromise();
      this.estadosRows.splice(this.deleteIndex, 1);
      this.originalEstados = this.originalEstados.filter(e => e.id !== row.id);
      this.updateOrdens();
      this.toastr.success('Estado excluído com sucesso!');
    } catch (error: any) {
      console.error('Erro ao excluir estado:', error);
      this.toastr.error('Erro ao excluir o estado.');
    } finally {
      this.isDeleting = false;
      this.showDeleteModal = false;
      this.deleteIndex = null;
    }
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.deleteIndex = null;
  }

  get deleteItemName(): string {
    if (this.deleteIndex !== null && this.estadosRows[this.deleteIndex]) {
      const row = this.estadosRows[this.deleteIndex];
      return `${row.estado} (${row.sigla})`;
    }
    return '';
  }

  onDrop(event: CdkDragDrop<EstadoRow[]>): void {
    moveItemInArray(this.estadosRows, event.previousIndex, event.currentIndex);
    this.updateOrdens();
    this.markAsEdited();
  }

  onFieldChange(index: number): void {
    const row = this.estadosRows[index];
    if (!row.isNew) {
      row.isEdited = true;
    }
  }

  async saveChanges(): Promise<void> {
    // Validar campos
    const invalidRows = this.estadosRows.filter(row =>
      !row.estado.trim() || !row.sigla.trim() || row.sigla.length !== 2
    );

    if (invalidRows.length > 0) {
      this.toastr.warning('Preencha todos os campos corretamente. A sigla deve ter 2 caracteres.');
      return;
    }

    this.isSaving = true;

    try {
      // 1. Processar estados novos (criar)
      const newRows = this.estadosRows.filter(row => row.isNew);
      for (const row of newRows) {
        const createData: CreateEstadoRequest = {
          numero: row.numero,
          estado: row.estado,
          sigla: row.sigla.toUpperCase(),
          ativo: true,
          ordem: row.ordem
        };
        await this.estadoAtuacaoService.createEstado(createData).toPromise();
      }

      // 2. Processar estados editados (atualizar)
      const editedRows = this.estadosRows.filter(row => row.isEdited && !row.isNew && row.id);
      for (const row of editedRows) {
        await this.estadoAtuacaoService.updateEstado(row.id!, {
          numero: row.numero,
          estado: row.estado,
          sigla: row.sigla.toUpperCase(),
          ativo: true,
          ordem: row.ordem
        }).toPromise();
      }

      // 3. Processar estados excluídos
      const deletedIds = this.originalEstados
        .filter(original => !this.estadosRows.find(row => row.id === original.id))
        .map(e => e.id);

      for (const id of deletedIds) {
        await this.estadoAtuacaoService.deleteEstado(id).toPromise();
      }

      this.toastr.success('Alterações salvas com sucesso!');
      this.loadEstados(); // Recarregar dados

    } catch (error: any) {
      console.error('Erro ao salvar alterações:', error);
      const errorMsg = error.error?.error || 'Erro ao salvar alterações';
      this.toastr.error(errorMsg);
    } finally {
      this.isSaving = false;
    }
  }

  cancelChanges(): void {
    if (this.hasUnsavedChanges()) {
      if (confirm('Tem certeza que deseja descartar as alterações?')) {
        this.loadEstados();
      }
    }
  }

  hasUnsavedChanges(): boolean {
    const hasNew = this.estadosRows.some(row => row.isNew);
    const hasEdited = this.estadosRows.some(row => row.isEdited);
    const hasDeleted = this.originalEstados.length !== this.estadosRows.filter(r => !r.isNew).length;

    return hasNew || hasEdited || hasDeleted;
  }

  private updateOrdens(): void {
    this.estadosRows.forEach((row, index) => {
      row.ordem = index + 1;
      row.numero = index + 1;
    });
  }

  private markAsEdited(): void {
    this.estadosRows.forEach(row => {
      if (!row.isNew) {
        row.isEdited = true;
      }
    });
  }

  private getNextNumero(): number {
    if (this.estadosRows.length === 0) return 1;
    return Math.max(...this.estadosRows.map(r => r.numero)) + 1;
  }

  getEstadosDisponiveis(currentSigla?: string): { estado: string; sigla: string }[] {
    const siglasUsadas = this.estadosRows.map(r => r.sigla.toUpperCase());
    return this.todosEstadosBrasil.filter(e =>
      e.sigla === currentSigla || !siglasUsadas.includes(e.sigla)
    );
  }

  onEstadoSelect(index: number, sigla: string): void {
    const found = this.todosEstadosBrasil.find(e => e.sigla === sigla);
    if (found) {
      this.estadosRows[index].estado = found.estado;
      this.estadosRows[index].sigla = found.sigla;
      this.onFieldChange(index);
    }
  }

  isValidSigla(sigla: string): boolean {
    return this.estadoAtuacaoService.isValidSigla(sigla);
  }
}
