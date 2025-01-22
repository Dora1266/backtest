'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';

interface SearchResults {
  index: { 代码: string[]; 名称: string[]; };
  stock: { 代码: string[]; 名称: string[]; };
}

const Search = () => {
  const [searchString, setSearchString] = useState<string>('');
  const [results, setResults] = useState<SearchResults>({ index: { 代码: [], 名称: [] }, stock: { 代码: [], 名称: [] } });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [addedToWatchlist, setAddedToWatchlist] = useState<{ [key: string]: boolean }>({});
  const [Add_select_index, setAdd_select_index] = useState<{ [key: string]: boolean }>({});

  const handleSearch = async (searchStr: string) => {
    if (!searchStr.trim()) {
      setResults({ index: { 代码: [], 名称: [] }, stock: { 代码: [], 名称: [] } });
      setError('');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          core_db: process.env.NEXT_PUBLIC_CORE_DB,
          core_chinalist_table: process.env.NEXT_PUBLIC_CORE_CHINA_TABLE,
          search_string: searchStr,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || '搜索失败');
        return;
      }

      const data: SearchResults = await response.json();
      setResults(data);
    } catch (err) {
      setError('搜索时发生错误');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWatchlist = useCallback(async (code: string, name: string) => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/add_select', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, name }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || '添加自选股失败');
        return;
      }

      setAddedToWatchlist(prev => ({ ...prev, [code]: true }));
      setTimeout(() => {
        setAddedToWatchlist(prev => ({ ...prev, [code]: false }));
      }, 2000);
    } catch (err) {
      setError('添加自选股时发生错误');
    }
  }, []);

  const handleAdd_select_index = useCallback(async (code: string, name: string) => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/add_select_index', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, name }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || '添加自选股失败');
        return;
      }

      setAdd_select_index(prev => ({ ...prev, [code]: true }));
      setTimeout(() => {
        setAdd_select_index(prev => ({ ...prev, [code]: false }));
      }, 2000);
    } catch (err) {
      setError('添加自选股时发生错误');
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchString);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchString]);

  const showResults = useMemo(() => searchString.trim() !== '' || loading || error, [searchString, loading, error]);

  return (
    <div className="flex flex-col items-center p-4 relative bg-gray-800">
      <input
        type="text"
        value={searchString}
        onChange={(e) => setSearchString(e.target.value)}
        placeholder="输入要搜索的股票..."
        className="border border-gray-700 rounded-lg p-2 w-full max-w-lg focus:outline-none focus:ring-2 focus:ring-purple-700 transition duration-200 text-sm bg-gray-900 text-gray-300 placeholder-gray-500"
      />

      {showResults && (
        <ul className={`absolute top-full mt-1 w-full max-w-lg bg-gray-900 border border-gray-700 rounded-lg shadow-md z-50 ${results.index.代码.length + results.stock.代码.length > 5 ? 'h-64 overflow-auto' : ''}`}>
          {loading && <div className="mt-2 text-purple-500 text-center text-sm">正在搜索...</div>}
          {error && <div className="text-red-400 mt-2 text-center text-sm">{error}</div>}

          {results.stock.代码.length > 0 && (
            <>
              <li className="p-2 font-semibold text-gray-300 bg-gray-800 text-sm">股票</li>
              {results.stock.代码.map((code, index) => (
                <li key={code} className="flex justify-between items-center p-2 border-b border-gray-700 last:border-b-0 hover:bg-gray-800 transition duration-200">
                  <span className="text-sm font-semibold text-gray-300">{results.stock.名称[index]}</span>
                  <span className="text-xs text-gray-500">{code}</span>
                  <button
                    onClick={() => handleAddToWatchlist(code, results.stock.名称[index])}
                    className={`ml-2 px-2 py-0.5 rounded-lg transition duration-200 ${addedToWatchlist[code] ? 'bg-green-500' : 'bg-purple-700'} text-white text-xs`}
                  >
                    {addedToWatchlist[code] ? '添加成功' : '添加自选股'}
                  </button>
                </li>
              ))}
            </>
          )}

          {results.index.代码.length > 0 && (
            <>
              <li className="p-2 font-semibold text-gray-300 bg-gray-800 text-sm">板块</li>
              {results.index.代码.map((code, index) => (
                <li key={code} className="flex justify-between items-center p-2 border-b border-gray-700 last:border-b-0 hover:bg-gray-800 transition duration-200">
                  <span className="text-sm font-semibold text-gray-300">{results.index.名称[index]}</span>
                  <span className="text-xs text-gray-500">{code}</span>
                  <button
                    onClick={() => handleAdd_select_index(code, results.index.名称[index])}
                    className={`ml-2 px-2 py-0.5 rounded-lg transition duration-200 ${Add_select_index[code] ? 'bg-green-500' : 'bg-purple-700'} text-white text-xs`}
                  >
                    {Add_select_index[code] ? '添加成功' : '添加板块'}
                  </button>
                </li>
              ))}
            </>
          )}

          {!loading && searchString.trim() !== '' && results.index.代码.length === 0 && results.stock.代码.length === 0 && (
            <div className="text-gray-500 text-center mt-2 text-sm">无搜索结果，尝试更换关键词。</div>
          )}
        </ul>
      )}
    </div>
  );
};

export default Search;
