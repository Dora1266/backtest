'use client';
// StockUpdater.tsx
import React, { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
// 定义股票处理状态的类型
interface StockStatus {
  stock_code: string;
  status: 'completed' | 'error';
  error?: string;
}

const StockUpdater: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [statuses, setStatuses] = useState<StockStatus[]>([]);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateType, setUpdateType] = useState<'incremental' | 'full'>('incremental');
  useEffect(() => {
    // 连接到 SocketIO 服务器
    const newSocket = io('http://localhost:5000'); 
    setSocket(newSocket);

    // 监听连接错误
    newSocket.on('connect_error', (err) => {
      console.error('连接错误:', err);
    });

    // 清理函数在组件卸载时关闭连接
    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    // 监听 'stock_update' 事件
    socket.on('stock_update', (data: StockStatus) => {
      setStatuses((prevStatuses) => [...prevStatuses, data]);
    });

    return () => {
      socket.off('stock_update');
    };
  }, [socket]);

  const handleUpdateStocks = () => {
    if (!socket) {
      console.error('未连接到服务器');
      return;
    }

    // 清空之前的状态
    setStatuses([]);
    setIsUpdating(true);

    // 根据选择的更新类型触发事件
    const event = updateType === 'incremental' ? 'updata_stock' : 'replace_stock';
    socket.emit(event);
  };

  // 当所有股票处理完成后，停止更新状态
  useEffect(() => {
    if (isUpdating && statuses.length > 0) {
      // 假设5秒后所有股票都已处理
      const timer = setTimeout(() => {
        setIsUpdating(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [statuses, isUpdating]);

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-center">股票数据更新</h2>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="updateType">选择更新类型</label>
        <select 
          id="updateType"
          value={updateType} 
          onChange={(e) => setUpdateType(e.target.value as 'incremental' | 'full')}
          className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="incremental">增量更新</option>
          <option value="full">全量更新</option>
        </select>
      </div>
      <button 
        onClick={handleUpdateStocks} 
        disabled={isUpdating}
        className={`w-full py-2 px-4 border rounded-md shadow-md text-white ${isUpdating ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} transition duration-300`}
      >
        {isUpdating ? '更新中...' : '开始更新股票数据'}
      </button>

      <h3 className="text-xl font-semibold mt-6 mb-2">处理状态：</h3>
      <ul className="space-y-2">
        {statuses.map((status, index) => (
          <li key={index} className={`p-2 rounded-md ${status.status === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            股票代码: <span className="font-bold">{status.stock_code}</span> - 状态: {status.status}
            {status.status === 'error' && <span> - 错误: {status.error}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default StockUpdater;
