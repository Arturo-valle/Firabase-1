import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from './Home';

// Mock del hook useIssuers
const mockUseIssuers = vi.fn();

vi.mock('../hooks/useIssuers', () => ({
    useIssuers: () => mockUseIssuers()
}));

describe('Home', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it('muestra spinner durante la carga', () => {
        mockUseIssuers.mockReturnValue({
            issuers: [],
            loading: true,
            error: null,
            retry: vi.fn(),
            isRetrying: false
        });

        render(<Home />);

        expect(screen.getByText(/Cargando Terminal/i)).toBeInTheDocument();
    });

    it('muestra ErrorDisplay cuando hay error', () => {
        const mockRetry = vi.fn();
        mockUseIssuers.mockReturnValue({
            issuers: [],
            loading: false,
            error: new Error('Error de red'),
            retry: mockRetry,
            isRetrying: false
        });

        render(<Home />);

        expect(screen.getByText('Error de Conexión')).toBeInTheDocument();
        expect(screen.getByText('Error de red')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
    });

    it('llama a retry cuando se hace clic en el botón', () => {
        const mockRetry = vi.fn();
        mockUseIssuers.mockReturnValue({
            issuers: [],
            loading: false,
            error: new Error('Error de red'),
            retry: mockRetry,
            isRetrying: false
        });

        render(<Home />);

        const retryButton = screen.getByRole('button', { name: /reintentar/i });
        retryButton.click();

        expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('muestra EmptyState cuando no hay emisores', () => {
        mockUseIssuers.mockReturnValue({
            issuers: [],
            loading: false,
            error: null,
            retry: vi.fn(),
            isRetrying: false
        });

        render(<Home />);

        expect(screen.getByText('No hay emisores disponibles')).toBeInTheDocument();
    });

    it('renderiza FinancialDashboard con emisores válidos', () => {
        const mockIssuers = [
            {
                id: 'test-issuer',
                name: 'Test Issuer',
                acronym: 'TEST',
                sector: 'Finanzas',
                documents: [{ title: 'Doc', url: 'http://test.com', type: 'test' }]
            }
        ];

        mockUseIssuers.mockReturnValue({
            issuers: mockIssuers,
            loading: false,
            error: null,
            retry: vi.fn(),
            isRetrying: false
        });

        render(<Home />);

        // El FinancialDashboard debería renderizarse
        // Verificamos que no estamos en ningún estado de error o vacío
        expect(screen.queryByText('Cargando Terminal...')).not.toBeInTheDocument();
        expect(screen.queryByText('Error de Conexión')).not.toBeInTheDocument();
        expect(screen.queryByText('No hay emisores disponibles')).not.toBeInTheDocument();
    });

    it('muestra botón deshabilitado durante retry', () => {
        mockUseIssuers.mockReturnValue({
            issuers: [],
            loading: false,
            error: new Error('Error de red'),
            retry: vi.fn(),
            isRetrying: true
        });

        render(<Home />);

        const retryButton = screen.getByRole('button', { name: /reintentando/i });
        expect(retryButton).toBeDisabled();
    });
});
