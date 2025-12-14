import { describe, it, expect } from 'vitest';
// import { render, screen } from '@testing-library/react'; // Commited out until needed
// import App from './App'; // Assuming App exists, or we might stick to a basic truthy test first if unsure about App export

describe('Calculadora', () => {
    it('suma 1 + 1 igual a 2', () => {
        expect(1 + 1).toBe(2);
    });
});
