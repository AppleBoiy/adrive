import { useState, useEffect } from 'react';
import { X, Database, RefreshCw, Search } from 'lucide-react';

const DatabaseViewer = ({ isOpen, onClose }) => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchTables();
    }
  }, [isOpen]);

  const fetchTables = async () => {
    try {
      const res = await fetch('/api/dev/database/tables');
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables || []);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
    }
  };

  const fetchTableData = async (tableName) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/dev/database/table/${tableName}`);
      if (res.ok) {
        const data = await res.json();
        setTableData(data);
        setSelectedTable(tableName);
        setQueryResult(null);
      }
    } catch (error) {
      console.error('Error fetching table data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const executeQuery = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    try {
      const res = await fetch('/api/dev/database/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setQueryResult(data.result);
        setSelectedTable(null);
        setTableData(null);
      } else {
        const error = await res.json();
        alert(`Query error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error executing query:', error);
      alert('Failed to execute query');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl h-[90vh] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-gray-200 bg-[#f6f6f6]">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-blue-600" />
            <span className="text-[13px] font-semibold text-gray-800">Database Viewer (Dev Mode)</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded-md transition-colors"
          >
            <X size={18} className="text-gray-600" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Tables List */}
          <div className="w-64 border-r border-gray-200 bg-gray-50 overflow-y-auto">
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-gray-500 uppercase">Tables</span>
                <button 
                  onClick={fetchTables}
                  className="p-1 hover:bg-gray-200 rounded"
                  title="Refresh"
                >
                  <RefreshCw size={12} className="text-gray-500" />
                </button>
              </div>
              <div className="space-y-1">
                {tables.map((table) => (
                  <button
                    key={table}
                    onClick={() => fetchTableData(table)}
                    className={`w-full text-left px-3 py-2 rounded-md text-[13px] transition-colors ${
                      selectedTable === table
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {table}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Query Input */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && executeQuery()}
                    placeholder="SELECT * FROM files WHERE..."
                    className="w-full pl-10 pr-3 py-2 text-[13px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={executeQuery}
                  disabled={isLoading || !query.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-[13px] font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Execute
                </button>
              </div>
              <p className="text-[11px] text-gray-500 mt-2">
                Only SELECT queries are allowed. Press Enter to execute.
              </p>
            </div>

            {/* Data Display */}
            <div className="flex-1 overflow-auto p-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : tableData ? (
                <div>
                  <div className="mb-4">
                    <h3 className="text-[14px] font-semibold text-gray-800 mb-1">
                      {tableData.tableName}
                    </h3>
                    <p className="text-[12px] text-gray-500">
                      {tableData.count} rows (showing first 100)
                    </p>
                  </div>

                  {/* Schema */}
                  <div className="mb-4">
                    <h4 className="text-[12px] font-semibold text-gray-700 mb-2">Schema</h4>
                    <div className="bg-gray-50 rounded-md p-3 overflow-x-auto">
                      <table className="min-w-full text-[11px]">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-1 px-2 font-semibold">Column</th>
                            <th className="text-left py-1 px-2 font-semibold">Type</th>
                            <th className="text-left py-1 px-2 font-semibold">Not Null</th>
                            <th className="text-left py-1 px-2 font-semibold">Default</th>
                            <th className="text-left py-1 px-2 font-semibold">PK</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tableData.schema.map((col) => (
                            <tr key={col.cid} className="border-b border-gray-100">
                              <td className="py-1 px-2 font-mono">{col.name}</td>
                              <td className="py-1 px-2 text-blue-600">{col.type}</td>
                              <td className="py-1 px-2">{col.notnull ? '✓' : ''}</td>
                              <td className="py-1 px-2 text-gray-500">{col.dflt_value || '-'}</td>
                              <td className="py-1 px-2">{col.pk ? '✓' : ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Data */}
                  <div>
                    <h4 className="text-[12px] font-semibold text-gray-700 mb-2">Data</h4>
                    <div className="bg-white border border-gray-200 rounded-md overflow-x-auto">
                      <table className="min-w-full text-[11px]">
                        <thead className="bg-gray-50">
                          <tr className="border-b border-gray-200">
                            {tableData.schema.map((col) => (
                              <th key={col.name} className="text-left py-2 px-3 font-semibold">
                                {col.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tableData.data.map((row, idx) => (
                            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                              {tableData.schema.map((col) => (
                                <td key={col.name} className="py-2 px-3 font-mono text-gray-700 max-w-xs truncate">
                                  {row[col.name] !== null ? String(row[col.name]) : <span className="text-gray-400">NULL</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : queryResult ? (
                <div>
                  <div className="mb-4">
                    <h3 className="text-[14px] font-semibold text-gray-800 mb-1">
                      Query Result
                    </h3>
                    <p className="text-[12px] text-gray-500">
                      {queryResult.length} rows returned
                    </p>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-md overflow-x-auto">
                    {queryResult.length > 0 ? (
                      <table className="min-w-full text-[11px]">
                        <thead className="bg-gray-50">
                          <tr className="border-b border-gray-200">
                            {Object.keys(queryResult[0]).map((key) => (
                              <th key={key} className="text-left py-2 px-3 font-semibold">
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {queryResult.map((row, idx) => (
                            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                              {Object.keys(row).map((key) => (
                                <td key={key} className="py-2 px-3 font-mono text-gray-700 max-w-xs truncate">
                                  {row[key] !== null ? String(row[key]) : <span className="text-gray-400">NULL</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        No results
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <Database size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="text-[13px]">Select a table or execute a query</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseViewer;
