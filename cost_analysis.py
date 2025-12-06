"""
ANÁLISIS DE COSTOS - PROCESAMIENTO DE DOCUMENTOS PENDIENTES
CentraCapital Intelligence - Vertex AI (Google Cloud)
"""

# ============================================================================
# DATOS ACTUALES DEL SISTEMA
# ============================================================================
documentos_procesados = 37
chunks_generados = 6976
chunks_promedio_por_doc = chunks_generados / documentos_procesados  # ~188.5 chunks/doc

documentos_pendientes = 552

print("=" * 80)
print("💰 ANÁLISIS DE COSTOS - PROCESAMIENTO DE 552 DOCUMENTOS PENDIENTES")
print("=" * 80)

print(f"\n📊 MÉTRICAS ACTUALES:")
print(f"   Documentos procesados: {documentos_procesados}")
print(f"   Chunks generados: {chunks_generados:,}")
print(f"   Promedio: {chunks_promedio_por_doc:.1f} chunks/documento")

# ============================================================================
# ESTIMACIÓN DE CHUNKS FUTUROS
# ============================================================================
chunks_estimados = int(documentos_pendientes * chunks_promedio_por_doc)

print(f"\n📈 PROYECCIÓN:")
print(f"   Documentos a procesar: {documentos_pendientes}")
print(f"   Chunks estimados: {chunks_estimados:,}")

# ============================================================================
# PRECIOS DE VERTEX AI (Región us-central1)
# Fuente: https://cloud.google.com/vertex-ai/pricing
# ============================================================================

# Text Embeddings API - text-embedding-004
# Precio: $0.00002 USD por 1,000 caracteres
# Promedio: ~650 caracteres por chunk
caracteres_por_chunk = 650
precio_embedding_por_1k_chars = 0.00002

# Gemini 2.0 Flash (para generación de respuestas - opcional en procesamiento)
# Input: $0.075 per 1M tokens
# Output: $0.30 per 1M tokens
# Nota: El procesamiento masivo NO genera respuestas, solo embeddings y chunks

# ============================================================================
# CÁLCULO 1: EMBEDDINGS (COSTO PRINCIPAL)
# ============================================================================
print("\n" + "=" * 80)
print("🔢 CÁLCULO DE COSTOS - EMBEDDINGS")
print("=" * 80)

caracteres_totales = chunks_estimados * caracteres_por_chunk
costo_embeddings = (caracteres_totales / 1000) * precio_embedding_por_1k_chars

print(f"\n1. Text Embeddings (text-embedding-004):")
print(f"   └─ Chunks a procesar: {chunks_estimados:,}")
print(f"   └─ Caracteres estimados: {caracteres_totales:,}")
print(f"   └─ Precio por 1K chars: ${precio_embedding_por_1k_chars:.5f}")
print(f"   └─ COSTO TOTAL: ${costo_embeddings:.2f} USD")

# ============================================================================
# CÁLCULO 2: FIRESTORE (ALMACENAMIENTO Y ESCRITURA)
# ============================================================================
print("\n" + "=" * 80)
print("🗄️  CÁLCULO DE COSTOS - FIRESTORE")
print("=" * 80)

# Firestore Pricing (us-central1)
# Document writes: $0.18 per 100,000 writes
# Storage: $0.18 per GB/month
precio_por_100k_writes = 0.18
precio_storage_gb_mes = 0.18

# Estimación de writes (cada chunk = 1 write + metadata)
writes_totales = chunks_estimados * 1.1  # +10% para metadata y updates
costo_writes = (writes_totales / 100000) * precio_por_100k_writes

# Estimación de storage
# Promedio: 1 chunk ~= 800 bytes (texto + embedding vector + metadata)
bytes_por_chunk = 800
storage_gb = (chunks_estimados * bytes_por_chunk) / (1024**3)
costo_storage_mensual = storage_gb * precio_storage_gb_mes

print(f"\n2. Firestore Document Writes:")
print(f"   └─ Writes estimados: {int(writes_totales):,}")
print(f"   └─ Precio por 100K writes: ${precio_por_100k_writes}")
print(f"   └─ COSTO TOTAL: ${costo_writes:.2f} USD")

print(f"\n3. Firestore Storage (mensual):")
print(f"   └─ Storage estimado: {storage_gb:.3f} GB")
print(f"   └─ Precio por GB/mes: ${precio_storage_gb_mes}")
print(f"   └─ COSTO MENSUAL: ${costo_storage_mensual:.2f} USD")

# ============================================================================
# CÁLCULO 3: CLOUD FUNCTIONS (TIEMPO DE EJECUCIÓN)
# ============================================================================
print("\n" + "=" * 80)
print("⚡ CÁLCULO DE COSTOS - CLOUD FUNCTIONS")
print("=" * 80)

