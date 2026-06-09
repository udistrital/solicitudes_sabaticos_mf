import { Injectable } from '@angular/core';
import { RequestManager } from '../../managers/requestManager';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { NotificationRole } from './notification-role.type';
import { NotificationEvent } from './notification-event.type';
import { notificationEventMapper } from './notification-event.mapper';
import { notificationEventReadable } from './notification-event-readable';
import { SolicitudNotificationData } from './solicitud-notification-data.type';

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
  constructor(private readonly requestManager: RequestManager) {
    this.requestManager.setPath('NOTIFICACION_MID_SERVICE');
  }

  enviarTemplatedEmail(body: EmailTemplatedBody): Observable<any> {
    this.requestManager.setPath('NOTIFICACION_MID_SERVICE');
    return this.requestManager.post('email/enviar_templated_email/', body);
  }

  getNotificationEmailByRole(role: NotificationRole): string {
    const config = environment.notifications;
    if (config.mode === 'testing') {
      return config.testEmail;
    }
    const email = config.emailsByRole[role];
    if (!email) {
      throw new Error(`No hay correo configurado para el rol: ${role}`);
    }
    return email;
  }

  sendNotification(
    event: NotificationEvent,
    data: SolicitudNotificationData,
  ): void {
    const roles = notificationEventMapper[event];
    if (!roles || roles.length === 0) {
      console.warn(`No hay roles configurados para el evento: ${event}`);
      return;
    }

    const destinations: EmailTemplatedDestination[] = roles.map((role) => ({
      Destination: { ToAddresses: [this.getNotificationEmailByRole(role)] },
      ReplacementTemplateData: {
        NombreDestinatario: role,
        SolicitudId: data.SolicitudId,
        Accion: notificationEventReadable[event],
        Fecha: data.Fecha,
        NombreDocente: data.NombreDocente,
        IdentificacionDocente: data.IdentificacionDocente,
        Facultad: data.Facultad,
        ProyectoCurricular: data.ProyectoCurricular,
      },
    }));

    this.enviarTemplatedEmail({
      Source: 'notificacionessga@udistrital.edu.co',
      Template: 'sabaticos_notificacion',
      Destinations: destinations,
      DefaultTemplateData: {},
    }).subscribe({
      error: (err) =>
        console.error(`Error enviando notificación ${event}:`, err),
    });
  }
}
