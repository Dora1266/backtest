import React from 'react';

interface SwitchViewProps {
    position: 'left' | 'right';
    onTogglePosition: () => void;
    onReplaceWithSelectStock: () => void;
    onReplaceWithCharts: () => void;
    onReplaceWithFactor: () => void;
    onReplaceWithStrategy: () => void;
    className?: string;
}

const SwitchView: React.FC<SwitchViewProps> = ({
    position,
    onTogglePosition,
    onReplaceWithSelectStock,
    onReplaceWithCharts,
    onReplaceWithFactor,
    onReplaceWithStrategy,
    className = '',
}) => {
    const handlePositionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        if (event.target.value === 'left' || event.target.value === 'right') {
            onTogglePosition();
        }
    };

    const handleReplaceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        if (event.target.value === 'selectStock') {
            onReplaceWithSelectStock();
        } else if (event.target.value === 'charts') {
            onReplaceWithCharts();
        } else if (event.target.value === 'factor') {
            onReplaceWithFactor();
        } else if (event.target.value === 'strategy') {
            onReplaceWithStrategy();
        }
    };

    return (
        <div className={`flex justify-end space-x-4 ${className}`}>
            {/* 位置切换下拉菜单 */}
            <select
                value={position}
                onChange={handlePositionChange}
                className="p-2 border border-gray-700 rounded-lg shadow-md bg-gray-800 text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-700 transition duration-200"
            >
                <option value="left" className="bg-gray-800 text-gray-300">左</option>
                <option value="right" className="bg-gray-800 text-gray-300">右</option>
            </select>

            {/* 视图切换下拉菜单 */}
            <select
                onChange={handleReplaceChange}
                className="p-2 border border-gray-700 rounded-lg shadow-md bg-gray-800 text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-700 transition duration-200"
            >
                <option value="selectStock" className="bg-gray-800 text-gray-300">自选</option>
                <option value="charts" className="bg-gray-800 text-gray-300">图表</option>
                <option value="factor" className="bg-gray-800 text-gray-300">因子</option>
                <option value="strategy" className="bg-gray-800 text-gray-300">策略</option>
            </select>
        </div>
    );
};

export default SwitchView;
