import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

interface NormativaItem {
  label: string;
  url: string;
}

@Component({
  selector: 'app-aviso-creacion',
  templateUrl: './aviso-creacion.component.html',
  styleUrl: './aviso-creacion.component.scss',
  standalone: false
})
export class AvisoCreacionComponent {
  aceptado = false;

  readonly normativa: NormativaItem[] = [
    {
      label: 'Acuerdo 07 de 2005 del CA',
      url: 'https://sgral.udistrital.edu.co/xdata/ca/acu_2005-007.pdf',
    },
    {
      label: 'Acuerdo 05 de 2011 del CSU',
      url: 'https://sgral.udistrital.edu.co/xdata/csu/acu_2011-005.pdf',
    },
  ];

  constructor(private readonly dialogRef: MatDialogRef<AvisoCreacionComponent, boolean>) {}

  confirmar(): void {
    if (this.aceptado) {
      this.dialogRef.close(true);
    }
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
