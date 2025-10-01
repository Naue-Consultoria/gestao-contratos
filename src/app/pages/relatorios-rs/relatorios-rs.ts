import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService, ReportRequest } from '../../services/report';
import { ClientService } from '../../services/client';
import { UserService } from '../../services/user.service';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb.component';

interface ReportConfig {
  clientId?: string;
  userId?: string;
  vagaId?: string;
  format: 'pdf' | 'excel';
  isLoading: boolean;
  startDate?: string;
  endDate?: string;
}

@Component({
  selector: 'app-relatorios-rs',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './relatorios-rs.html',
  styleUrls: ['./relatorios-rs.css']
})
export class RelatoriosRsComponent implements OnInit {
  clients: any[] = [];
  consultores: any[] = [];
  vagasByClient: any[] = [];

  // Relatório Geral de R&S
  rsGeneralReport: ReportConfig = { format: 'pdf', isLoading: false };

  // Relatório por Cliente
  rsClientReport: ReportConfig = { format: 'pdf', isLoading: false };

  // Relatório por Consultora
  rsConsultoraReport: ReportConfig = { format: 'pdf', isLoading: false };

  // Relatório de Vagas Abertas
  rsOpenVacanciesReport: ReportConfig = { format: 'pdf', isLoading: false };

  // Relatório Individual de Vaga
  rsIndividualReport: ReportConfig = { format: 'pdf', isLoading: false };

  constructor(
    private reportService: ReportService,
    private clientService: ClientService,
    private userService: UserService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadInitialData();
  }

  loadInitialData() {
    this.loadClients();
    this.loadConsultores();
  }

  loadClients() {
    this.clientService.getClients().subscribe({
      next: (response: any) => {
        const clients = response?.clients || [];
        this.clients = clients.sort((a: any, b: any) =>
          a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        );
      },
      error: (error: any) => {
        console.error('Erro ao carregar clientes:', error);
        this.toastr.error('Erro ao carregar lista de clientes');
      }
    });
  }

  loadConsultores() {
    this.userService.getAll().subscribe({
      next: (response: any) => {
        const users = response?.users || response || [];
        this.consultores = users
          .filter((user: any) => user.is_active)
          .sort((a: any, b: any) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
      },
      error: (error: any) => {
        console.error('Erro ao carregar consultoras:', error);
        this.toastr.error('Erro ao carregar lista de consultoras');
      }
    });
  }

  onClientChangeIndividual() {
    this.vagasByClient = [];
    this.rsIndividualReport.vagaId = '';

    if (!this.rsIndividualReport.clientId) {
      return;
    }

    // Carregar vagas do cliente
    this.reportService.getVagasByClient(this.rsIndividualReport.clientId).subscribe({
      next: (response: any) => {
        this.vagasByClient = response?.vagas || response || [];
      },
      error: (error: any) => {
        console.error('Erro ao carregar vagas do cliente:', error);
        this.toastr.error('Erro ao carregar vagas do cliente');
      }
    });
  }

  generateReport(reportType: 'rsGeneral' | 'rsClient' | 'rsConsultora' | 'rsOpenVacancies' | 'rsIndividual', config: ReportConfig) {
    if (reportType === 'rsClient' && !config.clientId) {
      this.toastr.warning('Por favor, selecione um cliente.');
      return;
    }
    if (reportType === 'rsConsultora' && !config.userId) {
      this.toastr.warning('Por favor, selecione uma consultora.');
      return;
    }
    if (reportType === 'rsIndividual' && !config.vagaId) {
      this.toastr.warning('Por favor, selecione uma vaga.');
      return;
    }

    config.isLoading = true;
    const requestData: ReportRequest = {
      clientId: config.clientId || '',
      format: config.format,
      startDate: config.startDate,
      endDate: config.endDate
    };

    // Add userId to request for consultora report
    if (reportType === 'rsConsultora' && config.userId) {
      (requestData as any).userId = config.userId;
    }

    // Add vagaId to request for individual report
    if (reportType === 'rsIndividual' && config.vagaId) {
      (requestData as any).vagaId = config.vagaId;
    }

    let reportObservable: Observable<Blob>;
    let fileName = '';

    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');

    switch (reportType) {
      case 'rsGeneral':
        fileName = `relatorio_rs_geral_${year}_${month}`;
        reportObservable = this.reportService.generateRsGeneralReport(requestData);
        break;
      case 'rsClient':
        const client = this.clients.find(c => c.id === parseInt(config.clientId as string, 10));
        const clientName = client ? client.name.replace(/\s+/g, '_').toLowerCase() : 'cliente';
        fileName = `relatorio_rs_cliente_${clientName}_${year}_${month}`;
        reportObservable = this.reportService.generateRsClientReport(requestData);
        break;
      case 'rsConsultora':
        const consultora = this.consultores.find(u => u.id === parseInt(config.userId as string, 10));
        const consultoraName = consultora ? consultora.name.replace(/\s+/g, '_').toLowerCase() : 'consultora';
        fileName = `relatorio_rs_consultora_${consultoraName}_${year}_${month}`;
        reportObservable = this.reportService.generateRsConsultoraReport(requestData);
        break;
      case 'rsOpenVacancies':
        fileName = `relatorio_rs_vagas_abertas_${year}_${month}`;
        reportObservable = this.reportService.generateRsOpenVacanciesReport(requestData);
        break;
      case 'rsIndividual':
        const vaga = this.vagasByClient.find(v => v.id === parseInt(config.vagaId as string, 10));
        const vagaCodigo = vaga ? vaga.codigo.replace(/\s+/g, '_').toLowerCase() : 'vaga';
        fileName = `relatorio_rs_individual_${vagaCodigo}_${year}_${month}`;
        reportObservable = this.reportService.generateRsIndividualReport(requestData);
        break;
    }

    reportObservable.subscribe({
      next: (blob: Blob) => {
        this.reportService.downloadFile(blob, `${fileName}.${config.format === 'pdf' ? 'pdf' : 'xlsx'}`);
        this.toastr.success('Relatório gerado com sucesso!');
        config.isLoading = false;
      },
      error: (error: any) => {
        console.error('Erro ao gerar relatório:', error);
        this.toastr.error('Ocorreu um erro ao gerar o relatório.');
        config.isLoading = false;
      }
    });
  }
}
