import { Component, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DateAdapter } from '@angular/material/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { PopUpManager } from '../../../managers/popUpManager';

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
  mes1: string;
  mes2: string;
  mes3: string;
  mes4: string;
  mes5: string;
  mes6: string;
  mes7: string;
  mes8: string;
  mes9: string;
  mes10: string;
  mes11: string;
  mes12: string;
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
  observacionesSecretaria?: string;
  documentosSecretaria?: Record<string, string | null>;
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
  readonly minDocumentosRequeridos = 9;
  private readonly otrosDocumentoKey = 'otros';
  private readonly otrosDocumentoPrefijo = 'otros__';
  private readonly otrosSecretariaKey = 'otrosRequeridos';
  private readonly otrosSecretariaPrefijo = 'otrosRequeridos__';
  currentLang = 'es';
  solicitud: SolicitudDetalle | null = null;
  form: FormGroup | null = null;
  isReadOnly = false;
  rol = '';
  documentoArchivos: Record<string, string | null> = {};
  documentoObjectUrls: Record<string, string> = {};
  documentoSeleccionado: string | null = null;
  documentosSeleccionados: string[] = [];
  secretariaDocumentoArchivos: Record<string, string | null> = {};
  secretariaDocumentoObjectUrls: Record<string, string> = {};
  secretariaDocumentoSeleccionado: string | null = null;
  secretariaDocumentosSeleccionados: string[] = [];

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
    { key: 'mes1', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.mes1' },
    { key: 'mes2', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.mes2' },
    { key: 'mes3', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.mes3' },
    { key: 'mes4', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.mes4' },
    { key: 'mes5', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.mes5' },
    { key: 'mes6', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.mes6' },
    { key: 'mes7', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.mes7' },
    { key: 'mes8', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.mes8' },
    { key: 'mes9', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.mes9' },
    { key: 'mes10', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.mes10' },
    { key: 'mes11', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.mes11' },
    { key: 'mes12', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.mes12' }
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
  readonly secretariaDocumentoOptions: DocumentoOption[] = [
    {
      key: 'revisionRequisitosSabatico',
      label: 'HISTORIAL_SOLICITUDES.edit.secretaria.documentos.revisionRequisitosSabatico'
    },
    {
      key: 'actaConsejoFacultad',
      label: 'HISTORIAL_SOLICITUDES.edit.secretaria.documentos.actaConsejoFacultad'
    },
    {
      key: 'actaConsejoAcademico',
      label: 'HISTORIAL_SOLICITUDES.edit.secretaria.documentos.actaConsejoAcademico'
    },
    {
      key: 'resolucionConsejoAcademico',
      label: 'HISTORIAL_SOLICITUDES.edit.secretaria.documentos.resolucionConsejoAcademico'
    },
    {
      key: 'otrosRequeridos',
      label: 'HISTORIAL_SOLICITUDES.edit.secretaria.documentos.otrosRequeridos'
    }
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
    private readonly destroyRef: DestroyRef,
    private readonly popUpManager: PopUpManager
  ) {
    this.currentLang = this.translate.currentLang || this.translate.getDefaultLang() || 'es';
    this.dateAdapter.setLocale(this.currentLang);

    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ lang }) => {
        this.currentLang = lang;
        this.dateAdapter.setLocale(lang);
      });

    this.destroyRef.onDestroy(() => {
      Object.values(this.documentoObjectUrls).forEach((url) => URL.revokeObjectURL(url));
      Object.values(this.secretariaDocumentoObjectUrls).forEach((url) => URL.revokeObjectURL(url));
    });

    const navigation = this.router.getCurrentNavigation();
    const stateSolicitud = navigation?.extras.state?.['solicitud'] ?? history.state?.solicitud;
    this.isReadOnly = Boolean(navigation?.extras.state?.['readOnly'] ?? history.state?.readOnly);
    this.rol = String(navigation?.extras.state?.['rol'] ?? history.state?.rol ?? '');
    this.solicitud = this.parseSolicitud(stateSolicitud);
    if (this.solicitud) {
      this.documentoArchivos = { ...(this.solicitud.documentos ?? {}) };
      this.documentosSeleccionados = Object.entries(this.documentoArchivos)
        .filter(([, nombre]) => Boolean(nombre))
        .map(([key]) => key);
      this.secretariaDocumentoArchivos = { ...(this.solicitud.documentosSecretaria ?? {}) };
      this.secretariaDocumentosSeleccionados = Object.entries(this.secretariaDocumentoArchivos)
        .filter(([, nombre]) => Boolean(nombre))
        .map(([key]) => key);
      this.form = this.formBuilder.group({
        docenteNombre: [{ value: this.solicitud.docenteNombre ?? '', disabled: true }],
        docenteIdentificacion: [{ value: this.solicitud.docenteIdentificacion ?? '', disabled: true }],
        docenteFacultad: [{ value: this.solicitud.docenteFacultad ?? '', disabled: true }],
        docenteProyecto: [{ value: this.solicitud.docenteProyecto ?? '', disabled: true }],
        periodoEjecucion: [this.solicitud.periodoEjecucion ?? '', Validators.required],
        ultimoSabatico: this.formBuilder.group({
          start: [this.solicitud.ultimoSabatico?.start ?? null, Validators.required],
          end: [this.solicitud.ultimoSabatico?.end ?? null, Validators.required]
        }),
        productoUltimo: [this.solicitud.productoUltimo ?? '', Validators.required],
        modalidad: [this.solicitud.modalidad ?? '', Validators.required],
        objetivoGeneral: [this.solicitud.objetivoGeneral ?? '', Validators.required],
        objetivosEspecificos: [this.solicitud.objetivosEspecificos ?? '', Validators.required],
        justificacion: [this.solicitud.justificacion ?? '', Validators.required],
        planDesarrolloInstitucional: [this.solicitud.planDesarrolloInstitucional ?? '', Validators.required],
        proyectoEducativoFacultad: [this.solicitud.proyectoEducativoFacultad ?? '', Validators.required],
        proyectoEducativoProgramas: [this.solicitud.proyectoEducativoProgramas ?? '', Validators.required],
        productoEntregable: [this.solicitud.productoEntregable ?? '', Validators.required],
        impactoAlcance: [this.solicitud.impactoAlcance ?? '', Validators.required],
        metodologia: [this.solicitud.metodologia ?? '', Validators.required],
        presupuesto: [this.solicitud.presupuesto ?? '', Validators.required],
        observaciones: [this.solicitud.observaciones ?? ''],
        observacionesSecretaria: [this.solicitud.observacionesSecretaria ?? ''],
        cronograma: this.formBuilder.group({
          mes1: [this.solicitud.cronograma?.mes1 ?? '', Validators.required],
          mes2: [this.solicitud.cronograma?.mes2 ?? '', Validators.required],
          mes3: [this.solicitud.cronograma?.mes3 ?? '', Validators.required],
          mes4: [this.solicitud.cronograma?.mes4 ?? '', Validators.required],
          mes5: [this.solicitud.cronograma?.mes5 ?? '', Validators.required],
          mes6: [this.solicitud.cronograma?.mes6 ?? '', Validators.required],
          mes7: [this.solicitud.cronograma?.mes7 ?? '', Validators.required],
          mes8: [this.solicitud.cronograma?.mes8 ?? '', Validators.required],
          mes9: [this.solicitud.cronograma?.mes9 ?? '', Validators.required],
          mes10: [this.solicitud.cronograma?.mes10 ?? '', Validators.required],
          mes11: [this.solicitud.cronograma?.mes11 ?? '', Validators.required],
          mes12: [this.solicitud.cronograma?.mes12 ?? '', Validators.required]
        })
      });

      if (this.isReadOnly) {
        this.form.disable({ emitEvent: false });
      } else if (!this.canEditarFormularioPrincipal) {
        this.disableFormularioPrincipal();
      }

      if (!this.canEditarSeccionSecretaria) {
        this.form.get('observacionesSecretaria')?.disable({ emitEvent: false });
      }
    }
  }

  getEstadoTranslation(estado: EstadoSolicitud): string {
    return this.estadoTraducciones[estado];
  }

  get documentosDisponibles(): DocumentoOption[] {
    return this.documentoOptions.filter(
      (documento) =>
        documento.key === this.otrosDocumentoKey
        || !this.documentosSeleccionados.includes(documento.key)
    );
  }

  get documentosSeleccionadosDetalle(): DocumentoOption[] {
    return this.documentosSeleccionados
      .map((key) => {
        const documento = this.documentoOptions.find(
          (option) => option.key === this.getDocumentoBaseKey(key)
        );
        return documento ? { key, label: documento.label } : null;
      })
      .filter((documento): documento is DocumentoOption => Boolean(documento));
  }

  get secretariaDocumentosDisponibles(): DocumentoOption[] {
    return this.secretariaDocumentoOptions.filter((documento) =>
      this.canGestionarDocumentoSecretaria(documento.key)
      && (
        documento.key === this.otrosSecretariaKey
        || !this.secretariaDocumentosSeleccionados.includes(documento.key)
      )
    );
  }

  get secretariaDocumentosSeleccionadosDetalle(): DocumentoOption[] {
    return this.secretariaDocumentosSeleccionados
      .map((key) => {
        const documento = this.secretariaDocumentoOptions.find(
          (option) => option.key === this.getDocumentoBaseKey(key)
        );
        return documento ? { key, label: documento.label } : null;
      })
      .filter((documento): documento is DocumentoOption => Boolean(documento));
  }

  get showSeccionSecretaria(): boolean {
    if (!this.solicitud) {
      return false;
    }

    return this.estadoOptions.indexOf(this.solicitud.estado) > this.estadoOptions.indexOf('Borrador');
  }

  get canEditarSeccionSecretaria(): boolean {
    return !this.isReadOnly && this.rol !== 'DOCENTE';
  }

  get canEditarFormularioPrincipal(): boolean {
    return !this.isReadOnly && this.rol !== 'COORDINADOR' && this.rol !== 'CONTRATISTA';
  }

  canGestionarDocumentoSecretaria(key: string): boolean {
    const baseKey = this.getDocumentoBaseKey(key);

    if (!this.canEditarSeccionSecretaria) {
      return false;
    }

    if (this.rol === 'CONTRATISTA') {
      return baseKey === 'revisionRequisitosSabatico'
        || baseKey === 'actaConsejoFacultad'
        || baseKey === this.otrosSecretariaKey;
    }

    if (this.rol === 'COORDINADOR') {
      return baseKey === 'actaConsejoAcademico'
        || baseKey === 'resolucionConsejoAcademico'
        || baseKey === this.otrosSecretariaKey;
    }

    return baseKey === this.otrosSecretariaKey;
  }

  get documentosAdjuntosCount(): number {
    return Object.values(this.documentoArchivos).filter(
      (nombre): nombre is string => Boolean(nombre && nombre.trim())
    ).length;
  }

  get canEnviarRevision(): boolean {
    if (this.isReadOnly || !this.form || !this.solicitud) {
      return false;
    }

    if (this.rol === 'CONTRATISTA' || this.rol === 'COORDINADOR') {
      return this.hasDocumentosSecretariaObligatorios();
    }

    return this.form.valid && this.documentosAdjuntosCount >= this.minDocumentosRequeridos;
  }

  onAgregarDocumento(): void {
    if (!this.canEditarFormularioPrincipal) {
      return;
    }

    if (!this.documentoSeleccionado) {
      return;
    }

    const keyToAdd = this.buildDocumentoKey(this.documentoSeleccionado, this.documentosSeleccionados);
    if (!this.documentosSeleccionados.includes(keyToAdd)) {
      this.documentosSeleccionados = [
        ...this.documentosSeleccionados,
        keyToAdd
      ];
      if (!(keyToAdd in this.documentoArchivos)) {
        this.documentoArchivos[keyToAdd] = null;
      }
    }

    this.documentoSeleccionado = null;
  }

  async onEliminarDocumento(key: string): Promise<void> {
    if (!this.canEditarFormularioPrincipal) {
      return;
    }

    const result = await this.popUpManager.showConfirmAlert(
      this.translate.instant('HISTORIAL_SOLICITUDES.actions.confirmDeleteDoc'),
      this.translate.instant('HISTORIAL_SOLICITUDES.actions.confirmDeleteDocTitle')
    );

    if (!result?.isConfirmed) {
      return;
    }

    this.documentosSeleccionados = this.documentosSeleccionados.filter(
      (documento) => documento !== key
    );
    this.revokeDocumentoObjectUrl(key);
    delete this.documentoArchivos[key];
  }

  onAgregarDocumentoSecretaria(): void {
    if (!this.canEditarSeccionSecretaria) {
      return;
    }

    if (!this.secretariaDocumentoSeleccionado) {
      return;
    }

    if (!this.canGestionarDocumentoSecretaria(this.secretariaDocumentoSeleccionado)) {
      return;
    }

    const keyToAdd = this.buildDocumentoKey(
      this.secretariaDocumentoSeleccionado,
      this.secretariaDocumentosSeleccionados
    );
    if (!this.secretariaDocumentosSeleccionados.includes(keyToAdd)) {
      this.secretariaDocumentosSeleccionados = [
        ...this.secretariaDocumentosSeleccionados,
        keyToAdd
      ];
      if (!(keyToAdd in this.secretariaDocumentoArchivos)) {
        this.secretariaDocumentoArchivos[keyToAdd] = null;
      }
    }

    this.secretariaDocumentoSeleccionado = null;
  }

  async onEliminarDocumentoSecretaria(key: string): Promise<void> {
    if (!this.canGestionarDocumentoSecretaria(key)) {
      return;
    }

    const result = await this.popUpManager.showConfirmAlert(
      this.translate.instant('HISTORIAL_SOLICITUDES.actions.confirmDeleteDoc'),
      this.translate.instant('HISTORIAL_SOLICITUDES.actions.confirmDeleteDocTitle')
    );

    if (!result?.isConfirmed) {
      return;
    }

    this.secretariaDocumentosSeleccionados = this.secretariaDocumentosSeleccionados.filter(
      (documento) => documento !== key
    );
    this.revokeSecretariaDocumentoObjectUrl(key);
    delete this.secretariaDocumentoArchivos[key];
  }

  getDocumentoNombre(key: string): string | null {
    return this.documentoArchivos[key] ?? null;
  }

  onDocumentoChange(key: string, event: Event): void {
    if (!this.canEditarFormularioPrincipal) {
      return;
    }

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file && !this.isPdfFile(file)) {
      this.popUpManager.showErrorAlert(
        this.translate.instant('HISTORIAL_SOLICITUDES.modal.documentos.errorSoloPdf')
      );
      input.value = '';
      return;
    }

    this.revokeDocumentoObjectUrl(key);
    if (file) {
      this.documentoObjectUrls[key] = URL.createObjectURL(file);
    }
    this.documentoArchivos[key] = file ? file.name : null;
  }

  getDocumentoSecretariaNombre(key: string): string | null {
    return this.secretariaDocumentoArchivos[key] ?? null;
  }

  onDocumentoSecretariaChange(key: string, event: Event): void {
    if (!this.canGestionarDocumentoSecretaria(key)) {
      return;
    }

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file && !this.isPdfFile(file)) {
      this.popUpManager.showErrorAlert(
        this.translate.instant('HISTORIAL_SOLICITUDES.modal.documentos.errorSoloPdf')
      );
      input.value = '';
      return;
    }

    this.revokeSecretariaDocumentoObjectUrl(key);
    if (file) {
      this.secretariaDocumentoObjectUrls[key] = URL.createObjectURL(file);
    }
    this.secretariaDocumentoArchivos[key] = file ? file.name : null;
  }

  canPrevisualizarDocumento(key: string): boolean {
    return Boolean(this.documentoObjectUrls[key]);
  }

  onPrevisualizarDocumento(key: string): void {
    const previewUrl = this.documentoObjectUrls[key];
    if (!previewUrl) {
      return;
    }

    window.open(previewUrl, '_blank', 'noopener,noreferrer');
  }

  canPrevisualizarDocumentoSecretaria(key: string): boolean {
    return Boolean(this.secretariaDocumentoObjectUrls[key]);
  }

  onPrevisualizarDocumentoSecretaria(key: string): void {
    const previewUrl = this.secretariaDocumentoObjectUrls[key];
    if (!previewUrl) {
      return;
    }

    window.open(previewUrl, '_blank', 'noopener,noreferrer');
  }

  trackDocumento(_: number, item: { key: string }): string {
    return item.key;
  }

  hasCronogramaValue(key: string): boolean {
    const value = this.form?.get(`cronograma.${key}`)?.value as string | null | undefined;
    return Boolean(value && value.trim());
  }

  onGuardar(): void {
    if (this.isReadOnly) {
      return;
    }

    if (!this.form || !this.solicitud) {
      return;
    }

    const formValue = this.form.getRawValue() as Omit<
      SolicitudDetalle,
      'id' | 'fechaRadicado' | 'estado' | 'documentos' | 'documentosSecretaria'
    > & {
      cronograma: CronogramaActividad;
    };

    this.solicitud = {
      ...this.solicitud,
      ...formValue,
      cronograma: { ...formValue.cronograma },
      documentos: { ...this.documentoArchivos },
      documentosSecretaria: { ...this.secretariaDocumentoArchivos }
    };
  }

  async onEnviarRevision(): Promise<void> {
    if (!this.canEnviarRevision || !this.solicitud) {
      return;
    }

    const isDocenteBorrador = this.rol === 'DOCENTE'
      && (this.solicitud.estado === 'Borrador' || this.solicitud.estado === 'Subsanación solicitada');
    const textKey = isDocenteBorrador
      ? 'HISTORIAL_SOLICITUDES.actions.confirmSendDocenteDraft'
      : 'HISTORIAL_SOLICITUDES.actions.confirmSendGeneral';

    const result = await this.popUpManager.showConfirmAlert(
      this.translate.instant(textKey),
      this.translate.instant('HISTORIAL_SOLICITUDES.actions.confirmSendTitle')
    );

    if (!result?.isConfirmed) {
      return;
    }

    console.log(`Enviar a revisión solicitud ${this.solicitud.id}`);
  }

  private revokeDocumentoObjectUrl(key: string): void {
    const url = this.documentoObjectUrls[key];
    if (url) {
      URL.revokeObjectURL(url);
      delete this.documentoObjectUrls[key];
    }
  }

  private revokeSecretariaDocumentoObjectUrl(key: string): void {
    const url = this.secretariaDocumentoObjectUrls[key];
    if (url) {
      URL.revokeObjectURL(url);
      delete this.secretariaDocumentoObjectUrls[key];
    }
  }

  private getDocumentoBaseKey(key: string): string {
    if (key.startsWith(this.otrosDocumentoPrefijo)) {
      return this.otrosDocumentoKey;
    }
    if (key.startsWith(this.otrosSecretariaPrefijo)) {
      return this.otrosSecretariaKey;
    }
    return key;
  }

  private buildDocumentoKey(baseKey: string, selectedKeys: string[]): string {
    if (baseKey === this.otrosDocumentoKey) {
      return this.buildUniqueKey(this.otrosDocumentoPrefijo, selectedKeys);
    }
    if (baseKey === this.otrosSecretariaKey) {
      return this.buildUniqueKey(this.otrosSecretariaPrefijo, selectedKeys);
    }
    return baseKey;
  }

  private buildUniqueKey(prefix: string, selectedKeys: string[]): string {
    let index = 1;
    let dynamicKey = `${prefix}${index}`;
    while (selectedKeys.includes(dynamicKey)) {
      index += 1;
      dynamicKey = `${prefix}${index}`;
    }
    return dynamicKey;
  }

  private disableFormularioPrincipal(): void {
    if (!this.form) {
      return;
    }

    Object.keys(this.form.controls)
      .filter((controlName) => controlName !== 'observacionesSecretaria')
      .forEach((controlName) => {
        this.form?.get(controlName)?.disable({ emitEvent: false });
      });
  }

  private hasDocumentosSecretariaObligatorios(): boolean {
    const requiredKeysByRole: Record<string, string[]> = {
      CONTRATISTA: ['revisionRequisitosSabatico', 'actaConsejoFacultad'],
      COORDINADOR: ['actaConsejoAcademico', 'resolucionConsejoAcademico']
    };
    const requiredKeys = requiredKeysByRole[this.rol] ?? [];

    if (!requiredKeys.length) {
      return false;
    }

    return requiredKeys.every((key) => {
      const nombre = this.secretariaDocumentoArchivos[key];
      return Boolean(nombre && nombre.trim());
    });
  }

  private isPdfFile(file: File): boolean {
    const fileName = file.name.toLowerCase();
    const isPdfByExtension = fileName.endsWith('.pdf');
    const isPdfByMime = file.type === 'application/pdf';
    return isPdfByExtension || isPdfByMime;
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
          mes1: '',
          mes2: '',
          mes3: '',
          mes4: '',
          mes5: '',
          mes6: '',
          mes7: '',
          mes8: '',
          mes9: '',
          mes10: '',
          mes11: '',
          mes12: ''
        }
    };
  }
}
