
import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { SabaticosMidService } from '../../services/sabaticos-mid.service';

@Component({
  selector: 'solicitudes-sabaticos-mf-endpoints',
  templateUrl: './endpoints.component.html',
  styleUrl: './endpoints.component.scss'
})
export class EndpointsComponent {

  readonly formularioDefault = {
    formulario: {
      plan_trabajo_ano_sabatico: {
        encabezado: {
          codigo: 'GD-PR-020-FR-028',
          version: '01',
          fecha_aprobacion: '07/05/2018',
          macroproceso: 'Gestión Académica',
          proceso: 'Gestión de la Docencia'
        },
        identificacion_docente: {
          nombre_docente: 'Adolfo Andrés Jaramillo Mata',
          numero_identificacion: '94.331.274',
          facultad: 'Ingeniería',
          proyecto_curricular: 'Ingeniería Eléctrica',
          periodo_ejecucion: 'A partir del periodo académico 2026-1 (enero 2026 – enero 2027)'
        },
        detalle_solicitud: {
          modalidad: {
            descripcion: 'Identifique la solicitud (conforme al Acuerdo 011 de 2002 - Consejo Superior Universitario. Acuerdo 07 de 2005 – Consejo Académico).',
            opciones: [
              {
                descripcion: 'Labores de investigación en los campos de las ciencias, las tecnologías, humanidades y las artes, afines al ámbito de su desempeño académico.',
                seleccionado: false
              },
              {
                descripcion: 'Participación en intercambios docentes o de investigación con otras instituciones de orden nacional o internacional legalmente reconocidas.',
                seleccionado: false
              },
              {
                descripcion: 'Elaboración de libros de texto o ensayo, notas de clase, resultados de investigación u otras actividades derivadas del quehacer docente.',
                seleccionado: true
              },
              {
                descripcion: 'Producción de videos, obras o cualquier otro producto vinculado con el desempeño docente y que tenga relación con la actividad que el profesor realiza en la Universidad.',
                seleccionado: false
              },
              {
                descripcion: 'Producción o creación de obras en el campo de la tecnología, la ingeniería, las ciencias o las artes y que tengan relación con la actividad que el profesor realiza en la Universidad.',
                seleccionado: false
              },
              {
                descripcion: 'Actualización de conocimientos en campos afines al área de desempeño del docente.',
                seleccionado: false
              },
              {
                descripcion: 'Actualización para el dominio de lenguas diferentes a la lengua materna.',
                seleccionado: false
              }
            ]
          }
        },
        objetivos: {
          objetivo_general: 'Elaborar un libro de texto titulado: "Análisis y control de sistemas dinámicos: del modelado clásico al aprendizaje inteligente", que integre los fundamentos físicos, matemáticos y computacionales del análisis, modelado y control de sistemas dinámicos, orientado a su aplicación en ingeniería eléctrica, incorporando herramientas de simulación y técnicas de aprendizaje inteligente que fortalezcan la formación académica y docente en la Universidad Distrital Francisco José de Caldas.',
          objetivos_especificos: [
            'Explicar los fundamentos teóricos y matemáticos que modelan el comportamiento de sistemas dinámicos continuos y discretos.',
            'Desarrollar metodologías para la representación, modelado y análisis de sistemas eléctricos, mecánicos y térmicos mediante ecuaciones diferenciales, modelos de estado y funciones de transferencia.',
            'Analizar el comportamiento dinámico, la estabilidad y la respuesta temporal de sistemas lineales e invariantes en el tiempo (LTI).',
            'Introducir estrategias de control clásico y técnicas de inteligencia artificial orientadas al análisis y diseño de sistemas dinámicos mediante simulación y aprendizaje basado en datos.'
          ]
        },
        justificacion: 'El avance de la ingeniería eléctrica y de control ha estado estrechamente ligado al desarrollo de herramientas matemáticas y computacionales que permiten representar, analizar y controlar sistemas dinámicos de diversa naturaleza. Sin embargo, la transición hacia nuevas tecnologías, como los sistemas de energía renovable, la electromovilidad, los convertidores electrónicos de potencia y las redes inteligentes, demanda una actualización conceptual y metodológica en la formación de ingenieros.',
        producto_entregable: {
          tipo: 'Libro de texto digital',
          titulo: 'Análisis y control de sistemas dinámicos: del modelado clásico al aprendizaje inteligente',
          material_complementario: [
            'Archivos de simulación en MATLAB/Simulink',
            'Python u otros scripts de modelado',
            'Ejemplos prácticos desarrollados durante la elaboración del libro'
          ]
        },
        impacto_alcance: {
          impacto: 'Incidir directamente en la calidad del proceso de enseñanza-aprendizaje en el área de Sistemas Dinámicos y Control, fortaleciendo las competencias analíticas, de modelado y simulación en los estudiantes del programa de Ingeniería Eléctrica.',
          alcance: 'Servir como recurso pedagógico de apoyo para la docencia y como base conceptual sólida para el desarrollo de proyectos en energías alternativas, electromovilidad, control inteligente y sistemas de almacenamiento de energía.'
        }
      }
    }
  };

  readonly formularioRadicacionDefault = {
    observacion: 'Radicación de solicitud con soportes completos',
    fechaRadicacion: '2026-03-05'
  };

