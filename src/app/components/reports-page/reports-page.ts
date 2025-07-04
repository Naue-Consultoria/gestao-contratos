// src/app/components/reports-page/reports-page.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../services/report';
import { CompanyService } from '../../services/company';
import { ToastrService } from 'ngx-toastr';

interface ReportConfig {
  companyId: string;
  format: 'pdf' | 'excel';
  isLoading: boolean;
}

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports-page.html',
  styleUrls: ['./reports-page.css']
})
export class ReportsPage implements OnInit {
  companies: any[] = []; // Usando any[] para evitar problemas de tipo
  
  // Configuração individual para cada tipo de relatório
  monthlyReport: ReportConfig = {
    companyId: '',
    format: 'pdf',
    isLoading: false
  };

  companyReport: ReportConfig = {
    companyId: '',
    format: 'pdf',
    isLoading: false
  };

  servicesReport: ReportConfig = {
    companyId: '',
    format: 'pdf',
    isLoading: false
  };

  financialReport: ReportConfig = {
    companyId: '',
    format: 'pdf',
    isLoading: false
  };

  constructor(
    private reportService: ReportService,
    private companyService: CompanyService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadCompanies();
  }

  loadCompanies() {
    this.companyService.getCompanies().subscribe({
      next: (response: any) => {
        // Verificar se a resposta tem a propriedade companies
        if (response && response.companies) {
          this.companies = response.companies;
        } else if (Array.isArray(response)) {
          this.companies = response;
        } else {
          this.companies = [];
        }
      },
      error: (error) => {
        console.error('Erro ao carregar empresas:', error);
        this.toastr.error('Erro ao carregar lista de empresas');
      }
    });
  }

  // Métodos de geração de relatórios
  generateMonthlyReport() {
    if (!this.monthlyReport.companyId) {
      this.toastr.warning('Selecione uma empresa');
      return;
    }

    this.monthlyReport.isLoading = true;
    
    this.reportService.generateMonthlyReport({
      companyId: this.monthlyReport.companyId,
      format: this.monthlyReport.format
    }).subscribe({
      next: (blob) => {
        const filename = `relatorio_mensal_${new Date().toISOString().split('T')[0]}.${this.monthlyReport.format === 'pdf' ? 'pdf' : 'xlsx'}`;
        this.reportService.downloadFile(blob, filename);
        this.toastr.success('Relatório gerado com sucesso!');
        this.monthlyReport.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao gerar relatório:', error);
        this.toastr.error('Erro ao gerar relatório');
        this.monthlyReport.isLoading = false;
      }
    });
  }

  generateCompanyReport() {
    if (!this.companyReport.companyId) {
      this.toastr.warning('Selecione uma empresa');
      return;
    }

    this.companyReport.isLoading = true;
    
    this.reportService.generateCompanyReport({
      companyId: this.companyReport.companyId,
      format: this.companyReport.format
    }).subscribe({
      next: (blob) => {
        const filename = `relatorio_empresa_${new Date().toISOString().split('T')[0]}.${this.companyReport.format === 'pdf' ? 'pdf' : 'xlsx'}`;
        this.reportService.downloadFile(blob, filename);
        this.toastr.success('Relatório gerado com sucesso!');
        this.companyReport.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao gerar relatório:', error);
        this.toastr.error('Erro ao gerar relatório');
        this.companyReport.isLoading = false;
      }
    });
  }

  generateServicesReport() {
    if (!this.servicesReport.companyId) {
      this.toastr.warning('Selecione uma empresa');
      return;
    }

    this.servicesReport.isLoading = true;
    
    this.reportService.generateServicesReport({
      companyId: this.servicesReport.companyId,
      format: this.servicesReport.format
    }).subscribe({
      next: (blob) => {
        const filename = `relatorio_servicos_${new Date().toISOString().split('T')[0]}.${this.servicesReport.format === 'pdf' ? 'pdf' : 'xlsx'}`;
        this.reportService.downloadFile(blob, filename);
        this.toastr.success('Relatório gerado com sucesso!');
        this.servicesReport.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao gerar relatório:', error);
        this.toastr.error('Erro ao gerar relatório');
        this.servicesReport.isLoading = false;
      }
    });
  }

  generateFinancialReport() {
    if (!this.financialReport.companyId) {
      this.toastr.warning('Selecione uma empresa');
      return;
    }

    this.financialReport.isLoading = true;
    
    this.reportService.generateFinancialReport({
      companyId: this.financialReport.companyId,
      format: this.financialReport.format
    }).subscribe({
      next: (blob) => {
        const filename = `relatorio_financeiro_${new Date().toISOString().split('T')[0]}.${this.financialReport.format === 'pdf' ? 'pdf' : 'xlsx'}`;
        this.reportService.downloadFile(blob, filename);
        this.toastr.success('Relatório gerado com sucesso!');
        this.financialReport.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao gerar relatório:', error);
        this.toastr.error('Erro ao gerar relatório');
        this.financialReport.isLoading = false;
      }
    });
  }
}