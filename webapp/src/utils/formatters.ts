export const formatDate = (dateValue: Date | string | number | { _seconds: number; _nanoseconds?: number } | null | undefined): string => {
    if (!dateValue) return 'Fecha desconocida';

    try {
        let date: Date;

        // Handle Firestore Timestamp (has _seconds)
        if (typeof dateValue === 'object' && '_seconds' in dateValue) {
            date = new Date(dateValue._seconds * 1000);
        }
        // Handle ISO string or standard Date object
        else {
            date = new Date(dateValue);
        }

        // Validate date
        if (isNaN(date.getTime())) {
            return 'Fecha inválida';
        }

        return new Intl.DateTimeFormat('es-NI', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).format(date);
    } catch (error) {
        console.warn('Error formatting date:', dateValue, error);
        return 'Error de fecha';
    }
};

export const formatCurrency = (value: number | undefined | null, currency: 'USD' | 'NIO' = 'USD'): string => {
    if (value === undefined || value === null) return 'N/D';

    // Determinar si debemos mostrar "M" basado en la magnitud (solo si es > 1 millón)
    const isMillions = Math.abs(value) >= 1_000_000 && currency === 'USD';
    const displayValue = isMillions ? value / 1_000_000 : value;

    return new Intl.NumberFormat('es-NI', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(displayValue) + (isMillions ? ' M' : '');
};

export const formatPercentage = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return 'N/D';
    return `${value.toFixed(2)}%`;
};

export const formatRatio = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return 'N/D';
    return `${value.toFixed(2)}x`;
};

export const formatNumber = (value: number | undefined | null, suffix: string = ''): string => {
    if (value === undefined || value === null) return 'N/D';
    return value.toLocaleString('es-NI', { maximumFractionDigits: 2 }) + suffix;
};
