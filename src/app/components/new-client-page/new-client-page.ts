import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ClientService, CreateClientRequest, UpdateClientRequest, ApiClient } from '../../services/client';
import { ModalService } from '../../services/modal.service';
import { DocumentMaskDirective } from '../../directives/document-mask.directive';
import { firstValueFrom } from 'rxjs';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { ImageUploadComponent } from '../image-upload/image-upload.component';

@Component({
  selector: 'app-new-client-page',
  standalone: true,
  imports: [CommonModule, FormsModule, DocumentMaskDirective, BreadcrumbComponent, ImageUploadComponent],
  templateUrl: './new-client-page.html',
  styleUrls: ['./new-client-page.css']
})
export class NewClientPageComponent implements OnInit {
  private clientService = inject(ClientService);
  private modalService = inject(ModalService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  
  // Form data
  formData: CreateClientRequest & { logo_url?: string } = {
    type: 'PF',
    email: '',
    phone: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipcode: '',
    // Optional fields
    employee_count: undefined,
    business_segment: '',
    // PF fields
    cpf: '',
    full_name: '',
    // PJ fields
    cnpj: '',
    company_name: '',
    trade_name: ''
  };
  
  isLoading = false;
  isEditing = false;
  editingId: number | null = null;
  
  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditing = true;
      this.editingId = parseInt(id);
      this.loadClient();
    }
  }

  async loadClient() {
    if (!this.editingId) return;
    
    try {
      this.isLoading = true;
      const response = await firstValueFrom(this.clientService.getClient(this.editingId));
      const client = response.client;
      
      // Map client data to form
      this.formData = {
        type: client.type,
        email: client.email,
        phone: client.phone || '',
        street: client.street,
        number: client.number,
        complement: client.complement || '',
        neighborhood: client.neighborhood,
        city: client.city,
        state: client.state,
        zipcode: client.zipcode,
        // Optional fields
        employee_count: client.employee_count || undefined,
        business_segment: client.business_segment || '',
        // PF fields
        cpf: client.cpf || '',
        full_name: client.full_name || '',
        // PJ fields
        cnpj: client.cnpj || '',
        company_name: client.company_name || '',
        trade_name: client.trade_name || ''
      };

      if (client.logo_path) {
        this.formData.logo_url = this.clientService.getClientLogoUrl(client.id);
      }
    } catch (error) {
      console.error('Erro ao carregar cliente:', error);
      this.modalService.showError('Erro ao carregar dados do cliente');
      this.goBack();
    } finally {
      this.isLoading = false;
    }
  }

  async onSubmit() {
    if (this.isLoading) return;
    
    try {
      this.isLoading = true;
      
      if (this.isEditing && this.editingId) {
        await firstValueFrom(this.clientService.updateClient(this.editingId, this.formData));
        this.modalService.showSuccess('Cliente atualizado com sucesso!');
      } else {
        await firstValueFrom(this.clientService.createClient(this.formData));
        this.modalService.showSuccess('Cliente criado com sucesso!');
      }
      
      this.goBack();
    } catch (error: any) {
      console.error('Erro ao salvar cliente:', error);
      
      if (error.status === 400) {
        this.modalService.showError(error.error?.message || 'Dados inválidos');
      } else {
        this.modalService.showError('Erro ao salvar cliente');
      }
    } finally {
      this.isLoading = false;
    }
  }

  goBack() {
    this.router.navigate(['/home/clients']);
  }

  getPageTitle(): string {
    return this.isEditing ? 'Editar Cliente' : 'Novo Cliente';
  }

  async onLogoUploaded(file: File) {
  if (!this.editingId) {
    this.modalService.showError('É necessário salvar o cliente antes de enviar uma logo.');
    return;
  }
  
  try {
    this.isLoading = true;
    
    const response = await firstValueFrom(this.clientService.uploadClientLogo(this.editingId, file));

    this.modalService.showSuccess('Logo enviada com sucesso!');

    if (response && response.logo_url) {
      this.formData.logo_url = response.logo_url;
    }

  } catch (error) {
    this.modalService.showError('Ocorreu um erro ao enviar a logo.');
    console.error('Upload error:', error);
  } finally {
    this.isLoading = false;
  }
}

  async onLogoRemoved() {
    if (!this.editingId) return;

    try {
      await firstValueFrom(this.clientService.deleteClientLogo(this.editingId));
      this.modalService.showSuccess('Logo removida com sucesso!');
      this.formData.logo_url = undefined;
    } catch (error) {
      this.modalService.showError('Erro ao remover a logo.');
    }
  }
}