import { NotificationEvent } from './notification-event.type';

export const notificationEventReadable: Record<NotificationEvent, string> = {
  BORRADOR_CREADO:          'creado el borrador de',
  RADICAR_SA:               'radicado y enviado a Secretaría Académica',
  SUBSANACION_SA:           'solicitada subsanación por Secretaría Académica a',
  DOC_COMPLETA_SA:          'verificada documentación completa por Secretaría Académica de',
  AVALADO_CF:               'avalado por Consejo de Facultad y enviado a Secretaría General',
  SUBSANACION_SG:           'solicitada subsanación por Secretaría General a',
  REENVIO_SUBSANACION_SG:   'reenviado con subsanaciones a Secretaría General',
  DOC_COMPLETA_SG:          'verificada documentación completa por Secretaría General de',
  DECISION_NO_APROBADA:     'notificada decisión no aprobada de',
  APROBACION_CA:            'aprobado por Consejo Académico',
  PENDIENTE_FECHAS:         'enviada resolución, pendiente de ingreso de fechas en SGA',
  INICIO_SABATICO:          'iniciado el año sabático de',
};
