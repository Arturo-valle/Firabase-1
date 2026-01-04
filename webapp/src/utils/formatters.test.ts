import { describe, it, expect } from 'vitest';
import { formatCurrency } from './formatters';

describe('formatCurrency', () => {
    // Helper to match text with any whitespace normalization
    const matchCurrency = (actual: string, expected: string) => {
        // Replace any whitespace (including nbsp) with regular space
        expect(actual.replace(/\s/g, ' ')).toBe(expected);
    };

    it('formats USD correctly', () => {
        matchCurrency(formatCurrency(100, 'USD'), 'USD 100');
        matchCurrency(formatCurrency(1234.56, 'USD'), 'USD 1,234.56');
    });

    it('formats NIO correctly', () => {
        // NIO seems to use C$ without space in this locale environment
        expect(formatCurrency(100, 'NIO')).toBe('C$100');
    });

    it('handles millions correctly for USD', () => {
        matchCurrency(formatCurrency(1000000, 'USD'), 'USD 1 M');
        matchCurrency(formatCurrency(1500000, 'USD'), 'USD 1.5 M');
        matchCurrency(formatCurrency(25000000, 'USD'), 'USD 25 M');
    });

    it('does not suffix millions for values under 1M USD', () => {
        matchCurrency(formatCurrency(999999, 'USD'), 'USD 999,999');
    });

    it('does not suffix millions for NIO even if over 1M', () => {
        expect(formatCurrency(1000000, 'NIO')).toBe('C$1,000,000');
    });

    it('handles undefined/null', () => {
        expect(formatCurrency(undefined)).toBe('N/D');
        expect(formatCurrency(null)).toBe('N/D');
    });
});
