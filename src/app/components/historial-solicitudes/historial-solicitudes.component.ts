import { Component, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DateAdapter } from '@angular/material/core';
import { MatDateRangeInput } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { CrearSolicitudModalComponent } from '../crear-solicitud-modal/crear-solicitud-modal.component';
import { IniciarSabaticoModalComponent } from '../iniciar-sabatico-modal/iniciar-sabatico-modal.component';
import { ImplicitAutenticationService } from '../../services/implicit_authentication.service';
import { SabaticosCrudService } from '../../services/sabaticos-crud.service';
import { SabaticosMidService } from '../../services/sabaticos-mid.service';
import { TercerosService } from '../../services/terceros.service';
import { PopUpManager } from '../../../managers/popUpManager';
import { RequestManager } from '../../../managers/requestManager';
import { ConfiguracionService } from '../../services/configuracion.service';
import { LoaderService } from '../../services/loader.service';
import { finalize } from 'rxjs/operators';

type EstadoSolicitud =
  | 'Borrador'
  | 'Radicada / Enviada a SA'
  | 'Subsanación solicitada SA'
  | 'Subsanación solicitada SG'
  | 'Enviada a SG'
  | 'Finalizada No aprobada'
  | 'Aprobada pendiente Resolución'
  | 'Finalizada Aprobada con Resolución';
type TipoSolicitud = 'Nueva' | 'Suspensión' | 'Modificación';
type RolOperativo = 'DOCENTE' | 'SECRETARIA_ACADEMICA' | 'SECRETARIA_GENERAL';
type RolSistema = RolOperativo | 'ADMIN_SGA';
type FilterColumn = 'id' | 'docenteIdentificacion' | 'docenteNombre';

interface HistorialSolicitud {
  id: string;
  fechaRadicado: string;
  tipoSolicitud: string;
  estado: EstadoSolicitud;
  terceroIdDocente?: number;
  docenteIdentificacion?: string;
  docenteNombre?: string;
}

interface ColumnFilters {
  id: string;
  docenteIdentificacion: string;
  docenteNombre: string;
  tipoSolicitud: TipoSolicitud[];
  estado: EstadoSolicitud[];
}

interface FechaFiltro {
  start: Date | null;
  end: Date | null;
}

interface DocenteInfo {
  nombre: string;
  facultad: string;
  documentoIdentificacion: string;
  edad: string;
  correoElectronico: string;
  proyectoCurricular: string;
  telefono: string;
  celular: string;
  fechaIngreso: string;
  resolucionFechaIngreso: string;
  fechaInscripcionEscalafon: string;
  resolucionInscripcionEscalafon: string;
  categoriaIngreso: string;
  categoriaActual: string;
}

@Component({
    selector: 'app-historial-solicitudes',
    templateUrl: './historial-solicitudes.component.html',
    styleUrl: './historial-solicitudes.component.scss',
    standalone: false
})
export class HistorialSolicitudesComponent {
  readonly displayedColumnsDocente = ['id', 'fechaRadicado', 'tipoSolicitud', 'estado', 'gestion'];
  readonly displayedColumnsSecretariaAcademica = ['id', 'fechaRadicado', 'tipoSolicitud', 'docenteIdentificacion', 'docenteNombre', 'estado', 'gestion'];
  currentLang = 'es';
  perfil: string = '';
  permisos: any[] = [];

  readonly estadoTraducciones: Record<EstadoSolicitud, string> = {
    Borrador: 'HISTORIAL_SOLICITUDES.status.draft',
    'Radicada / Enviada a SA': 'HISTORIAL_SOLICITUDES.status.filedSentSa',
    'Subsanación solicitada SA': 'HISTORIAL_SOLICITUDES.status.correctionRequestedSa',
    'Subsanación solicitada SG': 'HISTORIAL_SOLICITUDES.status.correctionRequestedSg',
    'Enviada a SG': 'HISTORIAL_SOLICITUDES.status.sentSg',
    'Finalizada No aprobada': 'HISTORIAL_SOLICITUDES.status.finishedNotApproved',
    'Aprobada pendiente Resolución': 'HISTORIAL_SOLICITUDES.status.approvedPendingResolution',
    'Finalizada Aprobada con Resolución': 'HISTORIAL_SOLICITUDES.status.finishedApprovedResolution'
  };

  readonly estadoOptions: EstadoSolicitud[] = [
    'Borrador',
    'Radicada / Enviada a SA',
    'Subsanación solicitada SA',
    'Subsanación solicitada SG',
    'Enviada a SG',
    'Finalizada No aprobada',
    'Aprobada pendiente Resolución',
    'Finalizada Aprobada con Resolución'
  ];

