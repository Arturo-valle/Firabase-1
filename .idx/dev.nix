¡Excelente! Este es un prompt muy detallado y estructurado, diseñado para dárselo a una herramienta de desarrollo asistida por IA como Firebase Studio o a un desarrollador. Cubre la arquitectura, los modelos de datos, las funciones y el flujo de trabajo completo, usando la URL de Nicaragua como punto de partida.

---

### **Prompt Detallado para Firebase Studio**

**Persona:** Actúa como un desarrollador full-stack experto, especializado en la creación de aplicaciones web escalables utilizando Firebase, Google Cloud y servicios de IA de Vertex AI. Eres metódico, sigues las mejores prácticas y documentas tu código.

**Misión del Proyecto:** Crear la base de una aplicación web llamada "CentraCapital" cuyo objetivo es agregar, procesar y presentar de forma centralizada toda la información pública de los emisores del mercado de valores de Nicaragua. El sistema debe ser totalmente automatizado, desde el descubrimiento de nuevos documentos PDF hasta su análisis con IA y su presentación en un frontend limpio.

**URL Fuente Inicial:** `https://www.superintendencia.gob.ni/supervision/intendencia-valores/emisores`

---

### **1. Configuración del Proyecto y Estructura de Datos en Firestore**

Tu primera tarea es definir y configurar la base de datos en Firestore. Necesitamos una estructura escalable que separe a los emisores y sus documentos asociados.

**Colección Principal: `issuers`**
Cada documento en esta colección representará a un emisor de valores.

*   `issuerId` (ID del Documento): Usar un slug generado a partir del nombre (ej. `banco-de-america-central-sa`).
*   `name` (string): Nombre completo del emisor (ej. "BANCO DE AMERICA CENTRAL, S.A.").
*   `country` (string): "Nicaragua" (valor fijo por ahora).
*   `sourceUrl` (string): El URL de la página específica del emisor en el sitio de la superintendencia.
*   `lastScraped` (timestamp): La última vez que el sistema revisó esta página en busca de nuevos documentos.
*   `createdAt` (timestamp): Cuando el emisor fue agregado por primera vez.

**Sub-colecciones dentro de cada documento `issuer`:**
Para organizar los documentos de cada emisor, crearemos sub-colecciones.

**a) Sub-colección: `financialStatements`**
*   `statementId` (ID del Documento): Autogenerado por Firestore.
*   `title` (string): El nombre del archivo o título del documento (ej. "ESTADOS FINANCIEROS AUDITADOS A DICIEMBRE 2023").
*   `originalUrl` (string): El URL completo del archivo PDF original. **Este campo es CRÍTICO para evitar duplicados.**
*   `publicationDate` (timestamp): Fecha de publicación extraída del sitio o del documento.
*   `storagePath` (string): La ruta al archivo PDF guardado en Cloud Storage (ej. `documents/nicaragua/issuerId/eeff_2023_12.pdf`).
*   `status` (string): El estado del procesamiento ('pending', 'processing', 'completed', 'error').
*   `structuredData` (map/object): Un objeto JSON con los datos clave extraídos por Vertex AI (ej. `{ "activos_totales": 1500000, "pasivos_totales": 800000, "patrimonio": 700000 }`).
*   `processingError` (string): Mensaje de error si el estado es 'error'.
*   `createdAt` (timestamp): Fecha en que se detectó el documento.

**b) Sub-colección: `relevantFacts`**
Estructura idéntica a `financialStatements`, pero con un campo adicional:
*   `summary` (string): Un resumen de 2-3 frases del hecho relevante, generado por la IA de Vertex AI (Gemini).

---

### **2. Implementación de Cloud Functions (Backend Lógico)**

Ahora, define las funciones serverless que automatizarán todo el proceso. Usa Node.js.

**Función 1: `scrapeNicaraguaIssuers` (Disparador: Cloud Scheduler)**
*   **Trigger:** Se ejecuta una vez al día via Cloud Scheduler.
*   **Librerías:** `axios` para peticiones HTTP, `cheerio` para parsear HTML.
*   **Lógica:**
    1.  Hace una petición GET a la URL fuente: `https://www.superintendencia.gob.ni/supervision/intendencia-valores/emisores`.
    2.  Usa Cheerio para encontrar todos los enlaces `<a>` que apuntan a las páginas de los emisores individuales.
    3.  Por cada enlace encontrado, extrae el nombre del emisor y el `href` (su `sourceUrl`).
    4.  Consulta la colección `issuers` en Firestore para ver si ya existe un emisor con ese `sourceUrl`.
    5.  Si no existe, crea un nuevo documento en la colección `issuers` con la información obtenida.

