import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Discover from './Discover';
import * as marketDataApi from '../utils/marketDataApi';
import { resetIssuersCache } from '../hooks/useIssuers';

// Mock the API
vi.mock('../utils/marketDataApi');

const mockIssuers = {
    issuers: [
        { id: 'banco1', name: 'Banco Uno', acronym: 'B1', sector: 'Banca', documents: [{}, {}], logoUrl: '' },
        { id: 'indus1', name: 'Industria Alfa', acronym: 'IA', sector: 'Industria', documents: [{}], logoUrl: '' },
    ]
};

const renderWithRouter = (ui: React.ReactElement) => {
    return render(ui, { wrapper: BrowserRouter });
};

describe('Discover Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetIssuersCache();
    });

    it('renders loading state initially', () => {
        (marketDataApi.fetchIssuers as any).mockReturnValue(new Promise(() => { }));
        renderWithRouter(<Discover />);
        expect(screen.getByText(/Cargando ecosistema financiero/i)).toBeInTheDocument();
    });

    it('renders issuers list on success', async () => {
        (marketDataApi.fetchIssuers as any).mockResolvedValue(mockIssuers);
        renderWithRouter(<Discover />);

        await waitFor(() => {
            expect(screen.getByText('Banco Uno')).toBeInTheDocument();
        });
        expect(screen.getByText('Industria Alfa')).toBeInTheDocument();
        expect(screen.getByText('2 documentos')).toBeInTheDocument();
    });

    it('filters issuers by search term', async () => {
        (marketDataApi.fetchIssuers as any).mockResolvedValue(mockIssuers);
        renderWithRouter(<Discover />);

        await waitFor(() => {
            expect(screen.getByText('Banco Uno')).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText(/Buscar por nombre/i);
        fireEvent.change(searchInput, { target: { value: 'Industria' } });

        expect(screen.getByText('Industria Alfa')).toBeInTheDocument();
        expect(screen.queryByText('Banco Uno')).not.toBeInTheDocument();
    });

    it('filters issuers by sector', async () => {
        (marketDataApi.fetchIssuers as any).mockResolvedValue(mockIssuers);
        renderWithRouter(<Discover />);

        await waitFor(() => {
            expect(screen.getByText('Banco Uno')).toBeInTheDocument();
        });

        const selects = screen.getAllByRole('combobox');
        const sectorSelect = selects[0];
        fireEvent.change(sectorSelect, { target: { value: 'Banca' } });

        await waitFor(() => {
            expect(screen.getByText(/Banco Uno/i)).toBeInTheDocument();
            expect(screen.queryByText(/Industria Alfa/i)).not.toBeInTheDocument();
        });
    });

    it('shows error state and retry button on failure', async () => {
        (marketDataApi.fetchIssuers as any).mockRejectedValue(new Error('API Failure'));
        renderWithRouter(<Discover />);

        await waitFor(() => {
            expect(screen.getByText(/Error al cargar emisores/i)).toBeInTheDocument();
        });

        expect(screen.getByText(/API Failure/i)).toBeInTheDocument();
        const retryButton = screen.getByRole('button', { name: /Reintentar conexión/i });
        expect(retryButton).toBeInTheDocument();

        // Test retry
        (marketDataApi.fetchIssuers as any).mockResolvedValue(mockIssuers);
        fireEvent.click(retryButton);

        await waitFor(() => {
            expect(screen.getByText('Banco Uno')).toBeInTheDocument();
        });
    });
});
