import { Injectable } from '@angular/core';
import { RequestManager } from '../../managers/requestManager';

@Injectable({
  providedIn: 'root'
})
export class SabaticosMidService {

    constructor(private requestManager: RequestManager) {
    this.requestManager.setPath('SABATICOS_MID_SERVICE');
    }
    get(endpoint: string) {
    this.requestManager.setPath('SABATICOS_MID_SERVICE');
    return this.requestManager.get(endpoint);
    }

    post(endpoint: string, element: any) {
    this.requestManager.setPath('SABATICOS_MID_SERVICE');
    return this.requestManager.post(endpoint, element);
    }

    postFile(endpoint: string, formData: FormData) {
    this.requestManager.setPath('SABATICOS_MID_SERVICE');
    return this.requestManager.post_file(endpoint, formData);
    }

    put(endpoint: string, element: { Id: any; }) {
    this.requestManager.setPath('SABATICOS_MID_SERVICE');
    return this.requestManager.put(endpoint, element);
    }

    delete(endpoint: string, element: { Id: any; }) {
    this.requestManager.setPath('SABATICOS_MID_SERVICE');
    return this.requestManager.delete(endpoint, element.Id);
    }
}
  