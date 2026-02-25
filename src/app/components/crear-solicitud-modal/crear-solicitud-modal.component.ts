import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

interface DocenteBasico {
  nombre: string;
  documentoIdentificacion: string;
  facultad: string;
  proyectoCurricular: string;
}

interface CrearSolicitudModalData {
  docente: DocenteBasico;
}

@Component({
  selector: 'app-crear-solicitud-modal',
  templateUrl: './crear-solicitud-modal.component.html',
  styleUrl: './crear-solicitud-modal.component.scss'
})
export class CrearSolicitudModalComponent {
  readonly form: FormGroup;
  readonly modalidadOptions = [
    'HISTORIAL_SOLICITUDES.modal.modalidad.opcion1',
    'HISTORIAL_SOLICITUDES.modal.modalidad.opcion2',
    'HISTORIAL_SOLICITUDES.modal.modalidad.opcion3',
    'HISTORIAL_SOLICITUDES.modal.modalidad.opcion4',
    'HISTORIAL_SOLICITUDES.modal.modalidad.opcion5',
    'HISTORIAL_SOLICITUDES.modal.modalidad.opcion6',
    'HISTORIAL_SOLICITUDES.modal.modalidad.opcion7'
  ];

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly dialogRef: MatDialogRef<CrearSolicitudModalComponent>,
    @Inject(MAT_DIALOG_DATA) private readonly data: CrearSolicitudModalData
  ) {
    this.form = this.formBuilder.group({
      docenteNombre: [{ value: data.docente.nombre, disabled: true }],
      docenteIdentificacion: [{ value: data.docente.documentoIdentificacion, disabled: true }],
      docenteFacultad: [{ value: data.docente.facultad, disabled: true }],
      docenteProyecto: [{ value: data.docente.proyectoCurricular, disabled: true }],
      periodoEjecucion: ['', Validators.required],
      ultimoSabatico: this.formBuilder.group({
        start: [null, Validators.required],
        end: [null, Validators.required]
      }),
      productoUltimo: ['', Validators.required],
      modalidad: ['', Validators.required],
      objetivoGeneral: ['', Validators.required],
      objetivosEspecificos: ['', Validators.required],
      justificacion: ['', Validators.required]
    });

  }

  onCancelar(): void {
    this.dialogRef.close();
  }

  onGuardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close(this.form.getRawValue());
  }
}
