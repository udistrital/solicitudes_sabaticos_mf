import { NotificationEvent } from './notification-event.type';
import { NotificationRole } from './notification-role.type';

export const notificationEventMapper: Record<NotificationEvent, NotificationRole[]> = {
  BORRADOR_CREADO:          ['docente'],
  RADICAR_SA:               ['secretaria_academica', 'docente'],
  SUBSANACION_SA:           ['docente'],
  DOC_COMPLETA_SA:          ['docente'],
  AVALADO_CF:               ['docente', 'secretaria_general'],
  SUBSANACION_SG:           ['docente'],
  REENVIO_SUBSANACION_SG:   ['secretaria_general', 'docente'],
  DOC_COMPLETA_SG:          ['docente'],
  DECISION_NO_APROBADA:     ['docente'],
  APROBACION_CA:            ['docente'],
  PENDIENTE_FECHAS:         ['secretaria_academica', 'docente'],
  INICIO_SABATICO:          ['docente'],
};
