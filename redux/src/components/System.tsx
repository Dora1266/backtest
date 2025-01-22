"use client";
import React, { useEffect, useState } from 'react';

interface Config {
  config_name: string;
  config_value: string;
}

const ConfigEditor: React.FC = () => {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5000/api/getsys', { method: 'POST' });
        if (!response.ok) {
          throw new Error('Failed to fetch');
        }
        const data: Config[] = await response.json();
        setConfigs(data);
      } catch (err) {
        setError('Failed to fetch configs');
      } finally {
        setLoading(false);
      }
    };

    fetchConfigs();
  }, []);

  const handleChange = (index: number, value: string) => {
    const updatedConfigs = [...configs];
    updatedConfigs[index].config_value = value;
    setConfigs(updatedConfigs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await fetch('http://127.0.0.1:5000/api/update-configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configs),
      });
      alert('Configs updated successfully');
    } catch {
      alert('Failed to update configs');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen text-gray-500">Loading...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>;
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-white">
      <form onSubmit={handleSubmit} className="w-full max-w-md p-6 bg-white shadow-md">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">Config Editor</h2>
        {configs.map((config, index) => (
          <div key={config.config_name} className="mb-4">
            <label className="block text-gray-800 mb-1">
              {config.config_name}:
              <input
                type="text"
                value={config.config_value}
                onChange={(e) => handleChange(index, e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white text-gray-800"
                required
              />
            </label>
          </div>
        ))}
        <button
          type="submit"
          className="w-full py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition duration-200"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
};

export default ConfigEditor;
