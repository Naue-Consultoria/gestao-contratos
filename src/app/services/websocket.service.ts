import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Notification } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private socket: Socket | undefined;
  
  private readonly WEBSOCKET_URL = environment.apiUrl.replace('/api', '');

  connect(userId: number): void {
    if (this.socket?.connected) {
      console.log('🔌 WebSocket já está conectado.');
      return;
    }

    this.socket = io(this.WEBSOCKET_URL);

    this.socket.on('connect', () => {
      console.log(`✅ Conectado ao servidor WebSocket com socket ID: ${this.socket?.id}`);
      this.socket?.emit('register', userId);
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Desconectado do servidor WebSocket.');
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
    }
  }

  listenForNewNotifications(): Observable<Notification> {
    return new Observable(observer => {
      this.socket?.on('new_notification', (notification: Notification) => {
        console.log('📬 Nova notificação recebida via WebSocket:', notification);
        observer.next(notification);
      });
    });
  }
}