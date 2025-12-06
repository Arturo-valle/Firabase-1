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

import Standardizer from './pages/Standardizer';
import Comparator from './pages/Comparator';

function App() {
  // Layout wrapper
  return (
    <Router>
      <div className="min-h-screen bg-bg-primary">
        {/* Sidebar - Fixed Left */}
        <Sidebar />

        {/* TopBar - Fixed Top */}
        <TopBar />

        {/* Main Content - Center */}
        <main className="ml-16 mr-80 mt-16 p-6 min-h-screen">
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
          </Routes>
        </main>

        {/* RightPanel - Fixed Right */}
        <RightPanel />
      </div>
    </Router>
  );
}

export default App;
