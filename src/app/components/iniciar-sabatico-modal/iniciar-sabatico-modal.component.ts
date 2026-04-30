import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

interface IniciarSabaticoModalData {
  solicitudId: string;
}

interface IniciarSabaticoModalResult {
  solicitudId: string;
  fechaInicio: Date;
  fechaFin: Date;
}

@Component({
  selector: 'app-iniciar-sabatico-modal',
  templateUrl: './iniciar-sabatico-modal.component.html',
  styleUrl: './iniciar-sabatico-modal.component.scss',
  standalone: false
})
export class IniciarSabaticoModalComponent {
  readonly form: FormGroup;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly dialogRef: MatDialogRef<IniciarSabaticoModalComponent, IniciarSabaticoModalResult | undefined>,
    @Inject(MAT_DIALOG_DATA) private readonly data: IniciarSabaticoModalData,
  ) {
    this.form = this.formBuilder.group({
      fechaInicio: [null, Validators.required],
      fechaFin: [null, Validators.required],
    }, { validators: [this.rangoFechasValido] });
  }

  onCancelar(): void {
    this.dialogRef.close();
  }

  onIniciar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { fechaInicio, fechaFin } = this.form.getRawValue();
    this.dialogRef.close({
      solicitudId: this.data.solicitudId,
      fechaInicio,
      fechaFin,
    });
  }

  private rangoFechasValido(group: FormGroup) {
    const inicio = group.get('fechaInicio')?.value as Date | null;
    const fin = group.get('fechaFin')?.value as Date | null;
    if (inicio && fin && inicio > fin) {
      return { rangoInvalido: true };
    }
    return null;
  }
}
