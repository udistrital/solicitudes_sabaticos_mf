import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatStepper } from '@angular/material/stepper';
import { concatMap, from, of, timer, toArray } from 'rxjs';
import { finalize, map, switchMap } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import Swal from 'sweetalert2';
import { PopUpManager } from '../../../managers/popUpManager';
import { LoaderService } from '../../services/loader.service';
import { ParametrosService } from '../../services/parametros.service';
import { SabaticosMidService } from '../../services/sabaticos-mid.service';
import { TercerosService } from '../../services/terceros.service';
import { NotificacionService } from '../../services/notificacion.service';

interface DocenteBasico {
  nombre: string;
  documentoIdentificacion: string;
  facultad: string;
  codigoFacultad: string;
  proyectoCurricular: string;
}

interface CrearSolicitudModalData {
  docente: DocenteBasico;
  terceroId?: number | null;
}

interface DocumentoOption {
  key: string;
  label: string;
  tipoDocumentoId?: number;
}

interface ModalidadOption {
  id: number;
  nombre: string;
}

@Component({
    selector: 'app-crear-solicitud-modal',
    templateUrl: './crear-solicitud-modal.component.html',
    styleUrl: './crear-solicitud-modal.component.scss',
    standalone: false
})
export class CrearSolicitudModalComponent implements OnInit {
  @ViewChild('stepper') stepper!: MatStepper;
  readonly form: FormGroup;
  modalidadOptions: ModalidadOption[] = [];
  cargandoModalidades = true;
  cargandoDocumentos = true;
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
  documentoOptions: DocumentoOption[] = [
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
  readonly documentoFiles: Record<string, File> = {};
  documentoSeleccionado: string | null = null;
  documentosSeleccionados: string[] = [];
  currentStep = 0;
  guardando = false;
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
    @Inject(MAT_DIALOG_DATA) private readonly data: CrearSolicitudModalData,
    private readonly tercerosService: TercerosService,
    private readonly sabaticosMidService: SabaticosMidService,
    private readonly parametrosService: ParametrosService,
    private readonly popUpManager: PopUpManager,
    private readonly translate: TranslateService,
    private readonly loaderService: LoaderService,
    private readonly notificacionService: NotificacionService,
  ) {
    this.form = this.formBuilder.group({
      docenteNombre: [{ value: data.docente.nombre, disabled: true }],
      docenteIdentificacion: [{ value: data.docente.documentoIdentificacion, disabled: true }],
      docenteFacultad: [{ value: data.docente.facultad, disabled: true }],
      docenteProyecto: [{ value: data.docente.proyectoCurricular, disabled: true }],
      docenteCodigoFacultad: [{ value: data.docente.codigoFacultad, disabled: true }],
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

  ngOnInit(): void {
    this.cargarModalidades();
    this.cargarDocumentos();
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

    if (this.guardando) {
      return;
    }

    this.guardando = true;

    const terceroId$ = this.data.terceroId
      ? of(this.data.terceroId)
      : this.obtenerTerceroId();

    terceroId$.pipe(
      switchMap((terceroId: number) => {
        const payload = {
          TerceroId: terceroId,
          TipoSolicitudId: 'NS',
          formulario: this.buildFormularioJson()
        };

        return this.sabaticosMidService.post('solicitud', payload).pipe(
          map((res: any) => ({ solicitudResponse: res, terceroId }))
        );
      }),
      switchMap(({ solicitudResponse, terceroId }) => {
        const solicitudId = solicitudResponse?.Data?.Solicitud?.Id;
        const archivos = Object.entries(this.documentoFiles || {});

        if (!solicitudId || archivos.length === 0) {
          return of(solicitudResponse);
        }

        this.loaderService.show();

        const cargasPorArchivo = archivos.map(([key, file]) => {
          const tipoDocumentoId = this.documentoOptions.find((option) => option.key === key)?.tipoDocumentoId ?? 1;
          const formData = new FormData();
          formData.append('solicitud_id', solicitudId.toString());
          formData.append('tercero_id', terceroId.toString());
          formData.append('rol_usuario', 'DOCENTE');
          formData.append('estado_soporte_solicitud', 'PEN');
          formData.append('tipo_documento_id', String(tipoDocumentoId));
          formData.append('documentos', file);
          return this.sabaticosMidService.postFileWithoutSpinner('soporte_solicitud', formData);
        });

        return from(cargasPorArchivo).pipe(
          concatMap((carga$, index) => (
            index === 0
              ? carga$
              : timer(2000).pipe(concatMap(() => carga$))
          )),
          toArray(),
          map((soportesRes: any[]) => ({ ...solicitudResponse, soporte: soportesRes })),
          finalize(() => this.loaderService.hide())
        );
      })
    ).subscribe({
      next: (response) => {
        this.guardando = false;
        this.popUpManager.showToast('HISTORIAL_SOLICITUDES.modal.guardarExitoso');

        const solicitudId = response?.Data?.Solicitud?.Id;
        const v = this.form.getRawValue();
        if (solicitudId) {
          const now = new Date();
          const fecha = now.toISOString().replace('T', ' ').substring(0, 19);
          this.notificacionService.sendNotification('sabaticos_borrador_creado', 'docente', {
            nombre_docente: v.docenteNombre ?? '',
            id_solicitud: String(solicitudId),
            fecha_solicitud: fecha,
            codigo_facultad: v.docenteCodigoFacultad ?? '',
          });
        }

        this.dialogRef.close({
          ...this.form.getRawValue(),
          documentos: this.documentoArchivos,
          respuestaServidor: response
        });
      },
      error: (error) => {
        this.guardando = false;
        this.showErrorAndReload('HISTORIAL_SOLICITUDES.modal.guardarError', error);
      }
    });
  }

  private showErrorAndReload(messageKey: string, error?: unknown): void {
    if (error !== undefined) {
      console.error('Error al crear solicitud, se recargará la página:', error);
    }

    Swal.fire({
      icon: 'error',
      title: this.translate.instant('GLOBAL.error'),
      text: this.translate.instant(messageKey),
      confirmButtonText: this.translate.instant('GLOBAL.aceptar'),
    }).then(() => {
      window.location.reload();
    });
  }

  private obtenerTerceroId() {
    const documento = this.data.docente.documentoIdentificacion;
    const endpoint = `datos_identificacion?query=Activo:true,Numero:${documento}&sortby=FechaCreacion&order=desc`;

    return this.tercerosService.get(endpoint).pipe(
      map((response: any) => {
        const registros = Array.isArray(response) ? response : [];
        if (!registros.length || !registros[0]?.TerceroId?.Id) {
          throw new Error('No se encontró el TerceroId para el documento proporcionado.');
        }
        return registros[0].TerceroId.Id as number;
      })
    );
  }

  private cargarModalidades(): void {
    this.cargandoModalidades = true;
    this.parametrosService
      .get('parametro?query=TipoParametroId__CodigoAbreviacion:MODSAB')
      .subscribe({
        next: (response: any) => {
          const datos = response?.Data ?? response ?? [];
          this.modalidadOptions = (Array.isArray(datos) ? datos : [])
            .filter((item: any) => item?.Id && item?.Nombre)
            .map((item: any) => ({ id: item.Id, nombre: item.Nombre }));
          this.cargandoModalidades = false;
        },
        error: (error) => {
          console.error('Error al cargar modalidades:', error);
          this.cargandoModalidades = false;
          this.popUpManager.showErrorToast('HISTORIAL_SOLICITUDES.modal.errorCargarModalidades');
        }
      });
  }

  private cargarDocumentos(): void {
    this.cargandoDocumentos = true;
    this.parametrosService
      .get('parametro?query=TipoParametroId__CodigoAbreviacion:DOCSOL_DOCE_SAB&limit=-1')
      .subscribe({
        next: (response: any) => {
          const datos = response?.Data ?? response ?? [];
          const opciones = (Array.isArray(datos) ? datos : [])
            .filter((item: any) => item?.Id && item?.CodigoAbreviacion && item?.Nombre)
            .map((item: any) => ({
              key: String(item.CodigoAbreviacion),
              label: String(item.Nombre),
              tipoDocumentoId: Number(item.Id)
            }));

          if (opciones.length) {
            this.documentoOptions = opciones;
          }
          this.cargandoDocumentos = false;
        },
        error: (error) => {
          console.error('Error al cargar documentos:', error);
          this.cargandoDocumentos = false;
          this.popUpManager.showErrorToast('HISTORIAL_SOLICITUDES.modal.errorCargarDocumentos');
        }
      });
  }

  private getModalidadSeleccionada(): ModalidadOption | null {
    const modalidadId = this.form.get('modalidad')?.value;
    if (!modalidadId) {
      return null;
    }
    return this.modalidadOptions.find((m) => m.id === modalidadId) ?? null;
  }

  private valueOrNull(value: unknown): string | null {
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
    return null;
  }

  private formatDate(date: Date | null): string | null {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString().split('T')[0];
  }

  private buildFormularioJson(): Record<string, unknown> {
    const v = this.form.getRawValue();
    const modalidad = this.getModalidadSeleccionada();

    return {
      plan_trabajo_ano_sabatico: {
        identificacion_docente: {
          nombre_docente: this.valueOrNull(v.docenteNombre),
          numero_identificacion: this.valueOrNull(v.docenteIdentificacion),
          facultad: this.valueOrNull(v.docenteFacultad),
          proyecto_curricular: this.valueOrNull(v.docenteProyecto),
          codigo_facultad: this.valueOrNull(v.docenteCodigoFacultad)
        },
        detalle_solicitud: {
          periodo_ejecucion: this.valueOrNull(v.periodoEjecucion),
          modalidad: modalidad?.nombre ?? null,
          modalidad_id: modalidad?.id ?? null,
          ultimo_sabatico: {
            fecha_inicio: this.formatDate(v.ultimoSabatico?.start),
            fecha_fin: this.formatDate(v.ultimoSabatico?.end),
            producto_ultimo_sabatico: this.valueOrNull(v.productoUltimo)
          }
        },
        objetivos: {
          objetivo_general: this.valueOrNull(v.objetivoGeneral),
          objetivos_especificos: this.valueOrNull(v.objetivosEspecificos)
        },
        justificacion: this.valueOrNull(v.justificacion),
        articulacion: {
          plan_desarrollo_institucional: this.valueOrNull(v.planDesarrolloInstitucional),
          proyecto_educativo_facultad: this.valueOrNull(v.proyectoEducativoFacultad),
          proyecto_educativo_programas: this.valueOrNull(v.proyectoEducativoProgramas)
        },
        producto_entregable: this.valueOrNull(v.productoEntregable),
        impacto_alcance: this.valueOrNull(v.impactoAlcance),
        metodologia: this.valueOrNull(v.metodologia),
        cronograma: {
          mes1: this.valueOrNull(v.cronograma?.mes1),
          mes2: this.valueOrNull(v.cronograma?.mes2),
          mes3: this.valueOrNull(v.cronograma?.mes3),
          mes4: this.valueOrNull(v.cronograma?.mes4),
          mes5: this.valueOrNull(v.cronograma?.mes5),
          mes6: this.valueOrNull(v.cronograma?.mes6),
          mes7: this.valueOrNull(v.cronograma?.mes7),
          mes8: this.valueOrNull(v.cronograma?.mes8),
          mes9: this.valueOrNull(v.cronograma?.mes9),
          mes10: this.valueOrNull(v.cronograma?.mes10),
          mes11: this.valueOrNull(v.cronograma?.mes11),
          mes12: this.valueOrNull(v.cronograma?.mes12)
        },
        presupuesto: this.valueOrNull(v.presupuesto),
        observaciones: null
      }
    };
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
    delete this.documentoFiles[key];
  }

  getDocumentoNombre(key: string): string | null {
    return this.documentoArchivos[key] ?? null;
  }

  onDocumentoChange(key: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file && !this.isPdfFile(file)) {
      this.popUpManager.showErrorAlert(
        this.translate.instant('HISTORIAL_SOLICITUDES.modal.documentos.errorSoloPdf')
      );
      input.value = '';
      return;
    }

    this.documentoArchivos[key] = file ? file.name : null;
    if (file) {
      this.documentoFiles[key] = file;
    } else {
      delete this.documentoFiles[key];
    }
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

  private isPdfFile(file: File): boolean {
    const fileName = file.name.toLowerCase();
    const isPdfByExtension = fileName.endsWith('.pdf');
    const isPdfByMime = file.type === 'application/pdf';
    return isPdfByExtension || isPdfByMime;
  }
}
