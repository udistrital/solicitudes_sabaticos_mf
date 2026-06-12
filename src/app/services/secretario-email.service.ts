import { Injectable } from '@angular/core';
import { RequestManager } from '../../managers/requestManager';
import { Observable, throwError } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class SecretarioEmailService {
  constructor(private readonly requestManager: RequestManager) {}

  getSecretaryDocument(codigoFacultad: string): Observable<string> {
    if (!codigoFacultad || codigoFacultad.trim() === '') {
      return throwError(() => new Error('codigoFacultad vacío'));
    }

    this.requestManager.setPath('ACADEMICA_MID_SERVICE');
    return this.requestManager.getXml(`secretario_dependencia/${codigoFacultad}`).pipe(
      map((text: string) => {
        const res = JSON.parse(text);
        const secretarios = res?.facultad?.secretario;
        if (!Array.isArray(secretarios) || secretarios.length === 0) {
          throw new Error(`No hay secretarios en la facultad ${codigoFacultad}`);
        }
        const documento = secretarios[0]?.documento ?? '';
        if (!documento) {
          throw new Error(`Secretario sin documento para facultad ${codigoFacultad}`);
        }
        return documento;
      }),
      catchError((err) => {
        console.error('Error al obtener documento del secretario:', err);
        return throwError(() => err);
      }),
    );
  }

  getEmailByDocument(documento: string): Observable<string> {
    this.requestManager.setPath('TERCEROS_SERVICE');
    return this.requestManager.get(`datos_identificacion?query=numero:${documento}`).pipe(
      map((res: any) => {
        const items = Array.isArray(res) ? res : (res?.Data ?? []);
        if (!items.length) {
          throw new Error(`Sin datos de identificación para documento: ${documento}`);
        }
        const email = items[0]?.TerceroId?.UsuarioWSO2;
        if (!email) {
          throw new Error(`UsuarioWSO2 vacío para documento: ${documento}`);
        }
        return email;
      }),
    );
  }

  getDocenteEmail(cedula: string): Observable<string> {
    if (!cedula || cedula.trim() === '') {
      return throwError(() => new Error('cédula del docente vacía'));
    }

    this.requestManager.setPath('ACADEMICA_MID_SERVICE');
    return this.requestManager.getXml(`consulta_datos_docente_planta/${cedula}`).pipe(
      map((text: string) => {
        const res = JSON.parse(text);
        const datos = res?.datosCollection?.datos?.[0];
        if (!datos) {
          throw new Error(`Sin datos del docente para cédula ${cedula}`);
        }
        const correo = (datos.correo || '').split(';').map((c: string) => c.trim()).filter(Boolean)[0];
        if (!correo) {
          throw new Error(`Docente sin correo para cédula ${cedula}`);
        }
        return correo;
      }),
      catchError((err) => {
        console.error('Error al obtener correo del docente:', err);
        return throwError(() => err);
      }),
    );
  }

  resolveEmail(codigoFacultad: string): Observable<string> {
    return this.getSecretaryDocument(codigoFacultad).pipe(
      switchMap((documento) => this.getEmailByDocument(documento)),
    );
  }
}
