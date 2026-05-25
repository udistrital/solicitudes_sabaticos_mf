import { Component, Inject, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';

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
export class IniciarSabaticoModalComponent implements OnDestroy {
  readonly form: FormGroup;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly dialogRef: MatDialogRef<IniciarSabaticoModalComponent, IniciarSabaticoModalResult | undefined>,
    @Inject(MAT_DIALOG_DATA) private readonly data: IniciarSabaticoModalData,
  ) {
    this.form = this.formBuilder.group({
      fechaInicio: [null, Validators.required],
      fechaFin: [{ value: null, disabled: true }],
    });

    this.form.get('fechaInicio')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(inicio => {
        if (inicio) {
          const fin = new Date(inicio);
          fin.setFullYear(fin.getFullYear() + 1);
          this.form.get('fechaFin')?.setValue(fin);
        } else {
          this.form.get('fechaFin')?.setValue(null);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get fechaFinFormateada(): string {
    const fecha = this.form.get('fechaFin')?.value;
    if (!fecha) return '';
    return `${fecha.getDate()}/${fecha.getMonth() + 1}/${fecha.getFullYear()}`;
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
}
