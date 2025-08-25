import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RoutineAttachmentUploadProgress {
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
  attachment?: any;
}

export interface RoutineAttachment {
  id: number;
  comment_id: number;
  file_name: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: number;
  uploaded_at: string;
  is_active: boolean;
  public_url?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RoutineAttachmentService {
  private apiUrl = `${environment.apiUrl}/routines`;

  constructor(
    private http: HttpClient
  ) {}

  /**
   * Validar arquivo antes do upload
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv'
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Tipo de arquivo não permitido. Permitidos: imagens, PDF, Word, Excel, texto.'
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'Arquivo muito grande. Tamanho máximo: 10MB.'
      };
    }

    return { valid: true };
  }

  /**
   * Fazer upload de um arquivo para um comentário de rotina
   */
  uploadFile(commentId: number, file: File): Observable<RoutineAttachmentUploadProgress> {
    const validation = this.validateFile(file);
    if (!validation.valid) {
      return new Observable(observer => {
        observer.next({
          progress: 0,
          status: 'error',
          error: validation.error
        });
        observer.complete();
      });
    }

    const formData = new FormData();
    formData.append('file', file);

    return new Observable(observer => {
      this.http.post(`${this.apiUrl}/comments/${commentId}/upload`, formData, {
        reportProgress: true,
        observe: 'events'
      }).subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            const progress = Math.round(100 * event.loaded / event.total);
            observer.next({
              progress,
              status: 'uploading'
            });
          } else if (event.type === HttpEventType.Response) {
            observer.next({
              progress: 100,
              status: 'completed',
              attachment: event.body
            });
            observer.complete();
          }
        },
        error: (error) => {
          observer.next({
            progress: 0,
            status: 'error',
            error: error.error?.error || error.message || 'Erro no upload'
          });
          observer.complete();
        }
      });
    });
  }

  /**
   * Buscar anexos de um comentário
   */
  getCommentAttachments(commentId: number): Observable<RoutineAttachment[]> {
    return this.http.get<RoutineAttachment[]>(
      `${this.apiUrl}/comments/${commentId}/attachments`
    );
  }

  /**
   * Baixar um anexo
   */
  downloadAttachment(attachmentId: number): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/attachments/${attachmentId}/download`,
      { 
        responseType: 'blob'
      }
    );
  }

  /**
   * Formatar tamanho do arquivo para exibição
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Obter ícone para tipo de arquivo
   */
  getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) {
      return 'fas fa-image';
    } else if (mimeType === 'application/pdf') {
      return 'fas fa-file-pdf';
    } else if (mimeType.includes('word')) {
      return 'fas fa-file-word';
    } else if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
      return 'fas fa-file-excel';
    } else if (mimeType.startsWith('text/')) {
      return 'fas fa-file-alt';
    } else {
      return 'fas fa-file';
    }
  }
}