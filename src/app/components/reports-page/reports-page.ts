// src/app/components/reports-page/reports-page.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../services/report';
import { ClientService } from '../../services/client';
import { ToastrService } from 'ngx-toastr';

interface ReportConfig {
  clientId: string;
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
  clients: any[] = []; // Usando any[] para evitar problemas de tipo
  
  // Configuração individual para cada tipo de relatório
  monthlyReport: ReportConfig = {
    clientId: '',
    format: 'pdf',
    isLoading: false
  };

  clientReport: ReportConfig = {
    clientId: '',
    format: 'pdf',
    isLoading: false
  };

  servicesReport: ReportConfig = {
    clientId: '',
    format: 'pdf',
    isLoading: false
  };

  financialReport: ReportConfig = {
    clientId: '',
    format: 'pdf',
    isLoading: false
  };

  constructor(
    private reportService: ReportService,
    private clientService: ClientService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadClients();
  }

  loadClients() {
    this.clientService.getClients().subscribe({
      next: (response: any) => {
        // Verificar se a resposta tem a propriedade clients
        if (response && response.clients) {
          this.clients = response.clients;
        } else if (Array.isArray(response)) {
          this.clients = response;
        } else {
          this.clients = [];
        }
      },
      error: (error) => {
        console.error('Erro ao carregar clientes:', error);
        this.toastr.error('Erro ao carregar lista de clientes');
      }
    });
  }

  // Métodos de geração de relatórios
  generateMonthlyReport() {
    if (!this.monthlyReport.clientId) {
      this.toastr.warning('Selecione um cliente');
      return;
    }

    this.monthlyReport.isLoading = true;
    
    this.reportService.generateMonthlyReport({
      clientId: this.monthlyReport.clientId,
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

  generateClientReport() {
    if (!this.clientReport.clientId) {
      this.toastr.warning('Selecione um cliente');
      return;
    }

    this.clientReport.isLoading = true;
    
    this.reportService.generateClientReport({
      clientId: this.clientReport.clientId,
      format: this.clientReport.format
    }).subscribe({
      next: (blob) => {
        const filename = `relatorio_cliente_${new Date().toISOString().split('T')[0]}.${this.clientReport.format === 'pdf' ? 'pdf' : 'xlsx'}`;
        this.reportService.downloadFile(blob, filename);
        this.toastr.success('Relatório gerado com sucesso!');
        this.clientReport.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao gerar relatório:', error);
        this.toastr.error('Erro ao gerar relatório');
        this.clientReport.isLoading = false;
      }
    });
  }

  generateServicesReport() {
    if (!this.servicesReport.clientId) {
      this.toastr.warning('Selecione um cliente');
      return;
    }

    this.servicesReport.isLoading = true;
    
    this.reportService.generateServicesReport({
      clientId: this.servicesReport.clientId,
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
    if (!this.financialReport.clientId) {
      this.toastr.warning('Selecione um cliente');
      return;
    }

    this.financialReport.isLoading = true;
    
    this.reportService.generateFinancialReport({
      clientId: this.financialReport.clientId,
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