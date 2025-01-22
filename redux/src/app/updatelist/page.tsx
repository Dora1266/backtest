'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Select from 'react-select';

// 自定义钩子：获取和更新股票数据及表头
const useStocks = () => {
  const [headers, setHeaders] = useState([]);
  const [allHeaders, setAllHeaders] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingHeaders, setUpdatingHeaders] = useState(false);
  const [updateMessage, setUpdateMessage] = useState(null);

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        // 获取当前表头数据
        const headersResponse = await fetch(`http://127.0.0.1:5000/api/getheader`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!headersResponse.ok) {
          throw new Error("获取表头的网络响应不正常");
        }

        const headersData = await headersResponse.json();

        // 如果获取到的表头数据为空，使用默认表头
        let headerNames = [];
        if (Array.isArray(headersData) && headersData.length > 0) {
          headerNames = headersData.map(item => item.header);
        } else {
          headerNames = ['code', 'name'];
        }
        setHeaders(headerNames);

        // 获取所有可选表头数据
        const allHeadersResponse = await fetch(`http://127.0.0.1:5000/api/getallheader`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!allHeadersResponse.ok) {
          throw new Error("获取所有表头的网络响应不正常");
        }

        const allHeadersData = await allHeadersResponse.json();

        if (!Array.isArray(allHeadersData)) {
          throw new Error("获取的所有表头数据格式不正确");
        }

        setAllHeaders(allHeadersData.map(item => item.baseData));

        // 使用表头数据获取股票数据
        const stocksResponse = await fetch(`http://127.0.0.1:5000/api/get_self_stocks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!stocksResponse.ok) {
          throw new Error("获取股票数据的网络响应不正常");
        }

        // 这里的响应是一个包含双引号的字符串化 JSON 数组
        const stocksDataString = await stocksResponse.json();

        let stocksData;
        try {
          stocksData = JSON.parse(stocksDataString);
        } catch (parseError) {
          throw new Error("解析股票数据失败：返回的数据不是有效的 JSON 格式");
        }

        if (!Array.isArray(stocksData)) {
          throw new Error("返回的股票数据格式不正确，应为数组对象");
        }

        if (stocksData.length === 0) {
          throw new Error("股票数据为空");
        }

        // 提取所有的表头
        const dataHeaders = Object.keys(stocksData[0]);
        setHeaders(dataHeaders);

        // 格式化股票数据
        const formattedStocks = stocksData.map(stock => {
          const formattedStock = {};
          dataHeaders.forEach(header => {
            formattedStock[header] = stock[header] !== undefined ? stock[header] : null;
          });
          return formattedStock;
        });

        setStocks(formattedStocks);
      } catch (error) {
        console.error("获取股票数据失败:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
  }, []);

  const updateHeader = async (newHeaders) => {
    setUpdatingHeaders(true);
    setUpdateMessage(null);
    try {
      const formattedHeaders = newHeaders.map(header => ({ header })).filter(header => header.header !== 'code' && header.header !== 'name');

      const response = await fetch(`http://127.0.0.1:5000/api/updateheader`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedHeaders),
      });

      if (!response.ok) {
        throw new Error("更新表头的网络响应不正常");
      }

      const result = await response.json();

      if (result.update !== '成功') {
        throw new Error("后端未成功更新表头");
      }

      setHeaders(newHeaders);
      setUpdateMessage("表头更新成功！");
    } catch (error) {
      console.error("更新表头失败:", error);
      setError(error.message);
    } finally {
      setUpdatingHeaders(false);
    }
  };

  return { headers, allHeaders, stocks, loading, error, updateHeader, updatingHeaders, updateMessage };
}

