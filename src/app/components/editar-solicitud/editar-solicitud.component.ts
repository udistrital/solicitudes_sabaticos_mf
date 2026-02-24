import { Component, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DateAdapter } from '@angular/material/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

type EstadoSolicitud =
  | 'Borrador'
  | 'Radicada / Enviada a SA'
  | 'Recepcionada a SA'
  | 'En verificación de SA'
  | 'Subsanación solicitada'
  | 'Trámite externo CF'
  | 'Respuesta CF registrada'
  | 'Enviada a SG'
  | 'Recepcionada a SG'
  | 'Trámite externo CA'
  | 'Decisión CA registrada'
  | 'Finalizada No aprobada'
  | 'Aprobada pendiente Resolución'
  | 'Finalizada Aprobada con Resolución';

interface SolicitudDetalle {
  id: string;
  fechaRadicado: string;
  estado: EstadoSolicitud;
}

@Component({
  selector: 'app-editar-solicitud',
  templateUrl: './editar-solicitud.component.html',
  styleUrl: './editar-solicitud.component.scss'
})
export class EditarSolicitudComponent {
  currentLang = 'es';
  solicitud: SolicitudDetalle | null = null;

  readonly estadoTraducciones: Record<EstadoSolicitud, string> = {
    Borrador: 'HISTORIAL_SOLICITUDES.status.draft',
    'Radicada / Enviada a SA': 'HISTORIAL_SOLICITUDES.status.filedSentSa',
    'Recepcionada a SA': 'HISTORIAL_SOLICITUDES.status.receivedSa',
    'En verificación de SA': 'HISTORIAL_SOLICITUDES.status.verificationSa',
    'Subsanación solicitada': 'HISTORIAL_SOLICITUDES.status.correctionRequested',
    'Trámite externo CF': 'HISTORIAL_SOLICITUDES.status.externalProcessCf',
    'Respuesta CF registrada': 'HISTORIAL_SOLICITUDES.status.responseCfRecorded',
    'Enviada a SG': 'HISTORIAL_SOLICITUDES.status.sentSg',
    'Recepcionada a SG': 'HISTORIAL_SOLICITUDES.status.receivedSg',
    'Trámite externo CA': 'HISTORIAL_SOLICITUDES.status.externalProcessCa',
    'Decisión CA registrada': 'HISTORIAL_SOLICITUDES.status.decisionCaRecorded',
    'Finalizada No aprobada': 'HISTORIAL_SOLICITUDES.status.finishedNotApproved',
    'Aprobada pendiente Resolución': 'HISTORIAL_SOLICITUDES.status.approvedPendingResolution',
    'Finalizada Aprobada con Resolución': 'HISTORIAL_SOLICITUDES.status.finishedApprovedResolution'
  };

  readonly estadoOptions: EstadoSolicitud[] = [
    'Borrador',
    'Radicada / Enviada a SA',
    'Recepcionada a SA',
    'En verificación de SA',
    'Subsanación solicitada',
    'Trámite externo CF',
    'Respuesta CF registrada',
    'Enviada a SG',
    'Recepcionada a SG',
    'Trámite externo CA',
    'Decisión CA registrada',
    'Finalizada No aprobada',
    'Aprobada pendiente Resolución',
    'Finalizada Aprobada con Resolución'
  ];

  constructor(
    private readonly translate: TranslateService,
    private readonly dateAdapter: DateAdapter<Date>,
    private readonly router: Router,
    private readonly destroyRef: DestroyRef
  ) {
    this.currentLang = this.translate.currentLang || this.translate.getDefaultLang() || 'es';
    this.dateAdapter.setLocale(this.currentLang);

    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ lang }) => {
        this.currentLang = lang;
        this.dateAdapter.setLocale(lang);
      });

    const navigation = this.router.getCurrentNavigation();
    const stateSolicitud = navigation?.extras.state?.['solicitud'] ?? history.state?.solicitud;
    this.solicitud = this.parseSolicitud(stateSolicitud);
  }

  getEstadoTranslation(estado: EstadoSolicitud): string {
    return this.estadoTraducciones[estado];
  }

  private parseEstado(value: string | null | undefined): EstadoSolicitud | null {
    if (!value) {
      return null;
    }

    return this.estadoOptions.includes(value as EstadoSolicitud)
      ? (value as EstadoSolicitud)
      : null;
  }

  private parseSolicitud(value: unknown): SolicitudDetalle | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const data = value as { id?: string; fechaRadicado?: string; estado?: string };
    const estado = this.parseEstado(data.estado);

    if (!data.id || !data.fechaRadicado || !estado) {
      return null;
    }

    return {
      id: data.id,
      fechaRadicado: data.fechaRadicado,
      estado
    };
  }
}
