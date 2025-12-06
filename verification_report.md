# Reporte de Verificación de Datos de la Interfaz

He realizado una auditoría profunda del código fuente (`webapp/src`) para verificar la autenticidad de los datos mostrados en la interfaz. A continuación, presento los hallazgos detallados:

## Resumen Ejecutivo

La interfaz opera en un **modo híbrido**.
- ✅ **Datos Reales**: Las estadísticas operativas del sistema (documentos procesados, cobertura, chunks) provienen de una API en vivo.
- ⚠️ **Datos Simulados (Mock)**: La información financiera específica (precios, índices, variaciones, gráficas y watchlist) está actualmente "hardcodeada" o generada aleatoriamente.

---

## Desglose Detallado

### 1. Tarjetas de Índices de Mercado (Top Bancario, Financiero, Índice General)
**Estado:** ⚠️ **SIMULADO**

*   **Valores:** Los números principales (`245.08`, `189.45`, `312.76`) y sus variaciones porcentuales están escritos directamente en el código (hardcoded).
*   **Gráficas (Sparklines):** Las pequeñas líneas de tendencia verde/roja se generan con una función de números aleatorios (`Math.random()`).
*   **Evidencia:**
    *   Archivo: `webapp/src/pages/Home.tsx` (Líneas 52-76)
    *   Archivo: `webapp/src/utils/marketDataApi.ts` (Función `generateSparklineData`)

### 2. Desarrollos Recientes (Noticias)
**Estado:** ⚠️ **PARCIALMENTE SIMULADO**

*   **Noticia 1 (Sistema):** ✅ **REAL**. Muestra datos dinámicos sobre documentos procesados y cobertura, obtenidos de la API.
*   **Noticia 2 (FAMA):** ⚠️ **ESTÁTICO**. El texto "FAMA mantiene calificación AA..." está fijo en el código.
*   **Noticia 3 (Banpro):** ⚠️ **ESTÁTICO**. El texto "Banpro reporta crecimiento..." está fijo en el código.
*   **Evidencia:**
    *   Archivo: `webapp/src/pages/Home.tsx` (Líneas 78-97)

### 3. Watchlist (Barra Lateral Derecha)
**Estado:** ⚠️ **SIMULADO**

*   **Emisores:** Los datos de FAMA, BDF, AGRI y BANPRO (precios, ratings, cambios) provienen de una lista estática definida como `mockWatchlist`.
*   **Comportamiento:** Aunque puedes filtrar y marcar favoritos, los datos base no se están actualizando desde ninguna base de datos.
*   **Evidencia:**
    *   Archivo: `webapp/src/components/layout/RightPanel.tsx` (Línea 16: `const mockWatchlist = [...]`)

### 4. Métricas del Sistema (Pie de Página)
**Estado:** ✅ **REAL (FUNCIONAL)**

*   **Datos:** "Emisores Activos", "Docs Procesados", "Chunks en DB" y "Cobertura".
*   **Fuente:** Estos datos se obtienen de una petición real a la API: `https://us-central1-mvp-nic-market.cloudfunctions.net/api/status`.
*   **Evidencia:**
    *   Archivo: `webapp/src/utils/marketDataApi.ts` (Función `fetchSystemStatus`)
    *   Archivo: `webapp/src/pages/Home.tsx` (Líneas 240-262)

---

## Conclusión Técnica

Para llevar esta interfaz a un estado 100% funcional ("Producción"), se requiere:
1.  Conectar los componentes `Home.tsx` y `RightPanel.tsx` a endpoints reales para obtener datos de mercado (precios, índices).
2.  Reemplazar los generadores aleatorios de gráficas con datos históricos reales de la base de datos.
