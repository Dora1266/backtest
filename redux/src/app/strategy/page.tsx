'use client';
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  ChangeEvent,
} from 'react';
import Select, { MultiValue } from 'react-select';
import { io } from 'socket.io-client';
import '../globals.css';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { v4 as uuidv4 } from 'uuid';

// Initialize Socket.io client
const socket = io('http://127.0.0.1:5000');

interface BuySellRecord {
  日期: string;
  操作: string;
  价格: number;
  数量: number;
  现金余额: number;
  持仓: number;
  总资产: number;
}

interface BacktestRecord {
  date: string;
  result: string;
  startdate: string;
  enddate: string;
  stocklist: string[];
  buyConditions: string[];
  sellConditions: string[];
  isExpanded?: boolean;
  leaderboards?: { [key: string]: LeaderboardRecord[] };
  selectedLeaderboard?: string;
  buySellRecords?: BuySellRecord[];
  isSelected?: boolean;
  showFullStockList?: boolean;
}

interface LeaderboardRecord {
  股票代码: string;
  backtestName: string; // 新增字段
  [key: string]: any;
}

interface Strategy {
  name: string;
  buyConditions: string[];
  sellConditions: string[];
  selectedOptions: { value: string; label: string }[];
  backtestHistory: BacktestRecord[];
  isOpen: boolean;
}

interface GlobalFilterCondition {
  column: string;
  type: 'exact' | 'contains' | 'min' | 'max' | 'dateMin' | 'dateMax';
  value: any;
}

// Pagination parameter
const PAGE_SIZE = 100;

