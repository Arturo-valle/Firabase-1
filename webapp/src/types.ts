/**
 * Define la estructura de un objeto Emisor tal como se recibe del backend.
 */
export interface Issuer {
  name: string;
  acronym: string;
  sector: string;
  detailUrl: string; // La URL a la página de detalles del emisor
  description?: string; // Opcional, como antes
}

/**
 * Define la estructura de un objeto Documento tal como se recibe del backend.
 */
export interface Document {
  text: string; // El texto del enlace del documento
  url: string;  // La URL completa al archivo del documento
}
