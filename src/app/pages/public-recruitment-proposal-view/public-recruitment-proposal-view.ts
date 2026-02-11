import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import {
  PublicProposalService as PublicProposalServiceAPI,
  PublicProposal,
  PublicProposalService,
  SignatureData
} from '../../services/public-proposal.service';

import {
  PublicTeamService,
  PublicTeamMember
} from '../../services/public-team.service';

import {
  EstadoAtuacaoService,
  EstadoAtuacaoSimples
} from '../../services/estado-atuacao.service';

type ProposalServiceItem = PublicProposalService;

import { BrazilMapComponent } from '../../components/brazil-map/brazil-map.component';

@Component({
  selector: 'app-public-recruitment-proposal-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, BrazilMapComponent],
  templateUrl: './public-recruitment-proposal-view.html',
  styleUrls: ['./public-recruitment-proposal-view.css']
})
export class PublicRecruitmentProposalView implements OnInit, AfterViewInit {
  currentYear = new Date().getFullYear();
  @ViewChild('signatureCanvas', { static: false }) signatureCanvas!: ElementRef<HTMLCanvasElement>;

  // Landing page properties
  clients: { name: string, logo: string }[] = [];

  private clientLogos = [
    'city.webp',
    'Logo-CMO-Construtora.webp',
    'logo-adao.png',
    'Séren.png',
    'Habitat.png',
    'TopConstrutora.png',
    'raizUrbana.png',
    'Elmo-inc.jpg',
    'myBroker.webp',
    'URBS One - Assinaturas_Separadas-01 (1).png',
    'URBS infinity P cima (1).png',
    'UrbsTrend.png',
    'haut.webp',
    'realize.png',
    'haura_principal_preto (1).png',
    'RDiniz.png',
    'Logo-Lopes-Consultoria-de-Imoveis-2020.png',
    'EBM.png'
  ];

  carouselProgress = 0;
  isManualControl = false;
  isDragging = false;
  currentTransform = '';

  private progressInterval: any;
  private manualControlTimeout: any;
  private startX = 0;
  private currentX = 0;
  private initialTransformX = 0;

  // Team members
  teamMembers: PublicTeamMember[] = [];
  duplicatedTeamMembers: PublicTeamMember[] = [];
  teamLoading = false;

  // Estados de atuação
  estadosAtuacao: EstadoAtuacaoSimples[] = [];
  estadosLoading = false;

  get estadosSiglas(): string[] {
    return this.estadosAtuacao.map(e => e.sigla);
  }

  // Team carousel properties
  isTeamManualControl = false;
  isTeamDragging = false;
  currentTeamTransform = '';

  private teamManualControlTimeout: any;
  private teamStartX = 0;
  private teamCurrentX = 0;
  private teamInitialTransformX = 0;
  private teamAnimationId = 0;

  proposal: PublicProposal | null = null;
  signatureForm!: FormGroup;

  // Estados da aplicação
  isLoading = true;
  isSubmitting = false;
  proposalExpired = false;
  daysUntilExpiration: number | null = null;

  // Fluxo de estados - para R&S é mais simples (sem seleção de serviços)
  currentStep: 'view' | 'signing' | 'completed' | 'rejected' = 'view';

  // Controle do modal de sucesso
  showSuccessModal = false;

  // Dados de pagamento - R&S tem valores fixos baseados em salário
  paymentMethod: string = '';

  // Métodos de pagamento para R&S (mais simples que propostas Full)
  paymentMethods = [
    { value: 'PIX', label: 'PIX', icon: 'fas fa-qrcode' },
    { value: 'Boleto', label: 'Boleto Bancário', icon: 'fas fa-barcode' },
    { value: 'Transferência', label: 'Transferência Bancária', icon: 'fas fa-exchange-alt' }
  ];

  // Dados de assinatura
  signatureDrawn = false;
  private signatureContext: CanvasRenderingContext2D | null = null;
  private isDrawing = false;

  // Controle do formulário de assinatura (toggle)
  isSignatureFormExpanded = false;

  private destroy$ = new Subject<void>();
  private token: string = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private publicProposalService: PublicProposalServiceAPI,
    private publicTeamService: PublicTeamService,
    private estadoAtuacaoService: EstadoAtuacaoService,
    private toastr: ToastrService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';

