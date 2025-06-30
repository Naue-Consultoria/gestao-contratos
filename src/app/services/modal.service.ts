import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  // Subjects para controlar a abertura dos modais
  openContractModal$ = new Subject<void>();
  openCompanyModal$ = new Subject<void>();
  openUserModal$ = new Subject<void>();
  
  // Subjects para notificações
  showNotification$ = new Subject<{ message: string; isSuccess: boolean }>();
  
  // Métodos convenientes para abrir modais
  openContractModal() {
    this.openContractModal$.next();
  }
  
  openCompanyModal() {
    this.openCompanyModal$.next();
  }
  
  openUserModal() {
    this.openUserModal$.next();
  }
  
  // Método para mostrar notificações
  showNotification(message: string, isSuccess: boolean = true) {
    this.showNotification$.next({ message, isSuccess });
  }
}