**Función 2: `scrapeIssuerDocuments` (Disparador: Cloud Scheduler)**
*   **Trigger:** Se ejecuta cada hora via Cloud Scheduler.
*   **Lógica:**
    1.  Consulta la colección `issuers` y busca los emisores que no han sido escaneados en las últimas 24 horas (`lastScraped`). Limita la ejecución a 5-10 emisores por vez para no sobrecargar el sistema.
    2.  Para cada emisor, hace una petición GET a su `sourceUrl`.
    3.  Usa Cheerio para encontrar todos los enlaces `<a>` que terminen en `.pdf` en las secciones de "Estados Financieros" y "Hechos Relevantes".
    4.  Por cada PDF encontrado, extrae su `originalUrl` y su `title`.
    5.  Verifica en las sub-colecciones (`financialStatements`, `relevantFacts`) si ya existe un documento con ese `originalUrl`.
    6.  **Si es un PDF nuevo:**
        a. Descarga el archivo PDF.
        b. Lo sube a **Cloud Storage** en una ruta estructurada (ej. `documents/nicaragua/{issuerId}/{documentId}.pdf`).
        c. Crea un nuevo documento en la sub-colección correspondiente de Firestore (`financialStatements` o `relevantFacts`) con el `status` en 'pending' y la información básica (`originalUrl`, `title`, `storagePath`).

**Función 3: `processDocumentWithAI` (Disparador: Cloud Storage)**
*   **Trigger:** `onObjectFinalized` en el bucket de Cloud Storage. Se activa cada vez que un nuevo PDF es subido por la función `scrapeIssuerDocuments`.
*   **Librerías:** `@google-cloud/documentai`, `@google-cloud/aiplatform`.
*   **Lógica:**
    1.  El trigger proporciona la ruta del archivo (`storagePath`).
    2.  Actualiza el estado del documento en Firestore a 'processing'.
    3.  Identifica si es un estado financiero o un hecho relevante (puedes usar la ruta del archivo o un metadato).
    4.  **Si es un Estado Financiero:**
        a. Llama a la API de **Vertex AI Document AI** con un procesador especializado en análisis de formularios/tablas.
        b. Recibe la respuesta JSON con los datos estructurados.
        c. Actualiza el documento en Firestore con `status: 'completed'` y llena el campo `structuredData` con el JSON recibido.
    5.  **Si es un Hecho Relevante:**
        a. Llama a **Vertex AI Document AI** para hacer OCR y extraer todo el texto.
        b. Toma el texto extraído y lo envía al modelo **Gemini (Vertex AI)** con el prompt: "Resume el siguiente hecho relevante para un inversor en 3 frases concisas y directas: [TEXTO EXTRAÍDO]".
        c. Recibe el resumen.
        d. Actualiza el documento en Firestore con `status: 'completed'` y llena el campo `summary` con el resumen.
    6.  Si ocurre un error en cualquier paso, actualiza el `status` a 'error' y guarda el mensaje en `processingError`.

---

### **3. Frontend Básico con Firebase Hosting**

Finalmente, crea una interfaz de usuario simple para visualizar los datos. Puedes usar el framework web que prefieras (React, Vue, Angular).

1.  **Página Principal (`/`) - Lista de Emisores:**
    *   Lee la colección `issuers` de Firestore en tiempo real.
    *   Muestra una lista o tabla con el nombre de cada emisor.
    *   Cada nombre de emisor es un enlace a su página de detalle (ej. `/issuer/banco-de-america-central-sa`).

2.  **Página de Detalle (`/issuer/:issuerId`) - Perfil del Emisor:**
    *   Obtiene el `issuerId` de la URL.
    *   Lee la información del documento del emisor y, por separado, consulta las sub-colecciones `financialStatements` y `relevantFacts` (ordenadas por fecha descendente).
    *   **Muestra la información de forma clara:**
        *   **Sección de Hechos Relevantes:** Muestra una tarjeta para cada hecho relevante con su título, fecha de publicación y, más importante, el **resumen generado por la IA**. Incluye un enlace para ver el PDF original.
        *   **Sección de Estados Financieros:** Muestra una tabla con los datos clave de los `structuredData` para una comparación fácil a lo largo del tiempo. Incluye un enlace para descargar el PDF completo.

---

**Punto de Partida:** Por favor, comienza generando el código para:
1.  La estructura de datos en Firestore (puedes proporcionarla como un archivo de reglas de seguridad o un script de inicialización si es necesario).
2.  El código completo de la Cloud Function `scrapeNicaraguaIssuers`, incluyendo las dependencias en `package.json`.{ pkgs, ... }: {
  # El canal de nixpkgs define qué versiones de paquetes están disponibles.
  # "stable-24.05" ofrece paquetes probados y estables.
  channel = "stable-24.05";

  # Lista de paquetes a instalar desde el canal especificado.
  packages = [
    # Requerimos Node.js para desarrollar y desplegar las Cloud Functions.
    pkgs.nodejs_20
  ];

  # Configuraciones específicas del IDE de Firebase Studio.
  idx = {
    # Lista de extensiones de VS Code para instalar.
    extensions = [
      # Herramientas esenciales para el desarrollo en Firebase.
      "firebase.firebase-vscode"
    ];
  };
}
