import { Component, Inject, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatStepper } from '@angular/material/stepper';

interface DocenteBasico {
  nombre: string;
  documentoIdentificacion: string;
  facultad: string;
  proyectoCurricular: string;
}

interface CrearSolicitudModalData {
  docente: DocenteBasico;
}

interface DocumentoOption {
  key: string;
  label: string;
}

@Component({
  selector: 'app-crear-solicitud-modal',
  templateUrl: './crear-solicitud-modal.component.html',
  styleUrl: './crear-solicitud-modal.component.scss'
})
export class CrearSolicitudModalComponent {
  @ViewChild('stepper') stepper!: MatStepper;
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
    { key: 'mes1', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.mes1' },
    { key: 'mes2', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.mes2' },
    { key: 'mes3', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.mes3' },
    { key: 'mes4', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.mes4' },
    { key: 'mes5', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.mes5' },
    { key: 'mes6', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.mes6' },
    { key: 'mes7', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.mes7' },
    { key: 'mes8', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.mes8' },
    { key: 'mes9', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.mes9' },
    { key: 'mes10', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.mes10' },
    { key: 'mes11', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.mes11' },
    { key: 'mes12', label: 'HISTORIAL_SOLICITUDES.modal.cronograma.mes12' }
  ];
  readonly documentoOptions: DocumentoOption[] = [
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
  documentoSeleccionado: string | null = null;
  documentosSeleccionados: string[] = [];
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
      'cronograma.mes1',
      'cronograma.mes2',
      'cronograma.mes3',
      'cronograma.mes4',
      'cronograma.mes5',
      'cronograma.mes6',
      'cronograma.mes7',
      'cronograma.mes8',
      'cronograma.mes9',
      'cronograma.mes10',
      'cronograma.mes11',
      'cronograma.mes12'
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
      this.stepper.selectedIndex = this.currentStep;
    }
  }

  onSiguiente(): void {
    if (!this.isStepValid(this.currentStep)) {
      this.markStepAsTouched(this.currentStep);
      return;
    }

    if (!this.isLastStep) {
      this.currentStep += 1;
      this.stepper.selectedIndex = this.currentStep;
    }
  }

  onGuardar(): void {
    if (!this.areStepsValidUpTo(this.currentStep)) {
      this.markStepAsTouched(this.currentStep);
      return;
    }

    this.dialogRef.close({
      ...this.form.getRawValue(),
      documentos: this.documentoArchivos
    });
  }

  areStepsValidUpTo(step: number): boolean {
    for (let i = 0; i <= step; i++) {
      if (!this.isStepValid(i)) {
        return false;
      }
    }
    return true;
  }

  isCurrentStepValid(): boolean {
    return this.isStepValid(this.currentStep);
  }

  hasCronogramaValue(key: string): boolean {
    const value = this.form.get(`cronograma.${key}`)?.value as string | null | undefined;
    return Boolean(value && value.trim());
  }

  get documentosDisponibles(): DocumentoOption[] {
    return this.documentoOptions.filter(
      (documento) => !this.documentosSeleccionados.includes(documento.key)
    );
  }

  get documentosSeleccionadosDetalle(): DocumentoOption[] {
    return this.documentosSeleccionados
      .map((key) => this.documentoOptions.find((documento) => documento.key === key))
      .filter((documento): documento is DocumentoOption => Boolean(documento));
  }

  onAgregarDocumento(): void {
    if (!this.documentoSeleccionado) {
      return;
    }

    if (!this.documentosSeleccionados.includes(this.documentoSeleccionado)) {
      this.documentosSeleccionados = [
        ...this.documentosSeleccionados,
        this.documentoSeleccionado
      ];
      if (!(this.documentoSeleccionado in this.documentoArchivos)) {
        this.documentoArchivos[this.documentoSeleccionado] = null;
      }
    }

    this.documentoSeleccionado = null;
  }

  onEliminarDocumento(key: string): void {
    this.documentosSeleccionados = this.documentosSeleccionados.filter(
      (documento) => documento !== key
    );
    delete this.documentoArchivos[key];
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
