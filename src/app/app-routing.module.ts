import { NgModule } from '@angular/core';
import { RouterModule, Routes, provideRouter } from '@angular/router';
import { APP_BASE_HREF } from '@angular/common';
import { getSingleSpaExtraProviders } from 'single-spa-angular';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { EditarSolicitudComponent } from './components/editar-solicitud/editar-solicitud.component';
import { HistorialSolicitudesComponent } from './components/historial-solicitudes/historial-solicitudes.component';
import { AuthGuard } from '../_guards/auth.guard';



const routes: Routes = [
  // {
  //   path: "disponibilidad-cupos",
  //   canActivate: [AuthGuard],
  //   component: DisponibilidadCuposComponent
  // },
  // {
  //   path: "por-grupos",
  //   canActivate: [AuthGuard],
  //   component: HorarioPorGruposComponent
  // },
  // {
  //   path: "gestion",
  //   canActivate: [AuthGuard],
  //   component: GestionHorarioComponent
  // },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'solicitudes'
  },
  {
    path: 'solicitudes',
    canActivate: [AuthGuard],
    component: HistorialSolicitudesComponent
  },
  {
    path: 'solicitudes/editar',
    canActivate: [AuthGuard],
    component: EditarSolicitudComponent
  },
  {
    path: '**',
    redirectTo: 'solicitudes'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: [
    provideRouter(routes),
    { provide: APP_BASE_HREF, useValue: '/sabaticos/' },
    getSingleSpaExtraProviders(),
    provideHttpClient(withFetch())]
})
export class AppRoutingModule { }
