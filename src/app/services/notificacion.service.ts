import { Injectable } from '@angular/core';
import { RequestManager } from '../../managers/requestManager';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PopUpManager } from '../../managers/popUpManager';
import { SecretarioEmailService } from './secretario-email.service';

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
    private readonly secretarioEmailService: SecretarioEmailService,
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
    const codigoFacultad = data['codigo_facultad'];

    if (emailConfig.emailMode === 'testing') {
      if (codigoFacultad) {
        this.secretarioEmailService.resolveEmail(codigoFacultad).subscribe({
          next: (emailConsultado) => {
            console.log('[TESTING] Correo resuelto (no se usa para envío):', emailConsultado);
          },
          error: () => {},
        });
      }
      this.enviarEmail(templateName, emailConfig.testEmail, data);
      return;
    }

    if (role === 'docente') {
      const email = emailConfig.emailsByRole['docente'];
      if (!email) {
        console.error('No hay correo configurado para docente');
        return;
      }
      this.enviarEmail(templateName, email, data);
      return;
    }

    if (!codigoFacultad) {
      console.error(`[PRODUCTION] No hay codigo_facultad para ${role}`);
      return;
    }

    this.secretarioEmailService.resolveEmail(codigoFacultad).subscribe({
      next: (email) => {
        console.log(`[PRODUCTION] Correo resuelto para ${role}:`, email);
        this.enviarEmail(templateName, email, data);
      },
      error: (err) => {
        console.error(`Error resolviendo correo para ${role}:`, err);
        this.popUpManager.showErrorToast('Error al obtener correo del destinatario');
      },
    });
  }

  private enviarEmail(
    templateName: string,
    email: string,
    data: Record<string, string>,
  ): void {
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
