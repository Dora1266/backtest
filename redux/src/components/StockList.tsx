import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setStockCode } from "../redux/Slice";
import { selectIndexConstituents } from '../redux/selectslice';

// 自定义 Hook 用于获取股票数据
const useStocks = () => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const stocksResponse = await fetch(`http://127.0.0.1:5000/api/get_self_stocks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!stocksResponse.ok) {
          throw new Error("获取股票数据的网络响应不正常");
        }

        let stocksData = await stocksResponse.json();

        if (typeof stocksData === 'string') {
          stocksData = JSON.parse(stocksData);
        }

        if (!Array.isArray(stocksData)) {
          throw new Error("返回的股票数据格式不正确，应为数组");
        }

        if (stocksData.length === 0) {
          throw new Error("股票数据为空");
        }

        setStocks(stocksData);
      } catch (error) {
        console.error("获取股票数据失败:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
  }, []);

  return { stocks, loading, error, setStocks };
};

const StockList = ({ stocks, loading, error, onReplaceWithupdatelist }) => {
  const dispatch = useDispatch();
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: null });

  const handleRowClick = (stock) => {
    dispatch(setStockCode(stock.code));
  };

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

  if (loading) return <div className="text-center py-8 text-gray-400">加载中...</div>;
  if (error) return <div className="text-center py-8 text-red-400">发生错误: {error}</div>;

  return (
    <div className="p-6 flex-grow bg-gradient-gray rounded-lg shadow-2xl">
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(65vh)', width: '100%' }}>
        <table className="min-w-full bg-gray-800 rounded-lg overflow-hidden shadow-lg" style={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse' }}>
          <thead className="bg-gradient-header">
            <tr className="text-white uppercase text-sm leading-normal">
              {Object.keys(stocks[0] || {}).map(header => (
                <th
                  key={header}
                  className="py-3 px-6 text-left"
                  style={{ width: '140px' }}
                >
                  {header === 'code' ? (
                    <div className="flex items-center space-x-2">
                      <button className="flex items-center text-white hover:text-purple-300 transition duration-150 ease-in-out" onClick={onReplaceWithupdatelist}>编辑表头</button>
                    </div>
                  ) : (
                    <span className="cursor-pointer flex items-center" onClick={() => handleSort(header)}>
                      {header}
                      <span className="inline-block ml-2">
                        {sortConfig.key === header ? (sortConfig.direction === 'asc' ? '🔼' : '🔽') : '➤'}
                      </span>
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-gray-300 text-sm font-light">
            {sortedStocks.map((stock, index) => (
              <tr
                key={index}
                className="hover:bg-gray-700 transition duration-150 ease-in-out cursor-pointer"
                onClick={() => handleRowClick(stock)}
              >
                {Object.keys(stock).map(header => (
                  <td
                    key={header}
                    className={`py-3 px-6 ${
                      header.includes('涨跌幅') && stock[header] !== null
                        ? (parseFloat(stock[header]) > 0 ? 'text-green-400' : 'text-red-400')
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

const Home = ({ onReplaceWithupdatelist }) => {
  const { stocks, loading, error, setStocks } = useStocks();
  const dispatch = useDispatch();
  const constituents = useSelector(selectIndexConstituents);

  // 监听 Redux state 的变化
  useEffect(() => {
    const updateStocksFromConstituents = () => {
      const updatedStocks = constituents.map(item => {
        const formattedItem = {};
        Object.keys(item).forEach(key => {
          if (key === "code") {
            formattedItem.code = item[key];
          } else if (key === "name") {
            formattedItem.name = item[key];
          } else {
            formattedItem[key] = item[key];
          }
        });
        return formattedItem;
      });

      setStocks(updatedStocks);
    };

    if (constituents.length > 0) {
      updateStocksFromConstituents();
    }
  }, [constituents, setStocks]);

  return (
    <div className="container mx-auto min-h-screen flex flex-col p-4 bg-gradient-gray overflow-y-auto">
      <div className="flex-grow">
        {error && <div className="text-center py-8 text-red-400">{error}</div>}
        {loading ? (
          <div className="text-center py-8 text-gray-400">加载中...</div>
        ) : (
          <StockList
            stocks={stocks}
            loading={loading}
            error={error}
            onReplaceWithupdatelist={onReplaceWithupdatelist}
          />
        )}
      </div>
    </div>
  );
};


export default Home;
