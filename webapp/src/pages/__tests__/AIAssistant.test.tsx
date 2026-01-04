import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, vi, expect, beforeEach } from 'vitest';
import AIAssistant from '../AIAssistant';
import { useIssuers } from '../../hooks/useIssuers';

// Mock dependencies
vi.mock('react-router-dom', () => ({
    useSearchParams: () => [new URLSearchParams()],
}));

vi.mock('../../hooks/useIssuers', () => ({
    useIssuers: vi.fn(),
}));

vi.mock('../../components/AIAnalysis', () => ({
    default: ({ issuers }: { issuers: any[] }) => (
        <div data-testid="ai-analysis">
            Analysis Component - {issuers.length} Issuers
        </div>
    )
}));

// Mock ErrorDisplay if it's complex, or rely on its output if it's simple. 
// Ideally we mock it to avoid testing child implementation details, but integration is also fine.
// Let's mock it to focus on AIAssistant logic.
vi.mock('../../components/ErrorDisplay', () => ({
    ErrorDisplay: ({ error, onRetry }: any) => (
        <div data-testid="error-display">
            <p>{error.message}</p>
            <button onClick={onRetry}>Retry</button>
        </div>
    )
}));

describe('AIAssistant Page', () => {
    const mockRetry = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('displays loading state correctly', () => {
        (useIssuers as any).mockReturnValue({
            issuers: [],
            loading: true,
            error: null,
            retry: mockRetry,
            isRetrying: false
        });

        render(<AIAssistant />);
        expect(screen.getByText('Cargando ecosistema de emisores...')).toBeInTheDocument();
    });

    it('displays error state correctly', () => {
        const error = new Error('Network Failure');
        (useIssuers as any).mockReturnValue({
            issuers: [],
            loading: false,
            error: error,
            retry: mockRetry,
            isRetrying: false
        });

        render(<AIAssistant />);
        expect(screen.getByTestId('error-display')).toBeInTheDocument();
        expect(screen.getByText('Network Failure')).toBeInTheDocument();
    });

    it('renders AIAnalysis with data on success', () => {
        const mockIssuers = [
            { id: '1', name: 'Issuer A' },
            { id: '2', name: 'Issuer B' }
        ];

        (useIssuers as any).mockReturnValue({
            issuers: mockIssuers,
            loading: false,
            error: null,
            retry: mockRetry,
            isRetrying: false
        });

        render(<AIAssistant />);
        expect(screen.getByTestId('ai-analysis')).toBeInTheDocument();
        expect(screen.getByText('Analysis Component - 2 Issuers')).toBeInTheDocument();
    });

    it('calls retry function when retry button is clicked', () => {
        const error = new Error('Retry Me');
        (useIssuers as any).mockReturnValue({
            issuers: [],
            loading: false,
            error: error,
            retry: mockRetry,
            isRetrying: false
        });

        render(<AIAssistant />);
        fireEvent.click(screen.getByText('Retry'));
        expect(mockRetry).toHaveBeenCalledTimes(1);
    });
});