// Leaderboard Table Component
const LeaderboardTable: React.FC<{
  leaderboard: LeaderboardRecord[];
  onViewRecords: (backtestName: string, stockCode: string) => void;
  strategyIndex: number;
  backtestName: string;
  globalFilters: GlobalFilterCondition[];
}> = React.memo(
  ({
    leaderboard,
    onViewRecords,
    strategyIndex,
    backtestName,
    globalFilters,
  }) => {
    const [expandedStock, setExpandedStock] = useState<{
      [key: string]: boolean;
    }>({});
    const [currentPage, setCurrentPage] = useState(1);

    const toggleStock = useCallback((stockCode: string) => {
      setExpandedStock((prev) => ({
        ...prev,
        [stockCode]: !prev[stockCode],
      }));
    }, []);

    const headers = useMemo(() => {
      if (leaderboard.length === 0) return [];
      // backtestName 字段本身不显示
      return Object.keys(leaderboard[0]).filter(
        (key) => key !== 'backtestName'
      );
    }, [leaderboard]);

    // Identify column data types
    const columnTypes = useMemo(() => {
      if (leaderboard.length === 0) return {};
      const firstRow = leaderboard[0];
      const types: { [key: string]: 'number' | 'string' | 'date' } = {};
      headers.forEach((header) => {
        const value = firstRow[header];
        if (typeof value === 'number') {
          types[header] = 'number';
        } else if (typeof value === 'string') {
          // 简单地用正则判断是否是 YYYY-MM-DD 格式
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (dateRegex.test(value)) {
            types[header] = 'date';
          } else {
            types[header] = 'string';
          }
        } else {
          types[header] = 'string';
        }
      });
      return types;
    }, [leaderboard, headers]);

    // Apply global filters
    const filteredLeaderboard = useMemo(() => {
      const applyFilters = (
        record: LeaderboardRecord,
        filters: GlobalFilterCondition[]
      ) => {
        return filters.every((filter) => {
          const { column, type, value } = filter;
          const recordValue = record[column];
          if (type === 'exact') {
            return String(recordValue).toLowerCase() === String(value).toLowerCase();
          }
          if (type === 'contains') {
            return String(recordValue)
              .toLowerCase()
              .includes(String(value).toLowerCase());
          }
          if (type === 'min') {
            return typeof recordValue === 'number' && recordValue >= Number(value);
          }
          if (type === 'max') {
            return typeof recordValue === 'number' && recordValue <= Number(value);
          }
          if (type === 'dateMin') {
            return new Date(recordValue) >= new Date(value);
          }
          if (type === 'dateMax') {
            return new Date(recordValue) <= new Date(value);
          }
          return true;
        });
      };

      return leaderboard.filter((record) => {
        return applyFilters(record, globalFilters);
      });
    }, [leaderboard, globalFilters]);

    const totalPages = useMemo(
      () => Math.ceil(filteredLeaderboard.length / PAGE_SIZE),
      [filteredLeaderboard.length]
    );

    const currentLeaderboard = useMemo(() => {
      const start = (currentPage - 1) * PAGE_SIZE;
      const end = start + PAGE_SIZE;
      return filteredLeaderboard.slice(start, end);
    }, [filteredLeaderboard, currentPage]);

    // Handler to copy stock codes
    const handleCopyStockCodes = useCallback(() => {
      const stockCodes = currentLeaderboard.map(record => record.股票代码);
      const uniqueStockCodes = Array.from(new Set(stockCodes));
      const stockCodesStr = uniqueStockCodes.join(',');
      navigator.clipboard.writeText(stockCodesStr).then(() => {
        alert('股票代码已复制到剪贴板');
      }).catch(err => {
        console.error('复制失败:', err);
        alert('无法复制股票代码');
      });
    }, [currentLeaderboard]);

    if (leaderboard.length === 0) {
      return <div className="text-gray-500">暂无排行榜数据</div>;
    }

    return (
      <div className="mt-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
          <button
            onClick={() => {
              const uniqueStockCodes = Array.from(new Set(leaderboard.map(item => item.股票代码)));
              const filtered = leaderboard.filter(item => uniqueStockCodes.includes(item.股票代码));
              // To ensure only the first occurrence is included
              const uniqueFiltered = filtered.filter((item, index) => filtered.findIndex(i => i.股票代码 === item.股票代码) === index);
              // Update the leaderboard to only include unique stock codes
              // This requires lifting the state up or handling via props, which is not straightforward.
              // Alternatively, you can handle this filtering inside the component or via global filters.
              alert('一键筛选功能尚未实现。');
            }}
            className="mb-2 md:mb-0 bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition duration-200"
          >
            一键筛选所有股票
          </button>
          <button
            onClick={handleCopyStockCodes}
            className="mb-2 md:mb-0 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition duration-200"
          >
            一键复制股票代码
          </button>
        </div>
        <table className="w-full table-auto border">
          <thead>
            <tr>
              <th className="border px-2 py-1">排名</th>
              {headers.map((header, idx) => (
                <th key={idx} className="border px-2 py-1">
                  {header === 'backtestName' ? '回测名称' : header}
                </th>
              ))}
              <th className="border px-2 py-1">操作</th>
            </tr>
          </thead>
          <tbody>
            {currentLeaderboard.map((item, idx) => (
              <React.Fragment key={idx}>
                <tr>
                  <td className="border px-2 py-1 text-center">
                    {(currentPage - 1) * PAGE_SIZE + idx + 1}
                  </td>
                  {headers.map((header, keyIdx) => (
                    <td key={keyIdx} className="border px-2 py-1 text-center">
                      {item[header]}
                    </td>
                  ))}
                  <td className="border px-2 py-1 text-center">
                    <button
                      onClick={() => {
                        onViewRecords(item.backtestName, item.股票代码);
                        toggleStock(item.股票代码);
                      }}
                      className="text-blue-600 hover:underline"
                    >
                      查看交易记录
                    </button>
                  </td>
                </tr>
                {expandedStock[item.股票代码] && (
                  <tr>
                    <td
                      colSpan={headers.length + 1}
                      className="p-4 bg-gray-100"
                    >
                      <BuySellChart
                        stockCode={item.股票代码}
                        backtestName={item.backtestName}
                        strategyIndex={strategyIndex}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {/* Pagination Controls */}
        <div className="flex justify-center items-center mt-4 space-x-2">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded ${
              currentPage === 1
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            第一页
          </button>

          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded ${
              currentPage === 1
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            上一页
          </button>

          <span className="text-gray-700">
            第 {currentPage} 页，共 {totalPages} 页
          </span>

          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded ${
              currentPage === totalPages
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            下一页
          </button>

          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded ${
              currentPage === totalPages
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            最后一页
          </button>
        </div>
      </div>
    );
  }
);

// Aggregated Leaderboard Table Component
const AggregatedLeaderboardTable: React.FC<{
  allLeaderboards: LeaderboardRecord[];
  globalFilters: GlobalFilterCondition[];
  onViewRecords: (backtestName: string, stockCode: string) => void;
}> = React.memo(
  ({ allLeaderboards, globalFilters, onViewRecords }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [uniqueFiltered, setUniqueFiltered] = useState<LeaderboardRecord[]>([]);

    const headers = useMemo(() => {
      if (allLeaderboards.length === 0) return [];
      return Object.keys(allLeaderboards[0]);
    }, [allLeaderboards]);

    // Identify column data types
    const columnTypes = useMemo(() => {
      if (allLeaderboards.length === 0) return {};
      const firstRow = allLeaderboards[0];
      const types: { [key: string]: 'number' | 'string' | 'date' } = {};
      headers.forEach((header) => {
        const value = firstRow[header];
        if (typeof value === 'number') {
          types[header] = 'number';
        } else if (typeof value === 'string') {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (dateRegex.test(value)) {
            types[header] = 'date';
          } else {
            types[header] = 'string';
          }
        } else {
          types[header] = 'string';
        }
      });
      return types;
    }, [allLeaderboards, headers]);

    // Apply global filters
    const filteredLeaderboard = useMemo(() => {
      const applyFilters = (
        record: LeaderboardRecord,
        filters: GlobalFilterCondition[]
      ) => {
        return filters.every((filter) => {
          const { column, type, value } = filter;
          const recordValue = record[column];
          if (type === 'exact') {
            return String(recordValue).toLowerCase() === String(value).toLowerCase();
          }
          if (type === 'contains') {
            return String(recordValue)
              .toLowerCase()
              .includes(String(value).toLowerCase());
          }
          if (type === 'min') {
            return typeof recordValue === 'number' && recordValue >= Number(value);
          }
          if (type === 'max') {
            return typeof recordValue === 'number' && recordValue <= Number(value);
          }
          if (type === 'dateMin') {
            return new Date(recordValue) >= new Date(value);
          }
          if (type === 'dateMax') {
            return new Date(recordValue) <= new Date(value);
          }
          return true;
        });
      };

      return allLeaderboards.filter((record) => {
        return applyFilters(record, globalFilters);
      });
    }, [allLeaderboards, globalFilters]);

    const totalPages = useMemo(
      () => Math.ceil(filteredLeaderboard.length / PAGE_SIZE),
      [filteredLeaderboard.length]
    );

    const currentLeaderboard = useMemo(() => {
      const start = (currentPage - 1) * PAGE_SIZE;
      const end = start + PAGE_SIZE;
      return uniqueFiltered.length > 0 ? uniqueFiltered.slice(start, end) : filteredLeaderboard.slice(start, end);
    }, [filteredLeaderboard, currentPage, uniqueFiltered]);

    const handleUniqueFilter = useCallback(() => {
      const uniqueMap = new Map<string, LeaderboardRecord>();
      filteredLeaderboard.forEach(record => {
        if (!uniqueMap.has(record.股票代码)) {
          uniqueMap.set(record.股票代码, record);
        }
      });
      setUniqueFiltered(Array.from(uniqueMap.values()));
      setCurrentPage(1);
    }, [filteredLeaderboard]);

    const clearUniqueFilter = useCallback(() => {
      setUniqueFiltered([]);
      setCurrentPage(1);
    }, []);

    // Handler to copy stock codes
    const handleCopyStockCodes = useCallback(() => {
      const stockCodes = currentLeaderboard.map(record => record.股票代码);
      const uniqueStockCodes = Array.from(new Set(stockCodes));
      const stockCodesStr = uniqueStockCodes.join(',');
      navigator.clipboard.writeText(stockCodesStr).then(() => {
        alert('股票代码已复制到剪贴板');
      }).catch(err => {
        console.error('复制失败:', err);
        alert('无法复制股票代码');
      });
    }, [currentLeaderboard]);

    if (allLeaderboards.length === 0) {
      return <div className="text-gray-500">暂无排行榜数据</div>;
    }

    return (
      <div className="mt-8">
        <h3 className="text-2xl font-semibold mb-4 text-gray-800">筛选后的排行榜</h3>
        <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition duration-200"
          >
            {isExpanded ? '收起排行榜' : '展开排行榜'}
          </button>
          <div className="flex space-x-2">
            <button
              onClick={handleUniqueFilter}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition duration-200"
            >
              一键筛选所有股票
            </button>
            <button
              onClick={handleCopyStockCodes}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition duration-200"
            >
              一键复制股票代码
            </button>
            {uniqueFiltered.length > 0 && (
              <button
                onClick={clearUniqueFilter}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition duration-200"
              >
                清除筛选
              </button>
            )}
          </div>
        </div>
        {isExpanded ? (
          uniqueFiltered.length > 0 || filteredLeaderboard.length > 0 ? (
            <>
              <table className="w-full table-auto border">
                <thead>
                  <tr>
                    <th className="border px-2 py-1">排名</th>
                    {headers.map((header, idx) => (
                      <th key={idx} className="border px-2 py-1">
                        {header === 'backtestName' ? '回测名称' : header}
                      </th>
                    ))}
                    <th className="border px-2 py-1">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {currentLeaderboard.map((item, idx) => (
                    <React.Fragment key={idx}>
                      <tr>
                        <td className="border px-2 py-1 text-center">
                          {(currentPage - 1) * PAGE_SIZE + idx + 1}
                        </td>
                        {headers.map((header, keyIdx) => (
                          <td key={keyIdx} className="border px-2 py-1 text-center">
                            {item[header]}
                          </td>
                        ))}
                        <td className="border px-2 py-1 text-center">
                          <button
                            onClick={() => {
                              onViewRecords(item.backtestName, item.股票代码);
                            }}
                            className="text-blue-600 hover:underline"
                          >
                            查看交易记录
                          </button>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>

              {/* Pagination Controls */}
              <div className="flex justify-center items-center mt-4 space-x-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded ${
                    currentPage === 1
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  第一页
                </button>

                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded ${
                    currentPage === 1
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  上一页
                </button>

                <span className="text-gray-700">
                  第 {currentPage} 页，共 {totalPages} 页
                </span>

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded ${
                    currentPage === totalPages
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  下一页
                </button>

                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded ${
                    currentPage === totalPages
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  最后一页
                </button>
              </div>
            </>
          ) : (
            <div className="text-gray-500">筛选后的排行榜暂无数据</div>
          )
        ) : (
          <div className="text-gray-500">排行榜已收起。点击上方按钮展开查看。</div>
        )}
      </div>
    );
  }
);

const BuySellChart: React.FC<{
  stockCode: string;
  backtestName: string;
  strategyIndex: number;
}> = React.memo(({ stockCode, backtestName, strategyIndex }) => {
  const [buySellRecords, setBuySellRecords] = useState<BuySellRecord[]>([]);

  useEffect(() => {
    const fetchBuySellRecords = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5000/api/getbacktestbuysell', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ backtestname: backtestName, stockcode: stockCode }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          alert(errorData.error || '获取买卖记录失败');
          return;
        }

        const data = await response.json();
        const parsedData =
          typeof data === 'string' ? JSON.parse(data) : data;

        if (!Array.isArray(parsedData)) {
          throw new TypeError('Parsed data is not an array');
        }

        const parsedBuySellRecords: BuySellRecord[] = parsedData.map(
          (item: any) => ({
            日期: new Date(item.日期).toLocaleDateString(),
            操作: item.操作,
            价格: item.价格,
            数量: item.数量,
            现金余额: item.现金余额,
            持仓: item.持仓,
            总资产: item.总资产,
          })
        );

        setBuySellRecords(parsedBuySellRecords);
      } catch (error) {
        console.error('获取买卖记录时出错:', error);
        alert('无法获取买卖记录，请稍后再试。');
      }
    };

    fetchBuySellRecords();
  }, [stockCode, backtestName]);

  const chartData = buySellRecords.map((item) => ({
    日期: item.日期,
    价格: item.价格,
    总资产: item.总资产,
    操作: item.操作,
  }));

  // Custom dot rendering function
  const renderCustomizedDot = useCallback((props: any) => {
    const { cx, cy, payload } = props;

    if (payload.操作 === '买入') {
      return (
        <circle cx={cx} cy={cy} r={6} fill="red" stroke="#fff" strokeWidth={2} />
      );
    }

    if (payload.操作 === '卖出') {
      return (
        <rect
          x={cx - 6}
          y={cy - 6}
          width={12}
          height={12}
          fill="green"
          stroke="#fff"
          strokeWidth={2}
        />
      );
    }

    return <circle cx={cx} cy={cy} r={3} fill="#8884d8" />;
  }, []);

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-semibold text-gray-800">买卖记录图表</h4>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 15 }}>
          <CartesianGrid strokeDasharray="5 5" stroke="#e0e0e0" />
          <XAxis dataKey="日期" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', borderRadius: '5px' }}
            labelStyle={{ fontWeight: 'bold' }}
            formatter={(value: any, name: string) => {
              if (name === '操作') {
                return `${value}`;
              }
              return value;
            }}
          />
          <Legend align="right" verticalAlign="top" />
          <Line
            type="monotone"
            dataKey="价格"
            stroke="#007bff"
            strokeWidth={2}
            dot={renderCustomizedDot}
          />
          <Line
            type="monotone"
            dataKey="总资产"
            stroke="#28a745"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

const Home = () => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStrategyIndex, setCurrentStrategyIndex] = useState<number | null>(null);
  const [newStrategy, setNewStrategy] = useState({
    name: '',
    buyConditions: [''],
    sellConditions: [''],
    selectedOptions: [] as { value: string; label: string }[],
  });

  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);
  const [stockOptions, setStockOptions] = useState<{ value: string; label: string }[]>([]);

  // 指数相关
  const [indexOptions, setIndexOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<{ value: string; label: string } | null>(null);

  // 回测多策略选中
  const [selectedBacktests, setSelectedBacktests] = useState<{ [strategyIdx: number]: Set<number> }>({});
  const [selectedStrategies, setSelectedStrategies] = useState<Set<number>>(new Set());

  // 全局排行榜筛选
  const [globalFilters, setGlobalFilters] = useState<GlobalFilterCondition[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [selectedFilterColumns, setSelectedFilterColumns] = useState<{ value: string; label: string }[]>([]);
  const [filterConditions, setFilterConditions] = useState<{ [key: string]: { type: string; value: any } }>({});

  // 可选排行榜类型
  const [selectedLeaderboardTypes, setSelectedLeaderboardTypes] = useState<{ value: string; label: string }[]>([]);
  const [availableLeaderboardTypes, setAvailableLeaderboardTypes] = useState<string[]>([]);

  // 控制查看交易记录弹窗
  const [selectedTransactionRecord, setSelectedTransactionRecord] = useState<{ backtestName: string; stockCode: string } | null>(null);

  // 批量回测弹窗相关状态
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchMode, setBatchMode] = useState<'single' | 'multi'>('single'); // 默认为单时间范围模式

  // 单时间范围
  const [singleTimeRange, setSingleTimeRange] = useState({ start: '', end: '' });

  // 多时间范围
  const [multiDateRanges, setMultiDateRanges] = useState<{
    [strategyIndex: number]: { start: string; end: string }[];
  }>({});

  // 自动生成时间范围
  const [autoGenerateParams, setAutoGenerateParams] = useState<{
    numberOfRanges: number;
    durationPerRange: number;
  }>({ numberOfRanges: 20, durationPerRange: 15 });

  // 统一选定的股票列表 & 指数
  const [batchSelectedStocks, setBatchSelectedStocks] = useState('');
  const [batchSelectedIndex, setBatchSelectedIndex] = useState<{ value: string; label: string } | null>(null);

  // Fetch strategies data
  const fetchStrategies = useCallback(async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/getstrategy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || '获取策略失败');
        return;
      }

      const data = await response.json();
      const parsedStrategies = JSON.parse(data).map((item: any) => ({
        name: item.strategy_name,
        buyConditions: item.buy.split(',').map((condition: string) => condition.trim()),
        sellConditions: item.sell.split(',').map((condition: string) => condition.trim()),
        selectedOptions: [] as { value: string; label: string }[],
        backtestHistory: [] as BacktestRecord[],
        isOpen: false,
      }));

      const strategiesWithBacktest = await Promise.all(
        parsedStrategies.map(async (strategy: any) => {
          const backtestResponse = await fetch('http://127.0.0.1:5000/api/getbacktest', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ strategyname: strategy.name })
          });

          if (!backtestResponse.ok) {
            const errorData = await backtestResponse.json();
            console.error(`获取策略 ${strategy.name} 的回测历史失败:`, errorData.error || '未知错误');
            return { ...strategy, backtestHistory: [] };
          }
          const backtestData = await backtestResponse.json();
          const parsedBacktests: BacktestRecord[] = JSON.parse(backtestData)
            .filter((item: any) => item.strategyname === strategy.name)
            .map((item: any) => ({
              date: item.date,
              result: item.backtestname,
              startdate: new Date(item.startdate).toLocaleDateString(),
              enddate: new Date(item.enddate).toLocaleDateString(),
              stocklist: item.stocklist.split(',').map((s: string) => s.trim()),
              buyConditions: item.buyConditions.split(',').map((s: string) => s.trim()),
              sellConditions: item.sellConditions.split(',').map((s: string) => s.trim()),
              isExpanded: false,
              leaderboards: {},
              isSelected: false,
              showFullStockList: false,
            }));

          return { ...strategy, backtestHistory: parsedBacktests };
        })
      );

      setStrategies(strategiesWithBacktest);
    } catch (error) {
      console.error('获取策略时出错:', error);
      alert('无法获取策略，请稍后再试。');
    }
  }, []);

  // Fetch index options
  const fetchIndexOptions = useCallback(async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/get_index', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || '获取指数列表失败');
        return;
      }

      const data = await response.json();
      const parsedData = JSON.parse(data);
      const options = parsedData.map((item: any) => ({
        value: item.code,
        label: item.name
      }));
      setIndexOptions(options);
    } catch (error) {
      console.error('获取指数列表时出错:', error);
      alert('无法获取指数列表，请稍后再试。');
    }
  }, []);

  // Fetch all available leaderboard columns and types
  const fetchAllLeaderboardData = useCallback(() => {
    const columnsSet = new Set<string>();
    const typesSet = new Set<string>();
    strategies.forEach((strategy) => {
      strategy.backtestHistory.forEach((backtest) => {
        if (backtest.leaderboards) {
          Object.keys(backtest.leaderboards).forEach((key) => typesSet.add(key));
          Object.values(backtest.leaderboards).forEach((leaderboard) => {
            leaderboard.forEach((record) => {
              Object.keys(record).forEach((key) => {
                if (key !== 'backtestName') {
                  columnsSet.add(key);
                }
              });
            });
          });
        }
      });
    });
    setAvailableColumns(Array.from(columnsSet));
    setAvailableLeaderboardTypes(Array.from(typesSet));
  }, [strategies]);

  useEffect(() => {
    fetchStrategies();
    socket.on('response/baseData', (data) => {
      const parsedData = JSON.parse(data);
      const selectOptions = parsedData.map((item: any) => ({
        value: item.baseData,
        label: item.baseData
      }));
      setOptions(selectOptions);
    });

    socket.on('response/stockList', (data) => {
      const parsedStocks = JSON.parse(data);
      const stockOptions = parsedStocks.map((stock: any) => ({
        value: stock.symbol,
        label: stock.name
      }));
      setStockOptions(stockOptions);
    });

    socket.emit('api/factor/baseData');
    socket.emit('api/stock/list');

    return () => {
      socket.off('response/baseData');
      socket.off('response/stockList');
    };
  }, [fetchStrategies]);

  useEffect(() => {
    fetchAllLeaderboardData();
  }, [strategies, fetchAllLeaderboardData]);

  // Handle index selection (单次回测弹窗专用)
  const handleIndexChange = useCallback(async (selectedOption: any) => {
    setSelectedIndex(selectedOption);
    if (selectedOption) {
      try {
        const response = await fetch('http://127.0.0.1:5000/api/get_select_indexcode', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ code: selectedOption.value })
        });

        if (!response.ok) {
          const errorData = await response.json();
          alert(errorData.error || '获取股票列表失败');
          return;
        }

        const data = await response.json();
        const stockList = data.code;
        setSelectedStocks(stockList); // 自动填充股票输入框
      } catch (error) {
        console.error('获取股票列表时出错:', error);
        alert('无法获取股票列表，请稍后再试。');
      }
    } else {
      setSelectedStocks(''); // 清空股票输入框
    }
  }, []);

  // 新增/更新策略
  const handleAddStrategy = useCallback(async () => {
    if (!newStrategy.name.trim()) {
      alert('策略名称不能为空。');
      return;
    }

    const postData = {
      strategy_name: newStrategy.name,
      baseData: newStrategy.selectedOptions.map(option => option.value).join(','),
      buy: newStrategy.buyConditions.filter(condition => condition !== '').join(','),
      sell: newStrategy.sellConditions.filter(condition => condition !== '').join(','),
    };

    try {
      const response = await fetch('http://127.0.0.1:5000/api/addstrategy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || '请求失败');
        return;
      }

      await fetchStrategies();
      resetModal();
    } catch (error) {
      console.error('请求出错:', error);
      alert('无法请求，请稍后再试。');
    }
  }, [newStrategy, fetchStrategies]);

  // 删除策略
  const handleDeleteStrategy = useCallback(async (strategyIndex: number) => {
    const strategyToDelete = strategies[strategyIndex];
    const postData = {
      strategy_name: strategyToDelete.name
    };

    if (!window.confirm(`确定要删除策略 "${strategyToDelete.name}" 吗？`)) {
      return;
    }

    try {
      const response = await fetch('http://127.0.0.1:5000/api/deletestrategy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || '删除策略失败');
        return;
      }

      await fetchStrategies();
      alert('策略已成功删除。');
    } catch (error) {
      console.error('删除策略时出错:', error);
      alert('无法删除策略，请稍后再试。');
    }
  }, [strategies, fetchStrategies]);

  // 重置添加策略 Modal
  const resetModal = useCallback(() => {
    setNewStrategy({ name: '', buyConditions: [''], sellConditions: [''], selectedOptions: [] });
    setCurrentStrategyIndex(null);
    setIsModalOpen(false);
  }, []);

  // 打开单次回测 Modal
  const openCalculateModal = useCallback((index: number | null = null) => {
    setCurrentStrategyIndex(index);
    setSelectedIndex(null);
    setSingleTimeRange({ start: '', end: '' });
    setSelectedStocks('');
    setIsCalculateModalOpen(true);
    fetchIndexOptions();
  }, [fetchIndexOptions]);

  // 状态 for single calculate modal
  const [isCalculateModalOpen, setIsCalculateModalOpen] = useState(false);
  const [timeRange, setTimeRange] = useState({ start: '', end: '' });
  const [selectedStocks, setSelectedStocks] = useState('');

  // Single calculate - confirm
  const handleCalculate = useCallback(async () => {
    if (currentStrategyIndex === null) {
      alert('请先选择要计算的策略。');
      return;
    }

    const currentStrategy = strategies[currentStrategyIndex];

    if (!timeRange.start || !timeRange.end) {
      alert('请填写完整的时间范围。');
      return;
    }

    const buyConditions = currentStrategy.buyConditions.filter(condition => condition !== '').join(',');
    const sellConditions = currentStrategy.sellConditions.filter(condition => condition !== '').join(',');

    const backtestData = {
      strategyname: currentStrategy.name,
      backtestname: `回测_${timeRange.start}_${timeRange.end}_${Date.now().toString(36)}`,
      date: new Date().toLocaleDateString(),
      startdate: timeRange.start,
      enddate: timeRange.end,
      stocklist: selectedStocks.split(',').map(stock => stock.trim()).join(','),
      buyConditions: buyConditions,
      sellConditions: sellConditions,
      index_code: selectedIndex ? selectedIndex.value : '',
      index_name: selectedIndex ? selectedIndex.label : '',
    };

    try {
      const response = await fetch('http://127.0.0.1:5000/api/addbacktest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(backtestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || '提交回测失败');
        return;
      }

      alert('回测已成功提交。');
      await fetchStrategies();
      setIsCalculateModalOpen(false);
    } catch (error) {
      console.error('提交回测时出错:', error);
      alert('无法提交回测，请稍后再试。');
    }
  }, [currentStrategyIndex, strategies, timeRange, selectedStocks, selectedIndex, fetchStrategies]);

  // 快速选择时间范围
  const handleQuickSelect = useCallback((period: string) => {
    const end = new Date();
    let start = new Date();

    if (period === '半年') {
      start.setMonth(start.getMonth() - 6);
    } else if (period === '一年') {
      start.setFullYear(start.getFullYear() - 1);
    } else if (period === '两年') {
      start.setFullYear(start.getFullYear() - 2);
    }

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    setTimeRange({ start: startStr, end: endStr });
  }, []);

  // 批量回测 - 打开 Modal
  const openBatchModal = useCallback(() => {
    if (selectedStrategies.size === 0) {
      alert('请先勾选需要回测的策略。');
      return;
    }
    // 初始化
    setBatchMode('single');
    setSingleTimeRange({ start: '', end: '' });
    setBatchSelectedStocks('');
    setBatchSelectedIndex(null);
    setAutoGenerateParams({ numberOfRanges: 20, durationPerRange: 15 });

    // Reset multiDateRanges for selected strategies
    const newRanges: { [key: number]: { start: string; end: string }[] } = {};
    selectedStrategies.forEach((idx) => {
      newRanges[idx] = multiDateRanges[idx] || [{ start: '', end: '' }];
    });
    setMultiDateRanges(newRanges);

    setIsBatchModalOpen(true);
    fetchIndexOptions();
  }, [selectedStrategies, multiDateRanges, fetchIndexOptions]);

  // 批量回测 - handle date range change for multi
  const handleDateRangeChange = useCallback(
    (strategyIdx: number, rangeIdx: number, field: 'start' | 'end', value: string) => {
      setMultiDateRanges((prev) => {
        const strategyRanges = [...(prev[strategyIdx] || [])];
        strategyRanges[rangeIdx] = {
          ...strategyRanges[rangeIdx],
          [field]: value,
        };
        return {
          ...prev,
          [strategyIdx]: strategyRanges
        };
      });
    },
    []
  );

  // **新增**：批量回测 - 删除某个时间范围
  const removeDateRangeForStrategy = useCallback(
    (strategyIdx: number, rangeIdx: number) => {
      setMultiDateRanges((prev) => {
        const updatedRanges = [...(prev[strategyIdx] || [])];
        updatedRanges.splice(rangeIdx, 1);
        return {
          ...prev,
          [strategyIdx]: updatedRanges
        };
      });
    },
    []
  );

  // 批量回测 - add date range for a strategy
  const addDateRangeForStrategy = useCallback((strategyIdx: number) => {
    setMultiDateRanges((prev) => {
      const existing = prev[strategyIdx] || [];
      return {
        ...prev,
        [strategyIdx]: [...existing, { start: '', end: '' }]
      };
    });
  }, []);

  // 批量回测 - handle quick range select for multi
  const handleQuickRangeSelectMulti = useCallback(
    (strategyIdx: number, rangeIdx: number, period: string) => {
      const endDate = new Date();
      let startDate = new Date();
      if (period === '半年') {
        startDate.setMonth(startDate.getMonth() - 6);
      } else if (period === '一年') {
        startDate.setFullYear(startDate.getFullYear() - 1);
      } else if (period === '两年') {
        startDate.setFullYear(startDate.getFullYear() - 2);
      }

      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      handleDateRangeChange(strategyIdx, rangeIdx, 'start', startStr);
      handleDateRangeChange(strategyIdx, rangeIdx, 'end', endStr);
    },
    [handleDateRangeChange]
  );

  // 批量回测 - handle batch index change
  const handleBatchIndexChange = useCallback(async (selectedOption: any) => {
    setBatchSelectedIndex(selectedOption);
    if (selectedOption) {
      try {
        const response = await fetch('http://127.0.0.1:5000/api/get_select_indexcode', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ code: selectedOption.value })
        });

        if (!response.ok) {
          const errorData = await response.json();
          alert(errorData.error || '获取股票列表失败');
          return;
        }

        const data = await response.json();
        const stockList = data.code;
        setBatchSelectedStocks(stockList); // 自动填充批量回测的股票输入框
      } catch (error) {
        console.error('获取股票列表时出错:', error);
        alert('无法获取股票列表，请稍后再试。');
      }
    } else {
      setBatchSelectedStocks(''); // 清空批量回测的股票输入框
    }
  }, []);

  // 批量回测 - handle submit
  const handleBatchSubmit = useCallback(async () => {
    if (selectedStrategies.size === 0) {
      alert('请先勾选需要回测的策略。');
      return;
    }

    const successStrategies: string[] = [];
    const failedStrategies: { name: string; error: string }[] = [];

    if (batchMode === 'single') {
      // Single time range mode
      if (!singleTimeRange.start || !singleTimeRange.end) {
        alert('请填写完整的单时间范围。');
        return;
      }

      const buyConditionsMap: { [strategyIdx: number]: string } = {};
      const sellConditionsMap: { [strategyIdx: number]: string } = {};

      selectedStrategies.forEach((strategyIdx) => {
        const strategy = strategies[strategyIdx];
        buyConditionsMap[strategyIdx] = strategy.buyConditions.filter(cond => cond !== '').join(',');
        sellConditionsMap[strategyIdx] = strategy.sellConditions.filter(cond => cond !== '').join(',');
      });

      const backtestDataTemplate = {
        date: new Date().toLocaleDateString(),
        startdate: singleTimeRange.start,
        enddate: singleTimeRange.end,
        stocklist: batchSelectedStocks.split(',').map(stock => stock.trim()).join(','),
        index_code: batchSelectedIndex ? batchSelectedIndex.value : '',
        index_name: batchSelectedIndex ? batchSelectedIndex.label : '',
      };

      for (const strategyIdx of Array.from(selectedStrategies)) {
        const strategy = strategies[strategyIdx];
        const buyConditions = buyConditionsMap[strategyIdx];
        const sellConditions = sellConditionsMap[strategyIdx];

        const individualBacktestData = {
          ...backtestDataTemplate,
          strategyname: strategy.name,
          backtestname: `批量回测_${singleTimeRange.start}_${singleTimeRange.end}_${uuidv4().split('-')[0]}`,
          buyConditions: buyConditions,
          sellConditions: sellConditions,
        };

        try {
          const response = await fetch('http://127.0.0.1:5000/api/addbacktest', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(individualBacktestData)
          });

          if (!response.ok) {
            const errorData = await response.json();
            failedStrategies.push({ name: strategy.name, error: errorData.error || '未知错误' });
          } else {
            successStrategies.push(strategy.name);
          }
        } catch (error) {
          console.error(`策略 "${strategy.name}" 提交回测时出错:`, error);
          failedStrategies.push({ name: strategy.name, error: '网络错误或服务器不可达' });
        }
      }
    } else {
      // Multi time range mode
      // Validate all date ranges
      let isValid = true;
      selectedStrategies.forEach((strategyIdx) => {
        const ranges = multiDateRanges[strategyIdx];
        if (!ranges || ranges.length === 0) {
          isValid = false;
          alert(`策略 "${strategies[strategyIdx].name}" 没有设置任何时间范围。`);
        } else {
          ranges.forEach((range, idx) => {
            if (!range.start || !range.end) {
              isValid = false;
              alert(`策略 "${strategies[strategyIdx].name}" 的第 ${idx + 1} 个时间范围不完整。`);
            }
          });
        }
      });

      if (!isValid) return;

      for (const strategyIdx of Array.from(selectedStrategies)) {
        const strategy = strategies[strategyIdx];
        const buyConditions = strategy.buyConditions.filter(cond => cond !== '').join(',');
        const sellConditions = strategy.sellConditions.filter(cond => cond !== '').join(',');

        const ranges = multiDateRanges[strategyIdx];

        for (const range of ranges) {
          const individualBacktestData = {
            strategyname: strategy.name,
            backtestname: `批量回测_${range.start}_${range.end}_${uuidv4().split('-')[0]}`,
            date: new Date().toLocaleDateString(),
            startdate: range.start,
            enddate: range.end,
            stocklist: batchSelectedStocks.split(',').map(stock => stock.trim()).join(','),
            buyConditions: buyConditions,
            sellConditions: sellConditions,
            index_code: batchSelectedIndex ? batchSelectedIndex.value : '',
            index_name: batchSelectedIndex ? batchSelectedIndex.label : '',
          };

          try {
            const response = await fetch('http://127.0.0.1:5000/api/addbacktest', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(individualBacktestData)
            });

            if (!response.ok) {
              const errorData = await response.json();
              failedStrategies.push({ name: strategy.name, error: errorData.error || '未知错误' });
            } else {
              successStrategies.push(`${strategy.name} (${range.start} ~ ${range.end})`);
            }
          } catch (error) {
            console.error(`策略 "${strategy.name}" 提交回测时出错:`, error);
            failedStrategies.push({ name: strategy.name, error: '网络错误或服务器不可达' });
          }
        }
      }
    }

    let message = '';
    if (successStrategies.length > 0) {
      message += `成功提交回测:\n${successStrategies.join('\n')}\n`;
    }
    if (failedStrategies.length > 0) {
      message += `\n失败回测:\n${failedStrategies.map(s => `${s.name}: ${s.error}`).join('\n')}`;
    }

    alert(message || '没有策略被提交。');
    await fetchStrategies();
    setIsBatchModalOpen(false);
    setSelectedStrategies(new Set());
  }, [strategies, selectedStrategies, batchMode, singleTimeRange, multiDateRanges, batchSelectedStocks, batchSelectedIndex, fetchStrategies]);

  // 批量回测 - auto generate time ranges
  const handleAutoGenerateTimeRanges = useCallback(() => {
    const { numberOfRanges, durationPerRange } = autoGenerateParams;
    const generatedRanges: { [strategyIdx: number]: { start: string; end: string }[] } = {};

    const today = new Date();
    const endStr = today.toISOString().split('T')[0];

    selectedStrategies.forEach((strategyIdx) => {
      const ranges: { start: string; end: string }[] = [];
      for (let i = 1; i <= numberOfRanges; i++) {
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - durationPerRange * i);

        if (startDate < new Date('2000-01-01')) { // Arbitrary cutoff
          break;
        }

        ranges.push({
          start: startDate.toISOString().split('T')[0],
          end: endStr,
        });
      }

      generatedRanges[strategyIdx] = ranges;
    });

    setMultiDateRanges(generatedRanges);
  }, [autoGenerateParams, selectedStrategies]);

  // 添加买卖条件
  const handleAddCondition = useCallback((type: 'buy' | 'sell') => {
    setNewStrategy((prev) => ({
      ...prev,
      [type === 'buy' ? 'buyConditions' : 'sellConditions']: [
        ...prev[type === 'buy' ? 'buyConditions' : 'sellConditions'],
        ''
      ]
    }));
  }, []);

  // 修改买卖条件
  const handleConditionChange = useCallback((type: 'buy' | 'sell', index: number, value: string) => {
    setNewStrategy((prev) => {
      const conditions = type === 'buy' ? [...prev.buyConditions] : [...prev.sellConditions];
      conditions[index] = value;
      return type === 'buy'
        ? { ...prev, buyConditions: conditions }
        : { ...prev, sellConditions: conditions };
    });
  }, []);

  // 展开/收起策略
  const toggleOpen = useCallback((index: number) => {
    setStrategies((prevStrategies) =>
      prevStrategies.map((strategy, i) =>
        i === index ? { ...strategy, isOpen: !strategy.isOpen } : strategy
      )
    );
  }, []);

  // 展开/收起 回测详情
  const toggleExpand = useCallback(async (strategyIndex: number, recordIndex: number) => {
    const backtest = strategies[strategyIndex].backtestHistory[recordIndex];
    if (!backtest.isExpanded) {
      try {
        const response = await fetch('http://127.0.0.1:5000/api/getbacktestall', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ backtestname: backtest.result, stockcode: backtest.stocklist[0] })
        });

        if (!response.ok) {
          const errorData = await response.json();
          alert(errorData.error || '获取详细回测数据失败');
          return;
        }
        const backtestData = await response.json();
        const parsedData = typeof backtestData === 'string' ? JSON.parse(backtestData) : backtestData;

        const leaderboards: { [key: string]: LeaderboardRecord[] } = {};
        for (const key of Object.keys(parsedData)) {
          leaderboards[key] = parsedData[key].map((item: any) => ({
            股票代码: item.股票代码,
            backtestName: backtest.result,
            ...item
          }));
        }

        const selectedLeaderboard = Object.keys(leaderboards)[0] || '';

        setStrategies((prevStrategies) => {
          const newStrategies = [...prevStrategies];
          const strategy = newStrategies[strategyIndex];
          const backtestHistory = [...strategy.backtestHistory];
          const backtestToUpdate = { ...backtestHistory[recordIndex] };

          backtestToUpdate.leaderboards = leaderboards;
          backtestToUpdate.selectedLeaderboard = selectedLeaderboard;
          backtestToUpdate.isExpanded = true;

          backtestHistory[recordIndex] = backtestToUpdate;
          newStrategies[strategyIndex] = { ...strategy, backtestHistory };
          return newStrategies;
        });

      } catch (error) {
        console.error('获取详细回测数据时出错:', error);
        alert('无法获取详细回测数据，请稍后再试。');
      }
    } else {
      // 收起
      setStrategies((prevStrategies) => {
        const newStrategies = [...prevStrategies];
        const strategy = newStrategies[strategyIndex];
        const backtestHistory = [...strategy.backtestHistory];
        const backtestToUpdate = { ...backtestHistory[recordIndex] };

        backtestToUpdate.isExpanded = false;

        backtestHistory[recordIndex] = backtestToUpdate;
        newStrategies[strategyIndex] = { ...strategy, backtestHistory };
        return newStrategies;
      });
    }
  }, [strategies]);

  // 打开编辑策略 Modal
  const openEditModal = useCallback((index: number) => {
    setCurrentStrategyIndex(index);
    setNewStrategy({
      name: strategies[index].name,
      buyConditions: [...strategies[index].buyConditions],
      sellConditions: [...strategies[index].sellConditions],
      selectedOptions: [...strategies[index].selectedOptions],
    });
    setIsModalOpen(true);
  }, [strategies]);

  // 下载单条回测记录
  const downloadBacktestHistory = useCallback((history: BacktestRecord[]) => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + ["日期,结果,开始日期,结束日期,股票列表,买入条件,卖出条件"].concat(
        history.map(record =>
          `"${record.date}","${record.result}","${record.startdate}","${record.enddate}","${record.stocklist.join(';')}",${record.buyConditions.join(';')},${record.sellConditions.join(';')}`
        )
      ).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "backtest_history.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // 展开/收起 股票列表
  const toggleStockList = useCallback((strategyIndex: number, recordIndex: number) => {
    setStrategies((prevStrategies) => {
      const newStrategies = [...prevStrategies];
      const strategy = newStrategies[strategyIndex];
      const backtestHistory = [...strategy.backtestHistory];
      const backtestToUpdate = { ...backtestHistory[recordIndex] };
      backtestToUpdate.showFullStockList = !backtestToUpdate.showFullStockList;
      backtestHistory[recordIndex] = backtestToUpdate;
      newStrategies[strategyIndex] = { ...strategy, backtestHistory };
      return newStrategies;
    });
  }, []);

  // 选中/取消选中 回测
  const handleBacktestSelect = useCallback((strategyIdx: number, backtestIdx: number) => {
    setSelectedBacktests((prev) => {
      const newSelected = { ...prev };
      if (!newSelected[strategyIdx]) {
        newSelected[strategyIdx] = new Set<number>();
      }
      const currentSet = new Set(newSelected[strategyIdx]);
      if (currentSet.has(backtestIdx)) {
        currentSet.delete(backtestIdx);
      } else {
        currentSet.add(backtestIdx);
      }
      newSelected[strategyIdx] = currentSet;
      return newSelected;
    });

    setStrategies((prevStrategies) => {
      const newStrategies = [...prevStrategies];
      const strategy = newStrategies[strategyIdx];
      const backtestHistory = [...strategy.backtestHistory];
      const backtest = { ...backtestHistory[backtestIdx] };
      backtest.isSelected = !backtest.isSelected;
      backtestHistory[backtestIdx] = backtest;
      newStrategies[strategyIdx] = { ...strategy, backtestHistory };
      return newStrategies;
    });
  }, []);

  // 批量删除选中的回测
  const handleDeleteSelectedBacktests = useCallback(async (strategyIdx: number) => {
    const selectedIndices = selectedBacktests[strategyIdx];
    if (!selectedIndices || selectedIndices.size === 0) {
      alert('请先选择要删除的回测记录。');
      return;
    }

    const selectedNames = Array.from(selectedIndices).map(idx =>
      strategies[strategyIdx].backtestHistory[idx].result
    );
    const backtestNamesStr = selectedNames.join(',');

    if (!window.confirm(`确定要删除选中的回测记录吗？\n${backtestNamesStr}`)) {
      return;
    }

    try {
      const response = await fetch('http://127.0.0.1:5000/api/deletebacktest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ backtestname: backtestNamesStr })
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || '删除回测记录失败');
        return;
      }

      alert('回测记录已成功删除。');

      setStrategies((prevStrategies) => {
        const newStrategies = [...prevStrategies];
        const strategy = newStrategies[strategyIdx];
        const updatedBacktestHistory = strategy.backtestHistory.filter((_, idx) => !selectedIndices.has(idx));
        strategy.backtestHistory = updatedBacktestHistory;
        newStrategies[strategyIdx] = strategy;
        return newStrategies;
      });

      setSelectedBacktests((prev) => {
        const newSelected = { ...prev };
        newSelected[strategyIdx] = new Set<number>();
        return newSelected;
      });
    } catch (error) {
      console.error('删除回测记录时出错:', error);
      alert('无法删除回测记录，请稍后再试。');
    }
  }, [selectedBacktests, strategies]);

  // 添加/更新全局筛选
  const handleAddGlobalFilter = useCallback(() => {
    const newFilters: GlobalFilterCondition[] = [];

    selectedFilterColumns.forEach(col => {
      const colKey = col.value;
      const conditionObj = filterConditions[colKey];
      if (conditionObj && conditionObj.value !== '' && conditionObj.value !== undefined) {
        newFilters.push({
          column: colKey,
          type: conditionObj.type as GlobalFilterCondition['type'],
          value: conditionObj.value
        });
      }
    });

    if (newFilters.length === 0) {
      alert('请至少针对一个列填写有效的筛选值');
      return;
    }

    setGlobalFilters(newFilters);
  }, [filterConditions, selectedFilterColumns]);

  // 删除全局筛选
  const handleDeleteGlobalFilter = useCallback((index: number) => {
    setGlobalFilters((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  // 筛选列选择
  const handleFilterColumnChange = useCallback((selectedOptions: MultiValue<{ value: string; label: string }>) => {
    setSelectedFilterColumns(selectedOptions as { value: string; label: string }[]);

    setFilterConditions((prev) => {
      const newConditions = { ...prev };
      // 清除不在selectedOptions的列
      Object.keys(newConditions).forEach(key => {
        if (!(selectedOptions || []).find((option) => option.value === key)) {
          delete newConditions[key];
        }
      });
      // 为新选中的列初始化筛选
      (selectedOptions || []).forEach((option) => {
        if (!newConditions[option.value]) {
          newConditions[option.value] = { type: 'exact', value: '' };
        }
      });
      return newConditions;
    });
  }, []);

  // 更新单独列筛选
  const handleIndividualFilterChange = useCallback((column: string, field: 'type' | 'value', value: any) => {
    setFilterConditions((prev) => ({
      ...prev,
      [column]: {
        ...prev[column],
        [field]: value
      }
    }));
  }, []);

  // 一次性展开所有
  const expandAll = useCallback(async () => {
    if (selectedLeaderboardTypes.length === 0) {
      alert('请先选择要展开的排行榜类型。');
      return;
    }

    // 先把所有策略本身展开
    setStrategies((prevStrategies) =>
      prevStrategies.map((strategy) => ({
        ...strategy,
        isOpen: true
      }))
    );

    // 再逐个回测展开
    for (let sIdx = 0; sIdx < strategies.length; sIdx++) {
      const strat = strategies[sIdx];
      for (let bIdx = 0; bIdx < strat.backtestHistory.length; bIdx++) {
        const backtest = strat.backtestHistory[bIdx];
        if (!backtest.isExpanded) {
          try {
            const response = await fetch('http://127.0.0.1:5000/api/getbacktestall', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ backtestname: backtest.result, stockcode: backtest.stocklist[0] })
            });

            if (!response.ok) {
              const errorData = await response.json();
              alert(errorData.error || '获取详细回测数据失败');
              continue;
            }
            const backtestData = await response.json();
            const parsedData = typeof backtestData === 'string' ? JSON.parse(backtestData) : backtestData;

            const leaderboards: { [key: string]: LeaderboardRecord[] } = {};
            for (const key of Object.keys(parsedData)) {
              if (selectedLeaderboardTypes.some(type => type.value === key)) {
                leaderboards[key] = parsedData[key].map((item: any) => ({
                  股票代码: item.股票代码,
                  backtestName: backtest.result,
                  ...item
                }));
              }
            }

            if (Object.keys(leaderboards).length === 0) {
              continue;
            }

            const selectedLeaderboard = Object.keys(leaderboards)[0] || '';

            setStrategies((prevStrategies) => {
              const newStrategies = [...prevStrategies];
              const strategy = newStrategies[sIdx];
              const backtestHistory = [...strategy.backtestHistory];
              const backtestToUpdate = { ...backtestHistory[bIdx] };

              backtestToUpdate.leaderboards = leaderboards;
              backtestToUpdate.selectedLeaderboard = selectedLeaderboard;
              backtestToUpdate.isExpanded = true;

              backtestHistory[bIdx] = backtestToUpdate;
              newStrategies[sIdx] = { ...strategy, backtestHistory };
              return newStrategies;
            });

          } catch (error) {
            console.error('获取详细回测数据时出错:', error);
            alert('无法获取详细回测数据，请稍后再试。');
          }
        } else {
          // 如果已经展开，则只保留所选排行榜
          setStrategies((prevStrategies) => {
            const newStrategies = [...prevStrategies];
            const strategy = newStrategies[sIdx];
            const backtestHistory = [...strategy.backtestHistory];
            const backtestToUpdate = { ...backtestHistory[bIdx] };

            if (backtestToUpdate.leaderboards) {
              const filteredLeaderboards: { [key: string]: LeaderboardRecord[] } = {};
              Object.keys(backtestToUpdate.leaderboards).forEach(key => {
                if (selectedLeaderboardTypes.some(type => type.value === key)) {
                  filteredLeaderboards[key] = backtestToUpdate.leaderboards[key];
                }
              });
              backtestToUpdate.leaderboards = filteredLeaderboards;
              backtestToUpdate.selectedLeaderboard = Object.keys(filteredLeaderboards)[0] || '';
            }

            backtestHistory[bIdx] = backtestToUpdate;
            newStrategies[sIdx] = { ...strategy, backtestHistory };
            return newStrategies;
          });
        }
      }
    }
  }, [strategies, selectedLeaderboardTypes]);

  // 收起所有
  const collapseAll = useCallback(() => {
    setStrategies((prevStrategies) =>
      prevStrategies.map((strategy) => ({
        ...strategy,
        isOpen: false,
        backtestHistory: strategy.backtestHistory.map((backtest) => ({
          ...backtest,
          isExpanded: false
        }))
      }))
    );
  }, []);

  // 选中/取消选中策略
  const handleStrategySelect = useCallback((strategyIdx: number, isChecked: boolean) => {
    setSelectedStrategies((prev) => {
      const newSelected = new Set(prev);
      if (isChecked) {
        newSelected.add(strategyIdx);
      } else {
        newSelected.delete(strategyIdx);
      }
      return newSelected;
    });
  }, []);

  // 汇总所有排行榜数据，仅包括展开的回测
  const aggregatedLeaderboards = useMemo(() => {
    const allLeaderboards: LeaderboardRecord[] = [];
    strategies.forEach((strategy) => {
      strategy.backtestHistory.forEach((backtest) => {
        if (backtest.isExpanded && backtest.leaderboards) {
          Object.values(backtest.leaderboards).forEach((leaderboard) => {
            leaderboard.forEach((record) => {
              allLeaderboards.push(record);
            });
          });
        }
      });
    });
    return allLeaderboards;
  }, [strategies]);

  // 查看交易记录
  const handleViewRecords = useCallback((backtestName: string, stockCode: string) => {
    setSelectedTransactionRecord({ backtestName, stockCode });
  }, []);

  // 关闭交易记录 Modal
  const closeTransactionModal = useCallback(() => {
    setSelectedTransactionRecord(null);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="container mx-auto p-6 flex-grow">
        <div className="max-h-[70vh] overflow-y-auto">
          {/* 全局排行榜筛选 */}
          <div className="mb-6 p-4 bg-blue-100 rounded-lg">
            <h4 className="text-lg font-semibold mb-2 text-blue-800">全局排行榜筛选</h4>

            <div className="mb-4">
              <label className="block text-sm font-medium text-blue-700 mb-1">选择要筛选的列:</label>
              <Select
                isMulti
                options={availableColumns.map(col => ({ value: col, label: col }))}
                value={selectedFilterColumns}
                onChange={handleFilterColumnChange}
                placeholder="选择列"
                className="w-full"
              />
            </div>

            {selectedFilterColumns.map((col) => (
              <div key={col.value} className="mb-4 p-2 bg-white rounded shadow">
                <h5 className="text-md font-semibold text-blue-700 mb-2">{col.label} 筛选条件</h5>
                <div className="flex space-x-4">
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-blue-700">筛选类型:</label>
                    <select
                      value={filterConditions[col.value]?.type || 'exact'}
                      onChange={(e) => handleIndividualFilterChange(col.value, 'type', e.target.value)}
                      className="w-full p-2 border border-blue-300 rounded"
                    >
                      <option value="exact">精确匹配</option>
                      <option value="contains">包含</option>
                      <option value="min">最小值</option>
                      <option value="max">最大值</option>
                      <option value="dateMin">开始日期</option>
                      <option value="dateMax">结束日期</option>
                    </select>
                  </div>
                  <div className="flex flex-col flex-1">
                    <label className="text-sm font-medium text-blue-700">值:</label>
                    <input
                      type="text"
                      value={filterConditions[col.value]?.value || ''}
                      onChange={(e) => handleIndividualFilterChange(col.value, 'value', e.target.value)}
                      className="w-full p-2 border border-blue-300 rounded"
                      placeholder="输入值"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* 选择排行榜类型 */}
            <div className="mb-4 p-2 bg-white rounded shadow">
              <h5 className="text-md font-semibold text-blue-700 mb-2">选择要展开的排行榜类型:</h5>
              <Select
                isMulti
                options={availableLeaderboardTypes.map(type => ({ value: type, label: type }))}
                value={selectedLeaderboardTypes}
                onChange={(selected) => setSelectedLeaderboardTypes(selected as { value: string; label: string }[])}
                placeholder="选择排行榜类型"
                className="w-full"
              />
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleAddGlobalFilter}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition duration-200"
              >
                添加筛选
              </button>
              <button
                onClick={() => {
                  setGlobalFilters([]);
                  setSelectedFilterColumns([]);
                  setFilterConditions({});
                }}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition duration-200"
              >
                清除所有筛选
              </button>
              <button
                onClick={expandAll}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition duration-200"
              >
                展开所有
              </button>
              <button
                onClick={collapseAll}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition duration-200"
              >
                收起所有
              </button>
            </div>

            {globalFilters.length > 0 && (
              <div className="mt-4">
                <h5 className="text-md font-semibold text-blue-800">当前全局筛选条件:</h5>
                <ul className="list-disc list-inside text-blue-700">
                  {globalFilters.map((filter, idx) => (
                    <li key={idx}>
                      <span className="font-medium">{filter.column}</span>{' '}
                      <span>
                        {filter.type === 'exact'
                          ? '等于'
                          : filter.type === 'contains'
                          ? '包含'
                          : filter.type === 'min'
                          ? '≥'
                          : filter.type === 'max'
                          ? '≤'
                          : filter.type === 'dateMin'
                          ? '开始日期 ≥'
                          : '结束日期 ≤'}
                      </span>{' '}
                      <span className="font-medium">{filter.value}</span>{' '}
                      <button
                        onClick={() => handleDeleteGlobalFilter(idx)}
                        className="ml-2 text-red-500 hover:underline"
                      >
                        删除
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 全局汇总排行榜 */}
          <AggregatedLeaderboardTable
            allLeaderboards={aggregatedLeaderboards}
            globalFilters={globalFilters}
            onViewRecords={handleViewRecords}
          />

          {/* 策略列表 */}
          <div className="space-y-4 mt-8">
            {strategies.map((strategy, strategyIndex) => (
              <div key={strategyIndex} className="border rounded-lg shadow-lg p-4 bg-white mb-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedStrategies.has(strategyIndex)}
                      onChange={(e) => handleStrategySelect(strategyIndex, e.target.checked)}
                      className="mr-2"
                    />
                    <div
                      onClick={() => openEditModal(strategyIndex)}
                      className="flex-1 cursor-pointer"
                    >
                      <h2 className="text-xl font-semibold text-gray-700">
                        {strategy.name || `策略 ${strategyIndex + 1}`}
                      </h2>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openCalculateModal(strategyIndex)}
                      className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition duration-200"
                    >
                      计算
                    </button>
                    <button
                      onClick={() => handleDeleteStrategy(strategyIndex)}
                      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition duration-200"
                    >
                      删除
                    </button>
                    <button
                      onClick={() => toggleOpen(strategyIndex)}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition duration-200"
                    >
                      {strategy.isOpen ? '收起' : '展开'}
                    </button>
                    {/* 新增：展开所有回测 */}
                    {strategy.isOpen && (
                      <>
                        <button
                          onClick={() => {
                            const allExpanded = strategy.backtestHistory.every(bt => bt.isExpanded);
                            if (allExpanded) {
                              // Collapse all
                              setStrategies((prevStrategies) =>
                                prevStrategies.map((s, idx) =>
                                  idx === strategyIndex
                                    ? {
                                        ...s,
                                        backtestHistory: s.backtestHistory.map(bt => ({
                                          ...bt,
                                          isExpanded: false,
                                        })),
                                      }
                                    : s
                                )
                              );
                            } else {
                              // Expand all
                              setStrategies((prevStrategies) =>
                                prevStrategies.map((s, idx) =>
                                  idx === strategyIndex
                                    ? {
                                        ...s,
                                        backtestHistory: s.backtestHistory.map(bt => ({
                                          ...bt,
                                          isExpanded: true,
                                        })),
                                      }
                                    : s
                                )
                              );
                            }
                          }}
                          className="bg-indigo-500 text-white px-3 py-2 rounded hover:bg-indigo-600 transition duration-200"
                        >
                          {strategy.backtestHistory.every(bt => bt.isExpanded) ? '收起所有回测' : '展开所有回测'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {strategy.isOpen && (
                  <div className="mt-4 p-6 bg-white rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-semibold text-gray-800">回测历史</h3>
                      <button
                        onClick={() => handleDeleteSelectedBacktests(strategyIndex)}
                        className={`bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition duration-200 ${
                          !(selectedBacktests[strategyIndex]?.size > 0)
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        }`}
                      >
                        删除选中回测
                      </button>
                    </div>
                    {strategy.backtestHistory.length > 0 ? (
                      strategy.backtestHistory.map((record, recordIndex) => (
                        <div
                          key={recordIndex}
                          className="border-b border-gray-200 py-4"
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={record.isSelected || false}
                                onChange={() => handleBacktestSelect(strategyIndex, recordIndex)}
                                className="mr-2"
                              />
                              <span className="font-semibold text-gray-700">
                                {record.result}:
                              </span>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span className="font-semibold text-gray-700">
                                {record.date}
                              </span>
                              <button
                                onClick={() => toggleExpand(strategyIndex, recordIndex)}
                                className="text-blue-600 hover:underline transition duration-200"
                              >
                                {record.isExpanded ? '收起详情' : '展开详情'}
                              </button>
                              <button
                                onClick={() => downloadBacktestHistory([record])}
                                className="text-green-600 hover:underline transition duration-200"
                              >
                                下载
                              </button>
                            </div>
                          </div>
                          {record.isExpanded && (
                            <div className="mt-4 space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-gray-600">
                                    开始日期: {record.startdate}
                                  </p>
                                  <p className="text-gray-600">
                                    结束日期: {record.enddate}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-600">
                                    股票范围:
                                    <span
                                      className="inline-block max-w-xs overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer"
                                      onClick={() => toggleStockList(strategyIndex, recordIndex)}
                                    >
                                      {record.stocklist.join(', ') || '无股票数据'}
                                    </span>
                                    {record.showFullStockList && (
                                      <span className="block text-gray-600">
                                        {record.stocklist.join(', ')}
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-gray-600">
                                    买入条件: {record.buyConditions.join(', ') || '无条件'}
                                  </p>
                                  <p className="text-gray-600">
                                    卖出条件: {record.sellConditions.join(', ') || '无条件'}
                                  </p>
                                </div>
                              </div>

                              {record.leaderboards &&
                                Object.keys(record.leaderboards).length > 0 && (
                                  <div className="mt-4">
                                    <label className="block text-md font-semibold mb-2 text-gray-600">
                                      选择查看的排行榜:
                                    </label>
                                    <select
                                      value={record.selectedLeaderboard}
                                      onChange={(e) => {
                                        const selected = e.target.value;
                                        setStrategies((prevStrategies) => {
                                          const newStrategies = [...prevStrategies];
                                          const strategy = newStrategies[strategyIndex];
                                          const backtestHistory = [...strategy.backtestHistory];
                                          const backtestToUpdate = { ...backtestHistory[recordIndex] };
                                          backtestToUpdate.selectedLeaderboard = selected;
                                          backtestHistory[recordIndex] = backtestToUpdate;
                                          newStrategies[strategyIndex] = { ...strategy, backtestHistory };
                                          return newStrategies;
                                        });
                                      }}
                                      className="border border-gray-300 p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                      {Object.keys(record.leaderboards).map((key, idx) => (
                                        <option key={idx} value={key}>
                                          {key}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                              {record.selectedLeaderboard &&
                                record.leaderboards &&
                                record.leaderboards[record.selectedLeaderboard] && (
                                  <LeaderboardTable
                                    leaderboard={record.leaderboards[record.selectedLeaderboard]}
                                    onViewRecords={(backtestName, stockCode) => {
                                      handleViewRecords(backtestName, stockCode);
                                    }}
                                    strategyIndex={strategyIndex}
                                    backtestName={record.result}
                                    globalFilters={globalFilters}
                                  />
                                )}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-500">暂无回测记录</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 批量回测按钮（合并单、多时间范围） */}
      <div className="fixed right-6 bottom-20 z-10">
        <button
          onClick={openBatchModal}
          className="flex items-center justify-center bg-purple-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-purple-700 transition duration-300"
        >
          批量回测
        </button>
      </div>

      {/* 添加新策略按钮 */}
      <div className="fixed right-6 bottom-6 z-10">
        <button
          onClick={() => {
            resetModal();
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-blue-700 transition duration-300"
        >
          添加新策略
        </button>
      </div>

      {/* 批量回测Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* 半透明遮罩 */}
          <div
            className="absolute inset-0 bg-black opacity-30"
            onClick={() => setIsBatchModalOpen(false)}
          ></div>

          {/* Modal容器，限制最大宽高，并内部可滚动 */}
          <div className="relative bg-white rounded-lg shadow-lg p-6 z-10 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">批量回测</h2>

            {/* 模式选择 */}
            <div className="mb-6 flex space-x-4 items-center">
              <label className="font-semibold text-gray-700">回测模式：</label>
              <div className="space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    name="batchMode"
                    value="single"
                    checked={batchMode === 'single'}
                    onChange={() => setBatchMode('single')}
                  />
                  <span className="ml-2">单时间范围</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    name="batchMode"
                    value="multi"
                    checked={batchMode === 'multi'}
                    onChange={() => setBatchMode('multi')}
                  />
                  <span className="ml-2">多时间范围</span>
                </label>
              </div>
            </div>

            {/* 指数、股票输入（统一） */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2 text-gray-600">选择指数(全局):</h3>
              <Select
                value={batchSelectedIndex}
                onChange={handleBatchIndexChange}
                options={indexOptions}
                placeholder="选择指数"
                isClearable
                styles={{
                  control: (base) => ({
                    ...base,
                    border: '1px solid #ccc',
                    boxShadow: 'none',
                    '&:hover': { border: '1px solid #aaa' },
                    borderRadius: '8px',
                    padding: '4px',
                  }),
                  singleValue: (base) => ({
                    ...base,
                    color: '#00796b',
                  }),
                }}
              />
            </div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 text-gray-600">选择股票(全局):</h3>
              <input
                type="text"
                value={batchSelectedStocks}
                onChange={(e) => setBatchSelectedStocks(e.target.value)}
                className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入股票，多个用逗号隔开"
              />
            </div>

            {/* 批量时间范围生成 */}
            <div className="mb-6">
              <h3 className="text-md font-semibold mb-2 text-gray-700">自动生成时间范围:</h3>
              <div className="flex flex-col md:flex-row items-start md:items-center mb-4 space-y-4 md:space-y-0 md:space-x-4">
                <div>
                  <label className="block text-sm text-gray-600">时间范围数量:</label>
                  <input
                    type="number"
                    min={1}
                    value={autoGenerateParams.numberOfRanges}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10);
                      setAutoGenerateParams((prev) => ({
                        ...prev,
                        numberOfRanges: isNaN(value) ? 20 : value,
                      }));
                    }}
                    className="border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">每个时间范围时长 (天):</label>
                  <input
                    type="number"
                    min={1}
                    value={autoGenerateParams.durationPerRange}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10);
                      setAutoGenerateParams((prev) => ({
                        ...prev,
                        durationPerRange: isNaN(value) ? 15 : value,
                      }));
                    }}
                    className="border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 invisible">Generate</label>
                  <button
                    onClick={handleAutoGenerateTimeRanges}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition duration-200 w-full md:w-auto"
                  >
                    生成时间范围
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                生成 {autoGenerateParams.numberOfRanges} 个时间范围，每个范围持续 {autoGenerateParams.durationPerRange} 天。
              </p>
            </div>

            {/* 单时间范围模式 */}
            {batchMode === 'single' && (
              <div className="mb-8">
                <h3 className="text-md font-semibold mb-4 text-gray-700">选择单时间范围</h3>
                <div className="flex flex-col md:flex-row items-start md:items-center mb-4 space-y-4 md:space-y-0 md:space-x-4">
                  <div>
                    <label className="block text-sm text-gray-600">开始日期:</label>
                    <input
                      type="date"
                      value={singleTimeRange.start}
                      onChange={(e) =>
                        setSingleTimeRange(prev => ({ ...prev, start: e.target.value }))
                      }
                      className="border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600">结束日期:</label>
                    <input
                      type="date"
                      value={singleTimeRange.end}
                      onChange={(e) =>
                        setSingleTimeRange(prev => ({ ...prev, end: e.target.value }))
                      }
                      className="border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                </div>
                <div className="flex space-x-2">
                  {['半年', '一年', '两年'].map(period => (
                    <button
                      key={period}
                      onClick={() => {
                        const end = new Date();
                        let start = new Date();
                        if (period === '半年') {
                          start.setMonth(start.getMonth() - 6);
                        } else if (period === '一年') {
                          start.setFullYear(start.getFullYear() - 1);
                        } else if (period === '两年') {
                          start.setFullYear(start.getFullYear() - 2);
                        }
                        const startStr = start.toISOString().split('T')[0];
                        const endStr = end.toISOString().split('T')[0];
                        setSingleTimeRange({ start: startStr, end: endStr });
                      }}
                      className="bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300 transition"
                    >
                      近{period}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 多时间范围模式 */}
            {batchMode === 'multi' && (
              <div className="mb-8">
                <h3 className="text-md font-semibold mb-4 text-gray-700">多时间范围设置</h3>
                {[...selectedStrategies].map(strategyIdx => {
                  const strategyRanges = multiDateRanges[strategyIdx] || [];
                  return (
                    <div key={strategyIdx} className="mb-4 border rounded p-4 bg-gray-50">
                      <h3 className="text-md font-semibold text-gray-800 mb-2">
                        策略：{strategies[strategyIdx]?.name || `策略${strategyIdx}`}
                      </h3>

                      {strategyRanges.map((range, rangeIdx) => (
                        <div
                          key={rangeIdx}
                          className="flex flex-col md:flex-row items-start md:items-center mb-4 space-y-2 md:space-y-0 md:space-x-4"
                        >
                          <div>
                            <label className="block text-sm text-gray-600">开始日期:</label>
                            <input
                              type="date"
                              value={range.start}
                              onChange={(e) =>
                                handleDateRangeChange(strategyIdx, rangeIdx, 'start', e.target.value)
                              }
                              className="border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600">结束日期:</label>
                            <input
                              type="date"
                              value={range.end}
                              onChange={(e) =>
                                handleDateRangeChange(strategyIdx, rangeIdx, 'end', e.target.value)
                              }
                              className="border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                            />
                          </div>
                          <div className="flex space-x-2">
                            {['半年', '一年', '两年'].map(period => (
                              <button
                                key={period}
                                onClick={() => handleQuickRangeSelectMulti(strategyIdx, rangeIdx, period)}
                                className="bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300 transition"
                              >
                                近{period}
                              </button>
                            ))}
                            {/* 删除该时间范围按钮 */}
                            {strategyRanges.length > 1 && (
                              <button
                                onClick={() => removeDateRangeForStrategy(strategyIdx, rangeIdx)}
                                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
                              >
                                删除
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={() => addDateRangeForStrategy(strategyIdx)}
                        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition"
                      >
                        + 添加时间范围
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleBatchSubmit}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition duration-150 ease-in-out"
              >
                确认回测
              </button>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition duration-150 ease-in-out"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 添加新策略 Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-50" onClick={resetModal}></div>
          <div className="bg-white rounded-lg shadow-lg p-8 z-10 max-w-lg w-full">
            <h2 className="text-2xl font-semibold mb-6 text-center text-gray-800">
              {currentStrategyIndex !== null ? '编辑策略' : '添加新策略'}
            </h2>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 text-gray-700">策略名称:</h3>
              <input
                type="text"
                value={newStrategy.name}
                onChange={(e) =>
                  setNewStrategy(prev => ({ ...prev, name: e.target.value }))
                }
                className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200"
                placeholder="输入策略名称"
              />
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 text-gray-700">选择基因数据:</h3>
              <Select
                value={newStrategy.selectedOptions}
                onChange={(options) =>
                  setNewStrategy(prev => ({ ...prev, selectedOptions: options || [] }))
                }
                options={options}
                placeholder="选择基因数据"
                isClearable
                isMulti
                styles={{
                  control: (base) => ({
                    ...base,
                    border: '1px solid #ccc',
                    boxShadow: 'none',
                    '&:hover': { border: '1px solid #aaa' },
                    borderRadius: '8px',
                    padding: '4px',
                  }),
                  multiValue: (base) => ({
                    ...base,
                    backgroundColor: '#e0f7fa',
                    borderRadius: '12px',
                  }),
                  multiValueLabel: (base) => ({
                    ...base,
                    color: '#00796b',
                    padding: '4px 8px',
                  }),
                  multiValueRemove: (base) => ({
                    ...base,
                    cursor: 'pointer',
                    ':hover': {
                      backgroundColor: '#b2ebf2',
                      color: 'white',
                    },
                  }),
                }}
              />
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">买入条件</h3>
              {newStrategy.buyConditions.map((condition, index) => (
                <input
                  key={index}
                  type="text"
                  value={condition}
                  onChange={(e) => handleConditionChange('buy', index, e.target.value)}
                  className="border border-gray-300 p-3 w-full mb-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200"
                  placeholder={`买入条件 ${index + 1}`}
                />
              ))}
              <button
                onClick={() => handleAddCondition('buy')}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg mb-4 hover:bg-blue-700 transition duration-200"
              >
                添加买入条件
              </button>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">卖出条件</h3>
              {newStrategy.sellConditions.map((condition, index) => (
                <input
                  key={index}
                  type="text"
                  value={condition}
                  onChange={(e) => handleConditionChange('sell', index, e.target.value)}
                  className="border border-gray-300 p-3 w-full mb-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200"
                  placeholder={`卖出条件 ${index + 1}`}
                />
              ))}
              <button
                onClick={() => handleAddCondition('sell')}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg mb-4 hover:bg-blue-700 transition duration-200"
              >
                添加卖出条件
              </button>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  if (currentStrategyIndex !== null) {
                    // 编辑策略逻辑
                    handleAddStrategy(); // 可以根据需求添加不同的逻辑
                  } else {
                    // 添加策略逻辑
                    handleAddStrategy();
                  }
                }}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition duration-200"
              >
                {currentStrategyIndex !== null ? '更新策略' : '添加策略'}
              </button>
              <button
                onClick={resetModal}
                className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition duration-200"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 计算单次回测 Modal */}
      {isCalculateModalOpen && currentStrategyIndex !== null && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* 半透明遮罩 */}
          <div
            className="absolute inset-0 bg-black opacity-30"
            onClick={() => setIsCalculateModalOpen(false)}
          ></div>

          {/* Modal容器 */}
          <div className="relative bg-white rounded-lg shadow-lg p-6 z-10 max-w-2xl w-full">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">单次回测</h2>

            {/* 指数选择 */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2 text-gray-600">选择指数:</h3>
              <Select
                value={selectedIndex}
                onChange={handleIndexChange}
                options={indexOptions}
                placeholder="选择指数"
                isClearable
                styles={{
                  control: (base) => ({
                    ...base,
                    border: '1px solid #ccc',
                    boxShadow: 'none',
                    '&:hover': { border: '1px solid #aaa' },
                    borderRadius: '8px',
                    padding: '4px',
                  }),
                  singleValue: (base) => ({
                    ...base,
                    color: '#00796b',
                  }),
                }}
              />
            </div>

            {/* 股票输入 */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 text-gray-600">选择股票:</h3>
              <input
                type="text"
                value={selectedStocks}
                onChange={(e) => setSelectedStocks(e.target.value)}
                className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入股票，多个用逗号隔开"
              />
            </div>

            {/* 时间范围选择 */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 text-gray-600">选择时间范围:</h3>
              <div className="flex flex-col md:flex-row items-start md:items-center mb-4 space-y-4 md:space-y-0 md:space-x-4">
                <div>
                  <label className="block text-sm text-gray-600">开始日期:</label>
                  <input
                    type="date"
                    value={timeRange.start}
                    onChange={(e) =>
                      setTimeRange(prev => ({ ...prev, start: e.target.value }))
                    }
                    className="border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">结束日期:</label>
                  <input
                    type="date"
                    value={timeRange.end}
                    onChange={(e) =>
                      setTimeRange(prev => ({ ...prev, end: e.target.value }))
                    }
                    className="border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>
              <div className="flex space-x-2">
                {['半年', '一年', '两年'].map(period => (
                  <button
                    key={period}
                    onClick={() => handleQuickSelect(period)}
                    className="bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300 transition"
                  >
                    近{period}
                  </button>
                ))}
              </div>
            </div>

            {/* 提交和取消按钮 */}
            <div className="flex justify-end space-x-4">
              <button
                onClick={handleCalculate}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition duration-200"
              >
                确认计算
              </button>
              <button
                onClick={() => setIsCalculateModalOpen(false)}
                className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition duration-200"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 交易记录 Modal */}
      {selectedTransactionRecord && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* 半透明遮罩 */}
          <div
            className="absolute inset-0 bg-black opacity-30"
            onClick={closeTransactionModal}
          ></div>

          {/* Modal容器 */}
          <div className="relative bg-white rounded-lg shadow-lg p-6 z-10 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">交易记录</h2>
            {/* 可以根据需要展示交易记录的详细信息 */}
            <p>回测名称: {selectedTransactionRecord.backtestName}</p>
            <p>股票代码: {selectedTransactionRecord.stockCode}</p>
            {/* 嵌入 BuySellChart 组件 */}
            <BuySellChart
              stockCode={selectedTransactionRecord.stockCode}
              backtestName={selectedTransactionRecord.backtestName}
              strategyIndex={-1} // 不需要特定的策略索引
            />
            <div className="flex justify-end mt-4">
              <button
                onClick={closeTransactionModal}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition duration-200"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;