
import { useState, useEffect } from 'react';
import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { initializeApp } from 'firebase/app';
import type { Issuer, Document } from './types';

// --- Configuración de Firebase ---
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "mvp-nic-market",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};
const firebaseApp = initializeApp(firebaseConfig);
const functions = getFunctions(firebaseApp);

// --- Componentes ---

interface IssuerDetailViewProps {
  issuer: Issuer;
  onBack: () => void;
}

const IssuerDetailView: React.FC<IssuerDetailViewProps> = ({ issuer, onBack }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!issuer || !issuer.detailUrl) return;

    let isMounted = true; // Para evitar actualizaciones de estado en un componente desmontado

    const fetchDocuments = async () => {
      console.log(`Invocando 'runScraping' para ${issuer.name}`);
      
      const getIssuerDocumentsFunction = httpsCallable<any, Document[]>(functions, 'runScraping');

      // Promise para el timeout
      const timeoutPromise = new Promise<HttpsCallableResult<Document[]>>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 25000) // 25 segundos
      );
      
      // Promise para la función de Firebase
      const functionPromise = getIssuerDocumentsFunction({ detailUrl: issuer.detailUrl });

      try {
        // Competir ambas promesas
        const result = await Promise.race([functionPromise, timeoutPromise]);
        
        if (isMounted) {
          console.log("Documentos recibidos:", result.data);
          setDocuments(result.data);
        }

      } catch (err: any) {
        if (isMounted) {
          if (err.message === 'Timeout') {
            console.log("La solicitud ha tardado demasiado.");
            setError("La solicitud ha tardado demasiado. Es posible que el servidor del emisor no esté disponible o sus datos sean incompatibles.");
          } else {
            console.error("Error al buscar documentos:", err);
            setError("No se pudieron cargar los documentos. El formato de los datos de origen puede ser incompatible.");
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchDocuments();

    // Función de limpieza
    return () => {
      isMounted = false;
    };
  }, [issuer]);

  return (
    <div className="p-4 bg-white rounded-lg shadow-md animate-fade-in">
      <button onClick={onBack} className="mb-4 text-sm font-medium text-blue-600 hover:text-blue-800">{'&lt; Volver a la lista'}</button>
      <h2 className="text-2xl font-bold text-gray-900">{issuer.name} ({issuer.acronym})</h2>
      <span className={`inline-block px-2 py-1 mt-2 text-xs font-semibold rounded-full ${issuer.sector === 'Público' ? 'bg-blue-200 text-blue-800' : 'bg-green-200 text-green-800'}`}>
        {issuer.sector}
      </span>
      <p className="mt-4 text-gray-700">{issuer.description || 'Descripción no disponible.'}</p>
      
      <div className="mt-6">
        <h3 className="text-lg font-semibold">Documentos y Hechos Relevantes</h3>
        {isLoading && <p className="text-sm text-gray-500 mt-2">Buscando documentos...</p>}
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        {!isLoading && !error && (
          documents.length > 0 ? (
            <ul className="list-disc list-inside mt-2 space-y-2">
              {documents.map((doc, index) => (
                <li key={index}>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {doc.text}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 mt-2">No se encontraron documentos para este emisor.</p>
          )
        )}
      </div>
    </div>
  );
};

const VaultModule = () => {
  const [selectedIssuer, setSelectedIssuer] = useState<Issuer | null>(null);
  const [issuers, setIssuers] = useState<Issuer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIssuers = async () => {
      try {
        const getIssuersFunction = httpsCallable<void, { issuers: Issuer[] }>(functions, 'getNicaraguaIssuers');
        const result = await getIssuersFunction();
        // Ordenar alfabéticamente
        const sortedIssuers = result.data.issuers.sort((a, b) => a.name.localeCompare(b.name));
        setIssuers(sortedIssuers);
      } catch (err) {
        console.error("Error al buscar emisores:", err);
        setError("No se pudieron cargar los datos de los emisores.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchIssuers();
  }, []);

  if (isLoading) return <div className="p-4 text-center">Cargando emisores...</div>;
  if (error) return <div className="p-4 text-center text-red-600">{error}</div>;
  if (selectedIssuer) return <IssuerDetailView issuer={selectedIssuer} onBack={() => setSelectedIssuer(null)} />;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-4">Módulo 1: La Bóveda Inteligente</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {issuers.map((issuer, index) => (
          <div 
            key={index} // Usar index como último recurso para la key
            onClick={() => setSelectedIssuer(issuer)}
            className="bg-white p-4 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-200 ease-in-out"
          >
            <h3 className="text-lg font-bold text-gray-800">{issuer.name}</h3>
            {issuer.acronym && <p className="text-sm text-gray-600">{issuer.acronym}</p>}
            <span className={`inline-block px-2 py-1 mt-2 text-xs font-semibold rounded-full ${issuer.sector === 'Público' ? 'bg-blue-200 text-blue-800' : 'bg-green-200 text-green-800'}`}>
              {issuer.sector}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const StandardizerModule = () => <div className="p-4"><h2 className="text-2xl font-semibold">Módulo 2: El Estandarizador</h2><p className="mt-2">Aquí estará la funcionalidad para extraer, limpiar y estandarizar los datos.</p></div>;
const ComparatorModule = () => <div className="p-4"><h2 className="text-2xl font-semibold">Módulo 3: El Comparador</h2><p className="mt-2">Herramientas para el análisis y comparación de métricas estandarizadas.</p></div>;

// --- Componente Principal de la Aplicación ---
function App() {
  const [activeModule, setActiveModule] = useState('vault');

  const renderModule = () => {
    switch (activeModule) {
      case 'vault': return <VaultModule />;
      case 'standardizer': return <StandardizerModule />;
      case 'comparator': return <ComparatorModule />;
      default: return <VaultModule />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold leading-tight text-gray-900">El Estandarizador (v2)</h1>
          <p className="text-sm text-gray-500">Plataforma de Datos para el Mercado de Capitales Nicaragüense</p>
        </div>
      </header>
      <nav className="bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-12">
            <div className="flex items-baseline space-x-4">
              <button onClick={() => setActiveModule('vault')} className={`px-3 py-2 rounded-md text-sm font-medium ${activeModule === 'vault' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>Bóveda Inteligente</button>
              <button onClick={() => setActiveModule('standardizer')} className={`px-3 py-2 rounded-md text-sm font-medium ${activeModule === 'standardizer' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>Estandarizador</button>
              <button onClick={() => setActiveModule('comparator')} className={`px-3 py-2 rounded-md text-sm font-medium ${activeModule === 'comparator' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>Comparador</button>
            </div>
          </div>
        </div>
      </nav>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{renderModule()}</div>
      </main>
    </div>
  );
}

export default App;
