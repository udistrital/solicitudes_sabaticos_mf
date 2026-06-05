import { Component, DestroyRef, OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PopUpManager } from '../../../managers/popUpManager';
import { GestorDocumentalService } from '../../services/gestor-documental.service';
import { ImplicitAutenticationService } from '../../services/implicit_authentication.service';
import { SabaticosCrudService } from '../../services/sabatico-crud.service';
import { SabaticosMidService } from '../../services/sabaticos-mid.service';
import { TercerosService } from '../../services/terceros.service';

export interface SabaticoSeleccionado {
  id: string;
  fechaInicio: string;
  fechaFinal: string;
  estadoSabatico: string;
}

interface ArchivoBackend {
  documentoId?: number;
  nombre: string;
  soporte?: any;
}

interface DocumentoDetalle {
  key: string;
  label: string;
  archivo?: File | null;
  archivoBackend?: ArchivoBackend | null;
}

type DocumentoConArchivo = DocumentoDetalle & { archivo: File };

interface CrearSolicitudFormulario {
  [key: string]: unknown;
}

interface FormularioSolicitudBody {
  Id: number;
  Contenido: string;
  Activo: true;
  FechaModificacion: string;
  FechaCreacion: string;
  SolicitudId: { Id: number };
}

interface RadicarBody {
  Id: number;
  SolicitudId: number;
  DocumentosId: number[];
  FormularioId: number;
  FechaCreacion: string;
  Formulario: CrearSolicitudFormulario;
}

interface AprobarRechazarBody {
  TerceroId: number;
  SolicitudId: number;
  Justificacion: string;
  EstadoSolicitud: string;
  EstadoSoporte?: string;
}

interface TransicionRol {
  origen: string;
  endpoint: 'radicar' | 'aprobar-rechazar';
  estadoDestino?: string;
  estadoSoporte?: string;
}

type TipoSolicitudPermitida = 'SUSPENSION' | 'MODIFICACION';
type RolPermitido = 'DOCENTE' | 'SECRETARIA_ACADEMICA' | 'SECRETARIA_GENERAL';

interface ContenidoSolicitud {
  sabatico?: Partial<SabaticoSeleccionado> | null;
  documentos?: Array<{ label?: string;[key: string]: unknown }> | null;
  justificacion?: string | null;
  tipoSolicitud?: string | null;
  respuestaSolicitud?: string | null;
  [key: string]: unknown;
}

interface NavigationState {
  sabatico?: SabaticoSeleccionado;
  solicitud?: {
    id?: string | number;
    tipoSolicitud?: string;
    estado?: string;
    [key: string]: unknown;
  };
  tipoSolicitud?: string;
  readOnly?: boolean;
  rol?: string;
}

@Component({
  selector: 'app-solicitud-sabatico',
  templateUrl: './solicitud-sabatico.component.html',
  styleUrl: './solicitud-sabatico.component.scss',
  standalone: false
})
export class SolicitudSabaticoComponent implements OnDestroy {
  form: FormGroup;
  enviando = false;
  cargando = false;
  sabaticoSeleccionado: SabaticoSeleccionado | null = null;
  isReadOnly = false;
  tipoSolicitudBloqueado = false;
  formularioRecordId: number | null = null;
  solicitudIdActual: number | null = null;
  rol = '';
  estadoActual = '';
  private terceroIdSolicitud: number | null = null;

  nombreDocumento = '';
  documentosSeleccionadosDetalle: DocumentoDetalle[] = [];

  // Soportes asociados a la solicitud: existentes (ya en backend al cargar) y
  // nuevos (subidos durante el envío). Se concatenan en el body de `radicar`.
  private documentosExistentesIds: number[] = [];
  private documentosNuevosIds: number[] = [];

  // URLs de blobs en memoria (archivos locales o documentos del backend ya
  // descargados). Se mantienen por `key` para reusarlos en cada apertura y
  // liberarlos al destruir el componente.
  documentoObjectUrls: Record<string, string> = {};
  documentosCargando: Record<string, boolean> = {};

  private datosExtraContenido: Record<string, unknown> = {};

