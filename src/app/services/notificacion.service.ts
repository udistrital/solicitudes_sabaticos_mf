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
    const esDocente = role === 'docente';
    const cedula = data['identificacion_docente'];
    const codigoFacultad = data['codigo_facultad'];

    if (!esDocente && role !== 'secretaria_general' && !codigoFacultad) {
      console.error('codigo_facultad vacío — no se puede resolver correo de SA');
      return;
    }

    const email$ = esDocente
      ? this.secretarioEmailService.getDocenteEmail(cedula)
      : role === 'secretaria_general'
        ? this.secretarioEmailService.resolveEmail('2')
        : this.secretarioEmailService.resolveEmail(codigoFacultad);

    if (emailConfig.emailMode === 'testing') {
      email$.subscribe({
        next: (emailConsultado) => {
          const etiqueta = esDocente ? 'docente' : (role === 'secretaria_general' ? 'sg' : 'sa');
          console.log(`correo ${etiqueta}: ${emailConsultado}`);
        },
        error: (err) => console.error(`Error consultando correo:`, err),
      });
      this.enviarEmail(templateName, emailConfig.testEmail, data);
      return;
    }

    email$.subscribe({
      next: (email) => {
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
        console.error('Error enviando notificación:', err);
        this.popUpManager.showErrorToast('Error al enviar notificación por correo electrónico');
      },
    });
  }
}
