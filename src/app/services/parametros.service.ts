import { Injectable } from '@angular/core';
import { RequestManager } from '../../managers/requestManager';

@Injectable({
  providedIn: 'root'
})
export class ParametrosService {

  constructor(private requestManager: RequestManager) {
    this.requestManager.setPath('PARAMETROS_SERVICE');
  }

  get(endpoint: string) {
    this.requestManager.setPath('PARAMETROS_SERVICE');
    return this.requestManager.get(endpoint);
  }
}
