import React, { useState, useEffect } from 'react';
import type { Issuer, Document } from './types';

// --- Funciones de Ayuda ---
const groupDocumentsByCategory = (documents: Document[]) => {
  return documents.reduce((acc, doc) => {
    const category = doc.type || 'Otros'; // Usar 'type' como categoría
    (acc[category] = acc[category] || []).push(doc);
    return acc;
  }, {} as Record<string, Document[]>);
};

// --- Componentes ---

interface IssuerDetailViewProps {
  issuer: Issuer;
  onBack: () => void;
}

// Vista de Detalle: Ya no necesita hacer su propia llamada a la API.
// Recibe todos los datos necesarios a través de las props.
const IssuerDetailView: React.FC<IssuerDetailViewProps> = ({ issuer, onBack }) => {
  // Los documentos ya están en el objeto 'issuer' que se pasa como prop.
  const documents = issuer.documents || [];
  const groupedDocuments = groupDocumentsByCategory(documents);

  return (
    <div className="p-4 bg-white rounded-lg shadow-md animate-fade-in">
      <button onClick={onBack} className="mb-4 text-sm font-medium text-blue-600 hover:text-blue-800">{'‹ Volver a la Lista'}</button>
      <div className="flex items-center mb-4">
        <img src={`https://www.bolsanic.com/wp-content/uploads/2016/12/logo.png`} alt="Logo" className="h-12 w-12 mr-4"/>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{issuer.name}</h2>
          {issuer.acronym && <p className="text-sm text-gray-600">{issuer.acronym}</p>}
        </div>
      </div>
      <span className={`inline-block px-2 py-1 mt-2 text-xs font-semibold rounded-full ${issuer.sector === 'Público' ? 'bg-blue-200 text-blue-800' : 'bg-green-200 text-green-800'}`}>
        {issuer.sector || 'N/A'}
      </span>
      
      <div className="mt-6">
        <h3 className="text-xl font-semibold border-b pb-2">Documentos y Hechos Relevantes</h3>
        {documents.length > 0 ? (
          <div className="mt-4 space-y-4">
            {Object.entries(groupedDocuments).map(([category, docs]) => (
              <div key={category}>
                <h4 className="font-bold text-gray-700">{category}</h4>
                <ul className="list-disc list-inside mt-2 space-y-2 pl-4">
                  {docs.map((doc, index) => (
                    <li key={index}>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {doc.title}
                      </a>
                      {doc.date && <span className="text-xs text-gray-500 ml-2">({doc.date})</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 mt-4">No se encontraron documentos para este emisor.</p>
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
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/issuers'); 
        if (!response.ok) throw new Error(`El servidor respondió con ${response.status}`);
        
        const data: Issuer[] = await response.json();
        
        const validIssuers = data.filter(issuer => !issuer.error);
        const erroredIssuers = data.filter(issuer => issuer.error);
        
        if (erroredIssuers.length > 0) {
          console.warn('Algunos emisores no se pudieron procesar:', erroredIssuers);
        }

        const sortedIssuers = validIssuers.sort((a, b) => a.name.localeCompare(b.name));
        setIssuers(sortedIssuers);

      } catch (err) {
        console.error("Error al obtener emisores:", err);
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
        {issuers.map((issuer) => (
          <div 
            key={issuer.name} // CORREGIDO: Usar 'name' como key única en lugar de 'id'
            onClick={() => setSelectedIssuer(issuer)}
            className="bg-white p-4 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-200 ease-in-out"
          >
            <h3 className="text-lg font-bold text-gray-800">{issuer.name}</h3>
            <p className="text-sm text-gray-500">Clic para ver documentos</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const StandardizerModule = () => <div className="p-4"><h2 className="text-2xl font-semibold">Módulo 2: El Estandarizador</h2><p className="mt-2">Aquí estará la funcionalidad para extraer, limpiar y estandarizar datos.</p></div>;
const ComparatorModule = () => <div className="p-4"><h2 className="text-2xl font-semibold">Módulo 3: El Comparador</h2><p className="mt-2">Herramientas para analizar y comparar métricas estandarizadas.</p></div>;

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
          <p className="text-sm text-gray-500">Plataforma de Datos para el Mercado de Capitales de Nicaragua</p>
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
