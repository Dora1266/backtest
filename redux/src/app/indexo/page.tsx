'use client';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { fetchIndexConstituent, selectIndexConstituents, selectLoading, selectError } from '../../redux/selectslice';

interface IndexData {
  code: string;
  name: string;
}

const IndexPage: React.FC = () => {
  const dispatch = useDispatch();
  const constituents = useSelector(selectIndexConstituents);
  const loading = useSelector(selectLoading);
  const error = useSelector(selectError);
  const [data, setData] = useState<IndexData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.post('http://127.0.0.1:5000/api/get_index');
        const parsedData = JSON.parse(response.data);
        if (Array.isArray(parsedData)) {
          setData(parsedData.map(item => ({
            code: item.code,
            name: item.name
          })));
        } else {
          setData([]);
          console.error('返回的数据不是数组');
        }
      } catch (error) {
        console.error('加载数据时出现错误：', error);
      }
    };

    fetchData();
  }, []);

  const handleBoxClick = (code: string) => {
    dispatch(fetchIndexConstituent({ code }));
  };

  const handleDelete = async (code: string) => {
    try {
      await axios.post('http://127.0.0.1:5000/api/delete_index', { code });
      // 删除成功后，更新状态
      setData(prevData => prevData.filter(item => item.code !== code));
    } catch (error) {
      console.error('删除数据时出现错误：', error);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-[132px]">
      <div className="flex flex-col items-center">
        <div className="loader"></div>
        <span className="mt-2 text-lg font-semibold text-gray-300">正在加载数据，请稍候...</span>
      </div>
    </div>
  );
  
  if (error) return <div className="text-red-400 text-center">数据加载失败: {error}</div>;

  return (
    <div 
      className="overflow-x-auto" 
      onWheel={(e) => {
        e.preventDefault(); // 阻止默认的滚动行为
        const scrollAmount = e.deltaY * 1.5;// 获取滚动量
        e.currentTarget.scrollBy({
          left: scrollAmount, // 横向滚动
          behavior: 'smooth' // 平滑滚动
        });
      }}
    >
      <div className="flex flex-nowrap p-4 space-x-4">
        {data.map((item) => (
          <div
            key={item.code}
            className="relative bg-purple-700 text-white m-2 p-4 rounded-lg cursor-pointer min-w-[150px] text-center shadow-md transition-all duration-300 hover:shadow-lg hover:bg-purple-600"
            onClick={() => handleBoxClick(item.code)}
          >
            <button
              aria-label="删除"
              className="absolute right-2 top-2 bg-white text-gray-800 border border-gray-400 p-1 rounded-md w-6 h-6 flex items-center justify-center hover:bg-gray-200 transition duration-200 ease-in-out shadow-md"
              onClick={(e) => {
                e.stopPropagation(); // 防止触发 box 的点击事件
                handleDelete(item.code);
              }}
            >
              × {/* 删除按钮的图标 */}
            </button>

            <h3 className="text-lg font-bold">{item.name}</h3>
            <p className="text-sm text-gray-300">{item.code}</p>
          </div>
        ))}
      </div>
      {/* 自定义滚动条样式 */}
      <style jsx>{`
        .overflow-x-auto::-webkit-scrollbar {
          height: 8px;  
        }

        .overflow-x-auto::-webkit-scrollbar-thumb {
          background-color: #6d28d9; /* 紫色 */
          border-radius: 10px;   
        }

        .overflow-x-auto::-webkit-scrollbar-track {
          background: #374151; /* 深灰色 */
          border-radius: 10px;  
        }
      `}</style>
    </div>
  );
};

export default IndexPage;