  readonly tipoSolicitudTraducciones: Record<TipoSolicitud, string> = {
    Nueva: 'HISTORIAL_SOLICITUDES.tipoSolicitud.nueva',
    'Suspensión': 'HISTORIAL_SOLICITUDES.tipoSolicitud.suspension',
    'Modificación': 'HISTORIAL_SOLICITUDES.tipoSolicitud.modificacion'
  };

  readonly tipoSolicitudOptions: TipoSolicitud[] = ['Nueva', 'Suspensión', 'Modificación'];

  docenteInfo: DocenteInfo = {
    nombre: '',
    facultad: '',
    documentoIdentificacion: '',
    edad: '',
    correoElectronico: '',
    proyectoCurricular: '',
    telefono: '',
    celular: '',
    fechaIngreso: '',
    resolucionFechaIngreso: '',
    fechaInscripcionEscalafon: '',
    resolucionInscripcionEscalafon: '',
    categoriaIngreso: '',
    categoriaActual: ''
  };

  terceroId: number | null = null;
  private documento = '';
  cargandoSolicitudes = true;
  solicitudes: HistorialSolicitud[] = [];
  filteredSolicitudes: HistorialSolicitud[] = [];

  readonly pageSizeOptions = [5, 10, 25];
  pageSize = 5;
  pageIndex = 0;

  get paginatedSolicitudes(): HistorialSolicitud[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredSolicitudes.slice(start, start + this.pageSize);
  }

  get displayedColumns(): string[] {
    return this.canViewDocenteColumns ? this.displayedColumnsSecretariaAcademica : this.displayedColumnsDocente;
  }

  columnFilters: ColumnFilters = {
    id: '',
    docenteIdentificacion: '',
    docenteNombre: '',
    tipoSolicitud: [],
    estado: []
  };

  fechaFiltro: FechaFiltro = { start: null, end: null };
  rol: RolOperativo = 'DOCENTE';
  rolReal: RolSistema | '' = '';
  rolConsulta: RolOperativo = 'SECRETARIA_ACADEMICA';
  documentoDocenteConsulta = '';
  readonly rolesConsultaOptions: RolOperativo[] = ['DOCENTE', 'SECRETARIA_ACADEMICA', 'SECRETARIA_GENERAL'];

  get esModoConsultaAdmin(): boolean {
    return this.rolReal === 'ADMIN_SGA';
  }

  get isConsultaDocenteAdmin(): boolean {
    return this.esModoConsultaAdmin && this.isDocente;
  }

  get canBuscarDocenteConsulta(): boolean {
    return this.isConsultaDocenteAdmin
      && !this.cargandoSolicitudes
      && this.documentoDocenteConsulta.trim().length > 0;
  }

  get canCrearSolicitud(): boolean {
    if (this.esModoConsultaAdmin) {
      return false;
    }
    return this.permisos.some((p: any) => p?.Opcion?.Nombre === 'Crear_Solicitud_Sabatico');
  }

  get canEditarSolicitud(): boolean {
    if (this.esModoConsultaAdmin) {
      return false;
    }
    return this.permisos.some((p: any) => p?.Opcion?.Nombre === 'Editar_Solicitud_Sabatico');
  }

  get canViewSolicitud(): boolean {
    return this.permisos.some((p: any) => p?.Opcion?.Nombre === 'Ver_Solicitud_Sabatico');
  }

  get canCrearSabatico(): boolean {
    if (this.esModoConsultaAdmin) {
      return false;
    }
    return this.permisos.some((p: any) => p?.Opcion?.Nombre === 'Crear_Sabatico');
  }

  get isDocente(): boolean {
    return this.rol === 'DOCENTE';
  }

  get isSecretariaAcademica(): boolean {
    return this.rol === 'SECRETARIA_ACADEMICA';
  }

  get isSecretariaGeneral(): boolean {
    return this.rol === 'SECRETARIA_GENERAL';
  }

  get canViewDocenteColumns(): boolean {
    return this.esModoConsultaAdmin || this.isSecretariaAcademica || this.isSecretariaGeneral;
  }

  get showDocenteInfo(): boolean {
    return this.isDocente && !this.esModoConsultaAdmin;
  }

  get roleInfoMessageKey(): string {
    if (this.esModoConsultaAdmin) {
      return 'HISTORIAL_SOLICITUDES.roleInfo.adminConsulta';
    }
    if (this.isSecretariaGeneral) {
      return 'HISTORIAL_SOLICITUDES.roleInfo.secretariaGeneral';
    }
    if (this.isSecretariaAcademica) {
      return 'HISTORIAL_SOLICITUDES.roleInfo.secretariaAcademica';
    }
    return 'HISTORIAL_SOLICITUDES.roleInfo.docente';
  }

