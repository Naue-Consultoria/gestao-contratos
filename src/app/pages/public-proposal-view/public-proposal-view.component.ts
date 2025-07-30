import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { 
  PublicProposalService, 
  PublicProposal, 
  PublicProposalService as ProposalServiceItem,
  ServiceSelectionData,
  SignatureData,
  ConfirmationData
} from '../../services/public-proposal.service';

@Component({
  selector: 'app-public-proposal-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './public-proposal-view.component.html',
  styleUrls: ['./public-proposal-view.component.css']
})
export class PublicProposalViewComponent implements OnInit {
  currentYear = new Date().getFullYear();
  @ViewChild('signatureCanvas', { static: false }) signatureCanvas!: ElementRef<HTMLCanvasElement>;

  proposal: PublicProposal | null = null;
  signatureForm!: FormGroup;
  confirmationForm!: FormGroup;
  
  // Estados da aplicação
  isLoading = true;
  isSubmitting = false;
  proposalExpired = false;
  daysUntilExpiration: number | null = null;
  
  // Fluxo de estados
  currentStep: 'view' | 'selecting' | 'signing' | 'confirming' | 'completed' | 'rejected' = 'view';
  
  // Dados de seleção de serviços
  selectedServices: Map<number, boolean> = new Map();
  serviceNotes: Map<number, string> = new Map();
  clientObservations = '';
  
  // Dados de assinatura
  signatureDrawn = false;
  private signatureContext: CanvasRenderingContext2D | null = null;
  private isDrawing = false;
  
  private destroy$ = new Subject<void>();
  private token: string = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private publicProposalService: PublicProposalService,
    private toastr: ToastrService
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    
    if (!this.token) {
      this.toastr.error('Token inválido');
      this.router.navigate(['/']);
      return;
    }

