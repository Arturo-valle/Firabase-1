import { useEffect } from 'react';
import { MarketDashboard } from './MarketDashboard';
import { useNavigate } from 'react-router-dom';
import type { Issuer } from '../types';

/**
 * Página principal - Ahora impulsa la nueva interfaz 'Obsidian Bento Grid'.
 */
export default function Home() {
    const navigate = useNavigate();

    // Título dinámico
    useEffect(() => {
        document.title = "Terminal de Mercado | Bolsa de Valores de Nicaragua";
    }, []);

    const handleSelectIssuer = (issuer: Issuer) => {
        navigate(`/issuer/${issuer.id}`);
    };

    // La lógica de carga, error y Demo Mode ahora vive dentro de MarketDashboard
    return (
        <MarketDashboard onSelectIssuer={handleSelectIssuer} />
    );
}
