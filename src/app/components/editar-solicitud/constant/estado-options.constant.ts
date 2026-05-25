import { EstadoSolicitud } from '../interface';

export const ESTADO_OPTIONS: EstadoSolicitud[] = [
  'Borrador',
  'Radicada / Enviada a SA',
  'Subsanación solicitada SA',
  'Subsanación solicitada SG',
  'Enviada a SG',
  'Finalizada No aprobada',
  'Aprobada pendiente Resolución',
  'Finalizada Aprobada con Resolución'
];
