/**
 * Defines the structure of an Issuer object as received from the backend.
 */
export interface Issuer {
  name: string;
  acronym: string;
  sector: string;
  detailUrl?: string; // The URL to the issuer's detail page, now optional
  description?: string;
}

/**
 * Defines the structure of a Document object as received from the backend.
 */
export interface Document {
  category: string; // The category of the document (e.g., 'Prospectos', 'Hechos Relevantes')
  title: string;    // The title of the document
  url: string;      // The full URL to the document file
}
