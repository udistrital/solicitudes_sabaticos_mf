import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { catchError, concatMap, finalize, forkJoin, from, map, Observable, of, switchMap, tap, timer, toArray } from 'rxjs';
import Swal from 'sweetalert2';
import { PopUpManager } from '../../../managers/popUpManager';
import { LoaderService } from '../../services/loader.service';
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
import { ConfiguracionService } from '../../services/configuracion.service';
import { ParametrosService } from '../../services/parametros.service';
import { SabaticosMidService } from '../../services/sabaticos-mid.service';
import { GestorDocumentalService } from '../../services/gestor-documental.service';
import { NotificacionService } from '../../services/notificacion.service';
import { SecretariaGeneralBody } from './interface/guardar-secretaria-general.type';

@Component({
    selector: 'app-editar-solicitud',
    templateUrl: './editar-solicitud.component.html',
    styleUrl: './editar-solicitud.component.scss',
    standalone: false
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
  cargandoDocumentos = true;
  cargandoDocumentosSecretaria = true;
  form: FormGroup | null = null;
  isReadOnly = false;
  rol = '';
  terceroIdSolicitud = 0;
  documentosModificados = false;
  permisos: any[] = [];
  perfil: string = '';


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
  secretariaDocumentoAprobaciones: Record<string, 'aprobado' | 'rechazado' | null> = {};
  private secretariaTiposPropiosIds: Set<number> = new Set();
  private secretariaKeysPropios: Set<string> = new Set();
  tipoDocumentoCodigoById: Record<number, string> = {};

  // Catálogos
  readonly cronogramaMeses = CRONOGRAMA_MESES;
  documentoOptions: DocumentoOption[] = [...DOCUMENTO_OPTIONS];
  secretariaDocumentoOptions: DocumentoOption[] = [...SECRETARIA_DOCUMENTO_OPTIONS];
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
    private readonly translate: TranslateService,
    private readonly loaderService: LoaderService,
    private readonly configuracionService: ConfiguracionService,
    private readonly notificacionService: NotificacionService,
  ) {
    const navigationState = this.router.currentNavigation()?.extras?.state ?? history.state;
    const rolNavegacion = String(navigationState?.['rol'] ?? '');
    const solicitudId = (this.router.currentNavigation()?.extras?.state ?? history.state)?.['solicitud']?.id;

    if (rolNavegacion) {
      this.configuracionService
        .get('perfil_x_menu_opcion?limit=-1&query=Perfil__Nombre__in:' + rolNavegacion)
        .subscribe((response: any) => {
          this.permisos = Array.isArray(response) ? response : (response?.Data ?? []);
          this.perfil = this.permisos[0]?.Perfil?.Nombre ?? '';
        });
    }

    forkJoin({
      formularioResponse: this.sabaticosCrudService.get(
        `formulario_solicitud?query=SolicitudId:${solicitudId},Activo:True&limit=-1`
      ),
      documentosResponse: this.sabaticosCrudService.get(
        `soporte_solicitud?query=SolicitudId:${solicitudId},Activo:True&limit=-1`
      ),
      modalidadesResponse: this.parametrosService.get('parametro?query=TipoParametroId__CodigoAbreviacion:MODSAB'),
      documentosDocenteResponse: this.parametrosService.get(
        'parametro?query=TipoParametroId__CodigoAbreviacion:DOCSOL_DOCE_SAB&limit=-1'
      ),
      documentosSecretariaResponse: this.cargarOpcionesDocumentosSecretaria(rolNavegacion)
    }).subscribe({
      next: ({ formularioResponse, documentosResponse, modalidadesResponse, documentosDocenteResponse, documentosSecretariaResponse }: any) => {
        const data = formularioResponse?.Data ?? formularioResponse ?? [];
        this.terceroIdSolicitud = Number(data[0]?.SolicitudId?.TerceroId) || 0;
        const formularioRaw = Array.isArray(data) && data.length > 0 ? data[0] : null;

        if (formularioRaw) {
          this.formularioRecordId = formularioRaw.Id ?? null;
          this.formulario = this.parseContenidoToFormulario(formularioRaw);
        }

        this.documentos = documentosResponse?.Data ?? documentosResponse;
        this.modalidadesOptions = modalidadesResponse?.Data ?? modalidadesResponse ?? [];
        this.documentoOptions = this.mapParametroDocumentos(documentosDocenteResponse, DOCUMENTO_OPTIONS);
        this.secretariaDocumentoOptions = documentosSecretariaResponse as DocumentoOption[];
        this.cachearCodigosDesdeOpciones([
          ...this.documentoOptions,
          ...this.secretariaDocumentoOptions
        ]);
        this.cargandoDocumentos = false;
        this.cargandoDocumentosSecretaria = false;
        this.initializeSolicitudFromNavigation();
        const soportesBackend = Array.isArray(documentosResponse?.Data)
          ? documentosResponse.Data
          : [];

        this.documentosDocenteBackend = [...soportesBackend];

        const soportesDocente = soportesBackend.filter(
          (s: any) => !s.RolUsuario || s.RolUsuario === 'DOCENTE'
        );
        const soportesSecretaria = soportesBackend.filter(
          (s: any) => s.RolUsuario === 'SECRETARIA_ACADEMICA' || s.RolUsuario === 'SECRETARIA_GENERAL'
        );

        this.documentosDocenteExistentesIds = soportesDocente
          .map((item: any) => Number(item?.DocumentoId))
          .filter((id: number) => !isNaN(id) && id > 0);

        this.secretariaDocumentosExistentesIds = soportesSecretaria
          .map((item: any) => Number(item?.DocumentoId))
          .filter((id: number) => !isNaN(id) && id > 0);

        this.resolverTiposDocumentoPorId(soportesBackend).subscribe({
          next: () => {
            this.applySoportesFromBackend(soportesDocente);
            this.applySoportesSecretariaFromBackend(soportesSecretaria);
            this.applyFormPermissions();
          },
          error: () => {
            this.applySoportesFromBackend(soportesDocente);
            this.applySoportesSecretariaFromBackend(soportesSecretaria);
            this.applyFormPermissions();
          }
        });
      },
      error: (error) => {
        console.error('Error al llamar al servicio:', error);
        this.cargandoDocumentos = false;
        this.cargandoDocumentosSecretaria = false;
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
    const navigationState = this.router.currentNavigation()?.extras?.state ?? history.state;
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
    return !this.isReadOnly && this.rol !== 'SECRETARIA_GENERAL' && this.rol !== 'SECRETARIA_ACADEMICA';
  }

  get permisoAprobarRechazarSoportes(): boolean {
    return this.permisos.some((p: any) => p?.Opcion?.Nombre === 'Aprobar_Rechazar_Soportes_Solicitudes_Sabatico');
  }

  get permisoEnviarRevision(): boolean {
    return this.permisos.some((p: any) => p?.Opcion?.Nombre === 'Enviar_Revision_Solicitud_Sabatico');
  }

  get permisoGuardarCambios(): boolean {
    return this.permisos.some((p: any) => p?.Opcion?.Nombre === 'Guardar_Cambios_Solicitud_Sabatico');
  }

  get permisoSubsanar(): boolean {
    return this.permisos.some((p: any) => p?.Opcion?.Nombre === 'Subsanar_Solicitud_Sabatico');
  }

  get permisoRechazar(): boolean {
    return this.permisos.some((p: any) => p?.Opcion?.Nombre === 'Rechazar_Solicitud_Sabatico');
  }

  isDocumentoBloqueado(key: string): boolean {
    return this.documentoAprobaciones[key] === 'aprobado';
  }

  get canDocenteEditarDocumento(): boolean {
    return !this.isReadOnly && this.rol === 'DOCENTE';
  }

  private docenteTieneDocumentosBloqueados(): boolean {
    return this.documentosSeleccionados.some(
      (key) => this.isDocumentoBloqueado(key)
    );
  }

  get canAprobarDocumentos(): boolean {
    return !this.isReadOnly
      && (this.rol === 'SECRETARIA_ACADEMICA' || this.rol === 'SECRETARIA_GENERAL')
      && this.permisoAprobarRechazarSoportes;
  }

  private get codigoEstadoAprobado(): 'SAOK' | 'SGOK' {
    return this.rol === 'SECRETARIA_GENERAL' ? 'SGOK' : 'SAOK';
  }

  private get codigoEstadoRechazado(): 'SAINV' | 'SGINV' {
    return this.rol === 'SECRETARIA_GENERAL' ? 'SGINV' : 'SAINV';
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

    this.actualizarEstadoSoporte(key, this.codigoEstadoAprobado);
  }

  async onRechazarDocumento(key: string): Promise<void> {
    const result = await this.popUpManager.showConfirmAlert(
      this.translate.instant('HISTORIAL_SOLICITUDES.edit.documentos.confirmRejectDoc'),
      this.translate.instant('HISTORIAL_SOLICITUDES.edit.documentos.confirmRejectDocTitle')
    );

    if (!result?.isConfirmed) {
      return;
    }

    this.actualizarEstadoSoporte(key, this.codigoEstadoRechazado);
  }

  get canAprobarDocumentosSecretaria(): boolean {
    return !this.isReadOnly
      && this.rol === 'SECRETARIA_GENERAL'
      && this.permisoAprobarRechazarSoportes;
  }

  getDocumentoSecretariaAprobacion(key: string): 'aprobado' | 'rechazado' | null {
    return this.secretariaDocumentoAprobaciones[key] ?? null;
  }

  async onAprobarDocumentoSecretaria(key: string): Promise<void> {
    const result = await this.popUpManager.showConfirmAlert(
      this.translate.instant('HISTORIAL_SOLICITUDES.edit.documentos.confirmApproveDoc'),
      this.translate.instant('HISTORIAL_SOLICITUDES.edit.documentos.confirmApproveDocTitle')
    );

    if (!result?.isConfirmed) {
      return;
    }

    this.actualizarEstadoSoporte(key, this.codigoEstadoAprobado, 'secretaria');
  }

  async onRechazarDocumentoSecretaria(key: string): Promise<void> {
    const result = await this.popUpManager.showConfirmAlert(
      this.translate.instant('HISTORIAL_SOLICITUDES.edit.documentos.confirmRejectDoc'),
      this.translate.instant('HISTORIAL_SOLICITUDES.edit.documentos.confirmRejectDocTitle')
    );

    if (!result?.isConfirmed) {
      return;
    }

    this.actualizarEstadoSoporte(key, this.codigoEstadoRechazado, 'secretaria');
  }

  canGestionarDocumentoSecretaria(key: string): boolean {
    const baseKey = this.getDocumentoBaseKey(key);

    if (!this.canEditarSeccionSecretaria) {
      return false;
    }

    if (!this.secretariaDocumentoOptions.some((option) => option.key === baseKey)) {
      return false;
    }

    if (this.rol === 'SECRETARIA_GENERAL' || this.rol === 'SECRETARIA_ACADEMICA') {
      return this.esDocumentoSecretariaPropio(key, baseKey);
    }

    return true;
  }

  private esDocumentoSecretariaPropio(key: string, baseKey: string): boolean {
    const soporte = this.secretariaSoporteBackendByKey[key];
    if (soporte) {
      const rolUsuario = soporte?.RolUsuario;
      if (rolUsuario === 'SECRETARIA_GENERAL' || rolUsuario === 'SECRETARIA_ACADEMICA') {
        return rolUsuario === this.rol;
      }
      const tipoId = Number(soporte?.TipoDocumentoId) || 0;
      if (tipoId > 0) {
        return this.secretariaTiposPropiosIds.has(tipoId);
      }
    }

    const opcion = this.secretariaDocumentoOptions.find((option) => option.key === baseKey);
    const tipoIdOpcion = Number(opcion?.tipoDocumentoId) || 0;
    if (tipoIdOpcion > 0) {
      return this.secretariaTiposPropiosIds.has(tipoIdOpcion);
    }
    return this.secretariaKeysPropios.has(baseKey);
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

    if (this.rol !== 'DOCENTE') {
      return false;
    }

    if (this.docenteTieneDocumentosBloqueados()) {
      return false;
    }

    return this.form.valid
      && this.hasDocumentosDocenteObligatorios()
      && this.permisoEnviarRevision;
  }

  get canEnviarSecretariaGeneral(): boolean {
    if (this.isReadOnly || !this.form) {
      return false;
    }

    const canEnviarPorRol = this.rol === 'SECRETARIA_GENERAL'
      || this.rol === 'SECRETARIA_ACADEMICA';

    if (!canEnviarPorRol) {
      return false;
    }

    if (!this.permisoEnviarRevision) {
      return false;
    }

    const observacionesSecretaria = String(
      this.form.get('observacionesSecretaria')?.value ?? ''
    ).trim();

    if (this.rol === 'SECRETARIA_ACADEMICA') {
      return observacionesSecretaria.length > 0
        && this.hasDocumentosSecretariaObligatorios()
        && this.hasDocumentosDocenteAprobados();
    }

    if (this.rol === 'SECRETARIA_GENERAL') {
      return observacionesSecretaria.length > 0
        && this.hasDocumentosDocenteAprobados()
        && this.hasDocumentosSecretariaAcademicaAprobados()
        && this.hasDocumentosSecretariaPropiosSubidos();
    }

    return true;
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

  get canSubsanar(): boolean {
    if (this.isReadOnly || !this.form) return false;
    const rolValido =
      this.rol === 'SECRETARIA_GENERAL' ||
      this.rol === 'SECRETARIA_ACADEMICA';
    if (!rolValido) return false;
    const obs = String(this.form.get('observacionesSecretaria')?.value ?? '').trim();
    return obs.length > 0;
  }
  async onEliminarDocumento(key: string): Promise<void> {
    if (!this.canGestionarDocumentoDocente(key)) {
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
    delete this.documentosDocenteNuevosFiles[key];
    delete this.documentoBackendIds[key];
    delete this.soporteBackendByKey[key];
    this.documentosModificados = true;
  }

  getDocumentoNombre(key: string): string | null {
    return this.documentoArchivos[key] ?? null;
  }

  onDocumentoChange(key: string, event: Event): void {
    if (!this.canGestionarDocumentoDocente(key)) {
      return;
    }

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

  canGestionarDocumentoDocente(key: string): boolean {
    return this.canDocenteEditarDocumento && !this.isDocumentoBloqueado(key);
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
    delete this.secretariaDocumentosNuevosFiles[key];
    delete this.secretariaDocumentoBackendIds[key];
    delete this.secretariaSoporteBackendByKey[key];
    delete this.secretariaDocumentoAprobaciones[key];
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
        return this.sabaticosCrudService.put('formulario_solicitud', body);
      })
    ).subscribe({
      next: (response) => {
        this.popUpManager.showSuccessAlert(
          this.translate.instant('HISTORIAL_SOLICITUDES.edit.saveSecretariaSuccess')
        );
        this.marcarFormularioGuardado();

        const formValue = this.form?.getRawValue();
        if (formValue) {
          const now = new Date();
          const fecha = now.toISOString().replace('T', ' ').substring(0, 19);
          console.log('[TRAMO] editar-solicitud: ANTES de sendNotification sabaticos_borrador_creado, codigo_facultad:', this.formulario?.docente?.codigoFacultad ?? '');
          this.notificacionService.sendNotification('sabaticos_borrador_creado', 'docente', {
            nombre_docente: this.formulario?.docente?.nombre ?? formValue.docenteNombre ?? '',
            id_solicitud: String(solicitudId),
            fecha_solicitud: fecha,
            codigo_facultad: this.formulario?.docente?.codigoFacultad ?? '',
          });
        }
      },
      error: (error) => {
        this.showErrorAndReload(
          'HISTORIAL_SOLICITUDES.edit.saveSecretariaError',
          error
        );
      }
    });
  }

  async onEnviarRevision(): Promise<void> {
  if (!this.canEnviarRevision || !this.formulario) {
    return;
  }

  const confirm = await this.popUpManager.showConfirmAlert(
    this.translate.instant('HISTORIAL_SOLICITUDES.actions.confirmSendDocenteDraft'),
    this.translate.instant('HISTORIAL_SOLICITUDES.actions.confirmSendTitle')
  );

  if (!confirm?.isConfirmed) {
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

  const debeGuardarBorrador = this.hasUnsavedChanges;

  const formularioBody: GuardarBorradorBody = {
    Id: this.formularioRecordId ?? 0,
    Contenido: JSON.stringify(this.formulario),
    Activo: true,
    FechaModificacion: this.formatTimestampForBackend(),
    FechaCreacion: this.formularioInit ? this.formatTimestampForBackend() : '',
    SolicitudId: {
      Id: solicitudId,
    }
  };

  const reenviaDirectoASg =
    this.formularioInit?.estado === 'Subsanación solicitada SG';

  this.subirDocumentosDocenteNuevos(solicitudId, terceroId).pipe(
      switchMap(() => (
        debeGuardarBorrador
          ? this.sabaticosCrudService.put('formulario_solicitud', formularioBody)
          : of(null)
      )),
      switchMap(() => {
        if (reenviaDirectoASg) {
          const estadoBody: SecretariaGeneralBody = {
            TerceroId: terceroId,
            SolicitudId: solicitudId,
            Justificacion: this.formulario?.observaciones ?? '',
            EstadoSolicitud: 'ENVIADA_SG',
            EstadoSoporte: 'SG_PENDIENTE_REVISION_SG',
          };

          return this.sabaticosMidService.post(
            'solicitud/aprobar-rechazar',
            estadoBody
          );
        }

        const body: RadicarBody = {
          Id: solicitudId,
          SolicitudId: solicitudId,
          DocumentosId: this.getDocumentosDocenteIds(),
          FormularioId: this.formularioRecordId ?? 0,
          FechaCreacion: this.formatTimestampForBackend(),
          Formulario: this.formulario as FormularioSolicitud
        };

        return this.sabaticosMidService.post(
          `solicitud/radicar/${this.formularioInit?.id ?? 0}`,
          body
        );
      })
    ).subscribe({
      next: (response) => {
        this.popUpManager.showSuccessAlert(
          this.translate.instant('HISTORIAL_SOLICITUDES.edit.sendSecretariaSuccess')
        );
        const now = new Date();
        const fecha = now.toISOString().replace('T', ' ').substring(0, 19);
        const hora = now.toTimeString().substring(0, 8);
        const nombreDoc = this.formulario?.docente?.nombre ?? '';

        if (reenviaDirectoASg) {
          console.log('[TRAMO] editar-solicitud: ANTES de sendNotification sabaticos_reenvio_subsanacion_secretaria_general, codigo_facultad:', this.formulario?.docente?.codigoFacultad ?? '');
          this.notificacionService.sendNotification('sabaticos_reenvio_subsanacion_secretaria_general', 'secretaria_general', {
            id_solicitud: String(solicitudId),
            nombre_docente: nombreDoc,
            fecha_solicitud: fecha,
            codigo_facultad: this.formulario?.docente?.codigoFacultad ?? '',
          });
        } else {
          console.log('[TRAMO] editar-solicitud: ANTES de sendNotification sabaticos_radicado_docente, codigo_facultad:', this.formulario?.docente?.codigoFacultad ?? '');
          this.notificacionService.sendNotification('sabaticos_radicado_docente', 'docente', {
            nombre_docente: nombreDoc,
            id_solicitud: String(solicitudId),
            fecha_radicacion: fecha,
            codigo_facultad: this.formulario?.docente?.codigoFacultad ?? '',
          });
          console.log('[TRAMO] editar-solicitud: ANTES de sendNotification sabaticos_radicado_secretaria_academica, codigo_facultad:', this.formulario?.docente?.codigoFacultad ?? '');
          this.notificacionService.sendNotification('sabaticos_radicado_secretaria_academica', 'secretaria_academica', {
            id_solicitud: String(solicitudId),
            nombre_docente: nombreDoc,
            fecha_radicacion: fecha,
            hora_radicacion: hora,
            codigo_facultad: this.formulario?.docente?.codigoFacultad ?? '',
          });
        }
        this.router.navigate(['solicitudes']);
      },
      error: (error) => {
        this.showErrorAndReload(
          'HISTORIAL_SOLICITUDES.edit.sendSecretariaError',
          error
        );
      }
    });
  }

  async onEnviarRevisionSecretariaGeneral(value: boolean): Promise<void> {
    if (!this.canEditarSeccionSecretaria || !this.formulario) {
      return;
    }

    const confirmMessageKey = value
      ? 'HISTORIAL_SOLICITUDES.actions.confirmSendGeneral'
      : 'HISTORIAL_SOLICITUDES.actions.confirmSubsanacion';
    const confirmTitleKey = value
      ? 'HISTORIAL_SOLICITUDES.actions.confirmSendTitle'
      : 'HISTORIAL_SOLICITUDES.actions.confirmSubsanacionTitle';

    const confirm = await this.popUpManager.showConfirmAlert(
      this.translate.instant(confirmMessageKey),
      this.translate.instant(confirmTitleKey)
    );

    if (!confirm?.isConfirmed) {
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

    const esSecretariaGeneral = this.rol === 'SECRETARIA_GENERAL';

    const estadoSolicitudEnviar = esSecretariaGeneral
      ? 'APROBADA_PENDIENTE_RESOLUCION' 
      : 'ENVIADA_SG';
    const estadoSolicitudSubsanar = esSecretariaGeneral
      ? 'SUBSANACION_SOLICITADA_SG' 
      : 'SUBSANACION_SOLICITADA_SA';

    const estadoSoporteEnviar: string | undefined = esSecretariaGeneral
      ? undefined
      : 'SG_PENDIENTE_REVISION_SG';
    const estadoSoporteSubsanar = esSecretariaGeneral
      ? 'SG_INVALIDO'
      : 'SA_INVALIDO';

    const estadoBody: SecretariaGeneralBody = {
      TerceroId: terceroId,
      SolicitudId: solicitudId,
      Justificacion: this.formulario.observacionesSecretaria ?? '',
      EstadoSolicitud: value ? estadoSolicitudEnviar : estadoSolicitudSubsanar,
    };

    const estadoSoporte = value ? estadoSoporteEnviar : estadoSoporteSubsanar;
    if (estadoSoporte !== undefined) {
      estadoBody.EstadoSoporte = estadoSoporte;
    }

    this.subirDocumentosSecretariaNuevos(solicitudId, terceroId).pipe(
      switchMap(() => this.sabaticosCrudService.put('formulario_solicitud', formularioBody)),
      switchMap(() => this.sabaticosMidService.post('solicitud/aprobar-rechazar', estadoBody))
    ).subscribe({
      next: (response) => {
        this.popUpManager.showSuccessAlert(
          this.translate.instant('HISTORIAL_SOLICITUDES.edit.sendSecretariaSuccess')
        );
        const now = new Date();
        const fecha = now.toISOString().replace('T', ' ').substring(0, 19);
        const nombreDoc = this.formulario?.docente?.nombre ?? '';
        if (value) {
          if (esSecretariaGeneral) {
            console.log('[TRAMO] editar-solicitud: ANTES de sendNotification sabaticos_aprobacion_sg_docente, codigo_facultad:', this.formulario?.docente?.codigoFacultad ?? '');
            this.notificacionService.sendNotification('sabaticos_aprobacion_sg_docente', 'docente', {
              nombre_docente: nombreDoc,
              id_solicitud: String(solicitudId),
              fecha_aprobacion: fecha,
              codigo_facultad: this.formulario?.docente?.codigoFacultad ?? '',
            });
            console.log('[TRAMO] editar-solicitud: ANTES de sendNotification sabaticos_aprobacion_sg_secretaria_academica, codigo_facultad:', this.formulario?.docente?.codigoFacultad ?? '');
            this.notificacionService.sendNotification('sabaticos_aprobacion_sg_secretaria_academica', 'secretaria_academica', {
              id_solicitud: String(solicitudId),
              nombre_docente: nombreDoc,
              fecha_aprobacion: fecha,
              codigo_facultad: this.formulario?.docente?.codigoFacultad ?? '',
            });
          } else {
            console.log('[TRAMO] editar-solicitud: ANTES de sendNotification sabaticos_aval_sa_docente, codigo_facultad:', this.formulario?.docente?.codigoFacultad ?? '');
            this.notificacionService.sendNotification('sabaticos_aval_sa_docente', 'docente', {
              nombre_docente: nombreDoc,
              id_solicitud: String(solicitudId),
              fecha_solicitud: fecha,
              codigo_facultad: this.formulario?.docente?.codigoFacultad ?? '',
            });
            console.log('[TRAMO] editar-solicitud: ANTES de sendNotification sabaticos_aval_sa_secretaria_general, codigo_facultad:', this.formulario?.docente?.codigoFacultad ?? '');
            this.notificacionService.sendNotification('sabaticos_aval_sa_secretaria_general', 'secretaria_general', {
              id_solicitud: String(solicitudId),
              nombre_docente: nombreDoc,
              fecha_solicitud: fecha,
              codigo_facultad: this.formulario?.docente?.codigoFacultad ?? '',
            });
          }
        } else {
          const obs = this.formulario?.observacionesSecretaria ?? '';
          if (esSecretariaGeneral) {
            console.log('[TRAMO] editar-solicitud: ANTES de sendNotification sabaticos_subsanacion_sg_docente, codigo_facultad:', this.formulario?.docente?.codigoFacultad ?? '');
            this.notificacionService.sendNotification('sabaticos_subsanacion_sg_docente', 'docente', {
              nombre_docente: nombreDoc,
              id_solicitud: String(solicitudId),
              motivo_decision: obs || 'Revise las observaciones registradas por la Secretaría General en el sistema.',
              codigo_facultad: this.formulario?.docente?.codigoFacultad ?? '',
            });
          } else {
            console.log('[TRAMO] editar-solicitud: ANTES de sendNotification sabaticos_subsanacion_sa_docente, codigo_facultad:', this.formulario?.docente?.codigoFacultad ?? '');
            this.notificacionService.sendNotification('sabaticos_subsanacion_sa_docente', 'docente', {
              nombre_docente: nombreDoc,
              id_solicitud: String(solicitudId),
              observaciones: obs || 'Revise las observaciones registradas por la Secretaría Académica en el sistema.',
              codigo_facultad: this.formulario?.docente?.codigoFacultad ?? '',
            });
          }
        }
        this.router.navigate(['solicitudes']);
      },
      error: (error) => {
        this.showErrorAndReload(
          'HISTORIAL_SOLICITUDES.edit.sendSecretariaError',
          error
        );
      }
    });
  }

  async onRechazarSolicitud(): Promise<void> {
    if (!this.canEditarSeccionSecretaria || !this.canSubsanar || !this.formulario) {
      return;
    }

    const confirm = await this.popUpManager.showConfirmAlert(
      this.translate.instant('HISTORIAL_SOLICITUDES.actions.confirmRechazarSolicitud'),
      this.translate.instant('HISTORIAL_SOLICITUDES.actions.confirmRechazarSolicitudTitle')
    );

    if (!confirm?.isConfirmed) {
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
      EstadoSolicitud: 'FINALIZADA_NO_APROBADA',
    };

    this.subirDocumentosSecretariaNuevos(solicitudId, terceroId).pipe(
      switchMap(() => this.sabaticosCrudService.put('formulario_solicitud', formularioBody)),
      switchMap(() => this.sabaticosMidService.post('solicitud/aprobar-rechazar', estadoBody))
    ).subscribe({
      next: () => {
        this.popUpManager.showSuccessAlert(
          this.translate.instant('HISTORIAL_SOLICITUDES.edit.sendSecretariaSuccess')
        );
        const now = new Date();
        const fecha = now.toISOString().replace('T', ' ').substring(0, 19);
        console.log('[TRAMO] editar-solicitud: ANTES de sendNotification sabaticos_no_aprobacion_sg_docente, codigo_facultad:', this.formulario?.docente?.codigoFacultad ?? '');
        this.notificacionService.sendNotification('sabaticos_no_aprobacion_sg_docente', 'docente', {
          nombre_docente: this.formulario?.docente?.nombre ?? '',
          id_solicitud: String(solicitudId),
          motivo_decision: this.formulario?.observacionesSecretaria ?? '',
          codigo_facultad: this.formulario?.docente?.codigoFacultad ?? '',
        });
        this.router.navigate(['solicitudes']);
      },
      error: (error) => {
        this.showErrorAndReload(
          'HISTORIAL_SOLICITUDES.edit.sendSecretariaError',
          error
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
        return this.sabaticosCrudService.put('formulario_solicitud', body);
      })
    ).subscribe({
      next: (response) => {
        this.popUpManager.showSuccessAlert(
          this.translate.instant('HISTORIAL_SOLICITUDES.edit.saveSecretariaSuccess')
        );
        this.marcarFormularioGuardado();
      },
      error: (error) => {
        this.showErrorAndReload(
          'HISTORIAL_SOLICITUDES.edit.saveSecretariaError',
          error
        );
      }
    });
  }

  private subirDocumentosSecretariaNuevos(
    solicitudId: number,
    terceroId: number
  ): Observable<number[]> {
    const archivos = Object.entries(this.secretariaDocumentosNuevosFiles || {});

    if (!archivos.length) {
      return of([]);
    }

    this.loaderService.show();

    const cargasPorArchivo = archivos.map(([key, file]) => {
      const baseKey = this.getDocumentoBaseKey(key);
      const tipoDocumentoId = this.secretariaDocumentoOptions.find(
        (option) => option.key === baseKey
      )?.tipoDocumentoId ?? 1;
      const formData = new FormData();
      formData.append('solicitud_id', solicitudId.toString());
      formData.append('tercero_id', terceroId.toString());
      formData.append('rol_usuario', this.rol);
      formData.append('estado_soporte_solicitud', 'PEN');
      formData.append('tipo_documento_id', String(tipoDocumentoId));
      formData.append('documentos', file);

      return this.sabaticosMidService.postFileWithoutSpinner('soporte_solicitud', formData).pipe(
        map((response: any) => {
          const nuevosIds = Array.isArray(response?.Data?.documentos)
            ? response.Data.documentos
                .map((doc: any) => Number(doc?.Id))
                .filter((id: number) => !isNaN(id) && id > 0)
            : [];

          return nuevosIds;
        })
      );
    });

    return from(cargasPorArchivo).pipe(
      concatMap((carga$, index) => (
        index === 0
          ? carga$
          : timer(2000).pipe(concatMap(() => carga$))
      )),
      toArray(),
      map((idsPorArchivo: number[][]) => idsPorArchivo.flat()),
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
      }),
      finalize(() => this.loaderService.hide())
    );
  }

  // =========================
  // Helpers privados
  // =========================
  private actualizarEstadoSoporte(
    key: string,
    codigoAbreviacionEstado: 'SAOK' | 'SAINV' | 'SGOK' | 'SGINV',
    contexto: 'docente' | 'secretaria' = 'docente'
  ): void {
    const soporteStore = contexto === 'secretaria'
      ? this.secretariaSoporteBackendByKey
      : this.soporteBackendByKey;
    const aprobacionesStore = contexto === 'secretaria'
      ? this.secretariaDocumentoAprobaciones
      : this.documentoAprobaciones;

    const soporte = soporteStore[key];
    if (!soporte?.Id) {
      return;
    }
    const esAprobacion = codigoAbreviacionEstado === 'SAOK'
      || codigoAbreviacionEstado === 'SGOK';

    Swal.fire({
      title: this.translate.instant('GLOBAL.cargando'),
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.sabaticosCrudService.get(
      `estado_soporte_solicitud?query=codigo_abreviacion:${codigoAbreviacionEstado},activo:true&limit=-1`
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
            aprobacionesStore[key] = esAprobacion ? 'aprobado' : 'rechazado';
            soporteStore[key] = body;
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
      },
      error: (error: any) => {
        console.error(`Error al desactivar soporte ${soporteId}:`, error);
        this.popUpManager.showErrorAlert(
          this.translate.instant('HISTORIAL_SOLICITUDES.edit.saveSecretariaError')
        );
      }
    });
  }

  private getTipoParametroSecretariaByRol(rol: string): string {
    if (rol === 'SECRETARIA_GENERAL') {
      return 'DOCSOL_SG_SAB';
    }
    if (rol === 'SECRETARIA_ACADEMICA') {
      return 'DOCSOL_SA_SAB';
    }
    return 'DOCSOL_DOCE_SAB';
  }

  private cargarOpcionesDocumentosSecretaria(rol: string): Observable<DocumentoOption[]> {
    this.secretariaTiposPropiosIds = new Set();
    this.secretariaKeysPropios = new Set();

    const sa$ = this.parametrosService.get(
      'parametro?query=TipoParametroId__CodigoAbreviacion:DOCSOL_SA_SAB&limit=-1'
    );
    const sg$ = this.parametrosService.get(
      'parametro?query=TipoParametroId__CodigoAbreviacion:DOCSOL_SG_SAB&limit=-1'
    );

    return forkJoin([sa$, sg$]).pipe(
      map(([respSa, respSg]: [any, any]) => {
        const opcionesSa = this.mapParametroDocumentos(respSa, []);
        const opcionesSg = this.mapParametroDocumentos(respSg, []);

        const opcionesPropias =
          rol === 'SECRETARIA_GENERAL' ? opcionesSg
          : rol === 'SECRETARIA_ACADEMICA' ? opcionesSa
          : [];

        opcionesPropias.forEach((option) => {
          const tipoId = Number(option.tipoDocumentoId) || 0;
          if (tipoId > 0) {
            this.secretariaTiposPropiosIds.add(tipoId);
          }
          this.secretariaKeysPropios.add(option.key);
        });

        const fusionadas = [...opcionesSg, ...opcionesSa];
        const vistosTipoId = new Set<number>();
        const vistosKey = new Set<string>();
        const deduplicadas = fusionadas.filter((option) => {
          const tipoId = Number(option.tipoDocumentoId) || 0;
          if (tipoId > 0 && vistosTipoId.has(tipoId)) {
            return false;
          }
          if (vistosKey.has(option.key)) {
            return false;
          }
          if (tipoId > 0) {
            vistosTipoId.add(tipoId);
          }
          vistosKey.add(option.key);
          return true;
        });

        return deduplicadas.length ? deduplicadas : [...SECRETARIA_DOCUMENTO_OPTIONS];
      })
    );
  }

  private mapParametroDocumentos(response: any, fallback: DocumentoOption[]): DocumentoOption[] {
    const data = response?.Data ?? response ?? [];
    const opciones = (Array.isArray(data) ? data : [])
      .filter((item: any) => item?.Id && item?.CodigoAbreviacion && item?.Nombre)
      .map((item: any) => ({
        key: String(item.CodigoAbreviacion),
        label: String(item.Nombre),
        tipoDocumentoId: Number(item.Id)
      }));

    return opciones.length ? opciones : [...fallback];
  }

  private cachearCodigosDesdeOpciones(opciones: DocumentoOption[]): void {
    opciones.forEach((option) => {
      const id = Number(option?.tipoDocumentoId) || 0;
      if (id > 0 && option?.key) {
        this.tipoDocumentoCodigoById[id] = option.key;
      }
    });
  }

  private resolverTiposDocumentoPorId(soportes: any[]): Observable<void> {
    const idsUnicos = [...new Set(
      (Array.isArray(soportes) ? soportes : [])
        .map((s: any) => Number(s?.TipoDocumentoId))
        .filter((id: number) => Number.isFinite(id) && id > 0)
    )];

    const idsPendientes = idsUnicos.filter((id) => !this.tipoDocumentoCodigoById[id]);
    if (!idsPendientes.length) {
      return of(void 0);
    }

    const consultas = idsPendientes.map((id) =>
      this.parametrosService.get(`parametro?query=Id:${id}`).pipe(
        map((response: any) => {
          const data = response?.Data ?? response ?? [];
          const item = Array.isArray(data) ? data[0] : null;
          return {
            id,
            codigo: String(item?.CodigoAbreviacion ?? '')
          };
        }),
        catchError(() => of({ id, codigo: '' }))
      )
    );

    return forkJoin(consultas).pipe(
      tap((resultados) => {
        resultados.forEach((resultado) => {
          if (resultado.codigo) {
            this.tipoDocumentoCodigoById[resultado.id] = resultado.codigo;
          }
        });
      }),
      map(() => void 0)
    );
  }

  private resolverDocumentoKeyPorTipoId(
    tipoDocumentoId: number,
    options: DocumentoOption[],
    fallbackKey: string
  ): string {
    if (!tipoDocumentoId) {
      return fallbackKey;
    }

    const optionById = options.find(
      (option) => Number(option.tipoDocumentoId) === Number(tipoDocumentoId)
    );
    if (optionById?.key) {
      return optionById.key;
    }

    const codigo = this.tipoDocumentoCodigoById[tipoDocumentoId];
    if (codigo && options.some((option) => option.key === codigo)) {
      return codigo;
    }

    return fallbackKey;
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
      const tipoDocumentoId = Number(soporte?.TipoDocumentoId) || 0;
      const resolvedBaseKey = this.resolverDocumentoKeyPorTipoId(
        tipoDocumentoId,
        this.documentoOptions,
        fallbackKey
      );
      const key = this.buildDocumentoKey(resolvedBaseKey, selectedKeys);
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
      if (this.rol === 'SECRETARIA_GENERAL') {
        if (codigoAbreviacion === 'SGOK') {
          this.documentoAprobaciones[key] = 'aprobado';
        } else if (codigoAbreviacion === 'SGINV') {
          this.documentoAprobaciones[key] = 'rechazado';
        }
      } else if (codigoAbreviacion === 'SAOK') {
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
      const tipoDocumentoId = Number(soporte?.TipoDocumentoId) || 0;
      const resolvedBaseKey = this.resolverDocumentoKeyPorTipoId(
        tipoDocumentoId,
        this.secretariaDocumentoOptions,
        fallbackKey
      );
      const key = this.buildDocumentoKey(resolvedBaseKey, selectedKeys);
      const documentoId = soporte?.DocumentoId;

      selectedKeys.push(key);
      archivos[key] = documentoId
        ? `Documento subido`
        : 'Documento cargado';

      if (documentoId && Number(documentoId) > 0) {
        this.secretariaDocumentoBackendIds[key] = Number(documentoId);
      }
      this.secretariaSoporteBackendByKey[key] = soporte;

      const codigoAbreviacion = soporte?.EstadoSoporteSolicitudId?.CodigoAbreviacion;
      if (codigoAbreviacion === 'SGOK') {
        this.secretariaDocumentoAprobaciones[key] = 'aprobado';
      } else if (codigoAbreviacion === 'SGINV') {
        this.secretariaDocumentoAprobaciones[key] = 'rechazado';
      }
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
    const archivos = Object.entries(this.documentosDocenteNuevosFiles || {});

    if (!archivos.length) {
      return of([]);
    }

    this.loaderService.show();

    const cargasPorArchivo = archivos.map(([key, file]) => {
      const baseKey = this.getDocumentoBaseKey(key);
      const tipoDocumentoId = this.documentoOptions.find(
        (option) => option.key === baseKey
      )?.tipoDocumentoId ?? 1;
      const formData = new FormData();
      formData.append('solicitud_id', solicitudId.toString());
      formData.append('tercero_id', terceroId.toString());
      formData.append('rol_usuario', 'DOCENTE');
      formData.append('estado_soporte_solicitud', 'PEN');
      formData.append('tipo_documento_id', String(tipoDocumentoId));
      formData.append('documentos', file);

      return this.sabaticosMidService.postFileWithoutSpinner('soporte_solicitud', formData).pipe(
        map((response: any) => {
          const nuevosIds = Array.isArray(response?.Data?.documentos)
            ? response.Data.documentos
                .map((doc: any) => Number(doc?.Id))
                .filter((id: number) => !isNaN(id) && id > 0)
            : [];

          return nuevosIds;
        })
      );
    });

    return from(cargasPorArchivo).pipe(
      concatMap((carga$, index) => (
        index === 0
          ? carga$
          : timer(2000).pipe(concatMap(() => carga$))
      )),
      toArray(),
      map((idsPorArchivo: number[][]) => idsPorArchivo.flat()),
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
      
        this.documentosDocenteNuevosFiles = {};
      }),
      finalize(() => this.loaderService.hide())
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
        proyecto_curricular: ident.proyecto_curricular ?? '',
        codigoFacultad: ident.codigo_facultad ?? ''
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
        proyecto_curricular: formulario.docente?.proyecto_curricular ?? '',
        codigoFacultad: formulario.docente?.codigoFacultad ?? ''
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
      docenteCodigoFacultad: [{ value: this.formulario?.docente?.codigoFacultad ?? '', disabled: true }],
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
        proyecto_curricular: formValue.docenteProyecto,
        codigoFacultad: formValue.docenteCodigoFacultad,
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

  private showErrorAndReload(messageKey: string, error?: unknown): void {
    if (error !== undefined) {
      console.error('Error en operación, se recargará la página:', error);
    }

    Swal.fire({
      icon: 'error',
      title: this.translate.instant('GLOBAL.error'),
      text: this.translate.instant(messageKey),
      confirmButtonText: this.translate.instant('GLOBAL.aceptar'),
    }).then(() => {
      window.location.reload();
    });
  }

  private marcarFormularioGuardado(): void {
    this.form?.markAsPristine();
    this.form?.markAsUntouched();
    this.documentosModificados = false;
  }

  private hasDocumentosDocenteObligatorios(): boolean {
    const requeridos = this.documentoOptions
      .filter((d) => !this.isDocumentoDocenteOpcional(d))
      .map((d) => d.key);

    return requeridos.every((key) => {
      const nombre = this.documentoArchivos[key];
      return Boolean(nombre && nombre.trim());
    });
  }

  private isDocumentoDocenteOpcional(documento: DocumentoOption): boolean {
    const key = String(documento?.key ?? '').toLowerCase();
    const label = String(documento?.label ?? '').toLowerCase();

    return key === this.otrosDocumentoKey.toLowerCase()
      || key === 'otr_soportes'
      || key.includes('otro')
      || label.includes('otro');
  }

  private hasDocumentosDocenteAprobados(): boolean {
    if (!this.documentosSeleccionados.length) {
      return false;
    }

    return this.documentosSeleccionados.every(
      (key) => this.documentoAprobaciones[key] === 'aprobado'
    );
  }

  private hasDocumentosSecretariaObligatorios(): boolean {
    const requiredKeys = this.secretariaDocumentoOptions
      .filter((option) => {
        const tipoId = Number(option.tipoDocumentoId) || 0;
        const esPropio = (tipoId > 0 && this.secretariaTiposPropiosIds.has(tipoId))
          || this.secretariaKeysPropios.has(option.key);
        return esPropio && !this.isDocumentoSecretariaOpcional(option.key);
      })
      .map((option) => option.key);

    if (!requiredKeys.length) {
      return true;
    }

    return requiredKeys.every((key) => {
      const nombre = this.secretariaDocumentoArchivos[key];
      return Boolean(nombre && nombre.trim());
    });
  }

  private hasDocumentosSecretariaPropiosSubidos(): boolean {
    const requiredKeys = this.secretariaDocumentoOptions
      .filter((option) => {
        const tipoId = Number(option.tipoDocumentoId) || 0;
        const esPropio = (tipoId > 0 && this.secretariaTiposPropiosIds.has(tipoId))
          || this.secretariaKeysPropios.has(option.key);
        return esPropio && !this.isDocumentoSecretariaOpcional(option.key);
      })
      .map((option) => option.key);

    if (!requiredKeys.length) {
      return true;
    }

    return requiredKeys.every((key) => {
      const nombre = this.secretariaDocumentoArchivos[key];
      return Boolean(nombre && nombre.trim());
    });
  }

  private hasDocumentosSecretariaAcademicaAprobados(): boolean {
    const saKeys = this.secretariaDocumentosSeleccionados.filter(
      (key) => !this.canGestionarDocumentoSecretaria(key)
    );

    if (!saKeys.length) {
      return true;
    }

    return saKeys.every(
      (key) => this.secretariaDocumentoAprobaciones[key] === 'aprobado'
    );
  }

  private isDocumentoSecretariaOpcional(key: string): boolean {
    const normalizedKey = String(key ?? '').toLowerCase();
    return normalizedKey === this.otrosSecretariaKey.toLowerCase()
      || normalizedKey === 'otr_soportes_sa'
      || normalizedKey === 'otr_soportes_sg'
      || normalizedKey.includes('otro');
  }

  private isPdfFile(file: File): boolean {
    const fileName = file.name.toLowerCase();
    const isPdfByExtension = fileName.endsWith('.pdf');
    const isPdfByMime = file.type === 'application/pdf';
    return isPdfByExtension || isPdfByMime;
  }

}
