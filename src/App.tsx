import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <AuthProvider>
      <FormProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/formulario/:formId" element={<PublicFormPage />} />
              <Route path="/test-qr/:formId" element={<TestQRPage />} />
              <Route path="/test-qr" element={<TestQRPage />} />
              <Route
                path="/*"
                element={
                  <PrivateRoute>
                    <>
                      <Navbar />
                      <main className="flex-grow p-4 md:p-6">
                        <Routes>
                          <Route path="/" element={<FormsList />} />
                          <Route
                            path="/crear"
                            element={
                              <PrivateRoute requiredRole="admin">
                                <FormBuilder />
                              </PrivateRoute>
                            }
                          />
                          <Route
                            path="/editar/:id"
                            element={
                              <PrivateRoute requiredRole="admin">
                                <FormBuilder />
                              </PrivateRoute>
                            }
                          />
                          <Route path="/vista-previa/:id" element={<FormPreview />} />
                          <Route path="/vista-previa/:id/:responseId" element={<FormPreview />} />
                          <Route path="/respuestas/:id" element={<FormResponses />} />
                          <Route
                            path="/admin/users"
                            element={
                              <PrivateRoute requiredRole="admin">
                                <UserManagement />
                              </PrivateRoute>
                            }
                          />
                        </Routes>
                      </main>
                    </>
                  </PrivateRoute>
                }
              />
            </Routes>
            <Toaster />
          </div>
        </Router>
      </FormProvider>
    </AuthProvider>
  );
}

export default App;