import { API_BASE_URL } from '../config';

interface RequestOptions extends RequestInit {
    params?: Record<string, string | number>;
}

export class ApiError extends Error {
    constructor(public message: string, public status?: number, public data?: any) {
        super(message);
        this.name = 'ApiError';
    }
}

/**
 * Centra la lógica de peticiones para asegurar:
 * 1. Manejo consistente de errores.
 * 2. Inyección de tokens de autenticación (futuro).
 * 3. Soporte para AbortSignal (prevención de condiciones de carrera).
 */
export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, signal, ...customConfig } = options;

    // Construir URL: si el endpoint es absoluto (http...), usarlo tal cual; sino, usar API_BASE_URL
    const isAbsolute = endpoint.startsWith('http://') || endpoint.startsWith('https://');
    const baseUrl = isAbsolute ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const url = new URL(baseUrl);
    if (params) {
        Object.keys(params).forEach(key => url.searchParams.append(key, String(params[key])));
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };

    // Inyección de token de Firebase Auth
    try {
        const { auth } = await import('../lib/firebase');
        const user = auth.currentUser;

        if (user) {
            const token = await user.getIdToken();
            headers['Authorization'] = `Bearer ${token}`;
            // console.debug('Token injected for user:', user.email);
        } else {
            console.warn('No authenticated user found in apiClient via standard auth.currentUser');

            // Intento de fallback: esperar un momento si la auth se está inicializando
            // (Opcional, pero útil si hay condiciones de carrera al inicio)
        }
    } catch (authError) {
        console.error("Failed to get auth token in apiClient:", authError);
    }

    const config: RequestInit = {
        method: customConfig.method || (customConfig.body ? 'POST' : 'GET'),
        ...customConfig,
        headers,
    };

    try {
        const response = await fetch(url.toString(), config);

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                errorData = { message: 'Unknown error' };
            }
            throw new ApiError(errorData.message || errorData.error || 'Error en la petición', response.status, errorData);
        }

        return await response.json() as T;
    } catch (error: any) {
        if (error.name === 'AbortError') throw error;
        throw error instanceof ApiError ? error : new ApiError(error.message || 'Error de red');
    }
}
