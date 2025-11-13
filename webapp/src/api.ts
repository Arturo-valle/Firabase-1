import { API_BASE_URL } from './config';
import type { Issuer, Document } from './types';

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

// --- Funciones de la API ---

export const getIssuers = async (): Promise<ApiResponse<{ issuers: Issuer[] }>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/issuers`);
    if (!response.ok) {
      throw new Error(`Error de red o de API: ${response.status}`);
    }
    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    console.error("Error al obtener los emisores:", error);
    return { data: null, error: error instanceof Error ? error.message : 'Ocurrió un error desconocido' };
  }
};

export const getIssuerDocuments = async (issuerName: string): Promise<ApiResponse<{ documents: Document[] }>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/issuer-documents?issuerName=${encodeURIComponent(issuerName)}`);
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Error al conectar con la API (${response.status}): ${errorBody}`);
    }
    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    console.error(`Error al obtener los documentos para ${issuerName}:`, error);
    return { data: null, error: error instanceof Error ? error.message : 'Ocurrió un error desconocido' };
  }
};
