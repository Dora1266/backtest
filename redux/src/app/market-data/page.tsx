'use client';
import { useState, useCallback, useMemo } from "react";
import '../globals.css'; 
import Search from '../../components/Search'; 
import StockList from "../../components/StockList";
import Charts from "../chart/page";
import Header from '../../components/Header'; 
import SwitchView from '../../components/SwitchView'; 
import Factor from "../factor/page";
import Strategy from "../strategy/page";
import UpdateList from "../updatelist/page";
import Index from "../indexo/page";
import { FiMaximize2, FiMinimize2 } from 'react-icons/fi'; // 引入图标库

const MarketData = () => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [position, setPosition] = useState<'left' | 'right'>('left');
  
  const [leftComponent, setLeftComponent] = useState(<StockList onReplaceWithupdatelist={() => onReplaceWithupdateselect('left')} />);
  const [rightComponent, setRightComponent] = useState(<Charts />);

  const replaceWithSelectStock = useCallback(() => {
    const newComponent = <StockList onReplaceWithupdatelist={() => onReplaceWithupdateselect(position)} />;
    if (position === 'left') {
      setLeftComponent(newComponent);
    } else {
      setRightComponent(newComponent);
    }
  }, [position]);
  
  const replaceWithCharts = useCallback((location: 'left' | 'right') => {
    if (location === 'left') {
      setLeftComponent(<Charts />);
    } else {
      setRightComponent(<Charts />);
    }
  }, []);

  const onReplaceWithFactor = useCallback((location: 'left' | 'right') => {
    if (location === 'left') {
      setLeftComponent(<Factor />);
    } else {
      setRightComponent(<Factor />);
    }
  }, []);

  const onReplaceWithStrategy = useCallback((location: 'left' | 'right') => {
    if (location === 'left') {
      setLeftComponent(<Strategy />);
    } else {
      setRightComponent(<Strategy />);
    }
  }, []);

  const onReplaceWithupdateselect = useCallback((location: 'left' | 'right') => {
    if (location === 'left') {
      setLeftComponent(<UpdateList />);
    } else {
      setRightComponent(<UpdateList />);
    }
  }, []);

  const toggleFullScreen = useCallback(() => {
    setIsFullScreen(prev => !prev);
  }, []);

  const togglePosition = useCallback(() => {
    setPosition(prev => (prev === 'left' ? 'right' : 'left'));
  }, []);

  const switchViewProps = useMemo(() => ({
    position,
    onTogglePosition: togglePosition,
    onReplaceWithSelectStock: replaceWithSelectStock,
    onReplaceWithFactor: () => onReplaceWithFactor(position),
    onReplaceWithStrategy: () => onReplaceWithStrategy(position),
    onReplaceWithCharts: () => replaceWithCharts(position),
  }), [position, togglePosition, replaceWithSelectStock, onReplaceWithFactor, onReplaceWithStrategy, replaceWithCharts]);

  return (
    <div className="h-screen flex flex-col bg-gray-900 overflow-hidden">
      {/* Header 部分 */}
      <div className="flex justify-between items-center p-4 bg-gray-800">
        <Header className="flex-1 text-gray-300" />
        <Search className="flex-1 text-center text-gray-300" />
        <SwitchView {...switchViewProps} className="flex-1 text-right text-gray-300" />
      </div>

      <section className="bg-gray-800 py-2">
        <Index />
      </section>

      {/* 主内容区域 */}
      <div className="flex-grow flex flex-col md:flex-row gap-2 p-4 overflow-hidden">
        <section className={`relative flex-1 ${isFullScreen ? 'h-[90vh] overflow-hidden' : 'h-full overflow-hidden'}`}>
          <div className="absolute top-2 right-2 z-10">
            <button
              onClick={toggleFullScreen}
              className="w-8 h-8 flex items-center justify-center bg-purple-700 text-gray-300 rounded-full transition duration-200 hover:bg-purple-600"
            >
              {isFullScreen ? <FiMinimize2 /> : <FiMaximize2 />}
            </button>
          </div>
          {leftComponent}
        </section>
        
        {!isFullScreen && (
          <section className="flex-1 h-full hidden md:block">
            {rightComponent}
          </section>
        )}
      </div>
    </div>
  );
};

export default MarketData;
