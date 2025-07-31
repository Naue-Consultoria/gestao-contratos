import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService, ReportRequest } from '../../services/report';
import { ServiceService } from '../../services/service';
import { CompanyService } from '../../services/company';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';

interface ReportConfig {
  companyId?: string;
  serviceId?: string;
  format: 'pdf' | 'excel';
  isLoading: boolean;
}

type GeneralReportConfig = Omit<ReportConfig, 'companyId'> & { companyId?: string };

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports-page.html',
  styleUrls: ['./reports-page.css']
})
export class ReportsPage implements OnInit {
  companies: any[] = [];
  services: any[] = [];
  
  monthlyReport: GeneralReportConfig = { format: 'pdf', isLoading: false };
  financialReport: GeneralReportConfig = { format: 'pdf', isLoading: false };
  companyReport: ReportConfig = { companyId: '', format: 'pdf', isLoading: false };
  servicesReport: ReportConfig = { companyId: '', serviceId: '', format: 'pdf', isLoading: false };

  constructor(
    private reportService: ReportService,
    private companyService: CompanyService,
    private serviceService: ServiceService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadCompanies();
  }

  loadInitialData() {
    this.loadCompanies();
    this.loadServices();
  }

  loadCompanies() {
    this.companyService.getCompanies().subscribe({
      next: (response: any) => {
        this.companies = response?.companies || [];
      },
      error: (error) => {
        console.error('Erro ao carregar empresas:', error);
        this.toastr.error('Erro ao carregar lista de empresas');
      }
    });
  }

  loadServices() {
    this.serviceService.getServices({ is_active: true }).subscribe({
      next: (response: any) => {
        this.services = response?.services || [];
      },
      error: (error) => {
        console.error('Erro ao carregar serviços:', error);
        this.toastr.error('Erro ao carregar lista de serviços');
      }
    });
  }

  generateReport(reportType: 'monthly' | 'company' | 'services' | 'financial', config: ReportConfig) {
    // Validation logic for reports that require a company
    if ((reportType === 'company' || reportType === 'services') && !config.companyId) {
      this.toastr.warning('Por favor, selecione uma empresa.');
      return;
    }
    // Validation for the services report
    if (reportType === 'services' && !config.serviceId) {
      this.toastr.warning('Por favor, selecione um serviço.');
      return;
    }

    config.isLoading = true;
    const requestData: ReportRequest = {
      companyId: config.companyId,
      serviceId: config.serviceId,
      format: config.format
    };

    let reportObservable: Observable<Blob>;
    let fileName = `relatorio_${reportType}_${new Date().toISOString().split('T')[0]}`;

    switch (reportType) {
      case 'monthly':
        reportObservable = this.reportService.generateMonthlyReport(requestData);
        break;
      case 'company':
        reportObservable = this.reportService.generateCompanyReport(requestData);
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