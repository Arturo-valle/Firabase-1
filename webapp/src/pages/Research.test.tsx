import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Research from './Research';

// Mock de componentes hijos
vi.mock('../components/ai/SmartSearch', () => ({
    default: () => <div data-testid="smart-search">Smart Search Mock</div>
}));

vi.mock('../components/ai/AINewsFeed', () => ({
    default: () => <div data-testid="ai-news-feed">AI News Feed Mock</div>
}));

describe('Research Page', () => {
    it('renderiza el encabezado y los componentes principales', () => {
        render(<Research />);

        expect(screen.getByText(/Centro de Investigación AI/i)).toBeInTheDocument();
        expect(screen.getByText(/Herramientas avanzadas de análisis financiero/i)).toBeInTheDocument();

        // Verificar que los subcomponentes se renderizan
        expect(screen.getByTestId('smart-search')).toBeInTheDocument();
        expect(screen.getByTestId('ai-news-feed')).toBeInTheDocument();
    });

    it('muestra el banner de información de Gemini', () => {
        render(<Research />);

        expect(screen.getByText(/Powered by Gemini 2.0 Flash/i)).toBeInTheDocument();
        expect(screen.getByText(/Documentos Auditados/i)).toBeInTheDocument();
        expect(screen.getByText(/95%\+/i)).toBeInTheDocument();
    });
});
