# Guía de Configuración: Firebase MCP

## Paso 1: Generar Service Account Key

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto **mvp-nic-market**
3. Ve a ⚙️ **Project Settings** > **Service Accounts**
4. Click en **"Generate new private key"**
5. Guarda el archivo JSON descargado en una ubicación segura, por ejemplo:
   ```
   C:\Users\artur\.firebase\mvp-nic-market-key.json
   ```

> [!CAUTION]
> **NUNCA** subas este archivo a Git. Contiene credenciales sensibles.

## Paso 2: Configurar Variables de Entorno

Crea o edita tu archivo de variables de entorno del sistema:

```powershell
# En PowerShell (permanente)
[Environment]::SetEnvironmentVariable("SERVICE_ACCOUNT_KEY_PATH", "C:\Users\artur\.firebase\mvp-nic-market-key.json", "User")
[Environment]::SetEnvironmentVariable("FIREBASE_STORAGE_BUCKET", "mvp-nic-market.appspot.com", "User")
```

## Paso 3: Configurar MCP en tu Editor

### Para VS Code con Antigravity/Claude

Crea el archivo `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "firebase": {
      "command": "npx",
      "args": ["-y", "firebase-mcp-server"],
      "env": {
        "SERVICE_ACCOUNT_KEY_PATH": "C:\\Users\\artur\\.firebase\\mvp-nic-market-key.json"
      }
    }
  }
}
```

### Alternativa: Usando Firebase CLI Login

Si ya tienes `firebase login` configurado, puedes usar:

```json
{
  "mcpServers": {
    "firebase": {
      "command": "npx",
      "args": ["-y", "firebase-mcp-server", "--project", "mvp-nic-market"]
    }
  }
}
```

## Verificación

Después de configurar, reinicia tu editor y el MCP debería conectarse automáticamente.
