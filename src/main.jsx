import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ReservePage from './pages/ReservePage.jsx';
import PrivacyPage from './pages/PrivacyPage.jsx';
import StaffManager from './pages/StaffManager.jsx';
import MarketingManager from './pages/MarketingManager.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ReservePage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/staff" element={<StaffManager />} />
        <Route path="/marketing" element={<MarketingManager />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
