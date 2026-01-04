#!/usr/bin/env node
/**
 * CLI Unificado para MVP-NIC-MARKET
 * 
 * Centraliza comandos de desarrollo, mantenimiento y despliegue.
 * 
 * Uso:
 *   npm run cli -- <comando> [opciones]
 *   node cli.js <comando> [opciones]
 * 
 * Ejemplos:
 *   npm run cli -- deploy
 *   npm run cli -- audit AGRI
 *   npm run cli -- extract horizonte
 */

const { execSync, spawn } = require('child_process');
const path = require('path');

const COMMANDS = {
    // === Desarrollo ===
    dev: {
        description: 'Inicia servidor de desarrollo del frontend',
        run: () => exec('npm run dev', 'webapp')
    },

    build: {
        description: 'Construye el frontend para producción',
        run: () => exec('npm run build', 'webapp')
    },

    emulators: {
        description: 'Inicia emuladores de Firebase',
        run: () => exec('firebase emulators:start')
    },

    // === Despliegue ===
    deploy: {
        description: 'Despliega todo (hosting + functions)',
        run: () => exec('firebase deploy')
    },

    'deploy:functions': {
        description: 'Despliega solo Cloud Functions',
        run: () => exec('firebase deploy --only functions')
    },

    'deploy:hosting': {
        description: 'Despliega solo hosting (frontend)',
        run: () => {
            exec('npm run build', 'webapp');
            exec('firebase deploy --only hosting');
        }
    },

    // === Mantenimiento ===
    audit: {
        description: 'Ejecuta auditoría de datos de emisores',
        args: '[issuerId]',
        run: (args) => {
            if (args[0]) {
                exec(`node scripts/audit_via_api.js ${args[0]}`);
            } else {
                exec('node scripts/audit_via_api.js');
            }
        }
    },

    extract: {
        description: 'Extrae métricas de un emisor',
        args: '<issuerId>',
        run: (args) => {
            if (!args[0]) {
                console.error('❌ Error: Debes especificar un issuerId');
                process.exit(1);
            }
            exec(`node scripts/reextract_all_history.js ${args[0]}`);
        }
    },

    logs: {
        description: 'Muestra logs de Cloud Functions',
        run: () => exec('firebase functions:log')
    },

    // === Limpieza ===
    clean: {
        description: 'Limpia node_modules y reinstala',
        run: () => {
            exec('rm -rf node_modules package-lock.json && npm install');
            exec('rm -rf node_modules package-lock.json && npm install', 'functions');
            exec('rm -rf node_modules package-lock.json && npm install', 'webapp');
        }
    },

    // === Ayuda ===
    help: {
        description: 'Muestra esta ayuda',
        run: () => showHelp()
    }
};

// === Helpers ===

function exec(cmd, cwd = null) {
    const options = {
        stdio: 'inherit',
        cwd: cwd ? path.join(process.cwd(), cwd) : process.cwd()
    };
    console.log(`\n🚀 Ejecutando: ${cmd}${cwd ? ` (en ${cwd})` : ''}\n`);
    try {
        execSync(cmd, options);
    } catch (error) {
        console.error(`❌ Error ejecutando: ${cmd}`);
        process.exit(1);
    }
}

function showHelp() {
    console.log('\n📋 CLI Unificado - MVP-NIC-MARKET\n');
    console.log('Uso: npm run cli -- <comando> [argumentos]\n');
    console.log('Comandos disponibles:\n');

    Object.entries(COMMANDS).forEach(([name, config]) => {
        const args = config.args || '';
        console.log(`  ${name.padEnd(18)} ${args.padEnd(12)} ${config.description}`);
    });

    console.log('\nEjemplos:');
    console.log('  npm run cli -- deploy');
    console.log('  npm run cli -- audit AGRI');
    console.log('  npm run cli -- extract horizonte\n');
}

// === Main ===

const [, , command, ...args] = process.argv;

if (!command || command === 'help' || command === '-h' || command === '--help') {
    showHelp();
    process.exit(0);
}

if (!COMMANDS[command]) {
    console.error(`❌ Comando desconocido: ${command}`);
    console.log('Usa "npm run cli -- help" para ver comandos disponibles.');
    process.exit(1);
}

COMMANDS[command].run(args);
