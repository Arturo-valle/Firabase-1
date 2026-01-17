const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Mock or require the normalization/config utils if needed, but for a standalone script
// we can just re-implement the simple mapping logic or use the existing ones.
const { EXTRACTION_MAPPING, WHITELIST } = require('../utils/issuerConfig');

async function runComprehensiveAudit() {
    console.log('🚀 Iniciando Auditoría Forense de Datos y Vectores...\n');

    if (!admin.apps.length) {
        admin.initializeApp();
    }

    const db = getFirestore();
    const auditResults = {
        timestamp: new Date().toISOString(),
        summary: {
            totalIssuers: 0,
            healthyIssuers: 0,
            degradedIssuers: 0,
            criticalIssuers: 0,
            totalDocumentsExpected: 0,
            totalDocumentsVectorized: 0,
            vectorizationCoverage: 0
        },
        issuers: {}
    };

    const docCountTotal = await db.collection('documentChunks').count().get();
    const factCountTotal = await db.collection('fact_vectors').count().get();
    console.log(`📊 Totales Globales - Chunks: ${docCountTotal.data().count} | Hechos Vectorizados: ${factCountTotal.data().count}\n`);

    const issuersSnapshot = await db.collection('issuers').get();

    for (const issuerDoc of issuersSnapshot.docs) {
        const issuerData = issuerDoc.data();
        const issuerId = issuerDoc.id;

        // Skip if not in whitelist (unless we want to audit orphans)
        if (!WHITELIST.includes(issuerId)) continue;

        auditResults.summary.totalIssuers++;

        console.log(`🧐 Auditando Emisor: ${issuerId.toUpperCase()}`);

        const stats = {
            id: issuerId,
            name: issuerData.name || 'MISSING',
            acronym: issuerData.acronym || 'MISSING',
            sector: issuerData.sector || 'MISSING',
            status: 'HEALTHY',
            documents: {
                total: issuerData.documents?.length || 0,
                vectorized: 0,
                missing: []
            },
            vectorStats: {
                chunks: 0,
                facts: 0,
                nullEmbeddings: 0
            },
            issues: []
        };

        // Validate Metadata
        if (stats.name === 'MISSING') stats.issues.push('Nombre faltante');
        if (stats.acronym === 'MISSING') stats.issues.push('Acrónimo faltante');
        if (stats.sector === 'MISSING') stats.issues.push('Sector faltante');

        // Mappings for vector search
        const mappingIds = EXTRACTION_MAPPING[issuerId] || [issuerId];

        // 1. Fetch Chunks and Facts
        const [chunkSnap, factSnap] = await Promise.all([
            db.collection('documentChunks').where('issuerId', 'in', mappingIds).get(),
            db.collection('fact_vectors').where('issuerId', 'in', mappingIds).get()
        ]);

        stats.vectorStats.chunks = chunkSnap.size;
        stats.vectorStats.facts = factSnap.size;

        // Group chunks by document to see what's covered
        const vectorizedTitles = new Set();

        chunkSnap.forEach(d => {
            const data = d.data();
            const title = data.metadata?.documentTitle || data.title;
            if (title) vectorizedTitles.add(title.trim().toLowerCase());
            if (!data.embedding || !Array.isArray(data.embedding)) stats.vectorStats.nullEmbeddings++;
        });

        factSnap.forEach(d => {
            const data = d.data();
            const title = data.metadata?.documentTitle || data.title;
            if (title) vectorizedTitles.add(title.trim().toLowerCase());
            if (!data.embedding || !Array.isArray(data.embedding)) stats.vectorStats.nullEmbeddings++;
        });

        // 2. Cross-reference with expected documents
        if (issuerData.documents) {
            issuerData.documents.forEach(doc => {
                const cleanTitle = (doc.title || '').trim().toLowerCase();
                const found = Array.from(vectorizedTitles).some(vt => vt.includes(cleanTitle) || cleanTitle.includes(vt));

                if (found) {
                    stats.documents.vectorized++;
                } else {
                    stats.documents.missing.push(doc.title);
                }
            });
        }

        // 3. Status Determination
        if (stats.issues.length > 0 || stats.vectorStats.nullEmbeddings > 0) {
            stats.status = 'CRITICAL';
        } else if (stats.documents.total > 0 && stats.documents.vectorized < stats.documents.total) {
            stats.status = 'DEGRADED';
        }

        if (stats.status === 'CRITICAL') auditResults.summary.criticalIssuers++;
        else if (stats.status === 'DEGRADED') auditResults.summary.degradedIssuers++;
        else auditResults.summary.healthyIssuers++;

        auditResults.summary.totalDocumentsExpected += stats.documents.total;
        auditResults.summary.totalDocumentsVectorized += stats.documents.vectorized;

        auditResults.issuers[issuerId] = stats;

        console.log(`   └─ Resultado: ${stats.status} | Docs: ${stats.documents.vectorized}/${stats.documents.total} | Chunks: ${stats.vectorStats.chunks}`);
        if (stats.documents.missing.length > 0) {
            console.log(`   ❗ Pendientes: ${stats.documents.missing.length} documentos sin vectores.`);
        }
    }

    auditResults.summary.vectorizationCoverage = auditResults.summary.totalDocumentsExpected > 0 ?
        (auditResults.summary.totalDocumentsVectorized / auditResults.summary.totalDocumentsExpected * 100).toFixed(2) : 0;

    console.log('\n--- 🏁 RESUMEN FINAL ---');
    console.log(`COBERTURA DE VECTORIZACIÓN: ${auditResults.summary.vectorizationCoverage}%`);
    console.log(`EMISORES SALUDABLES: ${auditResults.summary.healthyIssuers}`);
    console.log(`EMISORES DEGRADADOS: ${auditResults.summary.degradedIssuers}`);
    console.log(`EMISORES CRÍTICOS: ${auditResults.summary.criticalIssuers}`);

    // Store report
    // const reportPath = path.join(__dirname, '../../audit_report_full.json');
    // fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2));

    return auditResults;
}

if (require.main === module) {
    runComprehensiveAudit()
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = runComprehensiveAudit;