  constructor(
    private readonly translate: TranslateService,
    private readonly dateAdapter: DateAdapter<Date>,
    private readonly dialog: MatDialog,
    private readonly router: Router,
    private readonly destroyRef: DestroyRef,
    private readonly autenticationService: ImplicitAutenticationService,
    private readonly popUpManager: PopUpManager,
    private readonly requestManager: RequestManager,
    private readonly tercerosService: TercerosService,
    private readonly sabaticosCrudService: SabaticosCrudService,
    private readonly configuracionService: ConfiguracionService,
    private readonly sabaticosMidService: SabaticosMidService,
    private readonly loaderService: LoaderService
  ) {
    this.currentLang = this.translate.currentLang || this.translate.getDefaultLang() || 'es';
    this.dateAdapter.setLocale(this.currentLang);

    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ lang }) => {
        this.currentLang = lang;
        this.dateAdapter.setLocale(lang);
        this.applyFilters();
      });

    Promise.all([
      this.autenticationService.getRole(),
      this.autenticationService.getDocument()
    ]).then(([roles, documento]: [unknown, unknown]) => {
      this.inicializarRol(roles);
      this.cargarPermisosPorRol(this.rolReal);
      this.documento = String(documento ?? '');

      if (this.showDocenteInfo) {
        this.loadDocenteInfo(this.documento);
      }

      this.cargarSolicitudesPorRol();
    });
  }

  getEstadoTranslation(estado: EstadoSolicitud): string {
    return this.estadoTraducciones[estado];
  }

  getTipoSolicitudTranslation(tipo: string): string {
    return this.isTipoSolicitudConocido(tipo)
      ? this.tipoSolicitudTraducciones[tipo]
      : tipo;
  }

  getTipoSolicitudClass(tipo: string): string {
    switch (tipo) {
      case 'Nueva':
        return 'tipo--nueva';
      case 'Suspensión':
        return 'tipo--suspension';
      case 'Modificación':
        return 'tipo--modificacion';
      default:
        return 'tipo--desconocido';
    }
  }

  getTipoSolicitudIcon(tipo: string): string {
    switch (tipo) {
      case 'Nueva':
        return 'note_add';
      case 'Suspensión':
        return 'pause_circle';
      case 'Modificación':
        return 'edit';
      default:
        return 'help_outline';
    }
  }

  private isTipoSolicitudConocido(tipo: string): tipo is TipoSolicitud {
    return (this.tipoSolicitudOptions as readonly string[]).includes(tipo);
  }

  getEstadoClass(estado: EstadoSolicitud): string {
    switch (estado) {
      case 'Borrador':
        return 'estado--borrador';
      case 'Radicada / Enviada a SA':
        return 'estado--sa';
      case 'Subsanación solicitada SA':
      case 'Subsanación solicitada SG':
        return 'estado--subsanacion';
      case 'Enviada a SG':
        return 'estado--sg';
      case 'Aprobada pendiente Resolución':
        return 'estado--pendiente-resolucion';
      case 'Finalizada Aprobada con Resolución':
        return 'estado--aprobada';
      case 'Finalizada No aprobada':
        return 'estado--rechazada';
      default:
        return 'estado--pendiente';
    }
  }

  trackBySolicitud(_: number, solicitud: HistorialSolicitud): string {
    return solicitud.id;
  }

  getDocenteIdentificacion(solicitud: HistorialSolicitud): string {
    return solicitud.docenteIdentificacion
      || this.docenteInfo.documentoIdentificacion;
  }

  getDocenteNombre(solicitud: HistorialSolicitud): string {
    return solicitud.docenteNombre
      || this.docenteInfo.nombre;
  }

  onEditar(solicitud: HistorialSolicitud): void {
    this.navigateToEditarSolicitud(solicitud, this.esModoConsultaAdmin);
  }

  onVisualizar(solicitud: HistorialSolicitud): void {
    this.navigateToEditarSolicitud(solicitud, true);
  }

  shouldShowViewOnly(solicitud: HistorialSolicitud): boolean {
    if (this.canViewSolicitud){
      if (this.esModoConsultaAdmin) {
        return true;
      }
      if (this.isDocente) {
        return !this.isDocenteEditable(solicitud);
      }
      if (this.isSecretariaAcademica) {
        return this.isSecretariaAcademicaViewOnly(solicitud);
      }
      if (this.isSecretariaGeneral) {
        return this.isSecretariaGeneralViewOnly(solicitud);
      }
    }
    return false;
  }

  shouldShowEditButton(solicitud: HistorialSolicitud): boolean {
    if (this.canEditarSolicitud) {
      return !this.shouldShowViewOnly(solicitud);
    }

    return false;
  }

  getEditIcon(): string {
    return (this.isSecretariaAcademica || this.isSecretariaGeneral) ? 'library_add_check' : 'edit';
  }

  getEditAriaKey(): string {
    return (this.isSecretariaAcademica || this.isSecretariaGeneral)
      ? 'HISTORIAL_SOLICITUDES.actions.reviewAria'
      : 'HISTORIAL_SOLICITUDES.actions.editAria';
  }

  private isDocenteEditable(solicitud: HistorialSolicitud): boolean {
    if (this.esSuspensionOModificacion(solicitud.tipoSolicitud)) {
      return false;
    }
    return solicitud.estado === 'Borrador'
      || solicitud.estado === 'Radicada / Enviada a SA'
      || solicitud.estado === 'Subsanación solicitada SA'
      || solicitud.estado === 'Subsanación solicitada SG';
  }

  private isSecretariaGeneralViewOnly(solicitud: HistorialSolicitud): boolean {
    const viewOnlyStates: EstadoSolicitud[] = [
      'Borrador',
      'Radicada / Enviada a SA',
      'Subsanación solicitada SA',
      'Subsanación solicitada SG',
      'Finalizada Aprobada con Resolución',
    ];
    return viewOnlyStates.includes(solicitud.estado);
  }

  private isSecretariaAcademicaViewOnly(solicitud: HistorialSolicitud): boolean {
    return solicitud.estado === 'Borrador'
      || solicitud.estado === 'Subsanación solicitada SA'
      || solicitud.estado === 'Subsanación solicitada SG'
      || solicitud.estado === 'Enviada a SG'
      || solicitud.estado === 'Finalizada No aprobada'
      || solicitud.estado === 'Aprobada pendiente Resolución'
      || solicitud.estado === 'Finalizada Aprobada con Resolución';
  }

  private loadDocenteInfo(documento: string): void {
    this.requestManager.setPath('ACADEMICA_MID_SERVICE');
    this.requestManager.getXml(`consulta_datos_docente_planta/${documento}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => {
          const parsed = this.parseDocenteResponse(response);
          this.docenteInfo = { ...this.docenteInfo, ...parsed };
        },
        error: () => {
          this.popUpManager.showErrorToast('GLOBAL.error');
        }
      });
  }

  private isEstadoVisibleCoordinador(estado: EstadoSolicitud): boolean {
    return estado === 'Enviada a SG';
  }

  private isEstadoVisibleSecretariaAcademicaConsulta(estado: EstadoSolicitud): boolean {
    return estado === 'Radicada / Enviada a SA'
      || estado === 'Aprobada pendiente Resolución';
  }

  private inicializarRol(rolesRaw: unknown): void {
    const roles = Array.isArray(rolesRaw) ? rolesRaw.map(String) : [];
    const rolesSoportados: RolSistema[] = ['SECRETARIA_ACADEMICA', 'DOCENTE', 'SECRETARIA_GENERAL', 'ADMIN_SGA'];
    const rolEncontrado = roles.find((rol) => rolesSoportados.includes(rol as RolSistema)) as RolSistema | undefined;

    this.rolReal = roles.includes('ADMIN_SGA')
      ? 'ADMIN_SGA'
      : rolEncontrado ?? '';
    this.rol = this.esModoConsultaAdmin
      ? this.rolConsulta
      : (this.rolReal as RolOperativo) || 'DOCENTE';
  }

  private cargarPermisosPorRol(rol: string): void {
    if (!rol) {
      this.permisos = [];
      this.perfil = '';
      return;
    }

    this.configuracionService.get(`perfil_x_menu_opcion?limit=-1&query=Perfil__Nombre__in:${rol}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response: any) => {
        this.permisos = response;
        this.perfil = response[0]?.Perfil?.Nombre ?? '';
      });
  }

  onRolConsultaChange(rol: RolOperativo): void {
    if (!this.esModoConsultaAdmin || this.rolConsulta === rol) {
      return;
    }

    this.rolConsulta = rol;
    this.rol = rol;
    if (rol !== 'DOCENTE') {
      this.documentoDocenteConsulta = '';
    }
    this.cargarSolicitudesPorRol();
  }

  onDocumentoDocenteConsultaChange(value: string): void {
    this.documentoDocenteConsulta = value;
  }

  onBuscarDocenteConsulta(): void {
    if (!this.canBuscarDocenteConsulta) {
      return;
    }

    this.loadSolicitudesDocenteConsultaPorDocumento(this.documentoDocenteConsulta.trim());
  }

  getRolConsultaTranslationKey(rol: RolOperativo): string {
    const traducciones: Record<RolOperativo, string> = {
      DOCENTE: 'HISTORIAL_SOLICITUDES.adminConsulta.roles.docente',
      SECRETARIA_ACADEMICA: 'HISTORIAL_SOLICITUDES.adminConsulta.roles.secretariaAcademica',
      SECRETARIA_GENERAL: 'HISTORIAL_SOLICITUDES.adminConsulta.roles.secretariaGeneral'
    };
    return traducciones[rol];
  }

  private cargarSolicitudesPorRol(): void {
    this.solicitudes = [];
    this.filteredSolicitudes = [];
    this.pageIndex = 0;
    this.cargandoSolicitudes = false;

    if (this.isSecretariaAcademica) {
      this.esModoConsultaAdmin
        ? this.loadSolicitudesSecretariaAcademicaConsulta()
        : this.loadSolicitudesSecretariaAcademica();
      return;
    }

    if (this.isSecretariaGeneral) {
      this.loadSolicitudesSecretariaGeneral();
      return;
    }

    if (this.esModoConsultaAdmin) {
      return;
    }

    this.loadTerceroIdAndSolicitudes(this.documento);
  }

  private loadTerceroIdAndSolicitudes(documento: string): void {
    this.cargandoSolicitudes = true;
    const endpoint = `datos_identificacion?query=Activo:true,Numero:${documento}&sortby=FechaCreacion&order=desc`;

    this.tercerosService.get(endpoint).pipe(
      switchMap((response: any) => {
        const registros = Array.isArray(response) ? response : [];
        if (!registros.length || !registros[0]?.TerceroId?.Id) {
          throw new Error('No se encontró el TerceroId para el documento proporcionado.');
        }

        this.terceroId = registros[0].TerceroId.Id;
        const historialEndpoint = `historial_solicitud?query=TerceroId:${this.terceroId},Activo:true&limit=-1`;
        return this.sabaticosCrudService.get(historialEndpoint);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (response: any) => {
        const data = response?.Data ?? response ?? [];
        const apiSolicitudes = this.mapHistorialResponse(Array.isArray(data) ? data : []);
        this.solicitudes = apiSolicitudes;
        this.applyFilters();
        this.cargandoSolicitudes = false;
      },
      error: (error) => {
        console.error('Error al cargar solicitudes:', error);
        this.solicitudes = [];
        this.applyFilters();
        this.cargandoSolicitudes = false;
      }
    });
  }

  private loadSolicitudesSecretariaGeneral(): void {
    this.cargandoSolicitudes = true;
    const endpoint = 'historial_solicitud?query=Activo:True&limit=-1';

    this.sabaticosCrudService.get(endpoint)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => {
          const data = response?.Data ?? response ?? [];
          const apiSolicitudes = this.mapHistorialResponse(Array.isArray(data) ? data : [])
            .filter((s) => this.isEstadoVisibleCoordinador(s.estado));
          this.solicitudes = apiSolicitudes;
          this.applyFilters();
          this.cargandoSolicitudes = false;
          this.fetchDocenteInfoForSolicitudes(apiSolicitudes);
        },
        error: (error) => {
          console.error('Error al cargar solicitudes del coordinador:', error);
          this.solicitudes = [];
          this.applyFilters();
          this.cargandoSolicitudes = false;
        }
      });
  }

  private loadSolicitudesSecretariaAcademicaConsulta(): void {
    this.cargandoSolicitudes = true;
    const endpoint = 'historial_solicitud?query=Activo:True&limit=-1';

    this.sabaticosCrudService.get(endpoint)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => {
          const data = response?.Data ?? response ?? [];
          const apiSolicitudes = this.mapHistorialResponse(Array.isArray(data) ? data : [])
            .filter((s) => this.isEstadoVisibleSecretariaAcademicaConsulta(s.estado));
          this.solicitudes = apiSolicitudes;
          this.applyFilters();
          this.cargandoSolicitudes = false;
          this.fetchDocenteInfoForSolicitudes(apiSolicitudes);
        },
        error: (error) => {
          console.error('Error al cargar solicitudes de secretaría académica en modo consulta:', error);
          this.solicitudes = [];
          this.applyFilters();
          this.cargandoSolicitudes = false;
        }
      });
  }

  private loadSolicitudesDocenteConsultaPorDocumento(documento: string): void {
    this.cargandoSolicitudes = true;
    this.terceroId = null;
    const endpoint = `datos_identificacion?query=Activo:true,Numero:${documento}&sortby=FechaCreacion&order=desc`;

    this.tercerosService.get(endpoint).pipe(
      switchMap((response: any) => {
        const registros = Array.isArray(response)
          ? response
          : Array.isArray(response?.Data)
            ? response.Data
            : [];
        if (!registros.length || !registros[0]?.TerceroId?.Id) {
          throw new Error('No se encontró el TerceroId para el documento consultado.');
        }

        this.terceroId = registros[0].TerceroId.Id;
        const historialEndpoint = `historial_solicitud?query=TerceroId:${this.terceroId},Activo:true&limit=-1`;
        return this.sabaticosCrudService.get(historialEndpoint);
      }),
      takeUntilDestroyed(this.destroyRef)
    )
      .subscribe({
        next: (response: any) => {
          const data = response?.Data ?? response ?? [];
          const apiSolicitudes = this.mapHistorialResponse(Array.isArray(data) ? data : []);
          this.solicitudes = apiSolicitudes;
          this.applyFilters();
          this.cargandoSolicitudes = false;
          this.fetchDocenteInfoForSolicitudes(apiSolicitudes);
        },
        error: (error) => {
          console.error('Error al cargar solicitudes del docente en modo consulta:', error);
          this.solicitudes = [];
          this.applyFilters();
          this.cargandoSolicitudes = false;
        }
      });
  }

  private loadSolicitudesSecretariaAcademica(): void {
    this.cargandoSolicitudes = true;
    const estados = ['S1', 'S11B'];
    const queryParams = estados.map((s) => `estadoSolicitud=${s}`).join('&');
    const endpoint = `solicitud/formularios/${this.documento}?${queryParams}`;

    this.sabaticosMidService.get(endpoint)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => {
          const data = response?.Data ?? [];
          const apiSolicitudes = this.mapSecretariaAcademicaSolicitudes(Array.isArray(data) ? data : []);
          this.solicitudes = apiSolicitudes;
          this.applyFilters();
          this.cargandoSolicitudes = false;
          this.fetchDocenteInfoForSolicitudes(apiSolicitudes);
        },
        error: (error) => {
          console.error('Error al cargar solicitudes de secretaría académica:', error);
          this.solicitudes = [];
          this.applyFilters();
          this.cargandoSolicitudes = false;
        }
      });
  }

  private mapSecretariaAcademicaSolicitudes(data: any[]): HistorialSolicitud[] {
    const latestByIdSolicitud = new Map<number, any>();

    for (const item of data) {
      const solicitudId = item?.SolicitudId?.Id;
      if (!solicitudId) {
        continue;
      }

      const existing = latestByIdSolicitud.get(solicitudId);
      if (!existing || new Date(item.FechaCreacion) > new Date(existing.FechaCreacion)) {
        latestByIdSolicitud.set(solicitudId, item);
      }
    }

    return Array.from(latestByIdSolicitud.values()).map((item) => {
      const estadoNombre = item.EstadoSolicitudId?.Nombre ?? 'Borrador';
      const fechaFormateada = this.formatApiDate(item.FechaCreacion ?? '');
      const terceroId = Number(item.SolicitudId?.TerceroId ?? item.TerceroId) || 0;
      const tipoSolicitud = item.SolicitudId?.TipoSolicitudId?.Nombre ?? '';

      return {
        id: String(item.SolicitudId?.Id ?? ''),
        fechaRadicado: fechaFormateada,
        tipoSolicitud,
        estado: estadoNombre as EstadoSolicitud,
        ...(terceroId > 0 ? { terceroIdDocente: terceroId } : {})
      };
    });
  }

  private mapHistorialResponse(data: any[]): HistorialSolicitud[] {
    return data.map((item) => {
      const estadoNombre = item.EstadoSolicitudId?.Nombre ?? 'Borrador';
      const fechaRaw = item.FechaCreacion ?? '';
      const fechaFormateada = this.formatApiDate(fechaRaw);
      const terceroId = Number(item.SolicitudId?.TerceroId) || 0;
      const tipoSolicitud = item.SolicitudId?.TipoSolicitudId?.Nombre ?? '';

      return {
        id: String(item.SolicitudId?.Id ?? item.Id ?? ''),
        fechaRadicado: fechaFormateada,
        tipoSolicitud,
        estado: estadoNombre as EstadoSolicitud,
        ...(terceroId > 0 ? { terceroIdDocente: terceroId } : {})
      };
    });
  }

  private fetchDocenteInfoForSolicitudes(solicitudes: HistorialSolicitud[]): void {
    const uniqueTerceroIds = [...new Set(
      solicitudes
        .map((s) => s.terceroIdDocente)
        .filter((id): id is number => Boolean(id && id > 0))
    )];

    if (!uniqueTerceroIds.length) {
      return;
    }

    uniqueTerceroIds.forEach((terceroId) => {
      const endpoint = `datos_identificacion?query=Activo:true,TerceroId:${terceroId}&sortby=FechaCreacion&order=desc`;
      this.tercerosService.get(endpoint)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response: any) => {
            const registros = Array.isArray(response) ? response : [];
            if (!registros.length) {
              return;
            }

            const registro = registros[0];
            const nombre = registro?.TerceroId?.NombreCompleto ?? '';
            const identificacion = registro?.Numero ?? '';

            this.solicitudes.forEach((sol) => {
              if (sol.terceroIdDocente === terceroId) {
                sol.docenteNombre = nombre;
                sol.docenteIdentificacion = identificacion;
              }
            });

            this.applyFilters();
          },
          error: (err) => {
            console.warn(`No se pudo obtener info del docente con TerceroId ${terceroId}:`, err);
          }
        });
    });
  }

  private formatApiDate(fechaRaw: string): string {
    if (!fechaRaw) return '';
    const dateObj = new Date(fechaRaw);
    if (Number.isNaN(dateObj.getTime())) {
      const match = fechaRaw.match(/^(\d{4}-\d{2}-\d{2})/);
      return match ? match[1] : '';
    }
    return this.formatLocalDate(dateObj);
  }

  private parseDocenteResponse(response: string): Partial<DocenteInfo> {
    const data = JSON.parse(response);
    const datos = data?.datosCollection?.datos?.[0];

    if (!datos) {
      return {};
    }

    return {
      nombre: `${datos.nombres || ''} ${datos.apellidos || ''}`.trim(),
      facultad: datos.facultad || '',
      documentoIdentificacion: datos.documento || '',
      correoElectronico: (datos.correo || '').split(';').map((c: string) => c.trim()).filter(Boolean).join('|'),
      proyectoCurricular: datos.proyecto || '',
      telefono: datos.telefono || '',
      celular: datos.celular || '',
    };
  }

  private navigateToEditarSolicitud(
    solicitud: HistorialSolicitud,
    readOnly: boolean
  ): void {
    // Las solicitudes de Suspensión o Modificación usan un componente dedicado
    // para los tres roles (DOCENTE, SECRETARIA_ACADEMICA, SECRETARIA_GENERAL),
    // independientemente del rol que esté gestionando la solicitud.
    if (this.esSuspensionOModificacion(solicitud.tipoSolicitud)) {
      this.router.navigate(['solicitudes/suspension-modificacion'], {
        state: {
          rol: this.rol,
          readOnly: this.esModoConsultaAdmin ? true : readOnly,
          tipoSolicitud: solicitud.tipoSolicitud,
          solicitud: {
            id: solicitud.id,
            fechaRadicado: solicitud.fechaRadicado,
            estado: solicitud.estado,
            tipoSolicitud: solicitud.tipoSolicitud,
          }
        }
      });
      return;
    }

    this.router.navigate(['solicitudes/editar'], {
      state: {
        rol: this.rol,
        readOnly: this.esModoConsultaAdmin ? true : readOnly,
        solicitud: {
          id: solicitud.id,
          fechaRadicado: solicitud.fechaRadicado,
          estado: solicitud.estado,
        }
      }
    });
  }

  private esSuspensionOModificacion(tipo: string | undefined | null): boolean {
    if (!tipo) {
      return false;
    }
    const normalizado = tipo.trim().toLowerCase();
    return normalizado === 'suspensión'
      || normalizado === 'suspension'
      || normalizado === 'modificación'
      || normalizado === 'modificacion';
  }

  onIniciarSabatico(solicitud: HistorialSolicitud): void {
    const dialogRef = this.dialog.open(IniciarSabaticoModalComponent, {
      width: '420px',
      maxWidth: '90vw',
      disableClose: true,
      autoFocus: false,
      backdropClass: 'sga-sabaticos-blurred-backdrop',
      data: { solicitudId: solicitud.id }
    });

    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) {
          return;
        }
        this.crearSabatico(solicitud, result.fechaInicio, result.fechaFin);
      });
  }

  private crearSabatico(solicitud: HistorialSolicitud, fechaInicio: Date, fechaFin: Date): void {
    const solicitudIdNumerico = Number(String(solicitud.id).replace(/[^\d]/g, ''));
    const terceroId = solicitud.terceroIdDocente ?? this.terceroId ?? 0;

    const payload = {
      solicitud_id: solicitudIdNumerico,
      tercero_id: terceroId,
      observaciones: '',
      fecha_inicio: this.formatDate(fechaInicio),
      fecha_fin: this.formatDate(fechaFin)
    };

    this.loaderService.show();
    this.sabaticosMidService.post('sabatico', payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loaderService.hide())
      )
      .subscribe({
        next: () => {
          this.popUpManager.showToast('HISTORIAL_SOLICITUDES.iniciarSabatico.exito');
          this.recargarSolicitudes();
        },
        error: (error) => {
          console.error('Error al iniciar sabático:', error);
          this.popUpManager.showErrorAlert(
            this.translate.instant('HISTORIAL_SOLICITUDES.iniciarSabatico.errorEnviar')
          );
        }
      });
  }

  private formatDate(date: Date | null): string {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return '';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  shouldShowIniciarSabatico(solicitud: HistorialSolicitud): boolean {
    if (this.canCrearSabatico) {
    return this.isSecretariaAcademica && solicitud.estado === 'Aprobada pendiente Resolución';
    }

    return false;
  }

  onCrearSolicitud(): void {
    const dialogRef = this.dialog.open(CrearSolicitudModalComponent, {
      width: '90vw',
      maxWidth: '90vw',
      height: '90vh',
      maxHeight: '90vh',
      disableClose: true,
      data: {
        docente: {
          nombre: this.docenteInfo.nombre,
          documentoIdentificacion: this.docenteInfo.documentoIdentificacion,
          facultad: this.docenteInfo.facultad,
          proyectoCurricular: this.docenteInfo.proyectoCurricular
        },
        terceroId: this.terceroId
      }
    });

    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) {
          return;
        }

        this.recargarSolicitudes();
      });
  }

  private recargarSolicitudes(): void {
    if (this.esModoConsultaAdmin) {
      this.cargarSolicitudesPorRol();
      return;
    }

    if (this.isSecretariaAcademica) {
      this.loadSolicitudesSecretariaAcademica();
      return;
    }

    if (this.isSecretariaGeneral) {
      this.loadSolicitudesSecretariaGeneral();
      return;
    }

    if (!this.terceroId) return;

    this.cargandoSolicitudes = true;
    const endpoint = `historial_solicitud?query=TerceroId:${this.terceroId},Activo:true&limit=-1`;
    this.sabaticosCrudService.get(endpoint)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => {
          const data = response?.Data ?? response ?? [];
          const apiSolicitudes = this.mapHistorialResponse(Array.isArray(data) ? data : []);
          this.solicitudes = apiSolicitudes;
          this.applyFilters();
          this.cargandoSolicitudes = false;
        },
        error: () => {
          this.cargandoSolicitudes = false;
          this.popUpManager.showErrorToast('HISTORIAL_SOLICITUDES.errorCargarSolicitudes');
        }
      });
  }

  onFilterChange(column: FilterColumn, value: string): void {
    this.columnFilters[column] = value;
    this.applyFilters();
  }

  onEstadoFilterChange(estados: EstadoSolicitud[]): void {
    this.columnFilters.estado = estados ?? [];
    this.applyFilters();
  }

  onTipoSolicitudFilterChange(tipos: TipoSolicitud[]): void {
    this.columnFilters.tipoSolicitud = tipos ?? [];
    this.applyFilters();
  }

  onFechaRangeChange(rangeInput: MatDateRangeInput<Date>): void {
    const range = rangeInput.value;
    this.fechaFiltro = {
      start: range?.start ?? null,
      end: range?.end ?? null
    };
    this.applyFilters();
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
  }

  private applyFilters(): void {
    this.filteredSolicitudes = this.solicitudes.filter((solicitud) => {
      const matchesId = this.matchesFilter(solicitud.id, this.columnFilters.id);
      const matchesDocenteIdentificacion = this.canViewDocenteColumns
        ? this.matchesFilter(this.getDocenteIdentificacion(solicitud), this.columnFilters.docenteIdentificacion)
        : true;
      const matchesDocenteNombre = this.canViewDocenteColumns
        ? this.matchesFilter(this.getDocenteNombre(solicitud), this.columnFilters.docenteNombre)
        : true;
      const matchesTipoSolicitud = this.matchesTipoSolicitudFilter(solicitud.tipoSolicitud);
      const matchesEstado = this.matchesEstadoFilter(solicitud.estado);
      const matchesFecha = this.matchesFechaRange(solicitud.fechaRadicado);

      return matchesId && matchesDocenteIdentificacion && matchesDocenteNombre && matchesTipoSolicitud && matchesEstado && matchesFecha;
    });
    this.pageIndex = 0;
  }

  private matchesFilter(value: string, filterValue: string): boolean {
    if (!filterValue) {
      return true;
    }
    return this.normalize(value).includes(this.normalize(filterValue));
  }

  private matchesEstadoFilter(estado: EstadoSolicitud): boolean {
    if (!this.columnFilters.estado.length) {
      return true;
    }
    return this.columnFilters.estado.includes(estado);
  }

  private matchesTipoSolicitudFilter(tipo: string): boolean {
    if (!this.columnFilters.tipoSolicitud.length) {
      return true;
    }
    return this.columnFilters.tipoSolicitud.some((seleccionado) => seleccionado === tipo);
  }

  private matchesFechaRange(fechaRadicado: string): boolean {
    const { start, end } = this.fechaFiltro;
    if (!start && !end) {
      return true;
    }

    const fecha = this.parseLocalDate(fechaRadicado);
    if (!fecha) {
      return false;
    }

    const fechaTime = this.stripTime(fecha);
    const startTime = start ? this.stripTime(start) : null;
    const endTime = end ? this.stripTime(end) : null;

    if (startTime !== null && fechaTime < startTime) {
      return false;
    }

    if (endTime !== null && fechaTime > endTime) {
      return false;
    }

    return true;
  }

  private normalize(value: string): string {
    return value
      ? value
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
      : '';
  }

  private formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseLocalDate(value: string): Date | null {
    if (!value) {
      return null;
    }

    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
      return null;
    }

    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private stripTime(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  }
}