    if (!this.token) {
      this.toastr.error('Token inválido');
      this.router.navigate(['/']);
      return;
    }

    this.initializeForms();
    this.initializeClientLogos();
    this.initializeCarousel();
    this.loadTeamMembers();
    this.loadEstadosAtuacao(); // Carregar estados de atuação
    this.loadProposal();
  }

  ngAfterViewInit(): void {
    // Canvas será inicializado quando a proposta for carregada
    // Veja método loadProposal()
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    if (this.manualControlTimeout) {
      clearTimeout(this.manualControlTimeout);
    }

    if (this.teamManualControlTimeout) {
      clearTimeout(this.teamManualControlTimeout);
    }

    if (this.teamAnimationId) {
      cancelAnimationFrame(this.teamAnimationId);
    }
  }

  private initializeForms(): void {
    this.signatureForm = this.fb.group({
      client_name: ['', [Validators.required, Validators.minLength(2)]],
      client_email: ['', [Validators.required, Validators.email]],
      client_phone: [''],
      client_document: [''],
      client_observations: ['']
      // payment_method removido - não é mais necessário para R&S
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

            // Inicializar canvas após proposta ser carregada e DOM estar pronto
            if (this.proposal?.status === 'sent' && !this.proposalExpired) {
              setTimeout(() => {
                this.initializeSignatureCanvas();
              }, 1000);
            }
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

  private loadTeamMembers(): void {
    this.teamLoading = true;
    this.publicTeamService.getTeamMembers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.teamMembers = response.teamMembers || [];
          this.initializeTeamCarousel();
          this.teamLoading = false;
        },
        error: (error) => {
          console.error('Erro ao carregar membros da equipe:', error);
          this.teamMembers = [];
          this.teamLoading = false;
        }
      });
  }

  private loadEstadosAtuacao(): void {
    this.estadosLoading = true;
    this.estadoAtuacaoService.getEstadosAtivos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.estadosAtuacao = response.estados || [];
          this.estadosLoading = false;
        },
        error: (error) => {
          console.error('Erro ao carregar estados de atuação:', error);
          this.estadosAtuacao = [];
          this.estadosLoading = false;
        }
      });
  }

  private checkProposalStatus(): void {
    if (!this.proposal) return;

    this.proposalExpired = this.publicProposalService.isProposalExpired(this.proposal);
    this.daysUntilExpiration = this.publicProposalService.getDaysUntilExpiration(this.proposal);

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

  // === MÉTODOS DE VALIDAÇÃO E ASSINATURA ===

  canSignProposal(): boolean {
    return (
      this.signatureForm.get('client_name')?.valid === true &&
      this.signatureForm.get('client_email')?.valid === true &&
      this.signatureDrawn
      // payment_method não é mais necessário para R&S
    );
  }

  isFieldInvalid(form: FormGroup, fieldName: string): boolean {
    const field = form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  goToSigningStep(): void {
    if (this.proposalExpired || this.proposal?.status !== 'sent') {
      this.toastr.error('Esta proposta não está disponível para assinatura');
      return;
    }
    this.currentStep = 'signing';
    setTimeout(() => this.initializeSignatureCanvas(), 100);
  }

  // === MÉTODOS DE ASSINATURA ===

  initializeSignatureCanvas(retryCount: number = 0): void {
    const maxRetries = 10;

    if (!this.signatureCanvas || !this.signatureCanvas.nativeElement) {
      if (retryCount < maxRetries) {
        setTimeout(() => this.initializeSignatureCanvas(retryCount + 1), 200);
      }
      return;
    }

    const canvas = this.signatureCanvas.nativeElement;
    const parent = canvas.parentElement;

    if (!parent) {
      if (retryCount < maxRetries) {
        setTimeout(() => this.initializeSignatureCanvas(retryCount + 1), 200);
      }
      return;
    }

    const rect = parent.getBoundingClientRect();

    if (rect.width === 0) {
      if (retryCount < maxRetries) {
        setTimeout(() => this.initializeSignatureCanvas(retryCount + 1), 200);
      }
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = 250 * dpr;

    canvas.style.width = `${rect.width}px`;
    canvas.style.height = '250px';

    this.signatureContext = canvas.getContext('2d');

    if (this.signatureContext) {
      this.signatureContext.scale(dpr, dpr);
      this.signatureContext.strokeStyle = '#000000';
      this.signatureContext.lineWidth = 2;
      this.signatureContext.lineCap = 'round';
      this.signatureContext.lineJoin = 'round';
    }
  }

  startDrawing(event: MouseEvent): void {
    if (!this.signatureContext) return;

    event.preventDefault();
    this.isDrawing = true;
    const rect = this.signatureCanvas.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.signatureContext.beginPath();
    this.signatureContext.moveTo(x, y);
  }

  draw(event: MouseEvent): void {
    if (!this.isDrawing || !this.signatureContext) return;

    event.preventDefault();
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

    // Validar valor total da proposta (para R&S, valor 0 é permitido pois será calculado depois)
    const totalValue = this.getTotalValue();
    const isRecruitment = this.proposal?.type === 'Recrutamento & Seleção';

    if (!isRecruitment && (!totalValue || totalValue <= 0)) {
      this.toastr.error('Erro: valor da proposta inválido. Por favor, recarregue a página.');
      return;
    }

    this.isSubmitting = true;

    try {
      const canvas = this.signatureCanvas.nativeElement;
      const signatureDataUrl = canvas.toDataURL();

      const signatureData: SignatureData = {
        signature_data: signatureDataUrl,
        ...this.signatureForm.value,
        final_value: totalValue || 0, // Para R&S, pode ser 0
        payment_type: 'vista', // R&S sempre à vista
        payment_method: 'Boleto', // Forma de pagamento padrão para R&S
        installments: 1
      };

      const response = await this.publicProposalService.signProposal(this.token, signatureData).toPromise();
      if (response?.success) {
        this.showSuccessModal = true;
        this.currentStep = 'completed';

        setTimeout(() => {
          this.closeSuccessModal();
        }, 5000);
      }
    } catch (error) {
      console.error('Erro ao assinar proposta:', error);
      this.toastr.error('Erro ao processar assinatura');
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

  getTotalValue(): number {
    if (!this.proposal || !this.proposal.total_value) {
      return 0;
    }
    // Garantir que o valor seja um número positivo válido
    const value = Number(this.proposal.total_value);
    return value > 0 ? value : 0;
  }

  formatCurrency(value: number): string {
    if (typeof value !== 'number' || value === null || value === undefined || isNaN(value)) {
      return 'R$ 0,00';
    }

    try {
      return this.publicProposalService.formatCurrency(value);
    } catch (error) {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
      }).format(value);
    }
  }

  formatDescription(description: string): SafeHtml {
    if (!description) return this.sanitizer.bypassSecurityTrustHtml('');

    const isHtml = description.includes('<') && description.includes('>');
    let formatted = description;

    if (isHtml) {
      formatted = description
        .replace(/<\/p>/gi, '</p>\n')
        .replace(/<\/div>/gi, '</div>\n')
        .replace(/<p[^>]*>(&nbsp;|\s|<br\/?>)*<\/p>/gi, '<br>')
        .replace(/<div[^>]*>(&nbsp;|\s|<br\/?>)*<\/div>/gi, '<br>')
        .replace(/<br\s*\/?>/gi, '<br>')
        .replace(/<ul>/gi, '<ul style="margin-left: 3rem !important; padding-left: 1.5rem !important;">')
        .replace(/<ol>/gi, '<ol style="margin-left: 3rem !important; padding-left: 1.5rem !important;">');
    } else {
      formatted = description
        .replace(/\n\n+/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/  /g, '&nbsp;&nbsp;')
        .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');

      formatted = `<p>${formatted}</p>`;
    }

    const wrapped = `<div class="service-description" style="white-space: pre-line; line-height: 1.8; font-family: inherit; color: #022c22;">${formatted}</div>`;
    return this.sanitizer.bypassSecurityTrustHtml(wrapped);
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
      'signed': 'Fechada',
      'accepted': 'Aceita',
      'rejected': 'Rejeitada',
      'expired': 'Expirada',
      'converted': 'Assinada',
      'contraproposta': 'Assinada Parcialmente'
    };
    return texts[status] || status;
  }

  // === LANDING PAGE METHODS ===

  onImageError(event: any): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';

    const photoFrame = img.parentElement;
    if (photoFrame) {
      const placeholder = photoFrame.querySelector('.photo-placeholder');
      if (placeholder) {
        (placeholder as HTMLElement).style.display = 'flex';
      }
    }
  }

  onClientLogoError(event: any): void {
    event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIiBzdHJva2U9IiNkZGQiIHN0cm9rZS13aWR0aD0iMiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5DbGllbnRlPC90ZXh0Pjwvc3ZnPg==';
  }

  private initializeClientLogos(): void {
    this.clients = this.clientLogos.map(logoFile => ({
      name: this.getClientNameFromLogo(logoFile),
      logo: `/cliente-logos/${logoFile}`
    }));

    this.clients = [...this.clients, ...this.clients];
  }

  private getClientNameFromLogo(logoFile: string): string {
    const name = logoFile.replace(/\.[^/.]+$/, "");

    const nameMap: { [key: string]: string } = {
      'city': 'City',
      'Logo-CMO-Construtora': 'CMO Construtora',
      'logo-adao': 'Adão',
      'Séren': 'Séren',
      'Habitat': 'Habitat',
      'TopConstrutora': 'Top Construtora',
      'raizUrbana': 'Raiz Urbana',
      'Elmo-inc': 'Elmo Incorporações',
      'myBroker': 'My Broker',
      'URBS One - Assinaturas_Separadas-01 (1)': 'URBS One',
      'URBS infinity P cima (1)': 'URBS Infinity',
      'UrbsTrend': 'URBS Trend',
      'haut': 'Haut',
      'realize': 'Realize',
      'haura_principal_preto (1)': 'Haura',
      'RDiniz': 'R. Diniz',
      'Logo-Lopes-Consultoria-de-Imoveis-2020': 'Lopes Consultoria',
      'EBM': 'EBM'
    };

    return nameMap[name] || name.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private initializeCarousel(): void {
    this.startProgressAnimation();
  }

  private startProgressAnimation(): void {
    const animationDuration = 80000;
    const updateInterval = 100;
    let elapsed = 0;

    this.progressInterval = setInterval(() => {
      if (!this.isManualControl) {
        elapsed += updateInterval;
        this.carouselProgress = (elapsed % animationDuration) / animationDuration * 100;
      }
    }, updateInterval);
  }

  scrollCarousel(direction: 'prev' | 'next'): void {
    this.isManualControl = true;

    if (direction === 'next') {
      this.carouselProgress = Math.min(100, this.carouselProgress + 10);
    } else {
      this.carouselProgress = Math.max(0, this.carouselProgress - 10);
    }

    if (this.manualControlTimeout) {
      clearTimeout(this.manualControlTimeout);
    }

    this.manualControlTimeout = setTimeout(() => {
      this.isManualControl = false;
    }, 3000);
  }

  pauseCarousel(): void {
    this.isManualControl = true;
  }

  resumeCarousel(): void {
    if (this.manualControlTimeout) {
      clearTimeout(this.manualControlTimeout);
    }

    this.manualControlTimeout = setTimeout(() => {
      this.isManualControl = false;
    }, 1000);
  }

  startDrag(event: MouseEvent): void {
    this.isDragging = true;
    this.startX = event.clientX;
    this.initialTransformX = this.getCurrentTransformValue();
    this.pauseCarousel();
    event.preventDefault();
  }

  onDrag(event: MouseEvent): void {
    if (!this.isDragging) return;

    this.currentX = event.clientX;
    const deltaX = this.currentX - this.startX;
    const newTransformX = this.initialTransformX + deltaX;

    this.currentTransform = `translateX(${newTransformX}px)`;
    event.preventDefault();
  }

  endDrag(): void {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.currentTransform = '';

    setTimeout(() => {
      this.resumeCarousel();
    }, 1000);
  }

  startTouch(event: TouchEvent): void {
    this.isDragging = true;
    this.startX = event.touches[0].clientX;
    this.initialTransformX = this.getCurrentTransformValue();
    this.pauseCarousel();
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.isDragging) return;

    this.currentX = event.touches[0].clientX;
    const deltaX = this.currentX - this.startX;
    const deltaY = Math.abs(event.touches[0].clientY - event.touches[0].clientY);

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      event.preventDefault();
    }

    const newTransformX = this.initialTransformX + deltaX;
    this.currentTransform = `translateX(${newTransformX}px)`;
  }

  endTouch(): void {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.currentTransform = '';

    setTimeout(() => {
      this.resumeCarousel();
    }, 1000);
  }

  private getCurrentTransformValue(): number {
    return 0;
  }

  // === MÉTODOS DE MÁSCARA ===

  onPhoneInput(event: any): void {
    let value = event.target.value.replace(/\D/g, '');

    if (value.length <= 11) {
      if (value.length <= 2) {
        value = value.replace(/(\d{0,2})/, '($1');
      } else if (value.length <= 6) {
        value = value.replace(/(\d{2})(\d{0,4})/, '($1) $2');
      } else if (value.length <= 10) {
        value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
      } else {
        value = value.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
      }
    }

    event.target.value = value;
    this.signatureForm.patchValue({ client_phone: value });
  }

  onPhoneKeyPress(event: any): boolean {
    const char = String.fromCharCode(event.which);
    if (!/[0-9]/.test(char)) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  onDocumentInput(event: any): void {
    let value = event.target.value.replace(/\D/g, '');

    if (value.length <= 11) {
      if (value.length <= 3) {
        value = value.replace(/(\d{0,3})/, '$1');
      } else if (value.length <= 6) {
        value = value.replace(/(\d{3})(\d{0,3})/, '$1.$2');
      } else if (value.length <= 9) {
        value = value.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
      } else {
        value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
      }
    } else {
      if (value.length <= 2) {
        value = value.replace(/(\d{0,2})/, '$1');
      } else if (value.length <= 5) {
        value = value.replace(/(\d{2})(\d{0,3})/, '$1.$2');
      } else if (value.length <= 8) {
        value = value.replace(/(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3');
      } else if (value.length <= 12) {
        value = value.replace(/(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4');
      } else {
        value = value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5');
      }
    }

    event.target.value = value;
    this.signatureForm.patchValue({ client_document: value });
  }

  onDocumentKeyPress(event: any): boolean {
    const char = String.fromCharCode(event.which);
    if (!/[0-9]/.test(char)) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  onPaymentMethodChange(method: string): void {
    this.paymentMethod = method;
    this.signatureForm.patchValue({ payment_method: method });
  }

  // === MÉTODOS DA EQUIPE ===

  getTeamMemberPhotoUrl(member: PublicTeamMember): string {
    if (member.is_fixed && member.profile_picture_url) {
      return member.profile_picture_url;
    }

    if (member.profile_picture_url) {
      return member.profile_picture_url;
    }

    if (member.profile_picture_path && typeof member.id === 'number' && member.id > 0) {
      return this.publicTeamService.getProfilePictureUrl(member.id);
    }

    return '';
  }

  getTeamMemberInitials(name: string): string {
    if (!name) return 'NN';

    const words = name.split(' ').filter(word => word.length > 0);

    if (words.length === 0) return 'NN';
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();

    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }

  trackByMemberId(index: number, member: PublicTeamMember): number | string {
    return member.id;
  }

  // === TEAM CAROUSEL METHODS ===

  private initializeTeamCarousel(): void {
    if (this.teamMembers.length > 0) {
      const copies = 10;
      this.duplicatedTeamMembers = [];
      for (let i = 0; i < copies; i++) {
        this.duplicatedTeamMembers = [...this.duplicatedTeamMembers, ...this.teamMembers];
      }
      this.startInfiniteCarousel();
    }
  }

  private startInfiniteCarousel(): void {
    let position = 0;
    const speed = 2;

    const animate = () => {
      if (!this.isTeamManualControl && !this.isTeamDragging) {
        position += speed;
        this.currentTeamTransform = `translateX(-${position}px)`;

        if (position > 50000) {
          position = 0;
        }
      }

      this.teamAnimationId = requestAnimationFrame(animate);
    };

    animate();
  }

  pauseTeamCarousel(): void {
    this.isTeamManualControl = true;
  }

  resumeTeamCarousel(): void {
    if (this.teamManualControlTimeout) {
      clearTimeout(this.teamManualControlTimeout);
    }

    this.teamManualControlTimeout = setTimeout(() => {
      this.isTeamManualControl = false;
    }, 1000);
  }

  startTeamDrag(event: MouseEvent): void {
    this.isTeamDragging = true;
    this.teamStartX = event.clientX;
    this.teamInitialTransformX = this.getCurrentTeamTransformValue();
    this.pauseTeamCarousel();
    event.preventDefault();
  }

  onTeamDrag(event: MouseEvent): void {
    if (!this.isTeamDragging) return;

    this.teamCurrentX = event.clientX;
    const deltaX = this.teamCurrentX - this.teamStartX;
    const newTransformX = this.teamInitialTransformX + deltaX;

    this.currentTeamTransform = `translateX(${newTransformX}px)`;
    event.preventDefault();
  }

  endTeamDrag(): void {
    if (!this.isTeamDragging) return;

    this.isTeamDragging = false;
    this.currentTeamTransform = '';

    setTimeout(() => {
      this.resumeTeamCarousel();
    }, 1000);
  }

  startTeamTouch(event: TouchEvent): void {
    this.isTeamDragging = true;
    this.teamStartX = event.touches[0].clientX;
    this.teamInitialTransformX = this.getCurrentTeamTransformValue();
    this.pauseTeamCarousel();
  }

  onTeamTouchMove(event: TouchEvent): void {
    if (!this.isTeamDragging) return;

    this.teamCurrentX = event.touches[0].clientX;
    const deltaX = this.teamCurrentX - this.teamStartX;
    const deltaY = Math.abs(event.touches[0].clientY - event.touches[0].clientY);

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      event.preventDefault();
    }

    const newTransformX = this.teamInitialTransformX + deltaX;
    this.currentTeamTransform = `translateX(${newTransformX}px)`;
  }

  endTeamTouch(): void {
    if (!this.isTeamDragging) return;

    this.isTeamDragging = false;
    this.currentTeamTransform = '';

    setTimeout(() => {
      this.resumeTeamCarousel();
    }, 1000);
  }

  private getCurrentTeamTransformValue(): number {
    return 0;
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
  }

  // === MÉTODO DE TOGGLE DO FORMULÁRIO ===

  toggleSignatureForm(): void {
    this.isSignatureFormExpanded = !this.isSignatureFormExpanded;
    if (this.isSignatureFormExpanded) {
      // Aguardar animação e inicializar canvas
      setTimeout(() => {
        this.initializeSignatureCanvas();
      }, 300);
    }
  }

  // === MÉTODOS DE PORCENTAGENS DE R&S ===

  hasRecruitmentPercentages(): boolean {
    // Sempre mostrar a seção de investimento para propostas de R&S
    return !!(this.proposal && this.proposal.type === 'Recrutamento & Seleção');
  }

  getRecruitmentPercentage(type: 'administrativo_gestao' | 'comercial' | 'operacional' | 'estagio_jovem'): number {
    if (!this.proposal || !this.proposal.services || this.proposal.services.length === 0) {
      // Valores padrão caso não haja porcentagens definidas
      const defaults = {
        administrativo_gestao: 80,
        comercial: 80,
        operacional: 70,
        estagio_jovem: 100
      };
      return defaults[type];
    }

    // Pegar as porcentagens do primeiro serviço que tiver
    const serviceWithPercentages = this.proposal.services.find(s => s.recruitmentPercentages);

    if (serviceWithPercentages && serviceWithPercentages.recruitmentPercentages) {
      return serviceWithPercentages.recruitmentPercentages[type] || 0;
    }

    // Se não encontrar, retornar valores padrão
    const defaults = {
      administrativo_gestao: 80,
      comercial: 80,
      operacional: 70,
      estagio_jovem: 100
    };
    return defaults[type];
  }
}