// 更新列表组件
const UpdateList = ({ stocks, loading, error, className, headers, replaceWithSelectStock }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: null });

  const handleSort = (header) => {
    setSortConfig(prev => {
      let direction = 'asc';
      if (prev.key === header) {
        direction = prev.direction === 'asc' ? 'desc' : 'asc';
      }
      return { key: header, direction };
    });
  };

  const sortedStocks = useMemo(() => {
    if (!stocks.length) return [];
    let sortableStocks = [...stocks];
    if (sortConfig.direction) {
      sortableStocks.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        } else {
          return sortConfig.direction === 'asc'
            ? String(aValue).localeCompare(String(bValue))
            : String(bValue).localeCompare(String(aValue));
        }
      });
    }
    return sortableStocks;
  }, [stocks, sortConfig]);

  if (loading) return <div>加载中...</div>;
  if (error) return <div className="text-red-500">发生错误: {error}</div>;

  return (
    <div className={`p-6 ${className}`}>
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        <table className="min-w-full bg-white border border-gray-200" style={{ tableLayout: 'fixed' }}>
          <thead className="sticky top-0 bg-gray-100">
            <tr className="text-gray-600 uppercase text-sm leading-normal">
              {headers.map(header => (
                <th
                  key={header}
                  className="py-3 px-6 text-left"
                  style={{ width: '150px' }}
                >
                  {header === 'code' ? (
                    <div className="flex items-center space-x-2">
                      <button className="flex items-center" onClick={replaceWithSelectStock}>我的按钮</button>
                      <button>
                        <img src="icon2.png" alt="Icon 2" className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="cursor-pointer" onClick={() => handleSort(header)}>
                      {header}
                      <span className="inline-block text-gray-400 w-4">
                        {sortConfig.key === header ? (sortConfig.direction === 'asc' ? '🔼' : '🔽') : '➤'}
                      </span>
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm font-light">
            {sortedStocks.map((stock, index) => (
              <tr
                key={index}
                className="border-b border-gray-200 hover:bg-gray-100 transition duration-150 ease-in-out"
              >
                {headers.map(header => (
                  <td
                    key={header}
                    className={`py-3 px-6 ${
                      header.includes('涨跌幅') && stock[header] !== null
                        ? (parseFloat(stock[header]) > 0 ? 'text-red-500' : 'text-green-500')
                        : ''
                    }`}
                  >
                    {header.includes('涨跌幅') && stock[header] !== null
                      ? `${parseFloat(stock[header]).toFixed(2)}%`
                      : stock[header]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 编辑表头组件
const EditHeaders = ({ headers, allHeaders, onSave }) => {
  const fixedHeaders = headers.filter(header => header === 'code' || header === 'name');
  const editableHeaders = headers.filter(header => header !== 'code' && header !== 'name');

  const [selectedHeaders, setSelectedHeaders] = useState(
    editableHeaders.map(header => ({ value: header, label: header }))
  );

  const allOptions = allHeaders.map(header => ({ value: header, label: header }));

  const handleChange = (selectedOptions) => {
    setSelectedHeaders(selectedOptions || []);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newHeaders = [...fixedHeaders, ...selectedHeaders.map(option => option.value)];
    onSave(newHeaders);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 p-6 bg-gray-50 border rounded shadow">
      <h2 className="text-xl font-semibold mb-4">编辑表头</h2>
      <div className="mb-4">
        <label className="block text-gray-700 mb-2">选择表头:</label>
        <Select
          isMulti
          options={allOptions}
          value={selectedHeaders}
          onChange={handleChange}
          className="basic-multi-select"
          classNamePrefix="select"
          placeholder="请选择表头..."
        />
      </div>
      <div className="flex justify-end space-x-4">
        <button
          type="submit"
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          保存表头
        </button>
      </div>
    </form>
  );
};

// 主页面组件
const MarketData = ({ replaceWithSelectStock }) => {
  const { headers, allHeaders, stocks, loading, error, updateHeader, updatingHeaders, updateMessage } = useStocks();
  const [isEditing, setIsEditing] = useState(false);

  const handleSaveHeaders = (newHeaders) => {
    updateHeader(newHeaders);
    setIsEditing(false);
  };

  return (
    <div className="container mx-auto min-h-screen flex flex-col p-6 bg-gray-100">
      <div className="flex justify-between items-center mb-6">
        <div className="space-x-3">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-5 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            {isEditing ? '取消编辑' : '编辑表头'}
          </button>
        </div>
      </div>

      {isEditing && (
        <EditHeaders headers={headers} allHeaders={allHeaders} onSave={handleSaveHeaders} />
      )}

      {updateMessage && (
        <div className="mb-4 p-4 bg-green-100 text-green-700 border border-green-300 rounded">
          {updateMessage}
        </div>
      )}

      {error && <div className="text-red-500 mb-4">{error}</div>}
      {loading ? (
        <div className="text-center text-xl">加载中...</div>
      ) : (
        <UpdateList
          stocks={stocks}
          loading={loading}
          error={error}
          headers={headers}
          replaceWithSelectStock={replaceWithSelectStock} // 确保传递正确的函数
          className="shadow-lg rounded"
        />
      )}

      {updatingHeaders && (
        <div className="fixed bottom-4 right-4 p-4 bg-gray-800 text-white rounded shadow-lg">
          更新中...
        </div>
      )}
    </div>
  );
};

export default MarketData;
