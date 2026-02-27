import { Component, Inject } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
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
  readonly cronogramaMeses = [
    { key: 'enero', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.enero' },
    { key: 'febrero', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.febrero' },
    { key: 'marzo', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.marzo' },
    { key: 'abril', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.abril' },
    { key: 'mayo', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.mayo' },
    { key: 'junio', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.junio' },
    { key: 'julio', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.julio' },
    { key: 'agosto', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.agosto' },
    { key: 'septiembre', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.septiembre' },
    { key: 'octubre', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.octubre' },
    { key: 'noviembre', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.noviembre' },
    { key: 'diciembre', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.diciembre' }
  ];
  readonly documentoOptions = [
    { key: 'avalConsejo', label: 'HISTORIAL_SOLICITUDES.modal.documentos.avalConsejo' },
    { key: 'cronogramaMensual', label: 'HISTORIAL_SOLICITUDES.modal.documentos.cronogramaMensual' },
    { key: 'presupuestoProyectado', label: 'HISTORIAL_SOLICITUDES.modal.documentos.presupuestoProyectado' },
    { key: 'certificacionLaboral', label: 'HISTORIAL_SOLICITUDES.modal.documentos.certificacionLaboral' },
    { key: 'pazSalvoAcademico', label: 'HISTORIAL_SOLICITUDES.modal.documentos.pazSalvoAcademico' },
    { key: 'pazSalvoInvestigaciones', label: 'HISTORIAL_SOLICITUDES.modal.documentos.pazSalvoInvestigaciones' },
    { key: 'pazSalvoExtension', label: 'HISTORIAL_SOLICITUDES.modal.documentos.pazSalvoExtension' },
    { key: 'pazSalvoAlmacen', label: 'HISTORIAL_SOLICITUDES.modal.documentos.pazSalvoAlmacen' },
    { key: 'pazSalvoFinanciero', label: 'HISTORIAL_SOLICITUDES.modal.documentos.pazSalvoFinanciero' },
    { key: 'financiacion', label: 'HISTORIAL_SOLICITUDES.modal.documentos.financiacion' },
    { key: 'pazSalvoConsejoFacultad', label: 'HISTORIAL_SOLICITUDES.modal.documentos.pazSalvoConsejoFacultad' },
    { key: 'otros', label: 'HISTORIAL_SOLICITUDES.modal.documentos.otros' }
  ];
  readonly documentoArchivos: Record<string, string | null> = {};
  currentStep = 0;
  readonly stepControlPaths: string[][] = [
    [
      'periodoEjecucion',
      'ultimoSabatico.start',
      'ultimoSabatico.end',
      'productoUltimo',
      'modalidad'
    ],
    ['objetivoGeneral', 'objetivosEspecificos', 'justificacion'],
    [
      'planDesarrolloInstitucional',
      'proyectoEducativoFacultad',
      'proyectoEducativoProgramas'
    ],
    ['productoEntregable', 'impactoAlcance'],
    [
      'metodologia',
      'cronograma.enero',
      'cronograma.febrero',
      'cronograma.marzo',
      'cronograma.abril',
      'cronograma.mayo',
      'cronograma.junio',
      'cronograma.julio',
      'cronograma.agosto',
      'cronograma.septiembre',
      'cronograma.octubre',
      'cronograma.noviembre',
      'cronograma.diciembre'
    ],
    ['presupuesto']
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
      justificacion: ['', Validators.required],
      planDesarrolloInstitucional: ['', Validators.required],
      proyectoEducativoFacultad: ['', Validators.required],
      proyectoEducativoProgramas: ['', Validators.required],
      productoEntregable: ['', Validators.required],
      impactoAlcance: ['', Validators.required],
      metodologia: ['', Validators.required],
      presupuesto: ['', Validators.required],
      cronograma: this.formBuilder.group({
        enero: ['', Validators.required],
        febrero: ['', Validators.required],
        marzo: ['', Validators.required],
        abril: ['', Validators.required],
        mayo: ['', Validators.required],
        junio: ['', Validators.required],
        julio: ['', Validators.required],
        agosto: ['', Validators.required],
        septiembre: ['', Validators.required],
        octubre: ['', Validators.required],
        noviembre: ['', Validators.required],
        diciembre: ['', Validators.required]
      })
    });

  }

  onCancelar(): void {
    this.dialogRef.close();
  }

  get isFirstStep(): boolean {
    return this.currentStep === 0;
  }

  get isLastStep(): boolean {
    return this.currentStep === this.stepControlPaths.length - 1;
  }

  onRegresar(): void {
    if (!this.isFirstStep) {
      this.currentStep -= 1;
    }
  }

  onSiguiente(): void {
    if (!this.isStepValid(this.currentStep)) {
      this.markStepAsTouched(this.currentStep);
      return;
    }

    if (!this.isLastStep) {
      this.currentStep += 1;
    }
  }

  onGuardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close({
      ...this.form.getRawValue(),
      documentos: this.documentoArchivos
    });
  }

  isCurrentStepValid(): boolean {
    return this.isStepValid(this.currentStep);
  }

  hasCronogramaValue(key: string): boolean {
    const value = this.form.get(`cronograma.${key}`)?.value as string | null | undefined;
    return Boolean(value && value.trim());
  }

  getDocumentoNombre(key: string): string | null {
    return this.documentoArchivos[key] ?? null;
  }

  onDocumentoChange(key: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.documentoArchivos[key] = file ? file.name : null;
  }

  trackDocumento(_: number, item: { key: string }): string {
    return item.key;
  }

  private isStepValid(step: number): boolean {
    return this.getStepControls(step).every((control) => control.valid);
  }

  private markStepAsTouched(step: number): void {
    this.getStepControls(step).forEach((control) => control.markAsTouched());
  }

  private getStepControls(step: number): AbstractControl[] {
    return this.stepControlPaths[step]
      .map((path) => this.form.get(path))
      .filter((control): control is AbstractControl => Boolean(control));
  }
}
