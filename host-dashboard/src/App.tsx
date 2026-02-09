import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import FolderPanel from './components/FolderPanel';
import AssetViewer from './components/AssetViewer';
import GlobalLibrary from './components/GlobalLibrary';
import Home from './pages/Home';

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-[#050510] text-white font-sans overflow-hidden decoration-none selection:bg-pink-500/30">
        <Sidebar />
        <div className="flex-1 relative overflow-auto">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/library" element={<GlobalLibrary />} />
            <Route path="/dashboard/:moduleName" element={<FolderPanel />} />
            <Route path="/dashboard/:moduleName/folder/:folderId" element={<AssetViewer />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
