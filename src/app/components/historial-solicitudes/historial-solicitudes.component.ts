import { Component, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDateRangeInput } from '@angular/material/datepicker';
import { PageEvent } from '@angular/material/paginator';
import { TranslateService } from '@ngx-translate/core';

type EstadoSolicitud = 'Pendiente' | 'En revisión' | 'Aprobada' | 'Rechazada';
type FilterColumn = 'id' | 'estado';

interface HistorialSolicitud {
  id: string;
  fechaRadicado: string;
  estado: EstadoSolicitud;
}

interface FechaFiltro {
  start: Date | null;
  end: Date | null;
}

interface DocenteInfo {
  nombre: string;
  cedula: string;
  correo: string;
  estadoKey: string;
}

@Component({
  selector: 'app-historial-solicitudes',
  templateUrl: './historial-solicitudes.component.html',
  styleUrl: './historial-solicitudes.component.scss'
})
export class HistorialSolicitudesComponent {
  readonly displayedColumns = ['id', 'fechaRadicado', 'estado', 'gestion'];
  currentLang = 'es';

  readonly estadoTraducciones: Record<EstadoSolicitud, string> = {
    Pendiente: 'HISTORIAL_SOLICITUDES.status.pending',
    'En revisión': 'HISTORIAL_SOLICITUDES.status.review',
    Aprobada: 'HISTORIAL_SOLICITUDES.status.approved',
    Rechazada: 'HISTORIAL_SOLICITUDES.status.rejected'
  };

  readonly docenteInfo: DocenteInfo = {
    nombre: 'Ana María López',
    cedula: '1.234.567.890',
    correo: 'ana.lopez@udistrital.edu.co',
    estadoKey: 'GLOBAL.activo'
  };

  readonly solicitudes: HistorialSolicitud[] = [
    {
      id: 'SOL-001',
      fechaRadicado: '2026-01-15',
      estado: 'Pendiente'
    },
    {
      id: 'SOL-002',
      fechaRadicado: '2026-01-20',
      estado: 'En revisión'
    },
    {
      id: 'SOL-003',
      fechaRadicado: '2026-01-25',
      estado: 'Aprobada'
    },
    {
      id: 'SOL-004',
      fechaRadicado: '2026-02-25',
      estado: 'Aprobada'
    },
    {
      id: 'SOL-005',
      fechaRadicado: '2026-03-02',
      estado: 'En revisión'
    },
    {
      id: 'SOL-006',
      fechaRadicado: '2026-05-14',
      estado: 'Aprobada'
    },
    {
      id: 'SOL-007',
      fechaRadicado: '2026-06-10',
      estado: 'Pendiente'
    },
    {
      id: 'SOL-008',
      fechaRadicado: '2026-11-25',
      estado: 'En revisión'
    },
    {
      id: 'SOL-009',
      fechaRadicado: '2026-07-07',
      estado: 'En revisión'
    },
    {
      id: 'SOL-010',
      fechaRadicado: '2026-02-06',
      estado: 'Pendiente'
    },
  ];

  filteredSolicitudes: HistorialSolicitud[] = [...this.solicitudes];

  readonly pageSizeOptions = [5, 10, 25];
  pageSize = 5;
  pageIndex = 0;

  get paginatedSolicitudes(): HistorialSolicitud[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredSolicitudes.slice(start, start + this.pageSize);
  }

  columnFilters: Record<FilterColumn, string> = {
    id: '',
    estado: ''
  };

  fechaFiltro: FechaFiltro = { start: null, end: null };

  constructor(
    private readonly translate: TranslateService,
    private readonly destroyRef: DestroyRef
  ) {
    this.currentLang = this.translate.currentLang || this.translate.getDefaultLang() || 'es';

    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ lang }) => {
        this.currentLang = lang;
        this.applyFilters();
      });
  }

  getEstadoTranslation(estado: EstadoSolicitud): string {
    return this.estadoTraducciones[estado];
  }

  getEstadoClass(estado: EstadoSolicitud): string {
    switch (estado) {
      case 'Pendiente':
        return 'estado--pendiente';
      case 'En revisión':
        return 'estado--en-revision';
      case 'Aprobada':
        return 'estado--aprobada';
      case 'Rechazada':
        return 'estado--rechazada';
      default:
        return 'estado--pendiente';
    }
  }

  trackBySolicitud(_: number, solicitud: HistorialSolicitud): string {
    return solicitud.id;
  }

  onEditar(id: string): void {
    console.log(`Editar solicitud ${id}`);
  }

  onEnviar(id: string): void {
    console.log(`Enviar solicitud ${id}`);
  }

  onCrearSolicitud(): void {
    console.log('Crear nueva solicitud');
  }

  onFilterChange(column: FilterColumn, value: string): void {
    this.columnFilters[column] = value;
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
      const estadoTraducido = this.translate.instant(this.getEstadoTranslation(solicitud.estado));
      const matchesId = this.matchesFilter(solicitud.id, this.columnFilters.id);
      const matchesEstado = this.matchesFilter(
        `${solicitud.estado} ${estadoTraducido}`,
        this.columnFilters.estado
      );
      const matchesFecha = this.matchesFechaRange(solicitud.fechaRadicado);

      return matchesId && matchesEstado && matchesFecha;
    });
    this.pageIndex = 0;
  }

  private matchesFilter(value: string, filterValue: string): boolean {
    if (!filterValue) {
      return true;
    }
    return this.normalize(value).includes(this.normalize(filterValue));
  }

  private matchesFechaRange(fechaRadicado: string): boolean {
    const { start, end } = this.fechaFiltro;
    if (!start && !end) {
      return true;
    }

    const fecha = new Date(fechaRadicado);
    if (Number.isNaN(fecha.getTime())) {
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

  private stripTime(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  }
}
