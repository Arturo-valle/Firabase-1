import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import RightPanel from './components/layout/RightPanel';
import Home from './pages/Home';
import Login from './pages/Login';
import { IssuerProfile } from './pages/IssuerProfile';
import Discover from './pages/Discover';
import Library from './pages/Library';
import Finance from './pages/Finance';
import Standardizer from './pages/Standardizer';
import Comparator from './pages/Comparator';
import AIAssistant from './pages/AIAssistant';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import { fetchIssuerDetail } from './utils/marketDataApi';
import { Issuer } from './types';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// Wrapper to Fetch Data for Profile
const IssuerProfileRoute = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // We use 'any' here temporarily to bypass the strict type mismatch during rollback audit
  const { data: issuerData, isLoading } = useQuery({
    queryKey: ['issuer', id],
    queryFn: () => fetchIssuerDetail(id!),
    enabled: !!id
  });

  if (isLoading) return <div className="p-8 text-center text-text-secondary">Cargando perfil...</div>;
  if (!issuerData) return <div className="p-8 text-center text-status-danger">Emisor no encontrado</div>;

  // No adapter needed as IssuerDetail is compatible with Issuer (via optional fields)
  const issuer: Issuer = {
    ...issuerData,
    acronym: issuerData.acronym || issuerData.name.substring(0, 4).toUpperCase(),
    sector: issuerData.sector || 'Corporativo',
    documents: issuerData.documents || []
  };

  return <IssuerProfile issuer={issuer} onBack={() => navigate('/')} />;
};

function AppContent() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary transition-colors duration-300">
      <Sidebar />
      <TopBar />
      <main className="ml-24 mr-80 mt-16 p-4 min-h-screen transition-all duration-300">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/issuer/:id" element={<IssuerProfileRoute />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/library" element={<Library />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/standardizer" element={<Standardizer />} />
          <Route path="/comparator" element={<Comparator />} />
          <Route path="/ai" element={<AIAssistant />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <RightPanel />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <AppContent />
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
