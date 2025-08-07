import { Component, Input, Output, EventEmitter, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadService } from '../../services/upload';
import { ModalService } from '../../services/modal.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-upload.component.html',
  styleUrls: ['./image-upload.component.css']
})
export class ImageUploadComponent {
  private uploadService = inject(UploadService);
  private modalService = inject(ModalService);

  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;

  @Input() currentImageUrl: string | null = null;
  @Input() label: string = 'Upload de Imagem';
  @Input() placeholder: string = 'Clique para selecionar uma imagem';
  @Input() disabled: boolean = false;
  
  @Output() imageUploaded = new EventEmitter<string>();
  @Output() imageRemoved = new EventEmitter<void>();

  isUploading = false;
  dragOver = false;
  previewUrl: string | null = null;

  ngOnInit() {
    this.previewUrl = this.currentImageUrl;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.handleFileUpload(file);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.dragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileUpload(files[0]);
    }
  }

  async handleFileUpload(file: File) {
    if (this.disabled) return;

    // Validar arquivo
    const validation = this.uploadService.validateImageFile(file);
    if (!validation.valid) {
      this.modalService.showError(validation.message!);
      return;
    }

    try {
      this.isUploading = true;

      // Criar preview local
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(file);

      // Fazer upload
      const response = await firstValueFrom(this.uploadService.uploadClientLogo(file));
      
      if (response.success && response.file) {
        const fullUrl = this.uploadService.getFileUrl(response.file.url);
        this.imageUploaded.emit(fullUrl);
        this.modalService.showSuccess('Imagem enviada com sucesso!');
      }
    } catch (error: any) {
      console.error('Erro no upload:', error);
      this.modalService.showError(error.error?.message || 'Erro ao enviar imagem');
      this.previewUrl = this.currentImageUrl; // Restaurar preview anterior
    } finally {
      this.isUploading = false;
    }
  }

  removeImage() {
    if (this.disabled) return;
    
    this.previewUrl = null;
    this.currentImageUrl = null;
    
    // Reset the file input
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
    
    this.imageRemoved.emit();
  }

  triggerFileInput() {
    if (this.disabled) return;
    
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.click();
    }
  }
}