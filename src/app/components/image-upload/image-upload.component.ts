import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-upload.component.html',
  styleUrls: ['./image-upload.component.css']
})
export class ImageUploadComponent implements OnChanges {
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;

  @Input() currentImageUrl: string | null = null;
  @Input({ required: true }) label!: string;
  @Input() placeholder: string = 'Clique para selecionar ou arraste uma imagem';
  @Input() disabled: boolean = false;

  // LINHA CRÍTICA: Garantir que o EventEmitter está tipado como <File>
  @Output() imageUploaded = new EventEmitter<File>();
  @Output() imageRemoved = new EventEmitter<void>();

  dragOver = false;
  previewUrl: string | ArrayBuffer | null = null;
  
  constructor(private modalService: ModalService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentImageUrl']) {
      this.previewUrl = this.currentImageUrl;
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.handleFileSelection(file);
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.handleFileSelection(file);
    }
  }
  
  private handleFileSelection(file: File): void {
    if (!this.isValidFile(file)) return;

    // Gera a pré-visualização localmente
    const reader = new FileReader();
    reader.onload = () => {
      this.previewUrl = reader.result;
    };
    reader.readAsDataURL(file);

    // LINHA CRÍTICA: Emitir o objeto 'File' completo para o componente pai
    this.imageUploaded.emit(file);
  }

  removeImage(): void {
    this.previewUrl = null;
    this.currentImageUrl = null;
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
    this.imageRemoved.emit();
  }

  private isValidFile(file: File): boolean {
    const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (file.size > maxSizeInBytes) {
      this.modalService.showError('O ficheiro excede o tamanho máximo de 5MB.');
      return false;
    }
    if (!allowedTypes.includes(file.type)) {
      this.modalService.showError('Tipo de ficheiro inválido. Apenas imagens são permitidas.');
      return false;
    }
    return true;
  }

  // Funções para drag & drop e clique
  onDragOver(event: DragEvent): void { event.preventDefault(); this.dragOver = true; }
  onDragLeave(event: DragEvent): void { event.preventDefault(); this.dragOver = false; }
  triggerFileInput(): void { if (!this.disabled) this.fileInput.nativeElement.click(); }
}