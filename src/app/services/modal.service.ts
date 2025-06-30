import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { ApiCompany } from './company';
import { ApiUser } from './user';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  // Subjects para controlar a abertura dos modais
  openContractModal$ = new Subject<void>();
  openCompanyModal$ = new Subject<ApiCompany | void>();
  openUserModal$ = new Subject<ApiUser | void>();
  
  // Subjects para notificações
  showNotification$ = new Subject<{ message: string; isSuccess: boolean }>();
  
  // Métodos convenientes para abrir modais
  openContractModal() {
    this.openContractModal$.next();
  }
  
  openCompanyModal(company?: ApiCompany) {
    this.openCompanyModal$.next(company);
  }
  
  openUserModal(user?: ApiUser) {
    this.openUserModal$.next(user);
  }
  
  // Método para mostrar notificações
  showNotification(message: string, isSuccess: boolean = true) {
    this.showNotification$.next({ message, isSuccess });
  }
}