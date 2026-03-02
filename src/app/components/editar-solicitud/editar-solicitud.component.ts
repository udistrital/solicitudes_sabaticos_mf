import { Component, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup } from '@angular/forms';
import { DateAdapter } from '@angular/material/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

type EstadoSolicitud =
  | 'Borrador'
  | 'Radicada / Enviada a SA'
  | 'Recepcionada a SA'
  | 'En verificación de SA'
  | 'Subsanación solicitada'
  | 'Trámite externo CF'
  | 'Respuesta CF registrada'
  | 'Enviada a SG'
  | 'Recepcionada a SG'
  | 'Trámite externo CA'
  | 'Decisión CA registrada'
  | 'Finalizada No aprobada'
  | 'Aprobada pendiente Resolución'
  | 'Finalizada Aprobada con Resolución';

interface CronogramaActividad {
  enero: string;
  febrero: string;
  marzo: string;
  abril: string;
  mayo: string;
  junio: string;
  julio: string;
  agosto: string;
  septiembre: string;
  octubre: string;
  noviembre: string;
  diciembre: string;
}

interface SolicitudDetalle {
  id: string;
  fechaRadicado: string;
  estado: EstadoSolicitud;
  docenteNombre?: string;
  docenteIdentificacion?: string;
  docenteFacultad?: string;
  docenteProyecto?: string;
  periodoEjecucion?: string;
  ultimoSabatico?: {
    start: Date | null;
    end: Date | null;
  };
  productoUltimo?: string;
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
}

interface DocumentoOption {
  key: string;
  label: string;
}

@Component({
  selector: 'app-editar-solicitud',
  templateUrl: './editar-solicitud.component.html',
  styleUrl: './editar-solicitud.component.scss'
})
export class EditarSolicitudComponent {
  currentLang = 'es';
  solicitud: SolicitudDetalle | null = null;
  form: FormGroup | null = null;
  documentoArchivos: Record<string, string | null> = {};
  documentoSeleccionado: string | null = null;
  documentosSeleccionados: string[] = [];

  readonly modalidadOptions = [
    'HISTORIAL_SOLICITUDES.modal.modalidad.opcion1',
    'HISTORIAL_SOLICITUDES.modal.modalidad.opcion2',
    'HISTORIAL_SOLICITUDES.modal.modalidad.opcion3',
    'HISTORIAL_SOLICITUDES.modal.modalidad.opcion4',
    'HISTORIAL_SOLICITUDES.modal.modalidad.opcion5',
    'HISTORIAL_SOLICITUDES.modal.modalidad.opcion6',
    'HISTORIAL_SOLICITUDES.modal.modalidad.opcion7'
  ];