  // Mapa rol -> transición permitida desde el estado actual. Solo un único
  // disparo de "Enviar a revisión" por rol en todo el flujo (lineal puro,
  // sin contemplar subsanaciones).
  private readonly transicionesPorRol: Record<RolPermitido, TransicionRol> = {
    DOCENTE: {
      origen: 'Borrador',
      endpoint: 'radicar',
    },
    SECRETARIA_ACADEMICA: {
      origen: 'Radicada / Enviada a SA',
      endpoint: 'aprobar-rechazar',
      estadoDestino: 'ENVIADA_SG',
      estadoSoporte: 'SG_PENDIENTE_REVISION_SG',
    },
    SECRETARIA_GENERAL: {
      origen: 'Enviada a SG',
      endpoint: 'aprobar-rechazar',
      estadoDestino: 'FINALIZADA_APROBADA_RESOLUCION',
    },
  };

  constructor(
    private readonly fb: FormBuilder,
    private readonly translate: TranslateService,
    private readonly router: Router,
    private readonly popUpManager: PopUpManager,
    private readonly sabaticosCrudService: SabaticosCrudService,
    private readonly sabaticosMidService: SabaticosMidService,
    private readonly tercerosService: TercerosService,
    private readonly autenticationService: ImplicitAutenticationService,
    private readonly gestorDocumentalService: GestorDocumentalService,
    private readonly destroyRef: DestroyRef,
  ) {
    this.form = this.buildForm();

    const navigationState = this.resolveNavigationState();
    this.sabaticoSeleccionado = navigationState?.sabatico ?? null;
    this.isReadOnly = Boolean(navigationState?.readOnly);
    this.rol = String(navigationState?.rol ?? '');
    this.estadoActual = String(navigationState?.solicitud?.estado ?? '');

    const tipoPredeterminado = this.normalizarTipoSolicitud(
      navigationState?.tipoSolicitud ?? navigationState?.solicitud?.tipoSolicitud
    );
    if (tipoPredeterminado) {
      this.form.patchValue({ tipoSolicitud: tipoPredeterminado });
      this.form.controls['tipoSolicitud'].disable();
      this.tipoSolicitudBloqueado = true;
    }

    if (this.isReadOnly) {
      this.form.disable();
    } else if (this.esRolSecretaria) {
      this.aplicarBloqueoSecretaria();
    }

    const solicitudIdRaw = navigationState?.solicitud?.id;
    const solicitudId = Number(solicitudIdRaw);
    if (Number.isFinite(solicitudId) && solicitudId > 0) {
      this.solicitudIdActual = solicitudId;
      this.cargarDatosSolicitud(solicitudId);
    }
  }

  get esRolSecretaria(): boolean {
    return this.rol === 'SECRETARIA_ACADEMICA' || this.rol === 'SECRETARIA_GENERAL';
  }

  get puedeSolicitar(): boolean {
    return !this.isReadOnly && !this.esRolSecretaria && !this.cargando;
  }

  get canEnviarRevision(): boolean {
    if (this.isReadOnly || this.cargando || this.enviando) {
      return false;
    }
    if (!this.solicitudIdActual || this.form.invalid) {
      return false;
    }
    const transicion = this.transicionesPorRol[this.rol as RolPermitido];
    return !!transicion && this.estadoActual === transicion.origen;
  }

  get canRechazar(): boolean {
    if (this.isReadOnly || this.cargando || this.enviando) {
      return false;
    }
    if (!this.solicitudIdActual || !this.esRolSecretaria) {
      return false;
    }
    const respuesta = String(this.form.get('respuestaSolicitud')?.value ?? '').trim();
    return respuesta.length > 0;
  }

  private resolveNavigationState(): NavigationState | null {
    const fromNavigation = this.router.getCurrentNavigation()?.extras?.state as
      | NavigationState
      | undefined;

    if (fromNavigation) {
      return fromNavigation;
    }

    if (typeof history !== 'undefined') {
      return (history.state as NavigationState) ?? null;
    }

    return null;
  }

