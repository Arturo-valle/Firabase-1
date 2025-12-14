#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ISSUERS_PATH = path.join(__dirname, '..', 'webapp', 'src', 'issuers.json');

function loadIssuers() {
  const raw = fs.readFileSync(ISSUERS_PATH, 'utf8');
  return JSON.parse(raw);
}

function isHechoRelevante(doc) {
  return (doc.type || '').toLowerCase().includes('hecho relevante');
}

function buildSummary(issuers) {
  return issuers.map((issuer) => {
    const documents = Array.isArray(issuer.documents) ? issuer.documents : [];
    const hechos = documents.filter(isHechoRelevante);
    return {
      name: issuer.name,
      id: issuer.id || issuer.name,
      facts: hechos,
      documents,
    };
  });
}

function printReport(summary) {
  const withFacts = summary.filter((item) => item.facts.length > 0);
  const withoutFacts = summary.filter((item) => item.facts.length === 0);

  console.log(`Emisores totales: ${summary.length}`);
  console.log(`Con Hechos Relevantes: ${withFacts.length}`);
  console.log(`Sin Hechos Relevantes: ${withoutFacts.length}`);
  console.log('');

  console.log('Emisores con Hechos Relevantes (conteo):');
  withFacts
    .sort((a, b) => b.facts.length - a.facts.length || a.name.localeCompare(b.name))
    .forEach((item) => {
      console.log(`- ${item.name}: ${item.facts.length}`);
    });
  console.log('');

  console.log('Emisores sin Hechos Relevantes:');
  withoutFacts
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((item) => {
      console.log(`- ${item.name}`);
    });
}

function main() {
  const issuers = loadIssuers();
  const summary = buildSummary(issuers);
  printReport(summary);
}

main();
