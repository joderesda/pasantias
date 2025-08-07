import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/use-toast';
import { FormProvider } from './contexts/FormContext';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/auth/PrivateRoute';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import Navbar from './components/layout/Navbar';
import FormsList from './components/forms/FormsList';
import FormBuilder from './components/forms/FormBuilder';
import FormPreview from './components/forms/FormPreview';
import FormResponses from './components/responses/FormResponses';
import UserManagement from './components/admin/UserManagement';
import TestQRPage from './pages/TestQRPage';
import PublicFormPage from './pages/PublicFormPage';

import "./i18n";

// Componente para el diseño de páginas autenticadas
const AuthenticatedLayout = ({ children }: { children: React.ReactNode }) => (
  <PrivateRoute>
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <Navbar />
      <main className="flex-grow p-4 md:p-6">
        {children}
      </main>
    </div>
  </PrivateRoute>
);

// Componente para el diseño de páginas públicas
const PublicLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
    <Navbar />
    <main className="flex-grow">
      {children}
    </main>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <FormProvider>
        <Router>
          <Routes>
            {/* Rutas Públicas */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Rutas Públicas con Layout Público */}
            <Route element={<PublicLayout><Outlet /></PublicLayout>}>
              <Route path="/formulario/:formId" element={<PublicFormPage />} />
              <Route path="/test-qr/:formId" element={<TestQRPage />} />
              <Route path="/test-qr" element={<TestQRPage />} />
            </Route>
            
            {/* Rutas Protegidas con Layout Autenticado */}
            <Route element={<AuthenticatedLayout><Outlet /></AuthenticatedLayout>}>
              <Route path="/" element={<FormsList />} />
              <Route path="/vista-previa/:id" element={<FormPreview />} />
              <Route path="/vista-previa/:id/:responseId" element={<FormPreview />} />
              <Route path="/respuestas/:id" element={<FormResponses />} />
            </Route>
            
            {/* Rutas de Administrador */}
            <Route element={
              <PrivateRoute requiredRole="admin">
                <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
                  <Navbar />
                  <main className="flex-grow p-4 md:p-6">
                    <Outlet />
                  </main>
                </div>
              </PrivateRoute>
            }>
              <Route path="/crear" element={<FormBuilder />} />
              <Route path="/editar/:id" element={<FormBuilder />} />
              <Route path="/admin/users" element={<UserManagement />} />
            </Route>
            
            {/* Ruta por defecto - Redirigir al home (requiere autenticación) */}
            <Route path="*" element={
              <PrivateRoute>
                <Navigate to="/" replace />
              </PrivateRoute>
            } />
          </Routes>
          <Toaster />
        </Router>
      </FormProvider>
    </AuthProvider>
  );
}

export default App;