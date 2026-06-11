import { CronogramaActividad } from './cronograma-actividad.interface';

export type FormularioSolicitud = {
  docente: {
    nombre: string;
    identificacion: string;
    facultad: string;
    codigoFacultad: string;
    proyecto_curricular: string;
  };
  detalle_solicitud: {
    modalidad: string;
    modalidadId: number;
    periodo_ejecucion: string;
    producto_ultimo_sabatico: string;
    ultimo_sabatico: {
      fecha_inicio: string;
      fecha_fin: string;
      producto_ultimo_sabatico: string;
    };
  };
  objetivos: {
    objetivo_general: string;
    objetivos_especificos: string;
  };
  articulacion: {
    plan_desarrollo_institucional: string;
    proyecto_educativo_facultad: string;
    proyecto_educativo_programas: string;
  };
  cronograma: CronogramaActividad;
  justificacion: string;
  producto_entregable: string;
  impacto_alcance: string;
  metodologia: string;
  presupuesto: string;
  observaciones: string;
  observacionesSecretaria?: string;
};
