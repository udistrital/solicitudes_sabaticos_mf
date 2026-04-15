import { EstadoSolicitud } from './estado-solicitud.type';

export type FormularioInit = {
  id: string;
  fechaRadicado: string;
  estado: EstadoSolicitud;
};
