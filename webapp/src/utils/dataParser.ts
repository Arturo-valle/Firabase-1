/**
 * Data parsing utilities to extract structured data from AI text responses
 * for chart visualization
 */

export interface CreditRatingDataPoint {
    date: string;
    rating: string;
    numericValue: number;
}

export interface FinancialRatio {
    name: string;
    value: number;
    date?: string;
}

export interface RiskScore {
    category: string;
    score: number;
}

export interface ComparativeData {
    issuerName: string;
    metrics: { [key: string]: number };
}

// Convert credit rating to numeric value for charting
const ratingToNumeric: { [key: string]: number } = {
    'AAA': 10, 'AA+': 9.5, 'AA': 9, 'AA-': 8.5,
    'A+': 8, 'A': 7.5, 'A-': 7,
    'BBB+': 6.5, 'BBB': 6, 'BBB-': 5.5,
    'BB+': 5, 'BB': 4.5, 'BB-': 4,
    'B+': 3.5, 'B': 3, 'B-': 2.5,
    'CCC': 2, 'CC': 1.5, 'C': 1, 'D': 0.5,
};

/**
 * Parse credit rating trends from AI response text
 */
export function parseCreditRatingData(text: string): CreditRatingDataPoint[] {
    const data: CreditRatingDataPoint[] = [];

    // Look for patterns like "2023: AA+", "Calificación 2024: A-", etc.
    const ratingPattern = /(\d{4})[^\w]*(AAA|AA[\+\-]?|A[\+\-]?|BBB[\+\-]?|BB[\+\-]?|B[\+\-]?|CCC|CC|C|D)/gi;
    const matches = text.matchAll(ratingPattern);

    for (const match of matches) {
        const year = match[1];
        const rating = match[2].toUpperCase();
        const numericValue = ratingToNumeric[rating] || 5;

        data.push({
            date: year,
            rating,
            numericValue,
        });
    }

    // Sort by date
    data.sort((a, b) => a.date.localeCompare(b.date));

    // Remove duplicates (keep first occurrence)
    const seen = new Set<string>();
    return data.filter(item => {
        const key = `${item.date}-${item.rating}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/**
 * Parse financial ratios from AI response text
 */
export function parseFinancialRatios(text: string): FinancialRatio[] {
    const ratios: FinancialRatio[] = [];

    // Common ratio patterns
    const ratioPatterns = [
        { name: 'ROE', pattern: /ROE[:\s]+(\d+\.?\d*)%?/i },
        { name: 'ROA', pattern: /ROA[:\s]+(\d+\.?\d*)%?/i },
        { name: 'Margen Neto', pattern: /margen\s+neto[:\s]+(\d+\.?\d*)%?/i },
        { name: 'Ratio Corriente', pattern: /ratio\s+corriente[:\s]+(\d+\.?\d*)/i },
        { name: 'Deuda/Patrimonio', pattern: /deuda\/patrimonio[:\s]+(\d+\.?\d*)/i },
        { name: 'Liquidez', pattern: /liquidez[:\s]+(\d+\.?\d*)/i },
        { name: 'Solvencia', pattern: /solvencia[:\s]+(\d+\.?\d*)%?/i },
    ];

    for (const { name, pattern } of ratioPatterns) {
        const match = text.match(pattern);
        if (match) {
            ratios.push({
                name,
                value: parseFloat(match[1]),
            });
        }
    }

    return ratios;
}

/**
 * Parse risk assessment scores from AI response text
 */
export function parseRiskScores(text: string): RiskScore[] {
    const scores: RiskScore[] = [];

    const scorePatterns = [
        { category: 'Riesgo Crediticio', pattern: /riesgo\s+crediticio[:\s]+(\d+(?:\.\d+)?)\s*(?:\/\s*10)?/i },
        { category: 'Riesgo de Mercado', pattern: /riesgo\s+de\s+mercado[:\s]+(\d+(?:\.\d+)?)\s*(?:\/\s*10)?/i },
        { category: 'Riesgo Operacional', pattern: /riesgo\s+operacional[:\s]+(\d+(?:\.\d+)?)\s*(?:\/\s*10)?/i },
        { category: 'Calidad de Gestión', pattern: /calidad\s+de\s+gesti[óo]n[:\s]+(\d+(?:\.\d+)?)\s*(?:\/\s*10)?/i },
        { category: 'Liquidez', pattern: /(?:score|puntaje)\s+liquidez[:\s]+(\d+(?:\.\d+)?)\s*(?:\/\s*10)?/i },
    ];

    for (const { category, pattern } of scorePatterns) {
        const match = text.match(pattern);
        if (match) {
            scores.push({
                category,
                score: parseFloat(match[1]),
            });
        }
    }

    return scores;
}

/**
 * Parse comparative data for multiple issuers
 */
export function parseComparativeData(text: string): ComparativeData[] {
    const data: ComparativeData[] = [];

    // Try to find issuer sections
    const issuerSections = text.split(/\*\*([A-Z][^\*]+)\*\*/);

    for (let i = 1; i < issuerSections.length; i += 2) {
        const issuerName = issuerSections[i].trim();
        const content = issuerSections[i + 1] || '';

        const metrics: { [key: string]: number } = {};

        // Extract numeric metrics
        const metricPatterns = [
            { key: 'ROE', pattern: /ROE[:\s]+(\d+\.?\d*)%?/i },
            { key: 'ROA', pattern: /ROA[:\s]+(\d+\.?\d*)%?/i },
            { key: 'Liquidez', pattern: /(?:ratio\s+)?liquidez[:\s]+(\d+\.?\d*)/i },
            { key: 'Deuda', pattern: /deuda[\/\s]+patrimonio[:\s]+(\d+\.?\d*)/i },
        ];

        for (const { key, pattern } of metricPatterns) {
            const match = content.match(pattern);
            if (match) {
                metrics[key] = parseFloat(match[1]);
            }
        }

        if (Object.keys(metrics).length > 0) {
            data.push({ issuerName, metrics });
        }
    }

    return data;
}

/**
 * Extract table data from markdown-style tables in AI responses
 */
export function parseTableData(text: string): { headers: string[], rows: string[][] } | null {
    const lines = text.split('\n');
    let headers: string[] = [];
    const rows: string[][] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Check if this is a table row (contains |)
        if (line.includes('|')) {
            const cells = line.split('|')
                .map(cell => cell.trim())
                .filter(cell => cell.length > 0);

            if (headers.length === 0) {
                // First row is headers
                headers = cells;
            } else if (cells.every(cell => cell.match(/^[-:]+$/))) {
                // Skip separator row
                continue;
            } else {
                rows.push(cells);
            }
        }
    }

    if (headers.length > 0 && rows.length > 0) {
        return { headers, rows };
    }

    return null;
}
