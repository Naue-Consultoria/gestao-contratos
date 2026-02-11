import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb.component';
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
  imports: [CommonModule, FormsModule, DragDropModule, BreadcrumbComponent],
  templateUrl: './gerenciar-estados.component.html',
  styleUrls: ['./gerenciar-estados.component.css']
})
export class GerenciarEstadosComponent implements OnInit, OnDestroy {
  estadosRows: EstadoRow[] = [];
  isLoading = false;
  isSaving = false;

  private destroy$ = new Subject<void>();
  private originalEstados: EstadoAtuacao[] = [];

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
    this.estadoAtuacaoService.getEstados()
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
      // Se é novo, apenas remove da lista
      this.estadosRows.splice(index, 1);
      this.updateOrdens();
    } else {
      // Se é existente, confirma exclusão
      if (confirm(`Tem certeza que deseja excluir o estado ${row.estado}?`)) {
        this.estadosRows.splice(index, 1);
        this.updateOrdens();
        this.markAsEdited();
      }
    }
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

  isValidSigla(sigla: string): boolean {
    return this.estadoAtuacaoService.isValidSigla(sigla);
  }
}
