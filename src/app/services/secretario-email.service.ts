import { Injectable } from '@angular/core';
import { RequestManager } from '../../managers/requestManager';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class SecretarioEmailService {
  constructor(private readonly requestManager: RequestManager) {}

  getSecretaryDocument(codigoFacultad: string): Observable<string> {
    console.log('[NOTIFICACION] codigoDependencia:', codigoFacultad);
    this.requestManager.setPath('ACADEMICA_MID_SERVICE');
    return this.requestManager.getXml(`secretario_dependencia/${codigoFacultad}`).pipe(
      map((xml: string) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');
        const documento = doc.querySelector('documento')?.textContent ?? '';
        if (!documento) {
          throw new Error(
            `No se encontró documento en XML para dependencia ${codigoFacultad}`,
          );
        }
        console.log('[NOTIFICACION] Documento obtenido del primer servicio:', documento);
        return documento;
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
        console.log('[NOTIFICACION] email consultado en terceros:', email);
        return email;
      }),
    );
  }

  resolveEmail(codigoFacultad: string): Observable<string> {
    return this.getSecretaryDocument(codigoFacultad).pipe(
      switchMap((documento) => this.getEmailByDocument(documento)),
    );
  }
}
