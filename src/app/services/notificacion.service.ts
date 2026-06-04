import { Injectable } from '@angular/core';
import { RequestManager } from '../../managers/requestManager';
import { Observable } from 'rxjs';

export interface EmailTemplatedDestination {
  Destination: {
    ToAddresses: string[];
  };
  ReplacementTemplateData: Record<string, string>;
}

export interface EmailTemplatedBody {
  Source: string;
  Template: string;
  Destinations: EmailTemplatedDestination[];
  DefaultTemplateData: Record<string, string>;
}

@Injectable({
  providedIn: 'root'
})
export class NotificacionService {

  constructor(private readonly requestManager: RequestManager) {
    this.requestManager.setPath('NOTIFICACION_MID_SERVICE');
  }

  enviarTemplatedEmail(body: EmailTemplatedBody): Observable<any> {
    this.requestManager.setPath('NOTIFICACION_MID_SERVICE');
    return this.requestManager.post('email/enviar_templated_email/', body);
  }
}
