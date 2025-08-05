import { useState, useEffect } from 'react';
import { useForm } from '../../contexts/FormContext';
const WeeklyReport = () => {
  const { forms } = useForm(); // Obtener la lista de formularios del contexto
  const [stats, setStats] = useState({ green: 0, yellow: 0, red: 0, averageCompletion: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<string>('all'); // 'all' para todos los formularios

    useEffect(() => {
        const fetchStats = async () => {
      try {
        setLoading(true);
        const url = selectedForm === 'all'
          ? '/api/forms/stats/weekly'
          : `/api/forms/stats/weekly?formId=${selectedForm}`;

        const response = await fetch(url, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Error fetching weekly stats');
        }

        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching weekly stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [selectedForm]);

  const total = stats.green + stats.yellow + stats.red;
  const greenPercentage = total > 0 ? (stats.green / total) * 100 : 0;
  const yellowPercentage = total > 0 ? (stats.yellow / total) * 100 : 0;
  const redPercentage = total > 0 ? (stats.red / total) * 100 : 0;

  

  

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      {loading ? (
        <p>Cargando reporte...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Left side: Reporte Semanal */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Reporte Semanal de Diligenciamiento</h2>
                  <p className="text-sm text-gray-500">Mostrando datos de los últimos 7 días</p>
                </div>
                <select
                  value={selectedForm}
                  onChange={(e) => setSelectedForm(e.target.value)}
                  className="text-xs text-gray-600 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                >
                  <option value="all">Todos los Formularios</option>
                  {forms.map(form => (
                    <option key={form.id} value={form.id}>{form.name}</option>
                  ))}
                </select>
              </div>
              <div className="w-full bg-gray-200 h-5 flex rounded-sm overflow-hidden mb-2">
                <div
                  className="bg-lime-500 h-full"
                  style={{ width: `${greenPercentage}%` }}
                  title={`Verde: ${stats.green} (${greenPercentage.toFixed(1)}%)`}
                ></div>
                <div
                  className="bg-yellow-400 h-full"
                  style={{ width: `${yellowPercentage}%` }}
                  title={`Amarillo: ${stats.yellow} (${yellowPercentage.toFixed(1)}%)`}
                ></div>
                <div
                  className="bg-red-500 h-full"
                  style={{ width: `${redPercentage}%` }}
                  title={`Rojo: ${stats.red} (${redPercentage.toFixed(1)}%)`}
                ></div>
              </div>
              <div className="flex items-center">
                <div className="flex-1 text-center mx-1">
                  <div className="w-full px-2 py-1 bg-lime-500 flex justify-between items-center rounded-sm">
                    <span className="text-xs text-white font-semibold">98%-100%</span>
                    <span className="text-xs text-white font-bold bg-black/20 px-1.5 py-0.5 rounded-full">{stats.green}</span>
                  </div>
                </div>
                <div className="flex-1 text-center mx-1">
                  <div className="w-full px-2 py-1 bg-yellow-400 flex justify-between items-center rounded-sm">
                    <span className="text-xs text-white font-semibold">70%-97%</span>
                    <span className="text-xs text-white font-bold bg-black/20 px-1.5 py-0.5 rounded-full">{stats.yellow}</span>
                  </div>
                </div>
                <div className="flex-1 text-center mx-1">
                  <div className="w-full px-2 py-1 bg-red-500 flex justify-between items-center rounded-sm">
                    <span className="text-xs text-white font-semibold">&lt;70%</span>
                    <span className="text-xs text-white font-bold bg-black/20 px-1.5 py-0.5 rounded-full">{stats.red}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side: Promedio de Llenado */}
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Promedio de Llenado</h3>
              {total > 0 ? (
                <div>
                  <div className={`text-5xl font-bold ${stats.averageCompletion >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.averageCompletion.toFixed(1)}%
                  </div>
                  <p className="text-sm text-gray-500">de llenado en promedio</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No hay datos para mostrar.</p>
              )}
            </div>
          </div>
      )}
    </div>
  );
};

export default WeeklyReport;
