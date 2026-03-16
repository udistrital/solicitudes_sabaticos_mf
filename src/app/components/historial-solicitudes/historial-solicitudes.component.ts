import { Component, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DateAdapter } from '@angular/material/core';
import { MatDateRangeInput } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { CrearSolicitudModalComponent } from '../crear-solicitud-modal/crear-solicitud-modal.component';
import { ImplicitAutenticationService } from '../../services/implicit_authentication.service';
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
type FilterColumn = 'id' | 'docenteIdentificacion' | 'docenteNombre';

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
  documentos: Record<string, string | null>;
}

interface HistorialSolicitud {
  id: string;
  fechaRadicado: string;
  estado: EstadoSolicitud;
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
  styleUrl: './historial-solicitudes.component.scss'
})
export class HistorialSolicitudesComponent {
  readonly displayedColumnsDocente = ['id', 'fechaRadicado', 'estado', 'gestion'];
  readonly displayedColumnsContratista = ['id', 'fechaRadicado', 'docenteIdentificacion', 'docenteNombre', 'estado', 'gestion'];
  currentLang = 'es';

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

  readonly docenteInfo: DocenteInfo = {
    nombre: 'Ana María López',
    facultad: 'Facultad de Ingeniería',
    documentoIdentificacion: '1.234.567.890',
    edad: '42',
    correoElectronico: 'ana.lopez@udistrital.edu.co',
    proyectoCurricular: 'Ingeniería de Sistemas',
    telefono: '601 323 9300',
    celular: '300 123 4567',
    fechaIngreso: '2012-08-15',
    resolucionFechaIngreso: 'Resolución 015 de 2012',
    fechaInscripcionEscalafon: '2015-03-10',
    resolucionInscripcionEscalafon: 'Resolución 042 de 2015',
    categoriaIngreso: 'Asistente',
    categoriaActual: 'Asociado'
  };

  solicitudes: HistorialSolicitud[] = [
    {
      id: 'SOL-001',
      fechaRadicado: '2026-01-15',
      estado: 'Borrador'
    },
    {
      id: 'SOL-002',
      fechaRadicado: '2026-01-20',
      estado: 'Radicada / Enviada a SA'
    },
    {
      id: 'SOL-003',
      fechaRadicado: '2026-01-25',
      estado: 'Recepcionada a SA'
    },
    {
      id: 'SOL-004',
      fechaRadicado: '2026-02-25',
      estado: 'En verificación de SA'
    },
    {
      id: 'SOL-005',
      fechaRadicado: '2026-03-02',
      estado: 'Subsanación solicitada'
    },
    {
      id: 'SOL-006',
      fechaRadicado: '2026-05-14',
      estado: 'Trámite externo CF'
    },
    {
      id: 'SOL-007',
      fechaRadicado: '2026-06-10',
      estado: 'Respuesta CF registrada'
    },
    {
      id: 'SOL-008',
      fechaRadicado: '2026-11-25',
      estado: 'Enviada a SG'
    },
    {
      id: 'SOL-009',
      fechaRadicado: '2026-07-07',
      estado: 'Recepcionada a SG'
    },
    {
      id: 'SOL-010',
      fechaRadicado: '2026-08-06',
      estado: 'Trámite externo CA'
    },
    {
      id: 'SOL-011',
      fechaRadicado: '2026-09-12',
      estado: 'Decisión CA registrada'
    },
    {
      id: 'SOL-012',
      fechaRadicado: '2026-10-01',
      estado: 'Finalizada No aprobada'
    },
    {
      id: 'SOL-013',
      fechaRadicado: '2026-11-18',
      estado: 'Aprobada pendiente Resolución'
    },
    {
      id: 'SOL-014',
      fechaRadicado: '2026-12-05',
      estado: 'Finalizada Aprobada con Resolución'
    }
  ];

  filteredSolicitudes: HistorialSolicitud[] = [...this.solicitudes];

  readonly pageSizeOptions = [5, 10, 25];
  pageSize = 5;
  pageIndex = 0;

  get paginatedSolicitudes(): HistorialSolicitud[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredSolicitudes.slice(start, start + this.pageSize);
  }

  get displayedColumns(): string[] {
    return this.canViewDocenteColumns ? this.displayedColumnsContratista : this.displayedColumnsDocente;
  }

  columnFilters: ColumnFilters = {
    id: '',
    docenteIdentificacion: '',
    docenteNombre: '',
    estado: []
  };

  fechaFiltro: FechaFiltro = { start: null, end: null };
  rol!: string;

  get isDocente(): boolean {
    return this.rol === 'DOCENTE';
  }

  get isContratista(): boolean {
    return this.rol === 'CONTRATISTA';
  }

  get isCoordinador(): boolean {
    return this.rol === 'COORDINADOR';
  }

  get canViewDocenteColumns(): boolean {
    return this.isContratista || this.isCoordinador;
  }