  private cargarDatosSolicitud(solicitudId: number): void {
    this.cargando = true;

    forkJoin({
      formularioResponse: this.sabaticosCrudService.get(
        `formulario_solicitud?query=SolicitudId:${solicitudId},Activo:True&limit=-1`
      ),
      documentosResponse: this.sabaticosCrudService.get(
        `soporte_solicitud?query=SolicitudId:${solicitudId},Activo:True&limit=-1`
      ),
      documentosNombreResponse: this.sabaticosMidService
        .get(`soporte_solicitud/${solicitudId}`)
        .pipe(catchError(() => of(null))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ formularioResponse, documentosResponse, documentosNombreResponse }: any) => {
          const formularios = formularioResponse?.Data ?? formularioResponse ?? [];
          const formularioRaw = Array.isArray(formularios) && formularios.length > 0
            ? formularios[0]
            : null;

          if (formularioRaw) {
            this.formularioRecordId = formularioRaw?.Id ?? null;
            const terceroRaw = Number(formularioRaw?.SolicitudId?.TerceroId);
            this.terceroIdSolicitud = Number.isFinite(terceroRaw) && terceroRaw > 0
              ? terceroRaw
              : null;
            const contenido = this.parseContenido(formularioRaw?.Contenido);
            this.aplicarContenido(contenido);
          }

          const soportes = Array.isArray(documentosResponse?.Data)
            ? documentosResponse.Data
            : Array.isArray(documentosResponse)
              ? documentosResponse
              : [];
          const nombresPorDocumentoId = this.construirMapaNombresDocumentos(documentosNombreResponse);
          this.aplicarSoportes(soportes, nombresPorDocumentoId);

          // Reaplicamos el bloqueo por readOnly al final por si los patchValue
          // habilitaron controles previamente deshabilitados.
          if (this.isReadOnly) {
            this.form.disable();
          } else if (this.esRolSecretaria) {
            this.aplicarBloqueoSecretaria();
          } else if (this.tipoSolicitudBloqueado) {
            this.form.controls['tipoSolicitud'].disable();
          }

          this.cargando = false;
        },
        error: (error) => {
          console.error('Error al cargar la solicitud de Suspensión/Modificación', error);
          this.cargando = false;
        }
      });
  }

  private parseContenido(contenido: unknown): ContenidoSolicitud | null {
    if (!contenido) {
      return null;
    }

    try {
      return typeof contenido === 'string'
        ? (JSON.parse(contenido) as ContenidoSolicitud)
        : (contenido as ContenidoSolicitud);
    } catch (error) {
      console.error('Error al parsear Contenido del formulario_solicitud', error);
      return null;
    }
  }

  private static readonly CAMPOS_GESTIONADOS: ReadonlySet<string> = new Set([
    'sabatico', 'documentos', 'justificacion', 'tipoSolicitud', 'respuestaSolicitud',
  ]);

  private aplicarContenido(contenido: ContenidoSolicitud | null): void {
    if (!contenido) {
      return;
    }

    this.datosExtraContenido = {};
    for (const key of Object.keys(contenido)) {
      if (!SolicitudSabaticoComponent.CAMPOS_GESTIONADOS.has(key)) {
        this.datosExtraContenido[key] = contenido[key];
      }
    }

    if (contenido.sabatico) {
      this.sabaticoSeleccionado = {
        id: this.toStringSafe(contenido.sabatico.id),
        fechaInicio: this.toStringSafe(contenido.sabatico.fechaInicio),
        fechaFinal: this.toStringSafe(contenido.sabatico.fechaFinal),
        estadoSabatico: this.toStringSafe(contenido.sabatico.estadoSabatico),
      };
    }

    const tipoNormalizado = this.normalizarTipoSolicitud(contenido.tipoSolicitud);
    if (tipoNormalizado) {
      this.form.controls['tipoSolicitud'].enable({ emitEvent: false });
      this.form.patchValue({ tipoSolicitud: tipoNormalizado }, { emitEvent: false });
      this.form.controls['tipoSolicitud'].disable({ emitEvent: false });
      this.tipoSolicitudBloqueado = true;
    }

    this.form.patchValue({
      justificacion: contenido.justificacion ?? '',
      respuestaSolicitud: contenido.respuestaSolicitud ?? '',
    }, { emitEvent: false });

    if (Array.isArray(contenido.documentos)) {
      this.documentosSeleccionadosDetalle = contenido.documentos.map((doc) => ({
        key: this.generarKeyDocumento(),
        label: this.toStringSafe(doc?.label),
        archivo: null,
        archivoBackend: null,
      }));
    }
  }

  // Construye un mapa DocumentoId -> Nombre real a partir de la respuesta del
  // MID (`soporte_solicitud/{idSolicitud}`), que devuelve cada documento dentro
  // de la propiedad `Documento`.
  private construirMapaNombresDocumentos(respuesta: any): Map<number, string> {
    const mapa = new Map<number, string>();
    const data = Array.isArray(respuesta?.Data) ? respuesta.Data : [];

    data.forEach((item: any) => {
      const documento = item?.Documento ?? item;
      const documentoId = Number(documento?.Id);
      const nombre = this.toStringSafe(documento?.Nombre).trim();
      if (Number.isFinite(documentoId) && documentoId > 0 && nombre) {
        mapa.set(documentoId, nombre);
      }
    });

    return mapa;
  }

  private aplicarSoportes(soportes: any[], nombresPorDocumentoId?: Map<number, string>): void {
    if (!Array.isArray(soportes) || soportes.length === 0) {
      this.documentosExistentesIds = [];
      return;
    }

    const idsRecolectados: number[] = [];
    const nombres = nombresPorDocumentoId ?? new Map<number, string>();

    // Los soportes del backend se asocian por orden con los documentos cargados
    // desde el Contenido. Si llegan más soportes que documentos declarados, los
    // adicionales se anexan al final como "Documento adjunto" para no perderlos.
    soportes.forEach((soporte, index) => {
      const soporteId = Number(soporte?.Id);
      const documentoId = Number(soporte?.DocumentoId);
      const documentoIdValido = Number.isFinite(documentoId) && documentoId > 0;
      const nombreReal = documentoIdValido ? nombres.get(documentoId) : undefined;
      const archivoBackend: ArchivoBackend = {
        documentoId: documentoIdValido ? documentoId : undefined,
        nombre: nombreReal ?? this.translate.instant('CREAR_SOLICITUD.documentos.archivoBackend'),
        soporte,
      };

      if (Number.isFinite(soporteId) && soporteId > 0) {
        idsRecolectados.push(soporteId);
      }

      if (index < this.documentosSeleccionadosDetalle.length) {
        this.documentosSeleccionadosDetalle[index].archivoBackend = archivoBackend;
      } else {
        this.documentosSeleccionadosDetalle.push({
          key: this.generarKeyDocumento(),
          label: '',
          archivo: null,
          archivoBackend,
        });
      }
    });

    this.documentosExistentesIds = idsRecolectados;
  }

  documentoTieneArchivo(documento: DocumentoDetalle): boolean {
    return !!documento.archivo || !!documento.archivoBackend;
  }

  nombreArchivoDocumento(documento: DocumentoDetalle): string {
    if (documento.archivo?.name) {
      return documento.archivo.name;
    }
    if (documento.archivoBackend?.nombre) {
      return documento.archivoBackend.nombre;
    }
    return this.translate.instant('CREAR_SOLICITUD.documentos.sinArchivo');
  }

  async onEnviarRevision(): Promise<void> {
    if (!this.canEnviarRevision) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const transicion = this.transicionesPorRol[this.rol as RolPermitido];
    if (!transicion) {
      return;
    }

    const confirm = await this.popUpManager.showConfirmAlert(
      this.translate.instant('CREAR_SOLICITUD.actions.confirmEnvioText'),
      this.translate.instant('CREAR_SOLICITUD.actions.confirmEnvioTitle'),
    );

    if (!confirm?.isConfirmed) {
      return;
    }

    this.enviando = true;

    try {
      const terceroId = transicion.endpoint === 'aprobar-rechazar'
        ? this.terceroIdSolicitud
        : await this.resolveTerceroId();

      if (terceroId === null) {
        this.popUpManager.showErrorAlert(
          this.translate.instant('CREAR_SOLICITUD.errores.terceroNoEncontrado'),
        );
        return;
      }

      const solicitudId = this.solicitudIdActual as number;

      // 1) Subir soportes nuevos (PDFs locales) con el rol que está actuando.
      const { idsSubidos, fallidos } = await this.subirSoportesSecuencial(
        solicitudId,
        terceroId,
        this.rol,
      );
      this.documentosNuevosIds = [...this.documentosNuevosIds, ...idsSubidos];

      if (fallidos.length > 0) {
        this.popUpManager.showErrorAlert(
          this.translate.instant('CREAR_SOLICITUD.errores.documentosFallidos', {
            documentos: fallidos.join(', '),
          }),
        );
        return;
      }

      // 2) Persistir el formulario_solicitud (Contenido actualizado).
      if (this.formularioRecordId !== null) {
        const formularioBody: FormularioSolicitudBody = {
          Id: this.formularioRecordId,
          Contenido: JSON.stringify(this.buildFormularioPayload()),
          Activo: true,
          FechaModificacion: this.formatTimestampForBackend(),
          FechaCreacion: this.formatTimestampForBackend(),
          SolicitudId: { Id: solicitudId },
        };

        await firstValueFrom(
          this.sabaticosCrudService
            .put('formulario_solicitud', formularioBody)
            .pipe(takeUntilDestroyed(this.destroyRef)),
        );
      }

      // 3) Disparar la transición de estado vía MID según rol.
      await this.dispararTransicionMid(transicion, solicitudId, terceroId);

      this.popUpManager.showSuccessAlert(
        this.translate.instant('CREAR_SOLICITUD.exito.envioRevisionExitoso'),
      );
      this.router.navigate(['/solicitudes']);
    } catch (error) {
      console.error('Error al enviar la solicitud a revisión', error);
      this.popUpManager.showErrorAlert(
        this.translate.instant('CREAR_SOLICITUD.errores.envioRevisionFallido'),
      );
    } finally {
      this.enviando = false;
    }
  }

  async onRechazarSolicitud(): Promise<void> {
    if (!this.canRechazar) {
      return;
    }

    const confirm = await this.popUpManager.showConfirmAlert(
      this.translate.instant('CREAR_SOLICITUD.actions.confirmRechazarSolicitud'),
      this.translate.instant('CREAR_SOLICITUD.actions.confirmRechazarSolicitudTitle'),
    );

    if (!confirm?.isConfirmed) {
      return;
    }

    this.enviando = true;

    try {
      const solicitudId = this.solicitudIdActual as number;
      const terceroId = this.terceroIdSolicitud;

      if (terceroId === null) {
        this.popUpManager.showErrorAlert(
          this.translate.instant('CREAR_SOLICITUD.errores.terceroNoEncontrado'),
        );
        return;
      }

      // Persistir el formulario_solicitud (Contenido actualizado) antes de
      // disparar la transición de rechazo.
      if (this.formularioRecordId !== null) {
        const formularioBody: FormularioSolicitudBody = {
          Id: this.formularioRecordId,
          Contenido: JSON.stringify(this.buildFormularioPayload()),
          Activo: true,
          FechaModificacion: this.formatTimestampForBackend(),
          FechaCreacion: this.formatTimestampForBackend(),
          SolicitudId: { Id: solicitudId },
        };

        await firstValueFrom(
          this.sabaticosCrudService
            .put('formulario_solicitud', formularioBody)
            .pipe(takeUntilDestroyed(this.destroyRef)),
        );
      }

      const body: AprobarRechazarBody = {
        TerceroId: terceroId,
        SolicitudId: solicitudId,
        Justificacion: String(this.form.get('respuestaSolicitud')?.value ?? ''),
        EstadoSolicitud: 'FINALIZADA_NO_APROBADA',
      };

      await firstValueFrom(
        this.sabaticosMidService
          .post('solicitud/aprobar-rechazar', body)
          .pipe(takeUntilDestroyed(this.destroyRef)),
      );

      this.popUpManager.showSuccessAlert(
        this.translate.instant('CREAR_SOLICITUD.exito.rechazoExitoso'),
      );
      this.router.navigate(['/solicitudes']);
    } catch (error) {
      console.error('Error al rechazar la solicitud', error);
      this.popUpManager.showErrorAlert(
        this.translate.instant('CREAR_SOLICITUD.errores.rechazoFallido'),
      );
    } finally {
      this.enviando = false;
    }
  }

  private async dispararTransicionMid(
    transicion: TransicionRol,
    solicitudId: number,
    terceroId: number,
  ): Promise<void> {
    if (transicion.endpoint === 'radicar') {
      const body: RadicarBody = {
        Id: solicitudId,
        SolicitudId: solicitudId,
        DocumentosId: [
          ...new Set([...this.documentosExistentesIds, ...this.documentosNuevosIds]),
        ],
        FormularioId: this.formularioRecordId ?? 0,
        FechaCreacion: this.formatTimestampForBackend(),
        Formulario: this.buildFormularioPayload(),
      };

      await firstValueFrom(
        this.sabaticosMidService
          .post(`solicitud/radicar/${solicitudId}`, body)
          .pipe(takeUntilDestroyed(this.destroyRef)),
      );
      return;
    }

    const body: AprobarRechazarBody = {
      TerceroId: terceroId,
      SolicitudId: solicitudId,
      Justificacion: String(this.form.get('respuestaSolicitud')?.value ?? ''),
      EstadoSolicitud: transicion.estadoDestino ?? '',
    };
    if (transicion.estadoSoporte) {
      body.EstadoSoporte = transicion.estadoSoporte;
    }

    await firstValueFrom(
      this.sabaticosMidService
        .post('solicitud/aprobar-rechazar', body)
        .pipe(takeUntilDestroyed(this.destroyRef)),
    );
  }

  onAgregarDocumento(): void {
    if (!this.puedeSolicitar) {
      return;
    }

    const nombre = this.nombreDocumento.trim();
    if (!nombre) {
      return;
    }

    const yaExiste = this.documentosSeleccionadosDetalle.some(
      doc => doc.label.toLowerCase() === nombre.toLowerCase(),
    );
    if (yaExiste) {
      return;
    }

    this.documentosSeleccionadosDetalle.push({
      key: this.generarKeyDocumento(),
      label: nombre,
      archivo: null,
    });

    this.nombreDocumento = '';
  }

  onDocumentoChange(key: string, event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files?.length) {
      return;
    }

    const archivo = input.files[0];
    const documento = this.documentosSeleccionadosDetalle.find(doc => doc.key === key);

    if (!documento) {
      input.value = '';
      return;
    }

    documento.archivo = archivo;

    if (this.documentoObjectUrls[key]) {
      URL.revokeObjectURL(this.documentoObjectUrls[key]);
    }
    this.documentoObjectUrls[key] = URL.createObjectURL(archivo);

    input.value = '';
  }

  onEliminarDocumento(key: string): void {
    const documento = this.documentosSeleccionadosDetalle.find(doc => doc.key === key);
    if (!documento) {
      return;
    }

    const titulo = this.translate.instant('CREAR_SOLICITUD.documentos.confirmEliminarTitle');
    const texto = this.translate.instant(
      'CREAR_SOLICITUD.documentos.confirmEliminarText',
      { nombre: documento.label },
    );

    this.popUpManager.showConfirmAlert(texto, titulo).then((result) => {
      if (!result?.isConfirmed) {
        return;
      }

      this.documentosSeleccionadosDetalle = this.documentosSeleccionadosDetalle.filter(
        doc => doc.key !== key,
      );

      if (this.documentoObjectUrls[key]) {
        URL.revokeObjectURL(this.documentoObjectUrls[key]);
        delete this.documentoObjectUrls[key];
      }
      delete this.documentosCargando[key];
    });
  }

  canPrevisualizarDocumento(documento: DocumentoDetalle): boolean {
    if (!documento) {
      return false;
    }
    return Boolean(documento.archivo)
      || Boolean(this.documentoObjectUrls[documento.key])
      || Boolean(documento.archivoBackend?.documentoId);
  }

  onPrevisualizarDocumento(key: string): void {
    const documento = this.documentosSeleccionadosDetalle.find(doc => doc.key === key);
    if (!documento) {
      return;
    }

    const cachedUrl = this.documentoObjectUrls[key];
    if (cachedUrl) {
      window.open(cachedUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    const documentoId = documento.archivoBackend?.documentoId;
    if (!documentoId) {
      this.popUpManager.showAlert(
        this.translate.instant('CREAR_SOLICITUD.documentos.noPreviewTitle'),
        this.translate.instant('CREAR_SOLICITUD.documentos.noPreviewText')
      );
      return;
    }

    if (this.documentosCargando[key]) {
      return;
    }

    this.documentosCargando[key] = true;

    this.gestorDocumentalService.getDocumentoById(documentoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (nuxeoDoc) => {
          this.documentosCargando[key] = false;

          if (!nuxeoDoc) {
            this.popUpManager.showErrorAlert(
              this.translate.instant('CREAR_SOLICITUD.documentos.noPreviewText')
            );
            return;
          }

          const nombre = nuxeoDoc.Nombre ?? nuxeoDoc.Nuxeo?.['dc:title'];
          if (nombre && documento.archivoBackend) {
            documento.archivoBackend = { ...documento.archivoBackend, nombre };
          }

          const blobUrl = this.gestorDocumentalService.getBlobUrlFromDocumento(nuxeoDoc);
          if (blobUrl) {
            this.documentoObjectUrls[key] = blobUrl;
            window.open(blobUrl, '_blank', 'noopener,noreferrer');
          } else {
            this.popUpManager.showErrorAlert(
              this.translate.instant('CREAR_SOLICITUD.documentos.noPreviewText')
            );
          }
        },
        error: () => {
          this.documentosCargando[key] = false;
          this.popUpManager.showErrorAlert(
            this.translate.instant('CREAR_SOLICITUD.documentos.noPreviewText')
          );
        }
      });
  }

  ngOnDestroy(): void {
    Object.values(this.documentoObjectUrls).forEach((url) => {
      if (url?.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    this.documentoObjectUrls = {};
  }

  trackDocumento(_: number, item: DocumentoDetalle): string {
    return item.key;
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      tipoSolicitud: ['', Validators.required],
      justificacion: ['', [Validators.required, Validators.maxLength(1000)]],
      respuestaSolicitud: ['', Validators.maxLength(1000)],
    });
  }

  private aplicarBloqueoSecretaria(): void {
    this.form.disable({ emitEvent: false });
    this.form.controls['respuestaSolicitud'].enable({ emitEvent: false });
  }

  private buildFormularioPayload(): CrearSolicitudFormulario {
    const { tipoSolicitud, justificacion, respuestaSolicitud } = this.form.getRawValue();

    const sabatico = this.sabaticoSeleccionado
      ? {
          id: this.toNullable(this.sabaticoSeleccionado.id),
          fechaInicio: this.toIsoDate(this.sabaticoSeleccionado.fechaInicio),
          fechaFinal: this.toIsoDate(this.sabaticoSeleccionado.fechaFinal),
          estadoSabatico: this.toNullable(this.sabaticoSeleccionado.estadoSabatico),
        }
      : null;

    return {
      ...this.datosExtraContenido,
      tipoSolicitud: this.toNullable(tipoSolicitud),
      justificacion: this.toNullable(justificacion),
      respuestaSolicitud: this.toNullable(respuestaSolicitud),
      sabatico,
      documentos: this.documentosSeleccionadosDetalle.map((doc) => ({ label: doc.label })),
    };
  }

  // Sube secuencialmente los PDFs adjuntos al endpoint `soporte_solicitud`
  // usando el rol que está actuando (`rol_usuario`). Pausa 2s entre cargas
  // (sin pausa antes de la primera ni después de la última) según contrato
  // del microservicio. Retorna los IDs de los soportes creados y los labels
  // que fallaron para que el caller decida cómo informar al usuario.
  private async subirSoportesSecuencial(
    solicitudId: number,
    terceroId: number,
    rolUsuario: string,
  ): Promise<{ idsSubidos: number[]; fallidos: string[] }> {
    const pdfs: DocumentoConArchivo[] = this.documentosSeleccionadosDetalle.filter(
      (doc): doc is DocumentoConArchivo => !!doc.archivo && this.esArchivoPdf(doc.archivo),
    );

    if (pdfs.length === 0) {
      return { idsSubidos: [], fallidos: [] };
    }

    const idsSubidos: number[] = [];
    const fallidos: string[] = [];

    for (let i = 0; i < pdfs.length; i++) {
      const documento = pdfs[i];
      const formData = new FormData();
      formData.append('solicitud_id', String(solicitudId));
      formData.append('tercero_id', String(terceroId));
      formData.append('rol_usuario', rolUsuario);
      formData.append('estado_soporte_solicitud', 'PEN');
      formData.append('documentos', documento.archivo);

      try {
        const response: any = await firstValueFrom(
          this.sabaticosMidService.postFile('soporte_solicitud', formData),
        );

        const nuevosIds = Array.isArray(response?.Data?.documentos)
          ? response.Data.documentos
            .map((doc: any) => Number(doc?.Id))
            .filter((id: number) => Number.isFinite(id) && id > 0)
          : [];
        idsSubidos.push(...nuevosIds);
      } catch (error) {
        console.error(`Error al cargar el documento "${documento.label}"`, error);
        fallidos.push(documento.label);
      }

      if (i < pdfs.length - 1) {
        await this.sleep(2000);
      }
    }

    return { idsSubidos, fallidos };
  }

  // Resuelve el TerceroId del docente autenticado a partir del documento expuesto
  // por `ImplicitAutenticationService`. Devuelve `null` si no se obtiene un valor
  // válido, para que el llamador decida cómo informar.
  private async resolveTerceroId(): Promise<number | null> {
    try {
      const documentoRaw = await this.autenticationService.getDocument();
      const documento = String(documentoRaw ?? '').trim();
      if (!documento) {
        return null;
      }

      const endpoint =
        `datos_identificacion?query=Activo:true,Numero:${encodeURIComponent(documento)}` +
        `&sortby=FechaCreacion&order=desc`;

      const response: any = await firstValueFrom(this.tercerosService.get(endpoint));
      const data = response?.Data ?? response ?? [];

      if (!Array.isArray(data) || data.length === 0) {
        return null;
      }

      const terceroId = Number(data[0]?.TerceroId?.Id);
      return Number.isFinite(terceroId) && terceroId > 0 ? terceroId : null;
    } catch (error) {
      console.error('Error al resolver el TerceroId del docente', error);
      return null;
    }
  }

  // Acepta tanto los códigos internos (`SUSPENSION`/`MODIFICACION`) como los
  // nombres legibles que devuelve la API (`Suspensión`/`Modificación`).
  private normalizarTipoSolicitud(valor: string | null | undefined): TipoSolicitudPermitida | null {
    if (!valor) {
      return null;
    }

    const normalizado = String(valor).trim().toLowerCase();
    if (normalizado === 'suspension' || normalizado === 'suspensión') {
      return 'SUSPENSION';
    }
    if (normalizado === 'modificacion' || normalizado === 'modificación') {
      return 'MODIFICACION';
    }
    return null;
  }

  private toNullable(value: string | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const trimmed = String(value).trim();
    return trimmed === '' ? null : trimmed;
  }

  private toStringSafe(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  }

  // Devuelve únicamente la parte `YYYY-MM-DD` de un valor de fecha,
  // ignorando cualquier sufijo de hora o zona horaria.
  private toIsoDate(fechaRaw: string | null | undefined): string | null {
    if (!fechaRaw) {
      return null;
    }

    const match = fechaRaw.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  }

  private esArchivoPdf(archivo: File): boolean {
    if (archivo.type === 'application/pdf') {
      return true;
    }
    return archivo.name.toLowerCase().endsWith('.pdf');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Formato `YYYY-MM-DD HH:mm:ss` requerido por el backend para los campos
  // FechaCreacion / FechaModificacion. Mantiene la zona horaria local.
  private formatTimestampForBackend(date: Date = new Date()): string {
    const pad = (value: number): string => String(value).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  // `crypto.randomUUID` no existe en navegadores antiguos ni en algunos
  // entornos de prueba; este helper devuelve un identificador único válido.
  private generarKeyDocumento(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
