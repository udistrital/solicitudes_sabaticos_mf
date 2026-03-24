import { EstadoSolicitud } from '../interface';

export const ESTADO_TRADUCCIONES: Record<EstadoSolicitud, string> = {
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