    this.loadProposal();
  }

  ngAfterViewInit(): void {
    // Initialize signature canvas when signing step is reached
    if (this.currentStep === 'signing') {
      this.initializeSignatureCanvas();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.signatureForm = this.fb.group({
      client_name: ['', [Validators.required, Validators.minLength(2)]],
      client_email: ['', [Validators.required, Validators.email]],
      client_phone: [''],
      client_document: ['']
    });

    this.confirmationForm = this.fb.group({
      client_observations: ['']
    });
  }

  private loadProposal(): void {
    this.publicProposalService.getProposalByToken(this.token)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.proposal = response.data;
            this.checkProposalStatus();
            this.initializeServiceSelection();
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erro ao carregar proposta:', error);
          this.toastr.error('Proposta não encontrada ou link expirado');
          this.isLoading = false;
        }
      });
  }

  private checkProposalStatus(): void {
    if (!this.proposal) return;

    this.proposalExpired = this.publicProposalService.isProposalExpired(this.proposal);
    this.daysUntilExpiration = this.publicProposalService.getDaysUntilExpiration(this.proposal);

    // Definir estado inicial baseado no status
    if (this.proposal.status === 'accepted') {
      this.currentStep = 'completed';
      this.toastr.info('Esta proposta já foi aceita');
    } else if (this.proposal.status === 'rejected') {
      this.currentStep = 'rejected';
      this.toastr.info('Esta proposta foi rejeitada');
    } else if (this.proposal.status !== 'sent') {
      this.toastr.warning('Esta proposta não está disponível');
    }
  }

  private initializeServiceSelection(): void {
    if (!this.proposal?.services) return;
    
    this.proposal.services.forEach(service => {
      this.selectedServices.set(service.service_id, service.selected_by_client ?? true);
      this.serviceNotes.set(service.service_id, service.client_notes || '');
    });
  }

  // === MÉTODOS DE SELEÇÃO DE SERVIÇOS ===
  
  startServiceSelection(): void {
    if (this.proposalExpired || this.proposal?.status !== 'sent') {
      this.toastr.error('Esta proposta não está disponível para seleção');
      return;
    }
    this.currentStep = 'selecting';
  }
  
  goToSigningStep(): void {
    this.currentStep = 'signing';
    // Initialize canvas after step change
    setTimeout(() => this.initializeSignatureCanvas(), 100);
  }

  toggleService(serviceId: number): void {
    const current = this.selectedServices.get(serviceId) || false;
    this.selectedServices.set(serviceId, !current);
  }

  isServiceSelected(serviceId: number): boolean {
    return this.selectedServices.get(serviceId) || false;
  }

  updateServiceNote(serviceId: number, note: string): void {
    this.serviceNotes.set(serviceId, note);
  }

  getServiceNote(serviceId: number): string {
    return this.serviceNotes.get(serviceId) || '';
  }

  async saveServiceSelection(): Promise<void> {
    if (!this.hasSelectedServices()) {
      this.toastr.error('Selecione pelo menos um serviço');
      return;
    }

    this.isSubmitting = true;

    const selectionData: ServiceSelectionData = {
      selectedServices: Array.from(this.selectedServices.entries()).map(([serviceId, selected]) => ({
        service_id: serviceId,
        selected,
        client_notes: this.serviceNotes.get(serviceId) || ''
      })),
      client_observations: this.clientObservations
    };

    try {
      const response = await this.publicProposalService.selectServices(this.token, selectionData).toPromise();
      if (response?.success) {
        this.toastr.success('Seleção salva com sucesso!');
        await this.loadProposal(); // Recarregar dados atualizados
        this.goToSigningStep();
      }
    } catch (error) {
      console.error('Erro ao salvar seleção:', error);
      this.toastr.error('Erro ao salvar seleção de serviços');
    } finally {
      this.isSubmitting = false;
    }
  }

  // === MÉTODOS DE ASSINATURA ===

  initializeSignatureCanvas(): void {
    setTimeout(() => {
      if (this.signatureCanvas) {
        const canvas = this.signatureCanvas.nativeElement;
        this.signatureContext = canvas.getContext('2d');
        
        if (this.signatureContext) {
          canvas.width = canvas.offsetWidth;
          canvas.height = 200;
          this.signatureContext.strokeStyle = '#000000';
          this.signatureContext.lineWidth = 2;
          this.signatureContext.lineCap = 'round';
        }
      }
    }, 100);
  }

  startDrawing(event: MouseEvent): void {
    if (!this.signatureContext) return;
    
    this.isDrawing = true;
    const rect = this.signatureCanvas.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    this.signatureContext.beginPath();
    this.signatureContext.moveTo(x, y);
  }

  draw(event: MouseEvent): void {
    if (!this.isDrawing || !this.signatureContext) return;
    
    const rect = this.signatureCanvas.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    this.signatureContext.lineTo(x, y);
    this.signatureContext.stroke();
    this.signatureDrawn = true;
  }

  stopDrawing(): void {
    this.isDrawing = false;
  }
  
  // Support for touch devices
  startTouchDrawing(event: TouchEvent): void {
    event.preventDefault();
    if (!this.signatureContext) return;
    
    const touch = event.touches[0];
    const rect = this.signatureCanvas.nativeElement.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    this.isDrawing = true;
    this.signatureContext.beginPath();
    this.signatureContext.moveTo(x, y);
  }

  touchDraw(event: TouchEvent): void {
    event.preventDefault();
    if (!this.isDrawing || !this.signatureContext) return;
    
    const touch = event.touches[0];
    const rect = this.signatureCanvas.nativeElement.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    this.signatureContext.lineTo(x, y);
    this.signatureContext.stroke();
    this.signatureDrawn = true;
  }

  stopTouchDrawing(event: TouchEvent): void {
    event.preventDefault();
    this.isDrawing = false;
  }

  clearSignature(): void {
    if (!this.signatureContext) return;
    
    const canvas = this.signatureCanvas.nativeElement;
    this.signatureContext.clearRect(0, 0, canvas.width, canvas.height);
    this.signatureDrawn = false;
  }

  async signProposal(): Promise<void> {
    if (this.signatureForm.invalid) {
      this.markFormGroupTouched(this.signatureForm);
      this.toastr.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!this.signatureDrawn) {
      this.toastr.error('Assinatura é obrigatória');
      return;
    }

    this.isSubmitting = true;

    try {
      const canvas = this.signatureCanvas.nativeElement;
      const signatureDataUrl = canvas.toDataURL();

      const signatureData: SignatureData = {
        signature_data: signatureDataUrl,
        ...this.signatureForm.value
      };

      const response = await this.publicProposalService.signProposal(this.token, signatureData).toPromise();
      if (response?.success) {
        this.toastr.success('Proposta assinada com sucesso!');
        this.currentStep = 'confirming';
      }
    } catch (error) {
      console.error('Erro ao assinar proposta:', error);
      this.toastr.error('Erro ao processar assinatura');
    } finally {
      this.isSubmitting = false;
    }
  }

  // === MÉTODOS DE CONFIRMAÇÃO ===

  async confirmProposal(): Promise<void> {
    this.isSubmitting = true;

    try {
      const confirmationData: ConfirmationData = this.confirmationForm.value;
      const response = await this.publicProposalService.confirmProposal(this.token, confirmationData).toPromise();
      
      if (response?.success) {
        this.toastr.success('Proposta confirmada com sucesso!');
        this.currentStep = 'completed';
      }
    } catch (error) {
      console.error('Erro ao confirmar proposta:', error);
      this.toastr.error('Erro ao confirmar proposta');
    } finally {
      this.isSubmitting = false;
    }
  }

  async rejectProposal(): Promise<void> {
    const reason = prompt('Motivo da rejeição (opcional):');
    
    if (confirm('Tem certeza que deseja rejeitar esta proposta?')) {
      this.isSubmitting = true;

      try {
        const response = await this.publicProposalService.rejectProposal(this.token, reason || '').toPromise();
        if (response?.success) {
          this.toastr.success('Proposta rejeitada');
          this.currentStep = 'rejected';
        }
      } catch (error) {
        console.error('Erro ao rejeitar proposta:', error);
        this.toastr.error('Erro ao rejeitar proposta');
      } finally {
        this.isSubmitting = false;
      }
    }
  }

  // === MÉTODOS UTILITÁRIOS ===

  hasSelectedServices(): boolean {
    return Array.from(this.selectedServices.values()).some(selected => selected);
  }

  getSelectedTotal(): number {
    if (!this.proposal) return 0;
    
    return this.proposal.services
      .filter(service => this.selectedServices.get(service.service_id))
      .reduce((total, service) => {
        const value = service.custom_value || service.service.value;
        return total + (value * service.quantity);
      }, 0);
  }

  formatCurrency(value: number): string {
    return this.publicProposalService.formatCurrency(value);
  }

  getServiceValue(service: ProposalServiceItem): number {
    return service.custom_value || service.service.value;
  }

  getServiceTotal(service: ProposalServiceItem): number {
    const value = this.getServiceValue(service);
    return value * service.quantity;
  }

  isFieldInvalid(form: FormGroup, fieldName: string): boolean {
    const field = form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('pt-BR');
  }

  getStatusText(status: string): string {
    const texts: { [key: string]: string } = {
      'draft': 'Rascunho',
      'sent': 'Enviada',
      'accepted': 'Aceita',
      'rejected': 'Rejeitada',
      'expired': 'Expirada'
    };
    return texts[status] || status;
  }
}