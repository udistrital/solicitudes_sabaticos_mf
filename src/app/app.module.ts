import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { HTTP_INTERCEPTORS, HttpClient, HttpClientModule } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import localeEn from '@angular/common/locales/en';

import { SpinnerUtilInterceptor, SpinnerUtilModule } from 'spinner-util';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { ReactiveFormsModule } from '@angular/forms';
import { environment } from '../environments/environment';

import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatPaginatorIntl, MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';

import { CrearSolicitudModalComponent } from './components/crear-solicitud-modal/crear-solicitud-modal.component';
import { EditarSolicitudComponent } from './components/editar-solicitud/editar-solicitud.component';
import { HistorialSolicitudesComponent } from './components/historial-solicitudes/historial-solicitudes.component';

registerLocaleData(localeEs);
registerLocaleData(localeEn);

export function createTranslateLoader(http: HttpClient) {
  return new TranslateHttpLoader(
    http,
    environment.apiUrl + 'assets/i18n/',
    '.json'
  );
}

export function createPaginatorIntl(translate: TranslateService): MatPaginatorIntl {
  const paginatorIntl = new MatPaginatorIntl();

  const setLabels = () => {
    paginatorIntl.itemsPerPageLabel = translate.instant('GLOBAL.paginator.itemsPerPage');
    paginatorIntl.nextPageLabel = translate.instant('GLOBAL.paginator.nextPage');
    paginatorIntl.previousPageLabel = translate.instant('GLOBAL.paginator.previousPage');
    paginatorIntl.firstPageLabel = translate.instant('GLOBAL.paginator.firstPage');
    paginatorIntl.lastPageLabel = translate.instant('GLOBAL.paginator.lastPage');
    paginatorIntl.getRangeLabel = (page: number, pageSize: number, length: number) => {
      if (length === 0 || pageSize === 0) {
        return translate.instant('GLOBAL.paginator.range', {
          start: 0,
          end: 0,
          length
        });
      }

      const startIndex = page * pageSize;
      const endIndex = Math.min(startIndex + pageSize, length);
      return translate.instant('GLOBAL.paginator.range', {
        start: startIndex + 1,
        end: endIndex,
        length
      });
    };
    paginatorIntl.changes.next();
  };

  setLabels();
  translate.onLangChange.subscribe(() => setLabels());

  return paginatorIntl;
}

@NgModule({
  declarations: [
    AppComponent,
    CrearSolicitudModalComponent,
    EditarSolicitudComponent,
    HistorialSolicitudesComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    RouterModule,
    AppRoutingModule,
    SpinnerUtilModule,
    HttpClientModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatNativeDateModule,
    MatPaginatorModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTableModule,
    MatCardModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient],
      },
    })
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: SpinnerUtilInterceptor,
      multi: true,
    },
    {
      provide: MatPaginatorIntl,
      useFactory: createPaginatorIntl,
      deps: [TranslateService]
    }
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }

