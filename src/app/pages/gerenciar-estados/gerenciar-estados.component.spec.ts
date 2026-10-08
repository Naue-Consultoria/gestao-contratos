import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ToastrService } from 'ngx-toastr';

import { GerenciarEstadosComponent } from './gerenciar-estados.component';
import { environment } from '../../../environments/environment';

/**
 * Salvar em "Estados de Atuação".
 *
 * numero e ordem são únicos no banco. Salvar linha a linha com PUT violava a
 * constraint ao trocar duas linhas de lugar, e o novo estado ia com
 * "quantidade + 1", que colidia quando a numeração tinha buraco. Agora a
 * posição das linhas vai em uma chamada só (/reorder), que o backend aplica
 * em duas fases.
 */
describe('GerenciarEstadosComponent - salvar alterações', () => {
  const API = `${environment.apiUrl}/estados-atuacao`;

  let component: GerenciarEstadosComponent;
  let http: HttpTestingController;
  let toastr: jasmine.SpyObj<ToastrService>;

  const existentes = () => ([
    { id: 1, numero: 1, estado: 'Goiás', sigla: 'GO', ordem: 1, isNew: false, isEdited: false },
    { id: 22, numero: 15, estado: 'São Paulo', sigla: 'SP', ordem: 15, isNew: false, isEdited: false },
  ]);

  const aguardar = () => new Promise(resolve => setTimeout(resolve));

  beforeEach(async () => {
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error', 'warning']);

    await TestBed.configureTestingModule({
      imports: [GerenciarEstadosComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastrService, useValue: toastr },
      ],
    }).compileComponents();

    component = TestBed.createComponent(GerenciarEstadosComponent).componentInstance;
    http = TestBed.inject(HttpTestingController);
    component.estadosRows = existentes();
  });

  afterEach(() => http.verify());

  it('novo estado recebe a próxima ordem livre, não "quantidade + 1"', () => {
    component.addNewRow();

    const nova = component.estadosRows[component.estadosRows.length - 1];
    expect(nova.numero).toBe(16);
    expect(nova.ordem).toBe(16);
  });

  it('cria o estado novo e manda a posição de todas as linhas em uma chamada', async () => {
    component.addNewRow();
    component.onEstadoSelect(2, 'RR');

    const salvando = component.saveChanges();

    const criar = http.expectOne({ method: 'POST', url: API });
    expect(criar.request.body).toEqual(jasmine.objectContaining({ estado: 'Roraima', sigla: 'RR', numero: 16, ordem: 16 }));
    criar.flush({ message: 'ok', estado: { id: 16, numero: 16, estado: 'Roraima', sigla: 'RR', ativo: true, ordem: 16 } });
    await aguardar();

    const reordenar = http.expectOne({ method: 'POST', url: `${API}/reorder` });
    expect(reordenar.request.body).toEqual({ estados: [{ id: 1 }, { id: 22 }, { id: 16 }] });
    reordenar.flush({ message: 'ok' });
    await aguardar();

    http.expectOne(req => req.method === 'GET' && req.url === API).flush({ estados: [], total: 0 });
    await salvando;

    expect(toastr.success).toHaveBeenCalled();
    expect(toastr.error).not.toHaveBeenCalled();
    http.expectNone({ method: 'PUT', url: `${API}/1` });
  });

  it('reordenação (arrastar) não salva linha a linha com PUT', async () => {
    component.onDrop({ previousIndex: 1, currentIndex: 0 } as any);

    const salvando = component.saveChanges();
    await aguardar();

    const reordenar = http.expectOne({ method: 'POST', url: `${API}/reorder` });
    expect(reordenar.request.body).toEqual({ estados: [{ id: 22 }, { id: 1 }] });
    reordenar.flush({ message: 'ok' });
    await aguardar();

    http.expectOne(req => req.method === 'GET' && req.url === API).flush({ estados: [], total: 0 });
    await salvando;

    http.expectNone(req => req.method === 'PUT');
    expect(toastr.success).toHaveBeenCalled();
  });

  it('mostra o erro do backend quando a criação falha', async () => {
    component.addNewRow();
    component.onEstadoSelect(2, 'SP');

    const salvando = component.saveChanges();

    http.expectOne({ method: 'POST', url: API })
      .flush({ error: 'São Paulo (SP) já está cadastrado' }, { status: 400, statusText: 'Bad Request' });
    await salvando;

    expect(toastr.error).toHaveBeenCalledWith('São Paulo (SP) já está cadastrado');
    http.expectNone({ method: 'POST', url: `${API}/reorder` });
  });
});
