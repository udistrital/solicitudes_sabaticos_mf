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
    console.log('[TRAMO] sendNotification: INICIO', { templateName, role, data });
    const emailConfig = environment.notifications;
    const codigoFacultad = data['codigo_facultad'];
    console.log('[TRAMO] sendNotification: emailMode =', emailConfig.emailMode, ', codigoFacultad =', codigoFacultad);

    if (emailConfig.emailMode === 'testing') {
      console.log('[TRAMO] sendNotification: MODO TESTING');
      if (codigoFacultad) {
        console.log('[TRAMO] sendNotification: ANTES de resolveEmail (testing)');
        this.secretarioEmailService.resolveEmail(codigoFacultad).subscribe({
          next: (emailConsultado) => {
            console.log('[TRAMO] sendNotification: DESPUÉS de resolveEmail (testing) - UsuarioWSO2 (correo consultado):', emailConsultado);
          },
          error: () => {
            console.log('[TRAMO] sendNotification: resolveEmail (testing) falló, se ignora');
          },
        });
      } else {
        console.log('[TRAMO] sendNotification: Sin codigo_facultad, se omite resolveEmail en testing');
      }
      console.log('[TRAMO] sendNotification: ANTES de enviarEmail testing a:', emailConfig.testEmail);
      this.enviarEmail(templateName, emailConfig.testEmail, data);
      console.log('[TRAMO] sendNotification: FIN - modo testing');
      return;
    }

    if (role === 'docente') {
      console.log('[TRAMO] sendNotification: MODO PRODUCTION - role docente');
      const email = emailConfig.emailsByRole['docente'];
      if (!email) {
        console.error('[TRAMO] sendNotification: ERROR - No hay correo configurado para docente');
        return;
      }
      console.log('[TRAMO] sendNotification: ANTES de enviarEmail (docente) a:', email);
      this.enviarEmail(templateName, email, data);
      console.log('[TRAMO] sendNotification: FIN - production role docente');
      return;
    }

    console.log('[TRAMO] sendNotification: MODO PRODUCTION - role:', role);

    if (!codigoFacultad) {
      console.error(`[TRAMO] sendNotification: ERROR - No hay codigo_facultad para ${role}`);
      return;
    }

    console.log('[TRAMO] sendNotification: ANTES de resolveEmail (production)');
    this.secretarioEmailService.resolveEmail(codigoFacultad).subscribe({
      next: (email) => {
        console.log('[TRAMO] sendNotification: DESPUÉS de resolveEmail (production) - email:', email);
        console.log('[TRAMO] sendNotification: ANTES de enviarEmail a:', email);
        this.enviarEmail(templateName, email, data);
        console.log('[TRAMO] sendNotification: FIN - production role:', role);
      },
      error: (err) => {
        console.error(`[TRAMO] sendNotification: ERROR en resolveEmail para ${role}:`, err);
        this.popUpManager.showErrorToast('Error al obtener correo del destinatario');
      },
    });
  }

  private enviarEmail(
    templateName: string,
    email: string,
    data: Record<string, string>,
  ): void {
    console.log('[TRAMO] enviarEmail: INICIO - template:', templateName, ', email:', email);
    this.enviarTemplatedEmail({
      Source: 'notificacionessga@udistrital.edu.co',
      Template: templateName,
      Destinations: [{
        Destination: { ToAddresses: [email] },
        ReplacementTemplateData: data,
      }],
      DefaultTemplateData: {},
    }).subscribe({
      next: () => {
        console.log('[TRAMO] enviarEmail: ÉXITO - email enviado a:', email, ', template:', templateName);
      },
      error: (err) => {
        console.error(`[TRAMO] enviarEmail: ERROR - ${templateName}:`, err);
        this.popUpManager.showErrorToast('Error al enviar notificación por correo electrónico');
      },
    });
  }
}
