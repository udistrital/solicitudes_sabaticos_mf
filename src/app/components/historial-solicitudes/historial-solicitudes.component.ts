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
type FilterColumn = 'id' | 'docenteIdentificacion' | 'docenteNombre';

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
  docenteNombre: string;
  docenteIdentificacion: string;
  docenteFacultad: string;
  docenteProyecto: string;
  periodoEjecucion: string;
  ultimoSabatico: {
    start: Date | null;
    end: Date | null;
  };
  productoUltimo: string;
  modalidad: string;
  objetivoGeneral: string;
  objetivosEspecificos: string;
  justificacion: string;
  planDesarrolloInstitucional: string;
  proyectoEducativoFacultad: string;
  proyectoEducativoProgramas: string;
  productoEntregable: string;
  impactoAlcance: string;
  metodologia: string;
  cronograma: CronogramaActividad;
  presupuesto: string;
  observaciones: string;
  documentos: Record<string, string | null>;
}

interface HistorialSolicitud {
  id: string;
  fechaRadicado: string;
  estado: EstadoSolicitud;
  terceroIdDocente?: number;
  docenteIdentificacion?: string;
  docenteNombre?: string;
  detalle?: SolicitudDetalle;
}

interface ColumnFilters {
  id: string;
  docenteIdentificacion: string;
  docenteNombre: string;
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
  readonly displayedColumnsDocente = ['id', 'fechaRadicado', 'estado', 'gestion'];
  readonly displayedColumnsSecretariaAcademica = ['id', 'fechaRadicado', 'docenteIdentificacion', 'docenteNombre', 'estado', 'gestion'];
  currentLang = 'es';
  perfil: string = '';
  permisos: any[] = [];

  private readonly mockSolicitudes: HistorialSolicitud[] = [
    { id: 'SOL-001', fechaRadicado: '2026-01-15', estado: 'Borrador', detalle: this.buildMockDetalle('SOL-001') },
    { id: 'SOL-002', fechaRadicado: '2026-01-20', estado: 'Radicada / Enviada a SA', detalle: this.buildMockDetalle('SOL-002') },
    { id: 'SOL-003', fechaRadicado: '2026-01-25', estado: 'Recepcionada a SA', detalle: this.buildMockDetalle('SOL-003') },
    { id: 'SOL-004', fechaRadicado: '2026-02-25', estado: 'En verificación de SA', detalle: this.buildMockDetalle('SOL-004') },
    { id: 'SOL-005', fechaRadicado: '2026-03-02', estado: 'Subsanación solicitada', detalle: this.buildMockDetalle('SOL-005') },
    { id: 'SOL-006', fechaRadicado: '2026-05-14', estado: 'Trámite externo CF', detalle: this.buildMockDetalle('SOL-006') },
    { id: 'SOL-007', fechaRadicado: '2026-06-10', estado: 'Respuesta CF registrada', detalle: this.buildMockDetalle('SOL-007') },
    { id: 'SOL-008', fechaRadicado: '2026-11-25', estado: 'Enviada a SG', detalle: this.buildMockDetalle('SOL-008') },
    { id: 'SOL-009', fechaRadicado: '2026-07-07', estado: 'Recepcionada a SG', detalle: this.buildMockDetalle('SOL-009') },
    { id: 'SOL-010', fechaRadicado: '2026-08-06', estado: 'Trámite externo CA', detalle: this.buildMockDetalle('SOL-010') },
    { id: 'SOL-011', fechaRadicado: '2026-09-12', estado: 'Decisión CA registrada', detalle: this.buildMockDetalle('SOL-011') },
    { id: 'SOL-012', fechaRadicado: '2026-10-01', estado: 'Finalizada No aprobada', detalle: this.buildMockDetalle('SOL-012') },
    { id: 'SOL-013', fechaRadicado: '2026-11-18', estado: 'Aprobada pendiente Resolución', detalle: this.buildMockDetalle('SOL-013') },
    { id: 'SOL-014', fechaRadicado: '2026-12-05', estado: 'Finalizada Aprobada con Resolución', detalle: this.buildMockDetalle('SOL-014') },
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
    estado: []
  };

  fechaFiltro: FechaFiltro = { start: null, end: null };
  rol!: string;

  get canCrearSolicitud(): boolean {
    return this.permisos.some((p: any) => p?.Opcion?.Nombre === 'Crear_Solicitud_Sabatico');
  }

  get canEditarSolicitud(): boolean {
    return this.permisos.some((p: any) => p?.Opcion?.Nombre === 'Editar_Solicitud_Sabatico');
  }

  get canViewSolicitud(): boolean {
    return this.permisos.some((p: any) => p?.Opcion?.Nombre === 'Ver_Solicitud_Sabatico');
  }

  get canCrearSabatico(): boolean {
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
    return this.isSecretariaAcademica || this.isSecretariaGeneral;
  }

