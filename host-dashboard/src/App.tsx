import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { socket } from './services/api';
import DashboardPage from './pages/DashboardPage';
import Home from './pages/Home';

function App() {
  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to Relay Server:', socket.id);
    });

    return () => {
      socket.off('connect');
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard/:moduleName" element={<DashboardPage />} />
        <Route path="/dashboard/:moduleName/folder/:folderId" element={<DashboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
