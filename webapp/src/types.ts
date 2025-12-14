/**
 * Defines the structure of a Document object as returned by the new API.
 */
export interface Document {
  title: string;    // The title of the document
  url: string;      // The full URL to the document file
  date?: string;    // The publication date of the document, optional
  type: string;     // The category of the document (e.g., 'Hecho Relevante')
}

/**
 * Defines the structure of an Issuer object as returned by the new /api/issuers endpoint.
 */
export interface Issuer {
  id: string;         // A unique identifier, typically the issuer's name
  name: string;
  acronym: string;
  sector: string;
  logoUrl?: string;    // Optional: URL for the issuer's logo
  documents: Document[]; // An array of documents related to the issuer
  error?: string;       // An optional error message if data scraping failed for this issuer
  detailUrl?: string;   // Original URL, kept for reference but no longer used for fetching
}

// Financial Metrics Types
export interface MetricsData {
  liquidez: {
    ratioCirculante: number | null;
    pruebaAcida: number | null;
    capitalTrabajo: number | null;
  };
  solvencia: {
    deudaActivos: number | null;
    deudaPatrimonio: number | null;
    coberturIntereses: number | null;
  };
  rentabilidad: {
    roe: number | null;
    roa: number | null;
    margenNeto: number | null;
    utilidadNeta: number | null;
  };
  eficiencia: {
    rotacionActivos: number | null;
    rotacionCartera: number | null;
    morosidad: number | null;
  };
  capital: {
    activosTotales: number | null;
    patrimonio: number | null;
    pasivos: number | null;
  };
  calificacion: {
    rating: string | null;
    perspectiva: string | null;
    fecha: string | null;
  };
  metadata: {
    periodo: string;
    moneda: string;
    fuente: string;
    nota?: string;
  };
  extractedAt?: Date | string;
  issuerId: string;
  issuerName: string;
  chunksAnalyzed?: number;
}

export interface IssuerMetrics extends MetricsData {
  // Para uso en comparador
}

export interface ComparisonData {
  issuers: IssuerMetrics[];
  rankings?: {
    liquidez: string[];
    solvencia: string[];
    rentabilidad: string[];
    overall: string[];
  };
}