  get roleInfoMessageKey(): string {
    if (this.isCoordinador) {
      return 'HISTORIAL_SOLICITUDES.roleInfo.coordinador';
    }
    if (this.isContratista) {
      return 'HISTORIAL_SOLICITUDES.roleInfo.contratista';
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
    private readonly popUpManager: PopUpManager
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

    if (
      roles.__zone_symbol__value.find(
        (x: string) => x == 'COORDINADOR' || x == 'ADMIN_SGA' // utest => SEC GENERAL
      )
    ) {
      this.rol = 'COORDINADOR';
    } else if (
      roles.__zone_symbol__value.find((x: string) => x == 'CONTRATISTA')  // correo_personal => SEC ACADEMICA
    ) {
      this.rol = 'CONTRATISTA';
    } else if (
      roles.__zone_symbol__value.find(
        (x: string) => x == 'DOCENTE'
      )
    ) {
      this.rol = 'DOCENTE';
    }
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
    return solicitud.detalle?.docenteIdentificacion || this.docenteInfo.documentoIdentificacion;
  }

  getDocenteNombre(solicitud: HistorialSolicitud): string {
    return solicitud.detalle?.docenteNombre || this.docenteInfo.nombre;
  }

  onEditar(solicitud: HistorialSolicitud): void {
    this.navigateToEditarSolicitud(solicitud, false);
  }

  onVisualizar(solicitud: HistorialSolicitud): void {
    this.navigateToEditarSolicitud(solicitud, true);
  }

  shouldShowViewOnly(solicitud: HistorialSolicitud): boolean {
    if (this.isDocente) {
      return !this.isDocenteEditable(solicitud);
    }
    if (this.isContratista) {
      return this.isContratistaViewOnly(solicitud);
    }
    if (this.isCoordinador) {
      return this.isCoordinadorViewOnly(solicitud);
    }
    return false;
  }

  shouldShowEditButton(solicitud: HistorialSolicitud): boolean {
    return !this.shouldShowViewOnly(solicitud);
  }

  shouldShowSendButton(solicitud: HistorialSolicitud): boolean {
    if (this.shouldShowViewOnly(solicitud) || this.shouldShowIniciarSabatico(solicitud)) {
      return false;
    }

    if (this.isDocente) {
      return this.isDocenteEditable(solicitud);
    }

    return true;
  }

  getEditIcon(): string {
    return (this.isContratista || this.isCoordinador) ? 'library_add_check' : 'edit';
  }

  getEditAriaKey(): string {
    return (this.isContratista || this.isCoordinador)
      ? 'HISTORIAL_SOLICITUDES.actions.reviewAria'
      : 'HISTORIAL_SOLICITUDES.actions.editAria';
  }

  private isDocenteEditable(solicitud: HistorialSolicitud): boolean {
    return solicitud.estado === 'Borrador' || solicitud.estado === 'Subsanación solicitada';
  }

  private isCoordinadorViewOnly(solicitud: HistorialSolicitud): boolean {
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

  private isContratistaViewOnly(solicitud: HistorialSolicitud): boolean {
    return solicitud.estado === 'Borrador'
      || solicitud.estado === 'Subsanación solicitada'
      || solicitud.estado === 'Recepcionada a SG'
      || solicitud.estado === 'Finalizada Aprobada con Resolución';
  }

  private navigateToEditarSolicitud(solicitud: HistorialSolicitud, readOnly: boolean): void {
    this.router.navigate(['solicitudes/editar'], {
      state: {
        rol: this.rol,
        readOnly,
        solicitud: solicitud.detalle
          ? {
            ...solicitud.detalle,
            id: solicitud.id,
            fechaRadicado: solicitud.fechaRadicado,
            estado: solicitud.estado
          }
          : {
            id: solicitud.id,
            fechaRadicado: solicitud.fechaRadicado,
            estado: solicitud.estado
          }
      }
    });
  }

  async onEnviar(solicitud: HistorialSolicitud): Promise<void> {
    const isDocenteBorrador = this.isDocente && this.isDocenteEditable(solicitud);
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

    console.log(`Enviar solicitud ${solicitud.id}`);
  }

  onIniciarSabatico(id: string): void {
    console.log(`Iniciar sabático para solicitud ${id}`);
  }

  shouldShowIniciarSabatico(solicitud: HistorialSolicitud): boolean {
    return this.isContratista && solicitud.estado === 'Finalizada Aprobada con Resolución';
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
        }
      }
    });

    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) {
          return;
        }

        const nuevaId = this.getNextSolicitudId();
        const fechaRadicado = this.formatLocalDate(new Date());
        const detalle = result as SolicitudDetalle;

        this.solicitudes = [
          ...this.solicitudes,
          {
            id: nuevaId,
            fechaRadicado,
            estado: 'Borrador',
            detalle: {
              ...detalle,
              documentos: detalle.documentos ?? {}
            }
          }
        ];
        this.applyFilters();
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

  private getNextSolicitudId(): string {
    const maxId = this.solicitudes
      .map((solicitud) => {
        const match = solicitud.id.match(/\d+/);
        return match ? Number(match[0]) : 0;
      })
      .reduce((max, value) => (value > max ? value : max), 0);

    const nextId = maxId + 1;
    return `SOL-${String(nextId).padStart(3, '0')}`;
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
