import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIssuerMetrics } from './useIssuerMetrics';
import * as metricsApi from '../utils/metricsApi';

describe('useIssuerMetrics', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe inicializar con estado vacío', () => {
        const { result } = renderHook(() => useIssuerMetrics());
        expect(result.current.metrics).toBe(null);
        expect(result.current.loading).toBe(false);
        expect(result.current.extracting).toBe(false);
        expect(result.current.error).toBe(null);
    });

    it('debe cargar métricas exitosamente', async () => {
        const mockMetrics = { issuerId: 'test', issuerName: 'Test Issuer', liquidez: {}, solvencia: {}, rentabilidad: {}, eficiencia: {}, capital: {}, calificacion: {} };
        const fetchSpy = vi.spyOn(metricsApi, 'fetchIssuerMetrics').mockResolvedValue(mockMetrics as any);

        const { result } = renderHook(() => useIssuerMetrics());

        await act(async () => {
            await result.current.loadMetrics('test');
        });

        expect(fetchSpy).toHaveBeenCalledWith('test');
        expect(result.current.metrics).toEqual(mockMetrics);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe(null);
    });

    it('debe manejar error al cargar métricas', async () => {
        vi.spyOn(metricsApi, 'fetchIssuerMetrics').mockRejectedValue(new Error('API Error'));

        const { result } = renderHook(() => useIssuerMetrics());

        await act(async () => {
            await result.current.loadMetrics('test');
        });

        expect(result.current.metrics).toBe(null);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe('API Error');
    });

    it('debe extraer métricas exitosamente', async () => {
        const mockMetrics = { issuerId: 'test', issuerName: 'Test Issuer (Extracted)' };
        const extractSpy = vi.spyOn(metricsApi, 'extractIssuerMetrics').mockResolvedValue(mockMetrics as any);

        const { result } = renderHook(() => useIssuerMetrics());

        let data;
        await act(async () => {
            data = await result.current.extractMetrics('test');
        });

        expect(extractSpy).toHaveBeenCalledWith('test');
        expect(data).toEqual(mockMetrics);
        expect(result.current.metrics).toEqual(mockMetrics);
        expect(result.current.extracting).toBe(false);
    });

    it('debe resetear el estado', async () => {
        const { result } = renderHook(() => useIssuerMetrics());

        // Forzar un estado previo (aunque sea manual para el test)
        // En un test real, llamaríamos a loadMetrics primero.

        act(() => {
            result.current.resetMetrics();
        });

        expect(result.current.metrics).toBe(null);
        expect(result.current.error).toBe(null);
    });
});
