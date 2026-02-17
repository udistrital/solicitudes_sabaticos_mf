import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { fromEvent } from 'rxjs';
import { getCookie } from '../utils/cookie';

@Component({
  selector: 'solicitudes-sabaticos-mf',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  whatLang$ = fromEvent(window, 'lang');

  ngOnInit(): void {
    this.validateLang();
  }

  constructor(
    private translate: TranslateService
  ) { }

  validateLang() {
    let lang = getCookie('lang') || 'es';
    this.whatLang$.subscribe((x: any) => {
      lang = x['detail']['answer'];
      this.translate.setDefaultLang(lang);
      this.translate.use(lang);
    });
    const initialLang = getCookie('lang') || 'es';
    this.translate.setDefaultLang(initialLang);
    this.translate.use(initialLang);

  }
}
