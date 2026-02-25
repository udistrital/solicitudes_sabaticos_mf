import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearSolicitudModalComponent } from './crear-solicitud-modal.component';

describe('CrearSolicitudModalComponent', () => {
  let component: CrearSolicitudModalComponent;
  let fixture: ComponentFixture<CrearSolicitudModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CrearSolicitudModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CrearSolicitudModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