# Cloud Functions Pricing (2nd Gen)
# vCPU: $0.00001800 per vCPU-second
# Memory: $0.00000200 per GB-second
# Invocations: $0.40 per 1M invocations

segundos_por_documento = 45  # Promedio estimado para procesar 1 doc
vcpu = 1
memory_gb = 1
precio_vcpu_segundo = 0.00001800
precio_memory_gb_segundo = 0.00000200
precio_por_1m_invocations = 0.40

tiempo_total_segundos = documentos_pendientes * segundos_por_documento
costo_vcpu = tiempo_total_segundos * vcpu * precio_vcpu_segundo
costo_memory = tiempo_total_segundos * memory_gb * precio_memory_gb_segundo
costo_invocations = (documentos_pendientes / 1000000) * precio_por_1m_invocations

costo_cloud_functions_total = costo_vcpu + costo_memory + costo_invocations

print(f"\n4. Cloud Functions (Procesamiento):")
print(f"   └─ Tiempo estimado: {tiempo_total_segundos/3600:.1f} horas")
print(f"   └─ vCPU cost: ${costo_vcpu:.2f}")
print(f"   └─ Memory cost: ${costo_memory:.2f}")
print(f"   └─ Invocations: ${costo_invocations:.4f}")
print(f"   └─ COSTO TOTAL: ${costo_cloud_functions_total:.2f} USD")

# ============================================================================
# RESUMEN FINAL
# ============================================================================
print("\n" + "=" * 80)
print("💵 RESUMEN DE COSTOS TOTALES")
print("=" * 80)

costo_total_one_time = costo_embeddings + costo_writes + costo_cloud_functions_total
costo_mensual_recurrente = costo_storage_mensual

print(f"\n┌─ COSTOS ÚNICOS (One-time):")
print(f"│  ├─ Embeddings: ${costo_embeddings:.2f}")
print(f"│  ├─ Firestore Writes: ${costo_writes:.2f}")
print(f"│  └─ Cloud Functions: ${costo_cloud_functions_total:.2f}")
print(f"└─ TOTAL ONE-TIME: ${costo_total_one_time:.2f} USD")

print(f"\n┌─ COSTOS RECURRENTES (Mensual):")
print(f"└─ Firestore Storage: ${costo_mensual_recurrente:.2f} USD/mes")

print(f"\n" + "=" * 80)
print(f"🎯 COSTO TOTAL ESTIMADO PARA PROCESAR 552 DOCUMENTOS:")
print(f"   └─ Inversión inicial: ${costo_total_one_time:.2f} USD")
print(f"   └─ Costo mensual: ${costo_mensual_recurrente:.2f} USD")
print("=" * 80)

# ============================================================================
# DESGLOSE POR EMISOR
# ============================================================================
print("\n" + "=" * 80)
print("📋 DESGLOSE DE COSTOS POR EMISOR")
print("=" * 80)

emisores_pendientes = [
    ("Banco De Finanzas", 143),
    ("Corporación Agricola", 129),
    ("FAMA", 112),
    ("Banco De La Producción", 95),
    ("FID, Sociedad Anónima", 41),
    ("Financiera FDL", 18),
    ("INVERCASA SAFI", 14),
]

print(f"\n{'Emisor':<30} {'Docs':<8} {'Chunks Est.':<12} {'Costo Est.':<12}")
print("-" * 70)

for emisor, docs in emisores_pendientes:
    chunks_emisor = int(docs * chunks_promedio_por_doc)
    costo_emisor = (chunks_emisor * caracteres_por_chunk / 1000) * precio_embedding_por_1k_chars
    print(f"{emisor:<30} {docs:<8} {chunks_emisor:<12,} ${costo_emisor:<11.2f}")

print("-" * 70)

# ============================================================================
# OPTIMIZACIONES Y RECOMENDACIONES
# ============================================================================
print("\n" + "=" * 80)
print("💡 RECOMENDACIONES PARA OPTIMIZAR COSTOS")
print("=" * 80)

print("""
1. **Procesamiento por lotes (Batch Processing)**
   └─ Procesar en grupos de 50-100 documentos para monitorear costos
   
2. **Filtrado inteligente**
   └─ Priorizar documentos financieros más recientes (2020-2025)
   └─ Evitar documentos duplicados o versiones antiguas
   
3. **Chunking optimizado**
   └─ Ajustar tamaño de chunks para reducir overlapping
   └─ Posible ahorro: 10-15% en embeddings
   
4. **Cache de embeddings**
   └─ Guardar embeddings reutilizables para evitar regeneración
   
5. **Procesamiento nocturno**
   └─ Usar Cloud Scheduler para procesar fuera de horas pico
   
6. **Presupuesto mensual**
   └─ Configurar alertas en $10 USD para controlar costos
""")

print("\n" + "=" * 80)
print("✅ ANÁLISIS COMPLETO")
print("=" * 80)
