import { useState } from 'react'; // Added useState
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import FolderPanel from './components/FolderPanel';
import AssetViewer from './components/AssetViewer';
import GlobalLibrary from './components/GlobalLibrary';
import VRViewer from './components/VRViewer';
import CalibrationPanel from './components/CalibrationPanel'; // Added Import
import Home from './pages/Home';

function App() {
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false); // State for panel

  return (
    <Router>
      <div className="flex h-screen bg-[#050510] text-white font-sans overflow-hidden decoration-none selection:bg-pink-500/30">
        <Routes>
          {/* VR Viewer Route - Full Screen, No Sidebar */}
          <Route path="/viewer" element={<VRViewer />} />

          {/* Admin/Host Routes */}
          <Route path="*" element={
            <div className="flex h-full w-full">
              <Sidebar />
              <div className="flex-1 relative overflow-auto">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

                {/* Calibration Toggle Button */}
                <button
                  onClick={() => setIsCalibrationOpen(true)}
                  className="absolute top-6 right-6 z-40 p-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-colors backdrop-blur-sm group"
                  title="VR Calibration"
                >
                  <span className="text-xl group-hover:rotate-90 transition-transform duration-500 block">⚙️</span>
                </button>

                <CalibrationPanel isOpen={isCalibrationOpen} onClose={() => setIsCalibrationOpen(false)} />

                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/library" element={<GlobalLibrary />} />
                  <Route path="/dashboard/:moduleName" element={<FolderPanel />} />
                  <Route path="/dashboard/:moduleName/folder/:folderId" element={<AssetViewer />} />
                </Routes>
              </div>
            </div>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
