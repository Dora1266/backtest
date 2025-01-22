'use client';
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

// Define styles
const baseButtonClasses = "bg-blue-600 text-white rounded px-4 py-2 transition duration-300 ease-in-out";
const baseSelectClasses = "border border-gray-300 rounded p-2 bg-white";

const UpdateComponent: React.FC = () => {
  const [updateMode, setUpdateMode] = useState('增量更新');
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    const socket = io('http://127.0.0.1:5000');

    socket.on('progress_update', (data) => {
      setProgress(data.progress);
    });

    socket.on('update_complete', (data) => {
      alert('更新完成');
      socket.disconnect();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleUpdate = async () => {
    const data = {
      "stock_code": process.env.NEXT_PUBLIC_STOCK_CODE,
      updateMode,
    };

    try {
      await axios.post('http://127.0.0.1:5000/update_data', data);
    } catch (error) {
      console.error('更新失败:', error);
    }
  };

  return (
    <div className="flex flex-col items-center p-4">
      <select 
        value={updateMode} 
        onChange={(e) => setUpdateMode(e.target.value)} 
        className={baseSelectClasses}
      >
        <option value="增量更新">增量更新</option>
        <option value="全量更新">全量更新</option>
      </select>
      <button
        onClick={handleUpdate}
        className={baseButtonClasses + " mt-2"}
      >
        更新
      </button>
      
      {progress !== null && (
        <div className="mt-4 w-full bg-gray-200 rounded h-2">
          <div
            className="bg-blue-600 h-2 rounded"
            style={{ width: `${progress}%`, transition: 'width 0.5s ease-in-out' }}
          />
        </div>
      )}
      {progress !== null && (
        <p className="mt-1 text-sm text-gray-600">{progress}%</p>
      )}
    </div>
  );
};

export default UpdateComponent;
