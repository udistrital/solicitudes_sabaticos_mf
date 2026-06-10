import { Injectable } from '@angular/core';
import { RequestManager } from '../../managers/requestManager';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PopUpManager } from '../../managers/popUpManager';

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
  providedIn: 'root',
})
export class NotificacionService {
  constructor(
    private readonly requestManager: RequestManager,
    private readonly popUpManager: PopUpManager,
  ) {
    this.requestManager.setPath('NOTIFICACION_MID_SERVICE');
  }

  enviarTemplatedEmail(body: EmailTemplatedBody): Observable<any> {
    this.requestManager.setPath('NOTIFICACION_MID_SERVICE');
    return this.requestManager.post('email/enviar_templated_email/', body);
  }

  sendNotification(
    templateName: string,
    role: string,
    data: Record<string, string>,
  ): void {
    const emailConfig = environment.notifications;
    const email = emailConfig.mode === 'testing'
      ? emailConfig.testEmail
      : (emailConfig.emailsByRole as Record<string, string>)[role];

    if (!email) {
      console.error(`No hay correo configurado para el rol: ${role}`);
      return;
    }

    this.enviarTemplatedEmail({
      Source: 'notificacionessga@udistrital.edu.co',
      Template: templateName,
      Destinations: [{
        Destination: { ToAddresses: [email] },
        ReplacementTemplateData: data,
      }],
      DefaultTemplateData: {},
    }).subscribe({
      error: (err) => {
        console.error(`Error enviando notificación ${templateName}:`, err);
        this.popUpManager.showErrorToast('Error al enviar notificación por correo electrónico');
      },
    });
  }
}
