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
  documents: Document[]; // An array of documents related to the issuer
  error?: string;       // An optional error message if data scraping failed for this issuer
  detailUrl?: string;   // Original URL, kept for reference but no longer used for fetching
}
