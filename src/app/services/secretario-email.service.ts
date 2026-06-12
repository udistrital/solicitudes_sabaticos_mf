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
    console.log('[TRAMO] getSecretaryDocument: INICIO - codigoFacultad:', codigoFacultad);

    if (!codigoFacultad || codigoFacultad.trim() === '') {
      console.error('[TRAMO] getSecretaryDocument: ERROR - codigoFacultad vacío');
      return throwError(() => new Error('codigoFacultad vacío'));
    }

    this.requestManager.setPath('ACADEMICA_MID_SERVICE');
    console.log('[TRAMO] getSecretaryDocument: ANTES de llamar jBPM API secretario_dependencia/', codigoFacultad);
    return this.requestManager.getXml(`secretario_dependencia/${codigoFacultad}`).pipe(
      map((text: string) => {
        console.log('[TRAMO] getSecretaryDocument: RESPUESTA jBPM recibida (texto):', text.substring(0, 300));
        const res = JSON.parse(text);
        const secretarios = res?.facultad?.secretario;
        if (!Array.isArray(secretarios) || secretarios.length === 0) {
          throw new Error(`No hay secretarios en la facultad ${codigoFacultad}`);
        }
        const secretario = secretarios[0];
        const documento = secretario?.documento ?? '';
        if (!documento) {
          throw new Error(`Secretario sin documento para facultad ${codigoFacultad}`);
        }
        console.log('[TRAMO] getSecretaryDocument: FIN - Documento extraído:', documento);
        return documento;
      }),
      catchError((err) => {
        console.error('[TRAMO] getSecretaryDocument: ERROR:', err);
        return throwError(() => err);
      }),
    );
  }

  getEmailByDocument(documento: string): Observable<string> {
    console.log('[TRAMO] getEmailByDocument: INICIO - documento:', documento);
    this.requestManager.setPath('TERCEROS_SERVICE');
    console.log('[TRAMO] getEmailByDocument: ANTES de llamar TERCEROS API datos_identificacion');
    return this.requestManager.get(`datos_identificacion?query=numero:${documento}`).pipe(
      map((res: any) => {
        console.log('[TRAMO] getEmailByDocument: RESPUESTA TERCEROS JSON:', JSON.stringify(res, null, 2));
        const items = Array.isArray(res) ? res : (res?.Data ?? []);
        if (!items.length) {
          console.error('[TRAMO] getEmailByDocument: ERROR - Sin datos de identificación');
          throw new Error(`Sin datos de identificación para documento: ${documento}`);
        }
        const email = items[0]?.TerceroId?.UsuarioWSO2;
        if (!email) {
          console.error('[TRAMO] getEmailByDocument: ERROR - UsuarioWSO2 vacío');
          throw new Error(`UsuarioWSO2 vacío para documento: ${documento}`);
        }
        console.log('[TRAMO] getEmailByDocument: FIN - UsuarioWSO2 (email) obtenido:', email);
        return email;
      }),
    );
  }

  resolveEmail(codigoFacultad: string): Observable<string> {
    console.log('[TRAMO] resolveEmail: INICIO - codigoFacultad:', codigoFacultad);
    return this.getSecretaryDocument(codigoFacultad).pipe(
      switchMap((documento) => {
        console.log('[TRAMO] resolveEmail: Documento recibido de getSecretaryDocument, llamando getEmailByDocument');
        return this.getEmailByDocument(documento);
      }),
    );
  }
}