  formulario = this.fb.group({
    terceroId: [7173, Validators.required],
    tipoSolicitudId: ['NS', Validators.required],
    formularioTexto: [JSON.stringify(this.formularioDefault, null, 2), Validators.required]
  });



  formularioRadicacion = this.fb.group({
    solicitudId: [1, Validators.required],
    documentosId: ['[1,2]', Validators.required],
    formularioId: [1, Validators.required],
    fechaCreacion: ['2026-03-05 00:00:00', Validators.required],
    formularioTextoRadicacion: [JSON.stringify(this.formularioRadicacionDefault, null, 2), Validators.required]
  });

  formularioSoporte = this.fb.group({
    solicitudId: [1, Validators.required],
    terceroId: [7173, Validators.required],
    rolUsuario: ['DOCENTE', Validators.required],
    estadoSoporteSolicitud: ['PEN', Validators.required]
  });

  payloadGenerado: unknown = null;
  payloadRadicacionGenerado: unknown = null;
  errorJson = '';
  errorServicio = '';
  errorJsonRadicacion = '';
  errorServicioRadicacion = '';
  respuestaServicio: unknown = null;
  respuestaServicioRadicacion: unknown = null;
  respuestaServicioSoporte: unknown = null;
  errorServicioSoporte = '';
  archivosSoporte: File[] = [];
  

  constructor(
    private fb: FormBuilder,
    private sabaticosMidService: SabaticosMidService
  ) {}

  generarPayload(): void {
    const value = this.formulario.getRawValue();
    this.errorJson = '';

    try {
      const formularioJson = JSON.parse(value.formularioTexto || '{}');
      const formularioData = formularioJson?.formulario ?? formularioJson;
      this.payloadGenerado = {
        TerceroId: value.terceroId,
        TipoSolicitudId: value.tipoSolicitudId,
        formulario: formularioData
      };
    } catch {
      this.payloadGenerado = null;
      this.errorJson = 'El campo formulario debe contener un JSON válido.';
    }
  }

  generarPayloadRadicacion(): void {
    const value = this.formularioRadicacion.getRawValue();
    this.errorJsonRadicacion = '';

    try {
      const documentos = JSON.parse(value.documentosId || '[]');
      const formulario = JSON.parse(value.formularioTextoRadicacion || '{}');

      this.payloadRadicacionGenerado = {
        SolicitudId: value.solicitudId,
        DocumentosId: documentos,
        FormularioId: value.formularioId,
        FechaCreacion: value.fechaCreacion,
        Formulario: formulario
      };
    } catch {
      this.payloadRadicacionGenerado = null;
      this.errorJsonRadicacion = 'Los campos DocumentosId y Formulario deben contener JSON válido.';
    }
  }

  enviarPayload() {
    this.respuestaServicio = null;
    this.errorServicio = '';

    if (!this.payloadGenerado) {
      this.generarPayload();
    }

    if (!this.payloadGenerado) {
      return null;
    }

    return this.sabaticosMidService.post('solicitud', this.payloadGenerado).subscribe({
      next: (response) => {
        this.respuestaServicio = response;
      },
      error: (error) => {
        this.errorServicio = error?.message || 'Error enviando la solicitud.';
      }
    });
  }

  enviarPayloadRadicacion() {
    this.respuestaServicioRadicacion = null;
    this.errorServicioRadicacion = '';
    const { solicitudId } = this.formularioRadicacion.getRawValue();

    if (!this.payloadRadicacionGenerado) {
      this.generarPayloadRadicacion();
    }

    if (!this.payloadRadicacionGenerado) {
      return null;
    }

    return this.sabaticosMidService.post(`solicitud/radicar/${solicitudId}`, this.payloadRadicacionGenerado).subscribe({
      next: (response) => {
        this.respuestaServicioRadicacion = response;
      },
      error: (error) => {
        this.errorServicioRadicacion = error?.message || 'Error enviando la radicación.';
      }
    });
  }

  onArchivosSoporteSeleccionados(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.archivosSoporte = Array.from(input.files);
    }
  }

  enviarPayloadSoporte(): void {
    this.respuestaServicioSoporte = null;
    this.errorServicioSoporte = '';

    if (this.archivosSoporte.length === 0) {
      this.errorServicioSoporte = 'Debes seleccionar al menos un archivo.';
      return;
    }

    const value = this.formularioSoporte.getRawValue();
    const formData = new FormData();

    formData.append('solicitud_id', (value.solicitudId ?? 1).toString());
    formData.append('tercero_id', (value.terceroId ?? 7173).toString());
    formData.append('rol_usuario', value.rolUsuario ?? 'DOCENTE');
    formData.append('estado_soporte_solicitud', value.estadoSoporteSolicitud ?? 'PEN');

    this.archivosSoporte.forEach((archivo) => {
      formData.append(`documentos`, archivo);
    });

    this.sabaticosMidService.postFile('soporte_solicitud', formData).subscribe({
      next: (response) => {
        this.respuestaServicioSoporte = response;
        this.archivosSoporte = [];
      },
      error: (error) => {
        this.errorServicioSoporte = error?.message || 'Error enviando los soportes.';
      }
    });
  }

}
