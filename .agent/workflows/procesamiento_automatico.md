---
description: Automatización de scripts de procesamiento y auditoría sin confirmaciones manuales (Turbo Mode).
---

Este flujo de trabajo permite ejecutar los scripts de mantenimento de datos sin interrupciones para confirmación.
La instrucción `// turbo-all` asegura que Antigravity no solicite aprobación manual para estos comandos.

// turbo-all

## Scripts de Procesamiento

1. **Ejecutar Procesador de Lotes (Batch Processor)**
   Inicia el procesamiento de documentos históricos.
   Comando: `node scripts/batch_processor_v2.js`

2. **Ejecutar Auditoría de API (Audit)**
   Verifica el progreso de la recuperación de datos.
   Comando: `node scripts/audit_via_api.js`

## Peticiones a la API (PowerShell)

3. **Consultar Métricas de un Emisor**
   Obtiene las métricas históricas de un emisor específico.
   Comando: `$r = Invoke-RestMethod -Uri "https://us-central1-mvp-nic-market.cloudfunctions.net/api/metrics/{issuerId}"; $r | ConvertTo-Json -Depth 5`

4. **Consultar Historial de un Emisor**
   Obtiene el historial completo de un emisor.
   Comando: `$r = Invoke-RestMethod -Uri "https://us-central1-mvp-nic-market.cloudfunctions.net/api/metrics/history/{issuerId}"; $r | ConvertTo-Json -Depth 5`

5. **Verificar Estado del API**
   Comprueba que la API esté funcionando.
   Comando: `$r = Invoke-RestMethod -Uri "https://us-central1-mvp-nic-market.cloudfunctions.net/api/issuers"; $r | ConvertTo-Json -Depth 3`

## Firebase y Diagnóstico

6. **Verificar Logs de Firebase (API)**
   Revisa los logs recientes de la función API.
   Comando: `firebase functions:log --only api`

7. **Verificar Logs de Firebase (General)**
   Revisa todos los logs recientes de Cloud Functions.
   Comando: `firebase functions:log`

8. **Deploy de Cloud Functions**
   Despliega las funciones actualizadas a Firebase.
   Comando: `firebase deploy --only functions`

9. **Deploy Solo de API**
   Despliega únicamente la función API.
   Comando: `firebase deploy --only functions:api`

10. **Deploy de Mantenimiento Específico**
    Despliega API y tareas manuales para sincronización y finanzas.
    Comando: `firebase deploy --only functions:api,functions:manualSyncTask,functions:manualIndexFinancialsTask`

## NPM y Build

11. **Instalar dependencias**
    Instala las dependencias del proyecto.
    Comando: `npm install`

12. **Build del Frontend**
    Compila el frontend para producción.
    Comando: `npm run build`

13. **Iniciar servidor de desarrollo**
    Inicia el servidor de desarrollo local.
    Comando: `npm run dev`
