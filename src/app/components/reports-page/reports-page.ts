import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService, ReportRequest } from '../../services/report';
import { ClientService } from '../../services/client';
import { ServiceService } from '../../services/service';
import { ContractService } from '../../services/contract';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';

interface ReportConfig {
  clientId: string;
  serviceId?: string;
  contractId?: string;
  format: 'pdf' | 'excel';
  isLoading: boolean;
  startDate?: string;
  endDate?: string;
}

type GeneralReportConfig = Omit<ReportConfig, 'clientId'> & { clientId?: string };

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './reports-page.html',
  styleUrls: ['./reports-page.css']
})
export class ReportsPage implements OnInit {
  clients: any[] = [];
  services: any[] = [];
  clientContracts: any[] = [];
  
  monthlyReport: GeneralReportConfig = { format: 'pdf', isLoading: false };
  financialReport: GeneralReportConfig = { format: 'pdf', isLoading: false };
  clientReport: ReportConfig = { clientId: '', format: 'pdf', isLoading: false };
  servicesReport: ReportConfig = { clientId: '', serviceId: '', format: 'pdf', isLoading: false };
  serviceRoutinesReport: ReportConfig = { clientId: '', format: 'pdf', isLoading: false };

  constructor(
    private reportService: ReportService,
    private clientService: ClientService,
    private serviceService: ServiceService,
    private contractService: ContractService,
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

  onClientChange(event: any) {
    const clientId = event.target.value;
    if (clientId) {
      this.loadClientContracts(clientId);
    } else {
      this.clientContracts = [];
    }
    // Reset contract selection when client changes
    this.serviceRoutinesReport.contractId = '';
  }

  loadClientContracts(clientId: string) {
    this.contractService.getContracts({ client_id: clientId }).subscribe({
      next: (response: any) => {
        this.clientContracts = response?.contracts || [];
      },
      error: (error: any) => {
        console.error('Erro ao carregar contratos:', error);
        this.toastr.error('Erro ao carregar contratos do cliente');
        this.clientContracts = [];
      }
    });
  }

  generateReport(reportType: 'monthly' | 'client' | 'services' | 'financial' | 'serviceRoutines', config: ReportConfig | GeneralReportConfig) {
    if ((reportType === 'client' || reportType === 'serviceRoutines') && !config.clientId) {
      this.toastr.warning('Por favor, selecione um cliente.');
      return;
    }
    if (reportType === 'services' && !config.serviceId) {
      this.toastr.warning('Por favor, selecione um serviço.');
      return;
    }

    config.isLoading = true;
    const requestData: ReportRequest = {
      clientId: config.clientId || '',
      serviceId: config.serviceId,
      contractId: config.contractId && config.contractId !== '' ? config.contractId : undefined,
      format: config.format,
      startDate: config.startDate,
      endDate: config.endDate
    };

    let reportObservable: Observable<Blob>;
    let fileName = '';

    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');

    switch (reportType) {
      case 'monthly':
        fileName = `relatorio_mensal_${year}_${month}`;
        reportObservable = this.reportService.generateMonthlyReport(requestData);
        break;
      case 'client':
        const client = this.clients.find(c => c.id === parseInt(config.clientId as string, 10));
        const clientName = client ? client.name.replace(/\s+/g, '_').toLowerCase() : 'cliente';
        fileName = `relatorio_cliente_${clientName}_${year}_${month}`;
        reportObservable = this.reportService.generateClientReport(requestData);
        break;
      case 'services':
        const service = this.services.find(s => s.id === parseInt(config.serviceId as string, 10));
        const serviceName = service ? service.name.replace(/\s+/g, '_').toLowerCase() : 'servico';
        fileName = `relatorio_servico_${serviceName}_${year}_${month}`;
        reportObservable = this.reportService.generateServicesReport(requestData);
        break;
      case 'financial':
        fileName = `relatorio_financeiro_${year}_${month}`;
        reportObservable = this.reportService.generateFinancialReport(requestData);
        break;
      case 'serviceRoutines':
        const routineClient = this.clients.find(c => c.id === parseInt(config.clientId as string, 10));
        const routineClientName = routineClient ? routineClient.name.replace(/\s+/g, '_').toLowerCase() : 'cliente';
        fileName = `relatorio_rotinas_${routineClientName}_${year}_${month}`;
        reportObservable = this.reportService.generateServiceRoutinesReport(requestData);
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