import { CronogramaActividad } from './cronograma-actividad.interface';
import { EstadoSolicitud } from './estado-solicitud.type';

export interface FormularioDetalle {
  id: string;
  fechaRadicado: string;
  estado: EstadoSolicitud;
  docenteNombre?: string;
  docenteIdentificacion?: string;
  docenteFacultad?: string;
  docenteCodigoFacultad?: string;
  docenteProyecto?: string;
  periodoEjecucion?: string;
  ultimoSabatico?: {
    start: Date | null;
    end: Date | null;
    productoEntregadoUltimoAnoSabatico?: string;
  };
  productoUltimo?: string;
  modalidadId?: number;
  modalidad?: string;
  objetivoGeneral?: string;
  objetivosEspecificos?: string;
  justificacion?: string;
  planDesarrolloInstitucional?: string;
  proyectoEducativoFacultad?: string;
  proyectoEducativoProgramas?: string;
  productoEntregable?: string;
  impactoAlcance?: string;
  metodologia?: string;
  cronograma?: CronogramaActividad;
  presupuesto?: string;
  observaciones?: string;
  documentos?: Record<string, string | null>;
  observacionesSecretaria?: string;
  documentosSecretaria?: Record<string, string | null>;
}
