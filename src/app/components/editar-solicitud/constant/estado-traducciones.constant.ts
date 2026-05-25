import { EstadoSolicitud } from '../interface';

export const ESTADO_TRADUCCIONES: Record<EstadoSolicitud, string> = {
  Borrador: 'HISTORIAL_SOLICITUDES.status.draft',
  'Radicada / Enviada a SA': 'HISTORIAL_SOLICITUDES.status.filedSentSa',
  'Subsanación solicitada SA': 'HISTORIAL_SOLICITUDES.status.correctionRequestedSa',
  'Subsanación solicitada SG': 'HISTORIAL_SOLICITUDES.status.correctionRequestedSg',
  'Enviada a SG': 'HISTORIAL_SOLICITUDES.status.sentSg',
  'Finalizada No aprobada': 'HISTORIAL_SOLICITUDES.status.finishedNotApproved',
  'Aprobada pendiente Resolución': 'HISTORIAL_SOLICITUDES.status.approvedPendingResolution',
  'Finalizada Aprobada con Resolución': 'HISTORIAL_SOLICITUDES.status.finishedApprovedResolution'
};
