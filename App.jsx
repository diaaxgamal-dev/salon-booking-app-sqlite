import React, { useState } from 'react';
import { Layout } from './components/Layout/Layout';
import { Button } from './components/UI/Button';
import { Card } from './components/UI/Card';
import { BookingFlow } from './pages/BookingFlow';
import { LegalPage } from './pages/LegalPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { LoginView } from './pages/LoginView';
import { StaffDashboard } from './pages/StaffDashboard';
import { MasterDataManager } from './pages/MasterDataManager'; // Added import
import { RegisterView } from './pages/RegisterView';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const [currentRoute, setCurrentRoute] = useState('home');
  const { user } = useAuth();

  const handleNavigate = (route) => {
    setCurrentRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderRoute = () => {
    switch (currentRoute) {
      case 'booking':
        return <BookingFlow onNavigate={handleNavigate} />;
      case 'datenschutz':
        return <PrivacyPolicy onNavigate={handleNavigate} />;
      case 'impressum':
        return <LegalPage type="impressum" onNavigate={handleNavigate} />;
      case 'login':
        return (
          <Layout onNavigate={handleNavigate}>
            <LoginView
              onNavigate={handleNavigate}
              onSuccess={(role) => {
                if (role === 'admin') setCurrentRoute('admin');
                else if (role === 'staff') setCurrentRoute('staff-dashboard');
                else setCurrentRoute('booking');
              }}
            />
          </Layout>
        );
      case 'register':
        return (
          <Layout onNavigate={handleNavigate}>
            <RegisterView onSuccess={() => setCurrentRoute('booking')} onNavigate={handleNavigate} />
          </Layout>
        );
      case 'admin':
        if (user.role !== 'admin') {
          return (
            <Layout onNavigate={handleNavigate}>
              <div className="py-24 text-center">
                <h2>Zugriff verweigert. Bitte als Admin einloggen.</h2>
                <Button onClick={() => setCurrentRoute('login')} className="mt-4">Zum Login</Button>
              </div>
            </Layout>
          );
        }
        return (
          <Layout onNavigate={handleNavigate}>
            <AdminDashboard onManageData={() => setCurrentRoute('master-data')} />
          </Layout>
        );
      case 'master-data':
        if (user.role !== 'admin') {
          return (
            <Layout onNavigate={handleNavigate}>
              <div className="py-24 text-center">
                <h2>Zugriff verweigert.</h2>
                <Button onClick={() => setCurrentRoute('login')} className="mt-4">Zum Login</Button>
              </div>
            </Layout>
          );
        }
        return (
          <Layout onNavigate={handleNavigate}>
            <MasterDataManager onNavigate={handleNavigate} />
          </Layout>
        );
      case 'staff-dashboard':
        if (user.role !== 'staff') {
          setCurrentRoute('login');
          return null;
        }
        return (
          <Layout onNavigate={handleNavigate}>
            <StaffDashboard onNavigate={handleNavigate} />
          </Layout>
        );
      case 'home':
      default:
        return (
          <Layout onNavigate={handleNavigate}>
            <section className="py-12 md:py-24 text-center fade-in">
              <img src="/logo.png" alt="Next Generation Logo" className="h-24 md:h-32 w-auto object-contain mx-auto mb-8 drop-shadow-sm" onError={(e) => e.target.style.display = 'none'} />
              <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6 tracking-tight">
                Dein Premium <span className="text-tiffany">Hairstyling</span> Erlebnis
              </h1>
              <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto">
                Buche deinen nächsten Termin bei Next Generation in Alzenau bequem online.
                <br />
                <span className="font-semibold text-slate-900 mt-2 block italic">Wasserloser Straße 7, 63755 Alzenau</span>
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button onClick={() => handleNavigate('booking')} className="text-lg px-8 py-4 shadow-tiffany/20 shadow-lg">Jetzt Buchen</Button>
              </div>
            </section>


          </Layout>
        );
    }
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-[100] flex gap-2">
        {/* Minimal Dev Navigation for testing flow */}
        <button onClick={() => setCurrentRoute('admin')} className="text-[10px] bg-slate-800 text-white/50 px-2 py-1 rounded opacity-50 hover:opacity-100">Dev: Force Admin</button>
      </div>
      {renderRoute()}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
