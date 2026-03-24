import { FormularioSolicitud } from './formulario-solicitud.type';

export type RadicarBody = {
  Id: number;
  SolicitudId: number;
  DocumentosId: number[];
  FormularioId: number;
  FechaCreacion: string;
  Formulario: FormularioSolicitud;
};