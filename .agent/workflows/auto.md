---
description: Flujos de trabajo autónomos para mantenimiento y operaciones comunes (Turbo Mode habilitado)
---
// turbo-all

Esta configuración autoriza la ejecución automática de comandos críticos y operacionales según las instrucciones del usuario.

# Comandos de Mantenimiento Crítico
1. Limpieza profunda del root
   rm -rf node_modules package-lock.json && npm install

2. Limpieza profunda del backend
   cd functions && rm -rf node_modules package-lock.json && npm install && cd ..

# Comandos Estándar
1. Instalar dependencias
   npm install

2. Servidor de desarrollo
   npm run dev

3. Construcción del proyecto
   npm run build

4. Linting
   npm run lint

# Comandos Firebase
1. Despliegue completo
   firebase deploy

2. Despliegue solo functions
   firebase deploy --only functions

3. Logs de funciones
   firebase functions:log

4. Iniciar emuladores
   firebase emulators:start

# Comandos de Verificación de API (PowerShell)
Comandos autorizados para verificar endpoints del proyecto:

1. **Verificar historial de métricas por emisor**
   Comando: `$r = Invoke-RestMethod -Uri "https://us-central1-nicabolsa-mvp.cloudfunctions.net/api/metrics/history/{issuerId}"; $r | ConvertTo-Json -Depth 5`

2. **Verificar métricas de emisor**
   Comando: `$r = Invoke-RestMethod -Uri "https://us-central1-nicabolsa-mvp.cloudfunctions.net/api/metrics/{issuerId}"; $r | ConvertTo-Json -Depth 5`

3. **Verificar endpoint de chat analyst**
   Comando: `Invoke-RestMethod -Uri "https://us-central1-nicabolsa-mvp.cloudfunctions.net/api/chat" -Method Post -ContentType "application/json" -Body '{"message": "test"}'`

4. **Cualquier petición al dominio del proyecto**
   Comando: `Invoke-RestMethod -Uri "https://us-central1-nicabolsa-mvp.cloudfunctions.net/api/*"`

# Variaciones Lógicas Autorizadas
- Cualquier variación de los comandos anteriores con diferentes parámetros
- Comandos con pipes a herramientas como `jq`, `grep`, `head`, `tail`
- Comandos con flags adicionales como `-v`, `-H`, `-d`, `-X`
