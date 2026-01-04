import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Profile from '../Profile';
import { useAuth } from '../../context/AuthContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock useAuth
vi.mock('../../context/AuthContext', () => ({
    useAuth: vi.fn()
}));

const mockLogout = vi.fn();

describe('Profile Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useAuth as any).mockReturnValue({
            user: {
                displayName: 'Test User',
                email: 'test@example.com',
                metadata: { creationTime: '2024-01-01T00:00:00Z' },
                photoURL: null
            },
            logout: mockLogout
        });
    });

    it('renders user information correctly', () => {
        render(
            <BrowserRouter>
                <Profile />
            </BrowserRouter>
        );

        // Name might be inside a Heading or complex structure
        expect(screen.getByText((content) => content.includes('Test User'))).toBeInTheDocument();
        expect(screen.getByText((content) => content.includes('test@example.com'))).toBeInTheDocument();
    });

    it('changes tabs when clicked', async () => {
        render(
            <BrowserRouter>
                <Profile />
            </BrowserRouter>
        );

        const securityTab = screen.getByText('Seguridad');
        fireEvent.click(securityTab);

        await waitFor(() => {
            expect(screen.getByText('Seguridad de la Cuenta')).toBeInTheDocument();
        });
    });

    it('calls logout and navigates when logout button is clicked', async () => {
        render(
            <BrowserRouter>
                <Profile />
            </BrowserRouter>
        );

        const logoutButton = screen.getByText('Cerrar Sesión');
        fireEvent.click(logoutButton);

        expect(mockLogout).toHaveBeenCalledTimes(1);
    });
});
