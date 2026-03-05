import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';

@Component({
  selector: 'solicitudes-sabaticos-mf-prueba',
  templateUrl: './prueba.component.html',
  styleUrl: './prueba.component.scss'
})
export class PruebaComponent {
  selectedFiles: File[] = [];
  terceroId: number = 7213;
  solicitudId: number = 1;
  rolUsuario: string = 'DOCENTE';
  estadoSoporteSolicitud: string = 'PEN';
  isLoading: boolean = false;

  private apiUrl = 'http://localhost:8081/v1/soporte_solicitud/'; // Ajusta tu URL

  constructor(private http: HttpClient) {}

  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    this.selectedFiles = [];
    
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        this.selectedFiles.push(files[i]);
      }
    }
  }

  enviarSoporte(): void {
    if (!this.validarCampos()) {
      alert('Por favor completa todos los campos y selecciona al menos un archivo');
      return;
    }

    this.isLoading = true;
    const formData = new FormData();

    // Agregar campos al FormData
    formData.append('tercero_id', this.terceroId.toString());
    formData.append('solicitud_id', this.solicitudId.toString());
    formData.append('rol_usuario', this.rolUsuario);
    formData.append('estado_soporte_solicitud', this.estadoSoporteSolicitud);

    // Agregar archivos
    this.selectedFiles.forEach((file, index) => {
      formData.append('documentos', file, file.name);
    });

    // Realizar petición HTTP
    this.http.post(this.apiUrl, formData).subscribe({
      next: (response: any) => {
        console.log('Respuesta exitosa:', response);
        alert('Soporte enviado correctamente');
        this.ValorPredeterminado();
        this.isLoading = false;
      },
      error: (error:any) => {
        console.error('Error al enviar:', error);
        alert('Error al enviar el soporte: ' + (error.error?.message || error.message));
        this.isLoading = false;
      }
    });
  }

  validarCampos(): boolean {
    return this.terceroId > 0 && 
           this.solicitudId > 0 && 
           this.rolUsuario !== '' && 
           this.estadoSoporteSolicitud !== '' &&
           this.selectedFiles.length > 0;
  }

  ValorPredeterminado(): void {
    this.selectedFiles = [];
    this.terceroId = 7213;
    this.solicitudId = 1;
    this.rolUsuario = 'DOCENTE';
    this.estadoSoporteSolicitud = 'PEN';
    // Limpiar el input file
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  obtenerNombresArchivos(): string {
    return this.selectedFiles.map(f => f.name).join(', ');
  }

}
