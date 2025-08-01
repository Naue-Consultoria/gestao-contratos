import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService, ReportRequest } from '../../services/report';
import { ClientService } from '../../services/client';
import { ServiceService } from '../../services/service';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';

interface ReportConfig {
  clientId: string;
  serviceId?: string;
  format: 'pdf' | 'excel';
  isLoading: boolean;
}

type GeneralReportConfig = Omit<ReportConfig, 'clientId'> & { clientId?: string };

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports-page.html',
  styleUrls: ['./reports-page.css']
})
export class ReportsPage implements OnInit {
  clients: any[] = [];
  services: any[] = [];
  
  monthlyReport: GeneralReportConfig = { format: 'pdf', isLoading: false };
  financialReport: GeneralReportConfig = { format: 'pdf', isLoading: false };
  clientReport: ReportConfig = { clientId: '', format: 'pdf', isLoading: false };
  servicesReport: ReportConfig = { clientId: '', serviceId: '', format: 'pdf', isLoading: false };

  constructor(
    private reportService: ReportService,
    private clientService: ClientService,
    private serviceService: ServiceService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadInitialData();
  }

  loadInitialData() {
    this.loadClients();
    this.loadServices();
  }

  loadClients() {
    this.clientService.getClients().subscribe({
      next: (response: any) => {
        this.clients = response?.clients || [];
      },
      error: (error: any) => {
        console.error('Erro ao carregar clientes:', error);
        this.toastr.error('Erro ao carregar lista de clientes');
      }
    });
  }

  loadServices() {
    this.serviceService.getServices({ is_active: true }).subscribe({
      next: (response: any) => {
        this.services = response?.services || [];
      },
      error: (error: any) => {
        console.error('Erro ao carregar serviços:', error);
        this.toastr.error('Erro ao carregar lista de serviços');
      }
    });
  }

  generateReport(reportType: 'monthly' | 'client' | 'services' | 'financial', config: ReportConfig | GeneralReportConfig) {
    // Validation logic for reports that require a client
    if ((reportType === 'client' || reportType === 'services') && !config.clientId) {
      this.toastr.warning('Por favor, selecione um cliente.');
      return;
    }
    // Validation for the services report
    if (reportType === 'services' && !config.serviceId) {
      this.toastr.warning('Por favor, selecione um serviço.');
      return;
    }

    config.isLoading = true;
    const requestData: ReportRequest = {
      clientId: config.clientId || '',
      serviceId: config.serviceId,
      format: config.format
    };

    let reportObservable: Observable<Blob>;
    let fileName = `relatorio_${reportType}_${new Date().toISOString().split('T')[0]}`;

    switch (reportType) {
      case 'monthly':
        reportObservable = this.reportService.generateMonthlyReport(requestData);
        break;
      case 'client':
        reportObservable = this.reportService.generateClientReport(requestData);
        break;
      case 'services':
        reportObservable = this.reportService.generateServicesReport(requestData);
        break;
      case 'financial':
        reportObservable = this.reportService.generateFinancialReport(requestData);
        break;
    }

    reportObservable.subscribe({
      next: (blob: Blob) => {
        this.reportService.downloadFile(blob, `${fileName}.${config.format === 'pdf' ? 'pdf' : 'xlsx'}`);
        this.toastr.success('Relatório gerado com sucesso!');
        config.isLoading = false;
      },
      error: (error: any) => {
        this.toastr.error('Ocorreu um erro ao gerar o relatório.');
        config.isLoading = false;
      }
    });
  }
}