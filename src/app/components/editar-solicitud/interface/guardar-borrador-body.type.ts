export type GuardarBorradorBody = {
  Id: number;
  Contenido: string;
  Activo: boolean;
  FechaModificacion: string;
  FechaCreacion: string;
  SolicitudId: {
    Id: number;
  };
};