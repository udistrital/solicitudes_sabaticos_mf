import { Component } from '@angular/core';

type EstadoSolicitud = 'Pendiente' | 'En revisión' | 'Aprobada' | 'Rechazada';

interface HistorialSolicitud {
  id: string;
  fechaRadicado: string;
  estado: EstadoSolicitud;
}

@Component({
  selector: 'app-historial-solicitudes',
  templateUrl: './historial-solicitudes.component.html',
  styleUrl: './historial-solicitudes.component.scss'
})
export class HistorialSolicitudesComponent {
  readonly displayedColumns = ['id', 'fechaRadicado', 'estado', 'gestion'];

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
    }
  ];

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
}
