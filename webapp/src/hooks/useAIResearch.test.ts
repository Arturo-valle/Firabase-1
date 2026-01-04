import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAIResearch } from './useAIResearch';

describe('useAIResearch', () => {
    beforeEach(() => {
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('debe inicializar con estado correcto', () => {
        const { result } = renderHook(() => useAIResearch());
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe(null);
    });

    it('debe realizar una búsqueda exitosa', async () => {
        const mockResponse = {
            results: {
                answer: 'Respuesta de prueba',
                sources: [],
                metadata: { chunksUsed: 1, documentsFound: 1, yearsFound: '2023' }
            },
            queryUnderstanding: { intent: 'test', issuers: [], metrics: [], enhancedQuery: 'test' }
        };

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse,
        });

        const { result } = renderHook(() => useAIResearch());

        let searchResult;
        await waitFor(async () => {
            searchResult = await result.current.search('test query');
        });

        expect(searchResult).toEqual({
            answer: mockResponse.results.answer,
            sources: mockResponse.results.sources,
            metadata: mockResponse.results.metadata,
            queryUnderstanding: mockResponse.queryUnderstanding,
        });

        // Wait for final state
        await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it('debe manejar errores de búsqueda', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ message: 'Error de prueba' })
        });

        const { result } = renderHook(() => useAIResearch());

        // La función lanza un error, lo capturamos
        await expect(result.current.search('test query')).rejects.toThrow();

        // Esperamos a que los cambios de estado (setError) se apliquen
        await waitFor(() => {
            expect(result.current.error).toBe('Error de prueba');
            expect(result.current.loading).toBe(false);
        });
    });

    it('debe obtener noticias exitosamente', async () => {
        const mockNews = [
            { id: '1', headline: 'Noticia 1', summary: 'Resumen', category: 'market', issuers: [], timestamp: new Date().toISOString(), isAIGenerated: true }
        ];

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ newsItems: mockNews }),
        });

        const { result } = renderHook(() => useAIResearch());

        const news = await result.current.getNews(7);

        expect(news).toEqual(mockNews);
        expect(result.current.loading).toBe(false);
    });

    it('debe cancelar la petición previa si se realiza una nueva (AbortController)', async () => {
        const abortSpy = vi.spyOn(AbortController.prototype, 'abort');

        (global.fetch as any).mockImplementation(() => new Promise(() => { })); // Nunca resuelve

        const { result } = renderHook(() => useAIResearch());

        // Primera llamada
        result.current.search('query 1');

        // Segunda llamada inmediatamente
        result.current.search('query 2');

        expect(abortSpy).toHaveBeenCalled();
    });
});
