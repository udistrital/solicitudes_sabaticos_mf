import { CronogramaActividad } from './cronograma-actividad.interface';

export type FormularioSolicitudFormValue = {
  docenteNombre: string;
  docenteIdentificacion: string;
  docenteFacultad: string;
  docenteCodigoFacultad: string;
  docenteProyecto: string;
  periodoEjecucion: string;
  ultimoSabatico: {
    start: Date | null;
    end: Date | null;
  };
  productoUltimo: string;
  modalidad: number | string;
  objetivoGeneral: string;
  objetivosEspecificos: string;
  justificacion: string;
  planDesarrolloInstitucional: string;
  proyectoEducativoFacultad: string;
  proyectoEducativoProgramas: string;
  productoEntregable: string;
  impactoAlcance: string;
  metodologia: string;
  presupuesto: string;
  observaciones: string;
  observacionesSecretaria: string;
  cronograma: CronogramaActividad;
};
