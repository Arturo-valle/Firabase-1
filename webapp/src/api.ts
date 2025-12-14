import { API_BASE_URL } from './config';
import type { Issuer, Document } from './types';

// --- Funciones de la API para React Query ---

export const getIssuers = async (): Promise<{ issuers: Issuer[] }> => {
  const response = await fetch(`${API_BASE_URL}/issuers`);
  if (!response.ok) {
    throw new Error(`Error de red o de API: ${response.status}`);
  }
  return response.json();
};

export const getIssuerDocuments = async (issuerName: string): Promise<{ documents: Document[] }> => {
  const response = await fetch(`${API_BASE_URL}/issuer-documents?issuerName=${encodeURIComponent(issuerName)}`);
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error al conectar con la API (${response.status}): ${errorBody}`);
  }
  return response.json();
};
