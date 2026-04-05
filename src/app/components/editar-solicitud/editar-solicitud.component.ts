import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { forkJoin, map, Observable, of, switchMap, tap } from 'rxjs';
import Swal from 'sweetalert2';
import { PopUpManager } from '../../../managers/popUpManager';
import { SabaticosCrudService } from '../../services/sabatico-crud.service';
import {
  CRONOGRAMA_MESES,
  DOCUMENTO_OPTIONS,
  ESTADO_OPTIONS,
  ESTADO_TRADUCCIONES,
  SECRETARIA_DOCUMENTO_OPTIONS
} from './constant';
import {
  DocumentoOption,
  EstadoSolicitud,
  FormularioInit,
  FormularioSolicitud,
  FormularioSolicitudFormValue,
  GuardarBorradorBody,
  RadicarBody
} from './interface';
import { ParametrosService } from '../../services/parametros.service';
import { SabaticosMidService } from '../../services/sabaticos-mid.service';
import { GestorDocumentalService } from '../../services/gestor-documental.service';
import { SecretariaGeneralBody } from './interface/guardar-secretaria-general.type';

@Component({
  selector: 'app-editar-solicitud',
  templateUrl: './editar-solicitud.component.html',
  styleUrl: './editar-solicitud.component.scss'
})
export class EditarSolicitudComponent implements OnDestroy {
  // Estado general
  // readonly minDocumentosRequeridos = 9;
  private readonly otrosDocumentoKey = 'otros';
  private readonly otrosDocumentoPrefijo = 'otros__';
  private readonly otrosSecretariaKey = 'otrosRequeridos';
  private readonly otrosSecretariaPrefijo = 'otrosRequeridos__';

  formulario: FormularioSolicitud | null = null;
  formularioInit: FormularioInit | null = null;
  formularioRecordId: number | null = null;
  documentos: any = null;
  currentLang = 'es';
  modalidadesOptions: any[] = [];
  form: FormGroup | null = null;
  isReadOnly = false;
  rol = '';
  terceroIdSolicitud = 0;
  documentosModificados = false;


  // Estado de documentos (docente)
  documentoArchivos: Record<string, string | null> = {};
  documentoObjectUrls: Record<string, string> = {};
  documentoBackendIds: Record<string, number> = {};
  documentosCargando: Record<string, boolean> = {};
  documentoSeleccionado: string | null = null;
  documentosSeleccionados: string[] = [];
  documentoAprobaciones: Record<string, 'aprobado' | 'rechazado' | null> = {};
  documentosDocenteExistentesIds: number[] = [];
  documentosDocenteNuevosIds: number[] = [];

  // Para subir solo los nuevos
  documentosDocenteNuevosFiles: { [key: string]: File } = {};

  documentosDocenteBackend: any[] = [];
  soporteBackendByKey: Record<string, any> = {};

  // Estado de documentos (secretaría)
  secretariaDocumentoArchivos: Record<string, string | null> = {};
  secretariaDocumentoObjectUrls: Record<string, string> = {};
  secretariaDocumentoBackendIds: Record<string, number> = {};
  secretariaDocumentosCargando: Record<string, boolean> = {};
  secretariaDocumentoSeleccionado: string | null = null;
  secretariaDocumentosSeleccionados: string[] = [];
  secretariaDocumentosNuevosFiles: { [key: string]: File } = {};
  secretariaDocumentosExistentesIds: number[] = [];
  secretariaDocumentosNuevosIds: number[] = [];
  secretariaSoporteBackendByKey: Record<string, any> = {};

