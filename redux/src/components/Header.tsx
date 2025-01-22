import React, { useState } from 'react';
import System from './System';
import StockData from './StockData';

interface HeaderProps {
    className?: string;
}

const Header: React.FC<HeaderProps> = ({ className }) => {
    const [isSystemOpen, setIsSystemOpen] = useState(false);
    const [isStockDataOpen, setIsStockDataOpen] = useState(false);

    const toggleSystem = () => {
        setIsSystemOpen(!isSystemOpen);
    };

    const toggleStockData = () => {
        setIsStockDataOpen(!isStockDataOpen);
    };

    return (
        <>
            {/* Header 部分 */}
            <header className={`flex justify-between items-center p-4 bg-gray-800 ${className}`} style={{ height: '10vh' }}>
                <h1 className="text-2xl font-bold text-purple-700">Dora</h1>
                <div>
                    <button
                        className="p-2 text-purple-700 rounded hover:bg-purple-600 hover:text-white focus:outline-none mr-4 transition duration-200"
                        onClick={toggleSystem}
                    >
                        设置
                    </button>
                    <button
                        className="p-2 text-purple-700 rounded hover:bg-purple-600 hover:text-white focus:outline-none transition duration-200"
                        onClick={toggleStockData}
                    >
                        获取数据
                    </button>
                </div>
            </header>

            {/* 渲染 System 弹窗 */}
            {isSystemOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50" style={{ zIndex: 1000 }}>
                    <div className="relative bg-gray-800 p-6 rounded-lg shadow-lg" style={{ zIndex: 1001, maxHeight: '80vh', width: '90%', maxWidth: '800px' }}>
                        <button 
                            className="absolute top-4 right-4 text-red-400 text-lg focus:outline-none z-10 hover:text-red-500 transition duration-200"
                            onClick={toggleSystem}
                        >
                            &times; {/* 关闭按钮 */}
                        </button>
                        <div className="overflow-y-auto" style={{ maxHeight: '75vh' }}>
                            <System />
                        </div>
                    </div>
                </div>
            )}

            {/* 渲染 StockData 弹窗 */}
            {isStockDataOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50" style={{ zIndex: 1000 }}>
                    <div className="relative bg-gray-800 p-6 rounded-lg shadow-lg" style={{ zIndex: 1001, maxHeight: '80vh', width: '90%', maxWidth: '800px' }}>
                        <button 
                            className="absolute top-4 right-4 text-red-400 text-lg focus:outline-none z-10 hover:text-red-500 transition duration-200"
                            onClick={toggleStockData}
                        >
                            &times; {/* 关闭按钮 */}
                        </button>
                        <div className="overflow-y-auto" style={{ maxHeight: '75vh' }}>
                            <StockData />
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                /* 全局样式，去掉分界线和边框 */
                * {
                    box-sizing: border-box;
                    border: none;
                    outline: none;
                }

                /* 自定义滚动条样式 */
                ::-webkit-scrollbar {
                    width: 8px;
                }

                ::-webkit-scrollbar-track {
                    background: transparent;
                }

                ::-webkit-scrollbar-thumb {
                    background: #6d28d9; /* 使用紫色 */
                    border-radius: 4px; /* 圆角边 */
                }

                ::-webkit-scrollbar-thumb:hover {
                    background: #7c3aed; /* 鼠标悬停效果 */
                }

                body {
                    margin: 0;
                    padding: 0;
                    font-family: Arial, sans-serif; /* 默认字体 */
                    background-color: #111827; /* 深色背景 */
                    color: #d1d5db; /* 浅色文本 */
                }
            `}</style>
        </>
    );
};

export default Header;
