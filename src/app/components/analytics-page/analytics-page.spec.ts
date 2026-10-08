import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { AnalyticsPageComponent } from './analytics-page';
import { ContractCompletionData } from '../../services/analytics';

describe('AnalyticsPageComponent', () => {
  let component: AnalyticsPageComponent;
  let fixture: ComponentFixture<AnalyticsPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalyticsPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnalyticsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

/**
 * Gráfico "Taxa de Conclusão por Contrato".
 *
 * Contratos com 0% eram descartados quando "Todos os clientes" estava
 * selecionado: um contrato recém-fechado (ex.: NAUE-2026-0082) aparecia na
 * tela de Contratos e sumia do Analytics.
 */
describe('AnalyticsPageComponent - filtro de contratos por conclusão', () => {
  const contrato = (overrides: Partial<ContractCompletionData>): ContractCompletionData => ({
    contractId: 1,
    contractNumber: 'NAUE-2026-0001',
    clientId: 1,
    clientName: 'Cliente',
    type: 'Full',
    totalServices: 4,
    completedServices: 0,
    completionPercentage: 0,
    status: 'active',
    startDate: '2026-01-01',
    ...overrides,
  });

  const dados: ContractCompletionData[] = [
    contrato({ contractId: 1, contractNumber: 'NAUE-2026-0082', clientId: 10, type: 'Pontual', completionPercentage: 0 }),
    contrato({ contractId: 2, contractNumber: 'NAUE-2026-0056', clientId: 20, completionPercentage: 33 }),
    contrato({ contractId: 3, contractNumber: 'NAUE-2025-0027', clientId: 30, completionPercentage: 100, completedServices: 4 }),
    // R&S não tem etapas de serviço: sempre 0%, e tem Analytics próprio
    contrato({ contractId: 4, contractNumber: 'NAUE-2026-0040', clientId: 40, clientName: 'Bah Porto', type: 'Recrutamento & Seleção', totalServices: 0, completionPercentage: 0 }),
  ];

  let component: AnalyticsPageComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalyticsPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    component = TestBed.createComponent(AnalyticsPageComponent).componentInstance;
    component.analyticsData = { contractCompletionData: dados } as any;
    component.selectedClientId = null;
    component.selectedContractType = null;
  });

  const filtrados = () => (component as any).getFilteredContractData() as ContractCompletionData[];

  it('mostra contrato com 0% na aba Em Progresso com "Todos os clientes"', () => {
    component.completionTab = 'inProgress';

    expect(filtrados().map(c => c.contractNumber)).toEqual(['NAUE-2026-0082', 'NAUE-2026-0056']);
    expect(component.inProgressContractsCount).toBe(2);
  });

  it('mantém só os 100% na aba Concluídos', () => {
    component.completionTab = 'completed';

    expect(filtrados().map(c => c.contractNumber)).toEqual(['NAUE-2025-0027']);
    expect(component.completedContractsCount).toBe(1);
  });

  it('respeita a aba também com cliente selecionado', () => {
    component.selectedClientId = 30;
    component.completionTab = 'inProgress';

    expect(filtrados()).toEqual([]);
    expect(component.inProgressContractsCount).toBe(0);
  });

  it('não mostra contratos de Recrutamento & Seleção em nenhuma aba', () => {
    component.completionTab = 'inProgress';
    expect(filtrados().map(c => c.contractNumber)).not.toContain('NAUE-2026-0040');
    expect(component.inProgressContractsCount).toBe(2);

    component.completionTab = 'completed';
    expect(filtrados().map(c => c.contractNumber)).not.toContain('NAUE-2026-0040');
    expect(component.completedContractsCount).toBe(1);
  });

  it('não lista cliente que só tem contrato de R&S no filtro de clientes', () => {
    (component as any).extractAvailableClients();
    expect(component.availableClients.map(c => c.name)).not.toContain('Bah Porto');
    expect(component.availableClients.length).toBe(3);
  });

  it('filtra por tipo de contrato sem descartar 0%', () => {
    component.selectedContractType = 'Pontual';
    component.completionTab = 'inProgress';

    expect(filtrados().map(c => c.contractNumber)).toEqual(['NAUE-2026-0082']);
  });
});