  // Catálogos
  readonly cronogramaMeses = CRONOGRAMA_MESES;
  readonly documentoOptions: DocumentoOption[] = DOCUMENTO_OPTIONS;
  readonly secretariaDocumentoOptions: DocumentoOption[] = SECRETARIA_DOCUMENTO_OPTIONS;
  readonly estadoTraducciones: Record<EstadoSolicitud, string> = ESTADO_TRADUCCIONES;
  readonly estadoOptions: EstadoSolicitud[] = ESTADO_OPTIONS;
  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly router: Router,
    private readonly popUpManager: PopUpManager,
    private readonly sabaticosCrudService: SabaticosCrudService,
    private readonly sabaticosMidService: SabaticosMidService,
    private readonly parametrosService: ParametrosService,
    private readonly gestorDocumentalService: GestorDocumentalService,
    private readonly translate: TranslateService
  ) {
    const solicitudId = (this.router.getCurrentNavigation()?.extras?.state ?? history.state)?.['solicitud']?.id;

    forkJoin({
      formularioResponse: this.sabaticosCrudService.get(
        `formulario_solicitud?query=SolicitudId:${solicitudId},Activo:True&limit=100`
      ),
      documentosResponse: this.sabaticosCrudService.get(
        `soporte_solicitud?query=SolicitudId:${solicitudId},Activo:True`
      ),
      modalidadesResponse: this.parametrosService.get('parametro?query=TipoParametroId__CodigoAbreviacion:MODSAB')
    }).subscribe({
      next: ({ formularioResponse, documentosResponse, modalidadesResponse }: any) => {
        const data = formularioResponse?.Data ?? formularioResponse ?? [];
        this.terceroIdSolicitud = Number(data[0]?.SolicitudId?.TerceroId) || 0;
        const formularioRaw = Array.isArray(data) && data.length > 0 ? data[0] : null;

        if (formularioRaw) {
          this.formularioRecordId = formularioRaw.Id ?? null;
          this.formulario = this.parseContenidoToFormulario(formularioRaw);
        }

        this.documentos = documentosResponse?.Data ?? documentosResponse;
        this.modalidadesOptions = modalidadesResponse?.Data ?? modalidadesResponse ?? [];
        this.initializeSolicitudFromNavigation();
        const soportesBackend = Array.isArray(documentosResponse?.Data)
          ? documentosResponse.Data
          : [];

        this.documentosDocenteBackend = [...soportesBackend];

        const soportesDocente = soportesBackend.filter(
          (s: any) => !s.RolUsuario || s.RolUsuario === 'DOCENTE'
        );
        const soportesSecretaria = soportesBackend.filter(
          (s: any) => s.RolUsuario === 'SECRETARIA_ACADEMICA' || s.RolUsuario === 'COORDINADOR'
        );

        this.documentosDocenteExistentesIds = soportesDocente
          .map((item: any) => Number(item?.DocumentoId))
          .filter((id: number) => !isNaN(id) && id > 0);

        this.secretariaDocumentosExistentesIds = soportesSecretaria
          .map((item: any) => Number(item?.DocumentoId))
          .filter((id: number) => !isNaN(id) && id > 0);

        this.applySoportesFromBackend(soportesDocente);
        this.applySoportesSecretariaFromBackend(soportesSecretaria);
        this.applyFormPermissions();
      },
      error: (error) => {
        console.error('Error al llamar al servicio:', error);
        this.initializeFromMockDetalle();
      }
    });
  }

  ngOnDestroy(): void {
    Object.values(this.documentoObjectUrls).forEach((url) => {
      if (url?.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    Object.values(this.secretariaDocumentoObjectUrls).forEach((url) => {
      if (url?.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
  }

  // =========================
  // Inicialización
  // =========================
  private initializeSolicitudFromNavigation(): void {
    const navigationState = this.router.getCurrentNavigation()?.extras?.state ?? history.state;
    const stateSolicitud = navigationState?.['solicitud'];
    this.isReadOnly = Boolean(navigationState?.['readOnly']);
    this.rol = String(navigationState?.['rol'] ?? '');

    this.formularioInit = {
      id: stateSolicitud.id ?? '',
      fechaRadicado: stateSolicitud.fechaRadicado ?? '',
      estado: stateSolicitud.estado ?? '',
    };

    this.form = this.buildForm();

    if (!this.form || !this.formulario) {
      return;
    }

    const form = this.form;

    const detalleSolicitud = this.formulario.detalle_solicitud ?? {};
    const docente = this.formulario.docente ?? {};
    const objetivos = this.formulario.objetivos ?? {};
    const articulacion = this.formulario.articulacion ?? {};
    const cronograma = this.formulario.cronograma ?? {};

    form.patchValue({
      docenteNombre: docente.nombre ?? '',
      docenteIdentificacion: docente.identificacion ?? '',
      docenteFacultad: docente.facultad ?? '',
      docenteProyecto: docente.proyecto_curricular ?? '',
      periodoEjecucion: detalleSolicitud.periodo_ejecucion ?? '',
      productoUltimo:
        detalleSolicitud.ultimo_sabatico?.producto_ultimo_sabatico
        ?? detalleSolicitud.producto_ultimo_sabatico
        ?? '',
      modalidad: detalleSolicitud.modalidadId ??'',
      objetivoGeneral: objetivos.objetivo_general ?? '',
      objetivosEspecificos: objetivos.objetivos_especificos ?? '',
      justificacion: this.formulario.justificacion ?? '',
      planDesarrolloInstitucional:
        articulacion.plan_desarrollo_institucional ?? '',
      proyectoEducativoFacultad:
        articulacion.proyecto_educativo_facultad ?? '',
      proyectoEducativoProgramas:
        articulacion.proyecto_educativo_programas ?? '',
      productoEntregable: this.formulario.producto_entregable ?? '',
      impactoAlcance: this.formulario.impacto_alcance ?? '',
      metodologia: this.formulario.metodologia ?? '',
      presupuesto: this.formulario.presupuesto ?? '',
      observaciones: this.formulario.observaciones ?? '',
      observacionesSecretaria: this.formulario.observacionesSecretaria ?? '',
      ultimoSabatico: {
        start: this.parseApiDate(detalleSolicitud.ultimo_sabatico?.fecha_inicio),
        end: this.parseApiDate(detalleSolicitud.ultimo_sabatico?.fecha_fin)
      },
      cronograma: {
        mes1: cronograma.mes1 ?? '',
        mes2: cronograma.mes2 ?? '',
        mes3: cronograma.mes3 ?? '',
        mes4: cronograma.mes4 ?? '',
        mes5: cronograma.mes5 ?? '',
        mes6: cronograma.mes6 ?? '',
        mes7: cronograma.mes7 ?? '',
        mes8: cronograma.mes8 ?? '',
        mes9: cronograma.mes9 ?? '',
        mes10: cronograma.mes10 ?? '',
        mes11: cronograma.mes11 ?? '',
        mes12: cronograma.mes12 ?? ''
      }
    });
  }

  private applyFormPermissions(): void {
    if (!this.form) {
      return;
    }

    if (this.isReadOnly) {
      this.form.disable({ emitEvent: false });
    } else if (!this.canEditarFormularioPrincipal) {
      this.disableFormularioPrincipal();
    }

    if (!this.canEditarSeccionSecretaria) {
      this.form.get('observacionesSecretaria')?.disable({ emitEvent: false });
    }
  }

  // =========================
  // Getters / estado derivado
  // =========================
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

  get hasUnsavedChanges(): boolean {
    return Boolean(this.form?.dirty) || this.documentosModificados;
  }

  get showSeccionSecretaria(): boolean {
    if (!this.formularioInit) {
      return false;
    }

    return this.estadoOptions.indexOf(this.formularioInit.estado) > this.estadoOptions.indexOf('Borrador');
  }

  get canEditarSeccionSecretaria(): boolean {
    return !this.isReadOnly && this.rol !== 'DOCENTE';
  }

  get canEditarFormularioPrincipal(): boolean {
    return !this.isReadOnly && this.rol !== 'COORDINADOR' && this.rol !== 'SECRETARIA_ACADEMICA';
  }

  get canAprobarDocumentos(): boolean {
    return !this.isReadOnly && this.rol === 'SECRETARIA_ACADEMICA';
  }

  isDocumentoCargando(key: string): boolean {
    return Boolean(this.documentosCargando[key]);
  }

  getDocumentoAprobacion(key: string): 'aprobado' | 'rechazado' | null {
    return this.documentoAprobaciones[key] ?? null;
  }

  async onAprobarDocumento(key: string): Promise<void> {
    const result = await this.popUpManager.showConfirmAlert(
      this.translate.instant('HISTORIAL_SOLICITUDES.edit.documentos.confirmApproveDoc'),
      this.translate.instant('HISTORIAL_SOLICITUDES.edit.documentos.confirmApproveDocTitle')
    );

    if (!result?.isConfirmed) {
      return;
    }

    this.actualizarEstadoSoporte(key, 'SAOK');
  }

  async onRechazarDocumento(key: string): Promise<void> {
    const result = await this.popUpManager.showConfirmAlert(
      this.translate.instant('HISTORIAL_SOLICITUDES.edit.documentos.confirmRejectDoc'),
      this.translate.instant('HISTORIAL_SOLICITUDES.edit.documentos.confirmRejectDocTitle')
    );

    if (!result?.isConfirmed) {
      return;
    }

    this.actualizarEstadoSoporte(key, 'SAINV');
  }

  canGestionarDocumentoSecretaria(key: string): boolean {
    const baseKey = this.getDocumentoBaseKey(key);

    if (!this.canEditarSeccionSecretaria) {
      return false;
    }

    if (this.rol === 'SECRETARIA_ACADEMICA') {
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
    if (this.isReadOnly || !this.form || !this.formulario) {
      return false;
    }

    if (this.rol === 'SECRETARIA_ACADEMICA' || this.rol === 'COORDINADOR') {
      return false;
    }

    return true
  }

  get canEnviarSecretariaGeneral(): boolean {
    if (this.isReadOnly) {
      return false;
    }

    return this.rol === 'SECRETARIA_GENERAL'
      || this.rol === 'SECRETARIA_ACADEMICA'
      || this.rol === 'COORDINADOR';
  }

  // =========================
  // Acciones documentos docente
  // =========================
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
      this.documentosModificados = true;
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

    const soporte = this.soporteBackendByKey[key];
    if (soporte?.Id) {
      this.desactivarSoporteEnBackend(soporte);
    }

    this.documentosSeleccionados = this.documentosSeleccionados.filter(
      (documento) => documento !== key
    );
    this.revokeDocumentoObjectUrl(key);
    delete this.documentoArchivos[key];
    delete this.documentoBackendIds[key];
    delete this.soporteBackendByKey[key];
    this.documentosModificados = true;
  }

  getDocumentoNombre(key: string): string | null {
    return this.documentoArchivos[key] ?? null;
  }

  onDocumentoChange(key: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) {
      return;
    }
  
    if (!this.isPdfFile(file)) {
      input.value = '';
      return;
    }
  
    // Guardar archivo nuevo
    this.documentosDocenteNuevosFiles[key] = file;
  
    // Nombre
    this.documentoArchivos[key] = file.name;
    console.log("documentoArchivos:", this.documentoArchivos);
  
    // Revoke anterior si existe
    if (this.documentoObjectUrls[key]) {
      URL.revokeObjectURL(this.documentoObjectUrls[key]);
    }
  
    // Crear preview
    this.documentoObjectUrls[key] = URL.createObjectURL(file);
  
    // Agregar a seleccionados
    if (!this.documentosSeleccionados.includes(key)) {
      this.documentosSeleccionados.push(key);
    }

    this.documentosModificados = true;
    input.value = '';
  }

  canPrevisualizarDocumento(key: string): boolean {
    return Boolean(this.documentoObjectUrls[key]) || Boolean(this.documentoArchivos[key]);
  }

  onPrevisualizarDocumento(key: string): void {
    const cachedUrl = this.documentoObjectUrls[key];
    if (cachedUrl) {
      window.open(cachedUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    const documentoId = this.documentoBackendIds[key];
    if (!documentoId) {
      this.popUpManager.showAlert(
        this.translate.instant('HISTORIAL_SOLICITUDES.edit.documentos.noPreviewTitle'),
        this.translate.instant('HISTORIAL_SOLICITUDES.edit.documentos.noPreviewText')
      );
      return;
    }

    if (this.documentosCargando[key]) {
      return;
    }

    this.documentosCargando[key] = true;

    this.gestorDocumentalService.getDocumentoById(documentoId).subscribe({
      next: (nuxeoDoc) => {
        this.documentosCargando[key] = false;

        if (!nuxeoDoc) {
          this.popUpManager.showErrorAlert(
            this.translate.instant('HISTORIAL_SOLICITUDES.edit.documentos.noPreviewText')
          );
          return;
        }

        const nombre = nuxeoDoc.Nombre ?? nuxeoDoc.Nuxeo?.['dc:title'];
        if (nombre) {
          this.documentoArchivos[key] = nombre;
        }

        const blobUrl = this.gestorDocumentalService.getBlobUrlFromDocumento(nuxeoDoc);
        if (blobUrl) {
          this.documentoObjectUrls[key] = blobUrl;
          window.open(blobUrl, '_blank', 'noopener,noreferrer');
        } else {
          this.popUpManager.showErrorAlert(
            this.translate.instant('HISTORIAL_SOLICITUDES.edit.documentos.noPreviewText')
          );
        }
      },
      error: () => {
        this.documentosCargando[key] = false;
        this.popUpManager.showErrorAlert(
          this.translate.instant('HISTORIAL_SOLICITUDES.edit.documentos.noPreviewText')
        );
      }
    });
  }

  // =========================
  // Acciones documentos secretaría
  // =========================
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
      this.documentosModificados = true;
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

    const soporte = this.secretariaSoporteBackendByKey[key];
    if (soporte?.Id) {
      this.desactivarSoporteEnBackend(soporte);
    }

    this.secretariaDocumentosSeleccionados = this.secretariaDocumentosSeleccionados.filter(
      (documento) => documento !== key
    );
    this.revokeSecretariaDocumentoObjectUrl(key);
    delete this.secretariaDocumentoArchivos[key];
    delete this.secretariaDocumentoBackendIds[key];
    delete this.secretariaSoporteBackendByKey[key];
    this.documentosModificados = true;
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
      this.secretariaDocumentosNuevosFiles[key] = file;
      this.documentosModificados = true;
    }
    this.secretariaDocumentoArchivos[key] = file ? file.name : null;
    input.value = '';
  }

  canPrevisualizarDocumentoSecretaria(key: string): boolean {
    return Boolean(this.secretariaDocumentoObjectUrls[key]) || Boolean(this.secretariaDocumentoArchivos[key]);
  }

  canVerDocumentoSecretaria(key: string): boolean {
    return Boolean(this.secretariaDocumentoObjectUrls[key] || this.secretariaDocumentoArchivos[key]);
  }

  isDocumentoSecretariaCargando(key: string): boolean {
    return Boolean(this.secretariaDocumentosCargando[key]);
  }

  onPrevisualizarDocumentoSecretaria(key: string): void {
    const cachedUrl = this.secretariaDocumentoObjectUrls[key];
    if (cachedUrl) {
      window.open(cachedUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    const documentoId = this.secretariaDocumentoBackendIds[key];
    if (!documentoId) {
      this.popUpManager.showAlert(
        this.translate.instant('HISTORIAL_SOLICITUDES.edit.documentos.noPreviewTitle'),
        this.translate.instant('HISTORIAL_SOLICITUDES.edit.documentos.noPreviewText')
      );
      return;
    }

    if (this.secretariaDocumentosCargando[key]) {
      return;
    }

    this.secretariaDocumentosCargando[key] = true;

    this.gestorDocumentalService.getDocumentoById(documentoId).subscribe({
      next: (nuxeoDoc) => {
        this.secretariaDocumentosCargando[key] = false;

        if (!nuxeoDoc) {
          this.popUpManager.showErrorAlert(
            this.translate.instant('HISTORIAL_SOLICITUDES.edit.documentos.noPreviewText')
          );
          return;
        }

        const nombre = nuxeoDoc.Nombre ?? nuxeoDoc.Nuxeo?.['dc:title'];
        if (nombre) {
          this.secretariaDocumentoArchivos[key] = nombre;
        }

        const blobUrl = this.gestorDocumentalService.getBlobUrlFromDocumento(nuxeoDoc);
        if (blobUrl) {
          this.secretariaDocumentoObjectUrls[key] = blobUrl;
          window.open(blobUrl, '_blank', 'noopener,noreferrer');
        } else {
          this.popUpManager.showErrorAlert(
            this.translate.instant('HISTORIAL_SOLICITUDES.edit.documentos.noPreviewText')
          );
        }
      },
      error: () => {
        this.secretariaDocumentosCargando[key] = false;
        this.popUpManager.showErrorAlert(
          this.translate.instant('HISTORIAL_SOLICITUDES.edit.documentos.noPreviewText')
        );
      }
    });
  }

  // =========================
  // Acciones de formulario
  // =========================
  trackDocumento(_: number, item: { key: string }): string {
    return item.key;
  }

  hasCronogramaValue(key: string): boolean {
    const value = this.form?.get(`cronograma.${key}`)?.value as string | null | undefined;
    return Boolean(value && value.trim());
  }

  onGuardarBorrador(): void {
    if (!this.form || !this.formulario) {
      return;
    }
  
    this.syncFormularioFromForm();
  
    const solicitudId = Number(this.formularioInit?.id) || 0;
    const terceroId = this.terceroIdSolicitud;
  
    const body: GuardarBorradorBody = {
      Id: this.formularioRecordId ?? 0,
      Contenido: JSON.stringify(this.formulario),
      Activo: true,
      FechaModificacion: this.formatTimestampForBackend(),
      FechaCreacion: this.formularioInit ? this.formatTimestampForBackend() : '',
      SolicitudId: {
        Id: solicitudId,
      }
    };
  
    this.subirDocumentosDocenteNuevos(solicitudId, terceroId).pipe(
      switchMap(() => {
        console.log('Guardar borrador con body:', body);
        return this.sabaticosCrudService.put('formulario_solicitud', body);
      })
    ).subscribe({
      next: (response) => {
        console.log('Borrador guardado exitosamente:', response);
        this.popUpManager.showSuccessAlert(
          this.translate.instant('HISTORIAL_SOLICITUDES.edit.saveSecretariaSuccess')
        );
        this.router.navigate(['solicitudes']);
      },
      error: (error) => {
        console.error('Error al guardar el borrador:', error);
        this.popUpManager.showErrorAlert(
          this.translate.instant('HISTORIAL_SOLICITUDES.edit.saveSecretariaError')
        );
      }
    });
  }

  onEnviarRevision(): void {
  if (!this.canEnviarRevision || !this.formulario) {
    return;
  }

  this.syncFormularioFromForm();

  const solicitudId = Number(this.formularioInit?.id) || 0;
  const terceroId = this.terceroIdSolicitud;

  if (!terceroId) {
    this.popUpManager.showErrorAlert(
      'No fue posible identificar el tercero de la solicitud',
    );
    return;
  }

  this.subirDocumentosDocenteNuevos(solicitudId, terceroId).pipe(
      switchMap(() => {
        const body: RadicarBody = {
          Id: solicitudId,
          SolicitudId: solicitudId,
          DocumentosId: this.getDocumentosDocenteIds(),
          FormularioId: this.formularioRecordId ?? 0,
          FechaCreacion: this.formatTimestampForBackend(),
          Formulario: this.formulario as FormularioSolicitud
        };
      
        console.log('Enviar a revisión con body:', body);
      
        return this.sabaticosMidService.post(
          `solicitud/radicar/${this.formularioInit?.id ?? 0}`,
          body
        );
      })
    ).subscribe({
      next: (response) => {
        console.log('Solicitud enviada a revisión exitosamente:', response);
        this.popUpManager.showSuccessAlert(
          this.translate.instant('HISTORIAL_SOLICITUDES.edit.sendSecretariaSuccess')
        );
        this.router.navigate(['solicitudes']);
      },
      error: (error) => {
        console.error('Error al enviar la solicitud a revisión:', error);
        this.popUpManager.showErrorAlert(
          this.translate.instant('HISTORIAL_SOLICITUDES.edit.sendSecretariaError')
        );
      }
    });
  }

  async onEnviarRevisionSecretariaGeneral(value: boolean): Promise<void> {
    if (!this.canEditarSeccionSecretaria || !this.formulario) {
      return;
    }

    this.syncFormularioFromForm();

    const solicitudId = Number(this.formularioInit?.id) || 0;
    const terceroId = this.terceroIdSolicitud;

    const formularioBody: GuardarBorradorBody = {
      Id: this.formularioRecordId ?? 0,
      Contenido: JSON.stringify(this.formulario),
      Activo: true,
      FechaModificacion: this.formatTimestampForBackend(),
      FechaCreacion: this.formatTimestampForBackend(),
      SolicitudId: { Id: solicitudId }
    };

    const estadoBody: SecretariaGeneralBody = {
      TerceroId: terceroId,
      SolicitudId: solicitudId,
      Justificacion: this.formulario.observacionesSecretaria ?? '',
      EstadoSolicitud: value ? 'ENVIADA_SG' : 'SUBSANACION_SOLICITADA',
      EstadoSoporte: value ? 'APROB' : 'NOAPROB',
    };

    this.subirDocumentosSecretariaNuevos(solicitudId, terceroId).pipe(
      switchMap(() => this.sabaticosCrudService.put('formulario_solicitud', formularioBody)),
      switchMap(() => this.sabaticosMidService.post('solicitud/aprobar-rechazar', estadoBody))
    ).subscribe({
      next: (response) => {
        console.log('Solicitud enviada exitosamente:', response);
        this.popUpManager.showSuccessAlert(
          this.translate.instant('HISTORIAL_SOLICITUDES.edit.sendSecretariaSuccess')
        );
        this.router.navigate(['solicitudes']);
      },
      error: (error) => {
        console.error('Error al enviar la solicitud:', error);
        this.popUpManager.showErrorAlert(
          this.translate.instant('HISTORIAL_SOLICITUDES.edit.sendSecretariaError')
        );
      }
    });
  }


  onGuardarCambiosSecretaria(): void {
    if (!this.canEditarSeccionSecretaria || !this.form || !this.formulario) {
      return;
    }

    this.syncFormularioFromForm();

    const solicitudId = Number(this.formularioInit?.id) || 0;
    const terceroId = this.terceroIdSolicitud;

    const body: GuardarBorradorBody = {
      Id: this.formularioRecordId ?? 0,
      Contenido: JSON.stringify(this.formulario),
      Activo: true,
      FechaModificacion: this.formatTimestampForBackend(),
      FechaCreacion: this.formatTimestampForBackend(),
      SolicitudId: {
        Id: solicitudId,
      }
    };

    this.subirDocumentosSecretariaNuevos(solicitudId, terceroId).pipe(
      switchMap(() => {
        console.log('Guardar cambios secretaría con body:', body);
        return this.sabaticosCrudService.put('formulario_solicitud', body);
      })
    ).subscribe({
      next: (response) => {
        console.log('Cambios de secretaría guardados exitosamente:', response);
        this.popUpManager.showSuccessAlert(
          this.translate.instant('HISTORIAL_SOLICITUDES.edit.saveSecretariaSuccess')
        );
        this.router.navigate(['solicitudes']);
      },
      error: (error) => {
        console.error('Error al guardar cambios de secretaría:', error);
        this.popUpManager.showErrorAlert(
          this.translate.instant('HISTORIAL_SOLICITUDES.edit.saveSecretariaError')
        );
      }
    });
  }

  private subirDocumentosSecretariaNuevos(
    solicitudId: number,
    terceroId: number
  ): Observable<number[]> {
    const archivos = Object.values(this.secretariaDocumentosNuevosFiles || {});

    if (!archivos.length) {
      return of([]);
    }

    const formData = new FormData();
    formData.append('solicitud_id', solicitudId.toString());
    formData.append('tercero_id', terceroId.toString());
    formData.append('rol_usuario', this.rol);
    formData.append('estado_soporte_solicitud', 'PEN');

    archivos.forEach((file) => formData.append('documentos', file));

    return this.sabaticosMidService.postFile('soporte_solicitud', formData).pipe(
      map((response: any) => {
        const nuevosIds = Array.isArray(response?.Data?.documentos)
          ? response.Data.documentos
              .map((doc: any) => Number(doc?.Id))
              .filter((id: number) => !isNaN(id) && id > 0)
          : [];

        return nuevosIds;
      }),
      tap((nuevosIds: number[]) => {
        this.secretariaDocumentosNuevosIds = [
          ...this.secretariaDocumentosNuevosIds,
          ...nuevosIds
        ];

        this.secretariaDocumentosExistentesIds = [
          ...new Set([
            ...this.secretariaDocumentosExistentesIds,
            ...nuevosIds
          ])
        ];

        this.secretariaDocumentosNuevosFiles = {};
      })
    );
  }

  // =========================
  // Helpers privados
  // =========================
  private actualizarEstadoSoporte(key: string, codigoAbreviacionEstado: 'SAOK' | 'SAINV'): void {
    const soporte = this.soporteBackendByKey[key];
    if (!soporte?.Id) {
      return;
    }
    const esAprobacion = codigoAbreviacionEstado === 'SAOK';

    Swal.fire({
      title: this.translate.instant('GLOBAL.cargando'),
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.sabaticosCrudService.get(
      `estado_soporte_solicitud?query=codigo_abreviacion:${codigoAbreviacionEstado},activo:true`
    ).subscribe({
      next: (estadoResponse: any) => {
        const estados = Array.isArray(estadoResponse?.Data) ? estadoResponse.Data : [];
        const estadoId = Number(estados[0]?.Id);

        if (!estadoId) {
          Swal.close();
          this.popUpManager.showErrorAlert(
            this.translate.instant('HISTORIAL_SOLICITUDES.edit.documentos.updateStatusError')
          );
          return;
        }

        const body = {
          ...soporte,
          EstadoSoporteSolicitudId: { Id: estadoId }
        };

        this.sabaticosCrudService.put('soporte_solicitud', body).subscribe({
          next: () => {
            Swal.close();
            this.documentoAprobaciones[key] = esAprobacion ? 'aprobado' : 'rechazado';
            this.soporteBackendByKey[key] = body;
            this.popUpManager.showSuccessAlert(
              esAprobacion
                ? this.translate.instant('HISTORIAL_SOLICITUDES.edit.documentos.approveSuccess')
                : this.translate.instant('HISTORIAL_SOLICITUDES.edit.documentos.rejectSuccess')
            );
          },
          error: (error: any) => {
            Swal.close();
            console.error(`Error al actualizar estado del soporte ${soporte.Id}:`, error);
            this.popUpManager.showErrorAlert(
              this.translate.instant('HISTORIAL_SOLICITUDES.edit.documentos.updateStatusError')
            );
          }
        });
      },
      error: (error: any) => {
        Swal.close();
        console.error(`Error al consultar estado ${codigoAbreviacionEstado}:`, error);
        this.popUpManager.showErrorAlert(
          this.translate.instant('HISTORIAL_SOLICITUDES.edit.documentos.updateStatusError')
        );
      }
    });
  }

  private desactivarSoporteEnBackend(soporte: any): void {
    const soporteId = soporte.Id;
    const body = {
      ...soporte,
      Activo: false
    };

    this.sabaticosCrudService.put('soporte_solicitud', body).subscribe({
      next: () => {
        console.log(`Soporte ${soporteId} desactivado exitosamente`);
      },
      error: (error: any) => {
        console.error(`Error al desactivar soporte ${soporteId}:`, error);
        this.popUpManager.showErrorAlert(
          this.translate.instant('HISTORIAL_SOLICITUDES.edit.saveSecretariaError')
        );
      }
    });
  }

  private applySoportesFromBackend(soportes: any[]): void {
    if (!Array.isArray(soportes) || !soportes.length) {
      return;
    }

    const baseKeys = this.documentoOptions
      .filter((option) => option.key !== this.otrosDocumentoKey)
      .map((option) => option.key);

    const selectedKeys: string[] = [];
    const archivos: Record<string, string | null> = {};

    soportes.forEach((soporte, index) => {
      const fallbackKey = baseKeys[index] ?? this.otrosDocumentoKey;
      const key = this.buildDocumentoKey(fallbackKey, selectedKeys);
      const documentoId = soporte?.DocumentoId;

      selectedKeys.push(key);
      archivos[key] = documentoId
        ? `Documento subido`
        : 'Documento cargado';

      if (documentoId && Number(documentoId) > 0) {
        this.documentoBackendIds[key] = Number(documentoId);
      }
      this.soporteBackendByKey[key] = soporte;

      const codigoAbreviacion = soporte?.EstadoSoporteSolicitudId?.CodigoAbreviacion;
      if (codigoAbreviacion === 'SAOK') {
        this.documentoAprobaciones[key] = 'aprobado';
      } else if (codigoAbreviacion === 'SAINV') {
        this.documentoAprobaciones[key] = 'rechazado';
      }
    });

    this.documentosSeleccionados = selectedKeys;
    this.documentoArchivos = {
      ...this.documentoArchivos,
      ...archivos
    };
  }

  private applySoportesSecretariaFromBackend(soportes: any[]): void {
    if (!Array.isArray(soportes) || !soportes.length) {
      return;
    }

    const baseKeys = this.secretariaDocumentoOptions
      .filter((option) => option.key !== this.otrosSecretariaKey)
      .map((option) => option.key);

    const selectedKeys: string[] = [];
    const archivos: Record<string, string | null> = {};

    soportes.forEach((soporte, index) => {
      const fallbackKey = baseKeys[index] ?? this.otrosSecretariaKey;
      const key = this.buildDocumentoKey(fallbackKey, selectedKeys);
      const documentoId = soporte?.DocumentoId;

      selectedKeys.push(key);
      archivos[key] = documentoId
        ? `Documento subido`
        : 'Documento cargado';

      if (documentoId && Number(documentoId) > 0) {
        this.secretariaDocumentoBackendIds[key] = Number(documentoId);
      }
      this.secretariaSoporteBackendByKey[key] = soporte;
    });

    this.secretariaDocumentosSeleccionados = selectedKeys;
    this.secretariaDocumentoArchivos = {
      ...this.secretariaDocumentoArchivos,
      ...archivos
    };
  }

private subirDocumentosDocenteNuevos(
    solicitudId: number,
    terceroId: number
  ): Observable<number[]> {
    const archivos = Object.values(this.documentosDocenteNuevosFiles || {});

    if (!archivos.length) {
      return of([]);
    }

    const formData = new FormData();
    formData.append('solicitud_id', solicitudId.toString());
    formData.append('tercero_id', terceroId.toString());
    formData.append('rol_usuario', 'DOCENTE');
    formData.append('estado_soporte_solicitud', 'PEN');

    archivos.forEach((file) => formData.append('documentos', file));

    return this.sabaticosMidService.postFile('soporte_solicitud', formData).pipe(
      map((response: any) => {
        const nuevosIds = Array.isArray(response?.Data?.documentos)
          ? response.Data.documentos
              .map((doc: any) => Number(doc?.Id))
              .filter((id: number) => !isNaN(id) && id > 0)
          : [];

        return nuevosIds;
      }),
      tap((nuevosIds: number[]) => {
        this.documentosDocenteNuevosIds = [
          ...this.documentosDocenteNuevosIds,
          ...nuevosIds
        ];

        this.documentosDocenteExistentesIds = [
          ...new Set([
            ...this.documentosDocenteExistentesIds,
            ...nuevosIds
          ])
        ];

        // Ya quedaron persistidos, así que se limpian como "pendientes"
        this.documentosDocenteNuevosFiles = {};
      })
    );
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

  private parseContenidoToFormulario(formularioRaw: any): FormularioSolicitud | null {
    if (!formularioRaw?.Contenido) return null;

    try {
      const contenido = typeof formularioRaw.Contenido === 'string'
        ? JSON.parse(formularioRaw.Contenido)
        : formularioRaw.Contenido;

      if (contenido?.plan_trabajo_ano_sabatico) {
        return this.mapPlanTrabajoToFormulario(contenido.plan_trabajo_ano_sabatico);
      }

      if (contenido?.docente) {
        return this.sanitizeFormulario(contenido as FormularioSolicitud);
      }

      return null;
    } catch (e) {
      console.error('Error al parsear Contenido del formulario:', e);
      return null;
    }
  }

  private mapPlanTrabajoToFormulario(plan: any): FormularioSolicitud {
    const ident = plan.identificacion_docente ?? {};
    const detalleSol = plan.detalle_solicitud ?? {};
    const ultimoSab = detalleSol.ultimo_sabatico ?? {};
    const objetivos = plan.objetivos ?? {};
    const articulacion = plan.articulacion ?? {};
    const cronograma = plan.cronograma ?? {};

    return {
      docente: {
        nombre: ident.nombre_docente ?? '',
        identificacion: ident.numero_identificacion ?? '',
        facultad: ident.facultad ?? '',
        proyecto_curricular: ident.proyecto_curricular ?? ''
      },
      detalle_solicitud: {
        modalidad: detalleSol.modalidad ?? '',
        modalidadId: detalleSol.modalidad_id ?? 0,
        periodo_ejecucion: detalleSol.periodo_ejecucion ?? '',
        producto_ultimo_sabatico: ultimoSab.producto_ultimo_sabatico ?? '',
        ultimo_sabatico: {
          fecha_inicio: ultimoSab.fecha_inicio ?? '',
          fecha_fin: ultimoSab.fecha_fin ?? '',
          producto_ultimo_sabatico: ultimoSab.producto_ultimo_sabatico ?? ''
        }
      },
      objetivos: {
        objetivo_general: objetivos.objetivo_general ?? '',
        objetivos_especificos: objetivos.objetivos_especificos ?? ''
      },
      articulacion: {
        plan_desarrollo_institucional: articulacion.plan_desarrollo_institucional ?? '',
        proyecto_educativo_facultad: articulacion.proyecto_educativo_facultad ?? '',
        proyecto_educativo_programas: articulacion.proyecto_educativo_programas ?? ''
      },
      cronograma: {
        mes1: cronograma.mes1 ?? '',
        mes2: cronograma.mes2 ?? '',
        mes3: cronograma.mes3 ?? '',
        mes4: cronograma.mes4 ?? '',
        mes5: cronograma.mes5 ?? '',
        mes6: cronograma.mes6 ?? '',
        mes7: cronograma.mes7 ?? '',
        mes8: cronograma.mes8 ?? '',
        mes9: cronograma.mes9 ?? '',
        mes10: cronograma.mes10 ?? '',
        mes11: cronograma.mes11 ?? '',
        mes12: cronograma.mes12 ?? ''
      },
      justificacion: plan.justificacion ?? '',
      producto_entregable: plan.producto_entregable ?? '',
      impacto_alcance: plan.impacto_alcance ?? '',
      metodologia: plan.metodologia ?? '',
      presupuesto: plan.presupuesto ?? '',
      observaciones: plan.observaciones ?? '',
      observacionesSecretaria: plan.observacionesSecretaria ?? ''
    };
  }

  private sanitizeFormulario(formulario: FormularioSolicitud): FormularioSolicitud {
    return {
      docente: {
        nombre: formulario.docente?.nombre ?? '',
        identificacion: formulario.docente?.identificacion ?? '',
        facultad: formulario.docente?.facultad ?? '',
        proyecto_curricular: formulario.docente?.proyecto_curricular ?? ''
      },
      detalle_solicitud: {
        modalidad: formulario.detalle_solicitud?.modalidad ?? '',
        modalidadId: formulario.detalle_solicitud?.modalidadId ?? 0,
        periodo_ejecucion: formulario.detalle_solicitud?.periodo_ejecucion ?? '',
        producto_ultimo_sabatico: formulario.detalle_solicitud?.producto_ultimo_sabatico ?? '',
        ultimo_sabatico: {
          fecha_inicio: formulario.detalle_solicitud?.ultimo_sabatico?.fecha_inicio ?? '',
          fecha_fin: formulario.detalle_solicitud?.ultimo_sabatico?.fecha_fin ?? '',
          producto_ultimo_sabatico: formulario.detalle_solicitud?.ultimo_sabatico?.producto_ultimo_sabatico ?? ''
        }
      },
      objetivos: {
        objetivo_general: formulario.objetivos?.objetivo_general ?? '',
        objetivos_especificos: formulario.objetivos?.objetivos_especificos ?? ''
      },
      articulacion: {
        plan_desarrollo_institucional: formulario.articulacion?.plan_desarrollo_institucional ?? '',
        proyecto_educativo_facultad: formulario.articulacion?.proyecto_educativo_facultad ?? '',
        proyecto_educativo_programas: formulario.articulacion?.proyecto_educativo_programas ?? ''
      },
      cronograma: {
        mes1: formulario.cronograma?.mes1 ?? '',
        mes2: formulario.cronograma?.mes2 ?? '',
        mes3: formulario.cronograma?.mes3 ?? '',
        mes4: formulario.cronograma?.mes4 ?? '',
        mes5: formulario.cronograma?.mes5 ?? '',
        mes6: formulario.cronograma?.mes6 ?? '',
        mes7: formulario.cronograma?.mes7 ?? '',
        mes8: formulario.cronograma?.mes8 ?? '',
        mes9: formulario.cronograma?.mes9 ?? '',
        mes10: formulario.cronograma?.mes10 ?? '',
        mes11: formulario.cronograma?.mes11 ?? '',
        mes12: formulario.cronograma?.mes12 ?? ''
      },
      justificacion: formulario.justificacion ?? '',
      producto_entregable: formulario.producto_entregable ?? '',
      impacto_alcance: formulario.impacto_alcance ?? '',
      metodologia: formulario.metodologia ?? '',
      presupuesto: formulario.presupuesto ?? '',
      observaciones: formulario.observaciones ?? '',
      observacionesSecretaria: formulario.observacionesSecretaria ?? ''
    };
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

  private getDocumentosDocenteIds(): number[] {
    return [...new Set([
      ...this.documentosDocenteExistentesIds,
      ...this.documentosDocenteNuevosIds
    ])];
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

  private buildForm(): FormGroup {
    return this.formBuilder.group({
      docenteNombre: [{ value: this.formulario?.docente?.nombre ?? '', disabled: true }],
      docenteIdentificacion: [{ value: this.formulario?.docente?.identificacion ?? '', disabled: true }],
      docenteFacultad: [{ value: this.formulario?.docente?.facultad ?? '', disabled: true }],
      docenteProyecto: [{ value: this.formulario?.docente?.proyecto_curricular ?? '', disabled: true }],
      periodoEjecucion: ['', Validators.required],
      ultimoSabatico: this.formBuilder.group({
        start: [null, Validators.required],
        end: [null, Validators.required]
      }),
      productoUltimo: ['', Validators.required],
      modalidad: ['', Validators.required],
      objetivoGeneral: ['', Validators.required],
      objetivosEspecificos: ['', Validators.required],
      justificacion: ['', Validators.required],
      planDesarrolloInstitucional: ['', Validators.required],
      proyectoEducativoFacultad: ['', Validators.required],
      proyectoEducativoProgramas: ['', Validators.required],
      productoEntregable: ['', Validators.required],
      impactoAlcance: ['', Validators.required],
      metodologia: ['', Validators.required],
      presupuesto: ['', Validators.required],
      observaciones: [''],
      observacionesSecretaria: [this.formulario?.observacionesSecretaria ?? ''],
      cronograma: this.formBuilder.group({
        mes1: ['', Validators.required],
        mes2: ['', Validators.required],
        mes3: ['', Validators.required],
        mes4: ['', Validators.required],
        mes5: ['', Validators.required],
        mes6: ['', Validators.required],
        mes7: ['', Validators.required],
        mes8: ['', Validators.required],
        mes9: ['', Validators.required],
        mes10: ['', Validators.required],
        mes11: ['', Validators.required],
        mes12: ['', Validators.required]
      })
    });
  }

  private parseApiDate(value: string | null | undefined): Date | null {
    if (!value) {
      return null;
    }

    const [year, month, day] = value.split('-').map(Number);

    if (!year || !month || !day) {
      return null;
    }

    return new Date(year, month - 1, day);
  }

  private formatDateOnlyForBackend(date: Date | null | undefined): string {
    if (!date) {
      return '';
    }

    const pad = (value: number): string => String(value).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());

    return `${year}-${month}-${day}`;
  }

  private syncFormularioFromForm(): void {
    if (!this.form || !this.formulario) {
      return;
    }

    const formValue = this.form.getRawValue() as FormularioSolicitudFormValue;
    const modalidadOption = this.modalidadesOptions.find(
      (option) => String(option?.Id) === String(formValue.modalidad)
    );
    const modalidadIdParsed = Number(formValue.modalidad);

    this.formulario = {
      ...this.formulario,
      docente: {
        ...this.formulario.docente,
        nombre: formValue.docenteNombre,
        identificacion: formValue.docenteIdentificacion,
        facultad: formValue.docenteFacultad,
        proyecto_curricular: formValue.docenteProyecto
      },
      detalle_solicitud: {
        ...this.formulario.detalle_solicitud,
        modalidad: modalidadOption?.Nombre ?? this.formulario.detalle_solicitud?.modalidad ?? '',
        modalidadId: Number.isFinite(modalidadIdParsed)
          ? modalidadIdParsed
          : (this.formulario.detalle_solicitud?.modalidadId ?? 0),
        periodo_ejecucion: formValue.periodoEjecucion,
        producto_ultimo_sabatico: formValue.productoUltimo,
        ultimo_sabatico: {
          ...this.formulario.detalle_solicitud?.ultimo_sabatico,
          fecha_inicio: this.formatDateOnlyForBackend(formValue.ultimoSabatico?.start),
          fecha_fin: this.formatDateOnlyForBackend(formValue.ultimoSabatico?.end),
          producto_ultimo_sabatico: formValue.productoUltimo
        }
      },
      objetivos: {
        ...this.formulario.objetivos,
        objetivo_general: formValue.objetivoGeneral,
        objetivos_especificos: formValue.objetivosEspecificos
      },
      articulacion: {
        ...this.formulario.articulacion,
        plan_desarrollo_institucional: formValue.planDesarrolloInstitucional,
        proyecto_educativo_facultad: formValue.proyectoEducativoFacultad,
        proyecto_educativo_programas: formValue.proyectoEducativoProgramas
      },
      cronograma: {
        ...formValue.cronograma
      },
      justificacion: formValue.justificacion,
      producto_entregable: formValue.productoEntregable,
      impacto_alcance: formValue.impactoAlcance,
      metodologia: formValue.metodologia,
      presupuesto: formValue.presupuesto,
      observaciones: formValue.observaciones,
      observacionesSecretaria: formValue.observacionesSecretaria
    };
  }

  private formatTimestampForBackend(date: Date = new Date()): string {
    const pad = (value: number): string => String(value).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  private hasDocumentosSecretariaObligatorios(): boolean {
    const requiredKeysByRole: Record<string, string[]> = {
      SECRETARIA_ACADEMICA: ['revisionRequisitosSabatico', 'actaConsejoFacultad'],
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

  private initializeFromMockDetalle(): void {
    const navigationState = this.router.getCurrentNavigation()?.extras?.state ?? history.state;
    const stateSolicitud = navigationState?.['solicitud'];
    const mockDetalle = stateSolicitud?.mockDetalle;

    if (!mockDetalle) {
      return;
    }

    const formatDate = (d: Date | null): string =>
      d instanceof Date && !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';

    this.formulario = {
      docente: {
        nombre: mockDetalle.docenteNombre ?? '',
        identificacion: mockDetalle.docenteIdentificacion ?? '',
        facultad: mockDetalle.docenteFacultad ?? '',
        proyecto_curricular: mockDetalle.docenteProyecto ?? ''
      },
      detalle_solicitud: {
        modalidad: mockDetalle.modalidad ?? '',
        modalidadId: 0,
        periodo_ejecucion: mockDetalle.periodoEjecucion ?? '',
        producto_ultimo_sabatico: mockDetalle.productoUltimo ?? '',
        ultimo_sabatico: {
          fecha_inicio: formatDate(mockDetalle.ultimoSabatico?.start),
          fecha_fin: formatDate(mockDetalle.ultimoSabatico?.end),
          producto_ultimo_sabatico: mockDetalle.productoUltimo ?? ''
        }
      },
      objetivos: {
        objetivo_general: mockDetalle.objetivoGeneral ?? '',
        objetivos_especificos: mockDetalle.objetivosEspecificos ?? ''
      },
      articulacion: {
        plan_desarrollo_institucional: mockDetalle.planDesarrolloInstitucional ?? '',
        proyecto_educativo_facultad: mockDetalle.proyectoEducativoFacultad ?? '',
        proyecto_educativo_programas: mockDetalle.proyectoEducativoProgramas ?? ''
      },
      cronograma: mockDetalle.cronograma ?? {
        mes1: '', mes2: '', mes3: '', mes4: '', mes5: '', mes6: '',
        mes7: '', mes8: '', mes9: '', mes10: '', mes11: '', mes12: ''
      },
      justificacion: mockDetalle.justificacion ?? '',
      producto_entregable: mockDetalle.productoEntregable ?? '',
      impacto_alcance: mockDetalle.impactoAlcance ?? '',
      metodologia: mockDetalle.metodologia ?? '',
      presupuesto: mockDetalle.presupuesto ?? '',
      observaciones: mockDetalle.observaciones ?? ''
    };

    this.initializeSolicitudFromNavigation();

    const documentos: Record<string, string | null> = mockDetalle.documentos ?? {};
    const selectedKeys = Object.keys(documentos).filter((k) => Boolean(documentos[k]));
    this.documentosSeleccionados = selectedKeys;
    this.documentoArchivos = { ...documentos };

    this.applyFormPermissions();
  }
}
