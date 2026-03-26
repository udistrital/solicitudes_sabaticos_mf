export type TipoParametroModalidad = {
  Id: number;
  Nombre: string;
  Descripcion: string;
  CodigoAbreviacion: string;
  Activo: boolean;
};

export type ModalidadOption = {
  Id: number;
  Nombre: string;
  Descripcion: string;
  CodigoAbreviacion: string;
  Activo: boolean;
  NumeroOrden: number;
  ParametroPadreId: number | null;
  FechaCreacion: string;
  FechaModificacion: string;
  TipoParametroId: TipoParametroModalidad;
};
