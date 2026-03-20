import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { HttpErrorManager } from '../../managers/errorManager';

// TODO: Cuando se habilite access_token en producción, reemplazar HttpClient directo
// por RequestManager para que las peticiones incluyan el header Authorization.
// import { RequestManager } from '../../managers/requestManager';

@Injectable({
  providedIn: 'root'
})
export class SabaticosCrudService {
  private readonly basePath = environment.SABATICOS_CRUD_SERVICE;

  constructor(
    private http: HttpClient,
    private errManager: HttpErrorManager
  ) {}

  get(endpoint: string) {
    return this.http.get<any>(`${this.basePath}${endpoint}`).pipe(
      catchError(this.errManager.handleError.bind(this)),
    );
  }
}