  readonly cronogramaMeses = [
    { key: 'enero', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.enero' },
    { key: 'febrero', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.febrero' },
    { key: 'marzo', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.marzo' },
    { key: 'abril', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.abril' },
    { key: 'mayo', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.mayo' },
    { key: 'junio', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.junio' },
    { key: 'julio', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.julio' },
    { key: 'agosto', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.agosto' },
    { key: 'septiembre', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.septiembre' },
    { key: 'octubre', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.octubre' },
    { key: 'noviembre', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.noviembre' },
    { key: 'diciembre', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.diciembre' }
  ];

  readonly documentoOptions: DocumentoOption[] = [
    { key: 'avalConsejo', label: 'HISTORIAL_SOLICITUDES.modal.documentos.avalConsejo' },
    { key: 'cronogramaMensual', label: 'HISTORIAL_SOLICITUDES.modal.documentos.cronogramaMensual' },
    { key: 'presupuestoProyectado', label: 'HISTORIAL_SOLICITUDES.modal.documentos.presupuestoProyectado' },
    { key: 'certificacionLaboral', label: 'HISTORIAL_SOLICITUDES.modal.documentos.certificacionLaboral' },
    { key: 'pazSalvoAcademico', label: 'HISTORIAL_SOLICITUDES.modal.documentos.pazSalvoAcademico' },
    { key: 'pazSalvoInvestigaciones', label: 'HISTORIAL_SOLICITUDES.modal.documentos.pazSalvoInvestigaciones' },
    { key: 'pazSalvoExtension', label: 'HISTORIAL_SOLICITUDES.modal.documentos.pazSalvoExtension' },
    { key: 'pazSalvoAlmacen', label: 'HISTORIAL_SOLICITUDES.modal.documentos.pazSalvoAlmacen' },
    { key: 'pazSalvoFinanciero', label: 'HISTORIAL_SOLICITUDES.modal.documentos.pazSalvoFinanciero' },
    { key: 'financiacion', label: 'HISTORIAL_SOLICITUDES.modal.documentos.financiacion' },
    { key: 'pazSalvoConsejoFacultad', label: 'HISTORIAL_SOLICITUDES.modal.documentos.pazSalvoConsejoFacultad' },
    { key: 'otros', label: 'HISTORIAL_SOLICITUDES.modal.documentos.otros' }
  ];

  readonly estadoTraducciones: Record<EstadoSolicitud, string> = {
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

  readonly estadoOptions: EstadoSolicitud[] = [
    'Borrador',
    'Radicada / Enviada a SA',
    'Recepcionada a SA',
    'En verificación de SA',
    'Subsanación solicitada',
    'Trámite externo CF',
    'Respuesta CF registrada',
    'Enviada a SG',
    'Recepcionada a SG',
    'Trámite externo CA',
    'Decisión CA registrada',
    'Finalizada No aprobada',
    'Aprobada pendiente Resolución',
    'Finalizada Aprobada con Resolución'
  ];

  constructor(
    private readonly translate: TranslateService,
    private readonly dateAdapter: DateAdapter<Date>,
    private readonly formBuilder: FormBuilder,
    private readonly router: Router,
    private readonly destroyRef: DestroyRef
  ) {
    this.currentLang = this.translate.currentLang || this.translate.getDefaultLang() || 'es';
    this.dateAdapter.setLocale(this.currentLang);

    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ lang }) => {
        this.currentLang = lang;
        this.dateAdapter.setLocale(lang);
      });

    const navigation = this.router.getCurrentNavigation();
    const stateSolicitud = navigation?.extras.state?.['solicitud'] ?? history.state?.solicitud;
    this.solicitud = this.parseSolicitud(stateSolicitud);
    if (this.solicitud) {
      this.documentoArchivos = { ...(this.solicitud.documentos ?? {}) };
      this.documentosSeleccionados = Object.entries(this.documentoArchivos)
        .filter(([, nombre]) => Boolean(nombre))
        .map(([key]) => key);
      this.form = this.formBuilder.group({
        docenteNombre: [{ value: this.solicitud.docenteNombre ?? '', disabled: true }],
        docenteIdentificacion: [{ value: this.solicitud.docenteIdentificacion ?? '', disabled: true }],
        docenteFacultad: [{ value: this.solicitud.docenteFacultad ?? '', disabled: true }],
        docenteProyecto: [{ value: this.solicitud.docenteProyecto ?? '', disabled: true }],
        periodoEjecucion: [this.solicitud.periodoEjecucion ?? ''],
        ultimoSabatico: this.formBuilder.group({
          start: [this.solicitud.ultimoSabatico?.start ?? null],
          end: [this.solicitud.ultimoSabatico?.end ?? null]
        }),
        productoUltimo: [this.solicitud.productoUltimo ?? ''],
        modalidad: [this.solicitud.modalidad ?? ''],
        objetivoGeneral: [this.solicitud.objetivoGeneral ?? ''],
        objetivosEspecificos: [this.solicitud.objetivosEspecificos ?? ''],
        justificacion: [this.solicitud.justificacion ?? ''],
        planDesarrolloInstitucional: [this.solicitud.planDesarrolloInstitucional ?? ''],
        proyectoEducativoFacultad: [this.solicitud.proyectoEducativoFacultad ?? ''],
        proyectoEducativoProgramas: [this.solicitud.proyectoEducativoProgramas ?? ''],
        productoEntregable: [this.solicitud.productoEntregable ?? ''],
        impactoAlcance: [this.solicitud.impactoAlcance ?? ''],
        metodologia: [this.solicitud.metodologia ?? ''],
        presupuesto: [this.solicitud.presupuesto ?? ''],
        observaciones: [this.solicitud.observaciones ?? ''],
        cronograma: this.formBuilder.group({
          enero: [this.solicitud.cronograma?.enero ?? ''],
          febrero: [this.solicitud.cronograma?.febrero ?? ''],
          marzo: [this.solicitud.cronograma?.marzo ?? ''],
          abril: [this.solicitud.cronograma?.abril ?? ''],
          mayo: [this.solicitud.cronograma?.mayo ?? ''],
          junio: [this.solicitud.cronograma?.junio ?? ''],
          julio: [this.solicitud.cronograma?.julio ?? ''],
          agosto: [this.solicitud.cronograma?.agosto ?? ''],
          septiembre: [this.solicitud.cronograma?.septiembre ?? ''],
          octubre: [this.solicitud.cronograma?.octubre ?? ''],
          noviembre: [this.solicitud.cronograma?.noviembre ?? ''],
          diciembre: [this.solicitud.cronograma?.diciembre ?? '']
        })
      });
    }
  }

  getEstadoTranslation(estado: EstadoSolicitud): string {
    return this.estadoTraducciones[estado];
  }

  get documentosDisponibles(): DocumentoOption[] {
    return this.documentoOptions.filter(
      (documento) => !this.documentosSeleccionados.includes(documento.key)
    );
  }

  get documentosSeleccionadosDetalle(): DocumentoOption[] {
    return this.documentosSeleccionados
      .map((key) => this.documentoOptions.find((documento) => documento.key === key))
      .filter((documento): documento is DocumentoOption => Boolean(documento));
  }

  onAgregarDocumento(): void {
    if (!this.documentoSeleccionado) {
      return;
    }

    if (!this.documentosSeleccionados.includes(this.documentoSeleccionado)) {
      this.documentosSeleccionados = [
        ...this.documentosSeleccionados,
        this.documentoSeleccionado
      ];
      if (!(this.documentoSeleccionado in this.documentoArchivos)) {
        this.documentoArchivos[this.documentoSeleccionado] = null;
      }
    }

    this.documentoSeleccionado = null;
  }

  onEliminarDocumento(key: string): void {
    this.documentosSeleccionados = this.documentosSeleccionados.filter(
      (documento) => documento !== key
    );
    delete this.documentoArchivos[key];
  }

  getDocumentoNombre(key: string): string | null {
    return this.documentoArchivos[key] ?? null;
  }

  onDocumentoChange(key: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.documentoArchivos[key] = file ? file.name : null;
  }

  trackDocumento(_: number, item: { key: string }): string {
    return item.key;
  }

  hasCronogramaValue(key: string): boolean {
    const value = this.form?.get(`cronograma.${key}`)?.value as string | null | undefined;
    return Boolean(value && value.trim());
  }

  onGuardar(): void {
    if (!this.form || !this.solicitud) {
      return;
    }

    const formValue = this.form.getRawValue() as Omit<
      SolicitudDetalle,
      'id' | 'fechaRadicado' | 'estado' | 'documentos'
    > & {
      cronograma: CronogramaActividad;
    };

    this.solicitud = {
      ...this.solicitud,
      ...formValue,
      cronograma: { ...formValue.cronograma },
      documentos: { ...this.documentoArchivos }
    };
  }

  onEnviarRevision(): void {
    return;
  }

  private parseEstado(value: string | null | undefined): EstadoSolicitud | null {
    if (!value) {
      return null;
    }

    return this.estadoOptions.includes(value as EstadoSolicitud)
      ? (value as EstadoSolicitud)
      : null;
  }

  private parseSolicitud(value: unknown): SolicitudDetalle | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const data = value as Partial<SolicitudDetalle> & {
      id?: string;
      fechaRadicado?: string;
      estado?: string;
    };
    const estado = this.parseEstado(data.estado);

    if (!data.id || !data.fechaRadicado || !estado) {
      return null;
    }

    return {
      ...data,
      id: data.id,
      fechaRadicado: data.fechaRadicado,
      estado,
      documentos: data.documentos ?? {},
      cronograma: data.cronograma
        ? { ...data.cronograma }
        : {
          enero: '',
          febrero: '',
          marzo: '',
          abril: '',
          mayo: '',
          junio: '',
          julio: '',
          agosto: '',
          septiembre: '',
          octubre: '',
          noviembre: '',
          diciembre: ''
        }
    };
  }
}
