import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { FormProvider } from './contexts/FormContext';
import { DatabaseProvider } from './contexts/DatabaseContext';
import Navbar from './components/layout/Navbar';
import FormsList from './components/forms/FormsList';
import FormBuilder from './components/forms/FormBuilder';
import FormPreview from './components/forms/FormPreview';
import FormResponses from './components/responses/FormResponses';
import ImportExport from './components/import-export/ImportExport';
import "./i18n";

function App() {
  return (
    <DatabaseProvider>
      <FormProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
            <Navbar />
            <main className="flex-grow p-4 md:p-6">
              <Routes>
                <Route path="/" element={<FormsList />} />
                <Route path="/crear" element={<FormBuilder />} />
                <Route path="/editar/:id" element={<FormBuilder />} />
                <Route path="/vista-previa/:id" element={<FormPreview />} />
                <Route path="/respuestas/:id" element={<FormResponses />} />
                <Route path="/importar-exportar" element={<ImportExport />} />
              </Routes>
            </main>
            <Toaster position="bottom-right" />
          </div>
        </Router>
      </FormProvider>
    </DatabaseProvider>
  );
}

export default App;