  get roleInfoMessageKey(): string {
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

    let roles: any = this.autenticationService.getRole();

    this.rol= roles.__zone_symbol__value.find((x: string) => ['SECRETARIA_ACADEMICA', 'DOCENTE', 'SECRETARIA_GENERAL'].includes(x));

    this.configuracionService.get("perfil_x_menu_opcion?limit=-1&query=Perfil__Nombre__in:" + this.rol)
    .subscribe((response: any) => {
      this.permisos = response
      this.perfil = response[0]?.Perfil?.Nombre ?? '';
    });

    this.autenticationService.getDocument().then((documento: any) => {
      this.documento = String(documento ?? '');
      this.loadDocenteInfo(this.documento);

      if (this.isSecretariaAcademica) {
        this.loadSolicitudesSecretariaAcademica();
      } else if (this.isSecretariaGeneral) {
        this.loadSolicitudesSecretariaGeneral();
      } else {
        this.loadTerceroIdAndSolicitudes(this.documento);
      }
    });
  }

  getEstadoTranslation(estado: EstadoSolicitud): string {
    return this.estadoTraducciones[estado];
  }

  getEstadoClass(estado: EstadoSolicitud): string {
    switch (estado) {
      case 'Borrador':
        return 'estado--borrador';
      case 'Radicada / Enviada a SA':
      case 'Recepcionada a SA':
      case 'En verificación de SA':
        return 'estado--sa';
      case 'Subsanación solicitada':
        return 'estado--subsanacion';
      case 'Trámite externo CF':
      case 'Respuesta CF registrada':
        return 'estado--cf';
      case 'Enviada a SG':
      case 'Recepcionada a SG':
        return 'estado--sg';
      case 'Trámite externo CA':
      case 'Decisión CA registrada':
        return 'estado--ca';
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
      || solicitud.detalle?.docenteIdentificacion
      || this.docenteInfo.documentoIdentificacion;
  }

  getDocenteNombre(solicitud: HistorialSolicitud): string {
    return solicitud.docenteNombre
      || solicitud.detalle?.docenteNombre
      || this.docenteInfo.nombre;
  }

  onEditar(solicitud: HistorialSolicitud): void {
    this.navigateToEditarSolicitud(solicitud, false);
  }

  onVisualizar(solicitud: HistorialSolicitud): void {
    this.navigateToEditarSolicitud(solicitud, true);
  }

  shouldShowViewOnly(solicitud: HistorialSolicitud): boolean {
    if (this.canViewSolicitud){
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
    return solicitud.estado === 'Borrador'
      || solicitud.estado === 'Radicada / Enviada a SA'
      || solicitud.estado === 'Subsanación solicitada';
  }

  private isSecretariaGeneralViewOnly(solicitud: HistorialSolicitud): boolean {
    const viewOnlyStates: EstadoSolicitud[] = [
      'Borrador',
      'Radicada / Enviada a SA',
      'Recepcionada a SA',
      'En verificación de SA',
      'Subsanación solicitada',
      'Trámite externo CF',
      'Respuesta CF registrada',
      'Finalizada Aprobada con Resolución',
    ];
    return viewOnlyStates.includes(solicitud.estado);
  }

  private isSecretariaAcademicaViewOnly(solicitud: HistorialSolicitud): boolean {
    return solicitud.estado === 'Borrador'
      || solicitud.estado === 'Subsanación solicitada'
      || solicitud.estado === 'Enviada a SG'
      || solicitud.estado === 'Recepcionada a SG'
      || solicitud.estado === 'Trámite externo CA'
      || solicitud.estado === 'Decisión CA registrada'
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

  private readonly estadosVisiblesCoordinador: EstadoSolicitud[] = [
    'Enviada a SG',
    'Recepcionada a SG',
    'Trámite externo CA',
    'Decisión CA registrada',
    'Finalizada No aprobada',
    'Aprobada pendiente Resolución',
    'Finalizada Aprobada con Resolución',
  ];

  private isEstadoVisibleCoordinador(estado: EstadoSolicitud): boolean {
    return this.estadosVisiblesCoordinador.includes(estado);
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
        this.solicitudes = [...apiSolicitudes, ...this.mockSolicitudes];
        this.applyFilters();
        this.cargandoSolicitudes = false;
      },
      error: (error) => {
        console.error('Error al cargar solicitudes:', error);
        this.solicitudes = [...this.mockSolicitudes];
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
          this.solicitudes = [...apiSolicitudes, ...this.mockSolicitudes];
          this.applyFilters();
          this.cargandoSolicitudes = false;
          this.fetchDocenteInfoForSolicitudes(apiSolicitudes);
        },
        error: (error) => {
          console.error('Error al cargar solicitudes del coordinador:', error);
          this.solicitudes = [...this.mockSolicitudes];
          this.applyFilters();
          this.cargandoSolicitudes = false;
        }
      });
  }

