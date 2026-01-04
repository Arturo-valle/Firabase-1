import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import RightPanel from './components/layout/RightPanel';

// Pages
import Home from './pages/Home';
import Discover from './pages/Discover';
import Finance from './pages/Finance';
import AIAssistant from './pages/AIAssistant';
import Research from './pages/Research';
import IssuerDetail from './pages/IssuerDetail';
import Library from './pages/Library';
import Settings from './pages/Settings';
import Profile from './pages/Profile';

import Standardizer from './pages/Standardizer';
import Comparator from './pages/Comparator';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';

import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';

function App() {
  // Layout wrapper
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <div className="min-h-screen bg-bg-primary">
              {/* Sidebar - Fixed Left */}
              <Sidebar />

              {/* TopBar - Fixed Top */}
              <TopBar />

              {/* Main Content - Center */}
              <main className="ml-24 mr-80 mt-16 p-4 min-h-screen">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/discover" element={<Discover />} />
                  <Route path="/library" element={<Library />} />
                  <Route path="/finance" element={<Finance />} />
                  <Route path="/research" element={<Research />} />
                  <Route path="/issuer/:issuerId" element={<IssuerDetail />} />
                  <Route path="/ai" element={<AIAssistant />} />
                  <Route path="/standardizer" element={<Standardizer />} />
                  <Route path="/comparator" element={<Comparator />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/profile" element={<Profile />} />
                </Routes>
              </main>

              {/* RightPanel - Fixed Right */}
              <RightPanel />
            </div>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
