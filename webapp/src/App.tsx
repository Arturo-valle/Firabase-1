
import { useState, useEffect } from 'react';
import type { Issuer, Document } from './types';

// --- Helper Functions ---
const groupDocumentsByCategory = (documents: Document[]) => {
  return documents.reduce((acc, doc) => {
    (acc[doc.category] = acc[doc.category] || []).push(doc);
    return acc;
  }, {} as Record<string, Document[]>);
};

// --- Components ---

interface IssuerDetailViewProps {
  issuer: Issuer;
  onBack: () => void;
}

const IssuerDetailView: React.FC<IssuerDetailViewProps> = ({ issuer, onBack }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!issuer) return;

    const fetchDocuments = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const apiUrl = `/api/getIssuerDocuments?issuerName=${encodeURIComponent(issuer.name)}&detailUrl=${encodeURIComponent(issuer.detailUrl || '')}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }
        const data = await response.json();
        setDocuments(data.documents || []);
      } catch (err: any) {
        console.error("Error fetching documents:", err);
        setError("Could not load documents. The data source may be temporarily unavailable or the format may have changed.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, [issuer]);

  const groupedDocuments = groupDocumentsByCategory(documents);

  return (
    <div className="p-4 bg-white rounded-lg shadow-md animate-fade-in">
      <button onClick={onBack} className="mb-4 text-sm font-medium text-blue-600 hover:text-blue-800">{'‹ Back to List'}</button>
      <div className="flex items-center mb-4">
        <img src={`https://www.bolsanic.com/wp-content/uploads/2016/12/logo.png`} alt="Logo" className="h-12 w-12 mr-4"/>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{issuer.name}</h2>
          {issuer.acronym && <p className="text-sm text-gray-600">{issuer.acronym}</p>}
        </div>
      </div>
      <span className={`inline-block px-2 py-1 mt-2 text-xs font-semibold rounded-full ${issuer.sector === 'Public' ? 'bg-blue-200 text-blue-800' : 'bg-green-200 text-green-800'}`}>
        {issuer.sector || 'N/A'}
      </span>
      
      <div className="mt-6">
        <h3 className="text-xl font-semibold border-b pb-2">Documents & Facts</h3>
        {isLoading && <p className="text-sm text-gray-500 mt-4">Searching for documents...</p>}
        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
        {!isLoading && !error && (
          documents.length > 0 ? (
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
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 mt-4">No documents found for this issuer.</p>
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
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/getIssuers');
        if (!response.ok) throw new Error(`Server responded with ${response.status}`);
        const data = await response.json();
        const sortedIssuers = (data.issuers || []).sort((a: Issuer, b: Issuer) => a.name.localeCompare(b.name));
        setIssuers(sortedIssuers);
      } catch (err) {
        console.error("Error fetching issuers:", err);
        setError("Could not load issuer data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchIssuers();
  }, []);

  if (isLoading) return <div className="p-4 text-center">Loading issuers...</div>;
  if (error) return <div className="p-4 text-center text-red-600">{error}</div>;
  if (selectedIssuer) return <IssuerDetailView issuer={selectedIssuer} onBack={() => setSelectedIssuer(null)} />;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-4">Module 1: The Smart Vault</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {issuers.map((issuer, index) => (
          <div 
            key={index}
            onClick={() => setSelectedIssuer(issuer)}
            className="bg-white p-4 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-200 ease-in-out"
          >
            <h3 className="text-lg font-bold text-gray-800">{issuer.name}</h3>
            <p className="text-sm text-gray-500">Click to view documents</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const StandardizerModule = () => <div className="p-4"><h2 className="text-2xl font-semibold">Module 2: The Standardizer</h2><p className="mt-2">Functionality to extract, clean, and standardize data will be here.</p></div>;
const ComparatorModule = () => <div className="p-4"><h2 className="text-2xl font-semibold">Module 3: The Comparator</h2><p className="mt-2">Tools for analyzing and comparing standardized metrics.</p></div>;

// --- Main Application Component ---
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
          <h1 className="text-3xl font-bold leading-tight text-gray-900">The Standardizer (v2)</h1>
          <p className="text-sm text-gray-500">Data Platform for the Nicaraguan Capital Market</p>
        </div>
      </header>
      <nav className="bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-12">
            <div className="flex items-baseline space-x-4">
              <button onClick={() => setActiveModule('vault')} className={`px-3 py-2 rounded-md text-sm font-medium ${activeModule === 'vault' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>Smart Vault</button>
              <button onClick={() => setActiveModule('standardizer')} className={`px-3 py-2 rounded-md text-sm font-medium ${activeModule === 'standardizer' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>Standardizer</button>
              <button onClick={() => setActiveModule('comparator')} className={`px-3 py-2 rounded-md text-sm font-medium ${activeModule === 'comparator' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>Comparator</button>
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