  private loadSolicitudesSecretariaAcademica(): void {
    this.cargandoSolicitudes = true;
    const estados = ['S1', 'S2', 'S3', 'S5', 'S6', 'S11B', 'S12'];
    const queryParams = estados.map((s) => `estadoSolicitud=${s}`).join('&');
    const endpoint = `solicitud/formularios/${this.documento}?${queryParams}`;

    this.sabaticosMidService.get(endpoint)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => {
          const data = response?.Data ?? [];
          const apiSolicitudes = this.mapSecretariaAcademicaSolicitudes(Array.isArray(data) ? data : []);
          this.solicitudes = [...apiSolicitudes, ...this.mockSolicitudes];
          this.applyFilters();
          this.cargandoSolicitudes = false;
          this.fetchDocenteInfoForSolicitudes(apiSolicitudes);
        },
        error: (error) => {
          console.error('Error al cargar solicitudes de secretaría académica:', error);
          this.solicitudes = [...this.mockSolicitudes];
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

      return {
        id: String(item.SolicitudId?.Id ?? ''),
        fechaRadicado: fechaFormateada,
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

      return {
        id: String(item.SolicitudId?.Id ?? item.Id ?? ''),
        fechaRadicado: fechaFormateada,
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
    this.router.navigate(['solicitudes/editar'], {
      state: {
        rol: this.rol,
        readOnly,
        solicitud: {
          id: solicitud.id,
          fechaRadicado: solicitud.fechaRadicado,
          estado: solicitud.estado,
          ...(solicitud.detalle ? { mockDetalle: solicitud.detalle } : {})
        }
      }
    });
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
      observaciones: 'Creación de año sabático',
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
          this.solicitudes = [...apiSolicitudes, ...this.mockSolicitudes];
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
      const matchesEstado = this.matchesEstadoFilter(solicitud.estado);
      const matchesFecha = this.matchesFechaRange(solicitud.fechaRadicado);

      return matchesId && matchesDocenteIdentificacion && matchesDocenteNombre && matchesEstado && matchesFecha;
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

  private buildMockDetalle(id: string): SolicitudDetalle {
    return {
      docenteNombre: 'Carlos Andrés Pérez Gómez',
      docenteIdentificacion: '1023456789',
      docenteFacultad: 'Facultad de Ingeniería',
      docenteProyecto: 'Ingeniería de Sistemas',
      periodoEjecucion: '2026-I',
      ultimoSabatico: { start: new Date(2019, 0, 15), end: new Date(2019, 11, 15) },
      productoUltimo: 'Libro publicado: Fundamentos de IA aplicada',
      modalidad: 'Investigación',
      objetivoGeneral: `Desarrollar un framework de análisis predictivo para datos académicos (${id}).`,
      objetivosEspecificos: 'Diseñar la arquitectura del framework.\nImplementar módulos de procesamiento.\nValidar con datos reales.',
      justificacion: 'La universidad requiere herramientas que permitan anticipar tendencias académicas y optimizar la toma de decisiones.',
      planDesarrolloInstitucional: 'Alineado con el eje estratégico de innovación tecnológica del PDI 2024-2028.',
      proyectoEducativoFacultad: 'Contribuye al fortalecimiento de la línea de investigación en ciencia de datos.',
      proyectoEducativoProgramas: 'Aporta al componente investigativo del programa de Ingeniería de Sistemas.',
      productoEntregable: 'Framework funcional con documentación técnica y artículo sometido a revista indexada.',
      impactoAlcance: 'Beneficio directo para la comunidad académica de la universidad y potencial transferencia a otras IES.',
      metodologia: 'Metodología mixta: revisión sistemática de literatura, desarrollo ágil (Scrum) y validación empírica.',
      cronograma: {
        mes1: 'Revisión de literatura',
        mes2: 'Diseño de arquitectura',
        mes3: 'Desarrollo módulo de ingesta',
        mes4: 'Desarrollo módulo de procesamiento',
        mes5: 'Desarrollo módulo de análisis',
        mes6: 'Integración de módulos',
        mes7: 'Pruebas unitarias e integración',
        mes8: 'Validación con datos reales',
        mes9: 'Ajustes y optimización',
        mes10: 'Documentación técnica',
        mes11: 'Redacción de artículo científico',
        mes12: 'Entrega final y socialización'
      },
      presupuesto: 'Recursos computacionales: $5.000.000 COP\nMaterial bibliográfico: $2.000.000 COP\nViáticos: $3.000.000 COP',
      observaciones: '',
      documentos: {
        avalConsejo: `Aval_Consejo_${id}.pdf`,
        cronogramaMensual: `Cronograma_Mensual_${id}.pdf`,
        presupuestoProyectado: `Presupuesto_${id}.pdf`,
        certificacionLaboral: `Certificacion_Laboral_${id}.pdf`,
        pazSalvoAcademico: `Paz_Salvo_Academico_${id}.pdf`,
        pazSalvoInvestigaciones: `Paz_Salvo_Investigaciones_${id}.pdf`,
        pazSalvoExtension: `Paz_Salvo_Extension_${id}.pdf`,
        pazSalvoAlmacen: `Paz_Salvo_Almacen_${id}.pdf`,
        pazSalvoFinanciero: `Paz_Salvo_Financiero_${id}.pdf`,
      }
    };
  }
}
