'use client';
import React, { useReducer, useEffect, useCallback, useRef } from 'react';
import { DndProvider, useDrag, useDrop, DragSourceMonitor, DropTargetMonitor } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import MonacoEditor from '@monaco-editor/react';
import Select from 'react-select';
import io, { Socket } from 'socket.io-client';
import '../globals.css';
// 定义因子项接口
interface FactorItem {
  factor_name: string;
  factor: string;
  baseData: string;
  importFactors: string;
  algorithm: string;
  parameters: string;
}

// 定义搜索结果接口
interface SearchResult {
  factor: string;
  function_name: string;
  params: string[];
}

// 定义选项类型
interface Option {
  value: string;
  label: string;
}

// 定义状态接口
interface State {
  isModalOpen: boolean;
  isComputeModalOpen: boolean;
  factor_name: string;
  factor: string;
  baseData: string;
  importFactors: string;
  algorithm: string;
  parameters: string;
  layout: FactorItem[];
  editingIndex: number | null;
  searchResults: SearchResult[];
  parameterSuggestions: string[];
  baseDataOptions: Option[];
  importFileOptions: Option[];
  searchQuery: string;
  currentPage: number;
  itemsPerPage: number;
  isComputing: boolean;
  computeProgress: number;
  currentComputeFactor: FactorItem | null;
  computeParams: Record<string, any>;
}

// 定义动作类型
type Action =
  | { type: 'SET_MODAL_OPEN'; payload: boolean }
  | { type: 'SET_COMPUTE_MODAL_OPEN'; payload: boolean }
  | { type: 'SET_EDITING_INDEX'; payload: number | null }
  | { type: 'SET_LAYOUT'; payload: FactorItem[] }
  | { type: 'ADD_FACTOR'; payload: FactorItem }
  | { type: 'UPDATE_FACTOR'; payload: { index: number; factor: FactorItem } }
  | { type: 'RESET_MODAL' }
  | { type: 'SET_SEARCH_RESULTS'; payload: SearchResult[] }
  | { type: 'SET_PARAMETER_SUGGESTIONS'; payload: string[] }
  | { type: 'SET_FIELD'; field: keyof State; value: any }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_CURRENT_PAGE'; payload: number }
  | { type: 'SET_IS_COMPUTING'; payload: boolean }
  | { type: 'SET_COMPUTE_PROGRESS'; payload: number }
  | { type: 'SET_CURRENT_COMPUTE_FACTOR'; payload: FactorItem | null }
  | { type: 'SET_COMPUTE_PARAMS'; payload: Record<string, any> };

// 初始状态
const initialState: State = {
  isModalOpen: false,
  isComputeModalOpen: false,
  factor_name: '',
  factor: '',
  baseData: '',
  importFactors: '',
  algorithm: '',
  parameters: '',
  layout: [],
  editingIndex: null,
  searchResults: [],
  parameterSuggestions: [],
  baseDataOptions: [],
  importFileOptions: [],
  searchQuery: '',
  currentPage: 1,
  itemsPerPage: 20,
  isComputing: false,
  computeProgress: 0,
  currentComputeFactor: null,
  computeParams: {},
};

// Reducer 函数
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_MODAL_OPEN':
      return { ...state, isModalOpen: action.payload };
    case 'SET_COMPUTE_MODAL_OPEN':
      return { ...state, isComputeModalOpen: action.payload };
    case 'SET_EDITING_INDEX':
      return { ...state, editingIndex: action.payload };
    case 'SET_LAYOUT':
      return { ...state, layout: action.payload };
    case 'ADD_FACTOR':
      return { ...state, layout: [...state.layout, action.payload] };
    case 'UPDATE_FACTOR':
      const updatedLayout = [...state.layout];
      updatedLayout[action.payload.index] = action.payload.factor;
      return { ...state, layout: updatedLayout };
    case 'RESET_MODAL':
      return {
        ...state,
        isModalOpen: false,
        editingIndex: null,
        factor_name: '',
        factor: '',
        baseData: '',
        importFactors: '',
        algorithm: '',
        parameters: '',
        searchResults: [],
        parameterSuggestions: [],
      };
    case 'SET_SEARCH_RESULTS':
      return { ...state, searchResults: action.payload };
    case 'SET_PARAMETER_SUGGESTIONS':
      return { ...state, parameterSuggestions: action.payload };
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload, currentPage: 1 };
    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: action.payload };
    case 'SET_IS_COMPUTING':
      return { ...state, isComputing: action.payload };
    case 'SET_COMPUTE_PROGRESS':
      return { ...state, computeProgress: action.payload };
    case 'SET_CURRENT_COMPUTE_FACTOR':
      return { ...state, currentComputeFactor: action.payload };
    case 'SET_COMPUTE_PARAMS':
      return { ...state, computeParams: action.payload };
    default:
      return state;
  }
}

// 自定义 Hook 用于因子搜索
function useSearchFactor(dispatch: React.Dispatch<Action>) {
  const searchFactor = useCallback(
    (query: string) => {
      fetch('http://127.0.0.1:5000/api/search_factor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ search: query }),
      })
        .then((res) => res.json())
        .then((data) => dispatch({ type: 'SET_SEARCH_RESULTS', payload: data }))
        .catch((err) => console.error('搜索因子失败:', err));
    },
    [dispatch]
  );

  return { searchFactor };
}

export default function Home() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const socketRef = useRef<Socket | null>(null);

  // 定义可用的传入参数选项
  const parameterOptions: string[] = ['df', 'column', 'moving_average_days', 'k'];

  // 定义 handleConfirmComput 函数
  const handleConfirmComput = useCallback((progress: number) => {
    const roundedProgress = Math.round(progress);
    dispatch({ type: 'SET_COMPUTE_PROGRESS', payload: roundedProgress });

    if (roundedProgress >= 100) {
      dispatch({ type: 'SET_IS_COMPUTING', payload: false });
      alert('因子计算完成！');
    }
  }, []);

  // 获取因子数据
  useEffect(() => {
    fetch('http://127.0.0.1:5000/api/get_factor', { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        if (data.factor_name) {
          const layoutData: FactorItem[] = data.factor_name.map((name: string, i: number) => ({
            factor_name: name,
            factor: data.factor[i],
            baseData: data.baseData[i] ? data.baseData[i].trim() : '',
            importFactors: data.importFactors[i] ? data.importFactors[i].trim() : '',
            algorithm: data.algorithm[i],
            parameters: data.parameters[i] ? data.parameters[i].trim() : '',
          }));
          dispatch({ type: 'SET_LAYOUT', payload: layoutData });
        }
      })
      .catch((err) => console.error('获取因子失败:', err));
  }, []);

  // 初始化 Socket.IO 客户端并监听事件
  useEffect(() => {
    const socket = io('http://127.0.0.1:5000');
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('已连接到 Socket.IO 服务器');
      // 请求基础数据和引用因子数据
      socket.emit('api/factor/baseData');
      socket.emit('api/factor/importFactors');
    });

    // 监听基础数据响应
    socket.on('response/baseData', (data: string) => {
      try {
        const parsedData = JSON.parse(data);
        const baseDataSet = new Set<string>();
        parsedData.forEach((record: any) => {
          if (record.baseData) {
            record.baseData
              .split(',')
              .map((item: string) => item.trim())
              .forEach((item) => baseDataSet.add(item));
          }
        });
        const baseDataOptions: Option[] = Array.from(baseDataSet).map((item) => ({ value: item, label: item }));
        dispatch({ type: 'SET_FIELD', field: 'baseDataOptions', value: baseDataOptions });
      } catch (error) {
        console.error('解析基础数据失败:', error);
      }
    });

    // 监听引用因子响应
    socket.on('response/importFactors', (data: string) => {
      try {
        const parsedData = JSON.parse(data);
        const importFactorSet = new Set<string>();
        parsedData.forEach((record: any) => {
          if (record.factor_name) {
            record.factor_name
              .split(',')
              .map((item: string) => item.trim())
              .forEach((item) => importFactorSet.add(item));
          }
        });
        const importFileOptions: Option[] = Array.from(importFactorSet).map((item) => ({ value: item, label: item }));
        dispatch({ type: 'SET_FIELD', field: 'importFileOptions', value: importFileOptions });
      } catch (error) {
        console.error('解析引用因子失败:', error);
      }
    });

    // 监听计算进度
    socket.on('compute/progress', (data: any) => {
      console.log('Received compute/progress data:', data);

      // 假设 data 直接是进度值的字符串，例如 "100.0"
      const progress = parseFloat(data); // 将字符串转为浮点数
      if (!isNaN(progress)) {
        handleConfirmComput(progress);
      } else {
        console.error('Invalid progress value:', progress);
      }
    });

    // 监听计算完成
    socket.on('compute/complete', () => {
      dispatch({ type: 'SET_COMPUTE_PROGRESS', payload: 100 });
      dispatch({ type: 'SET_IS_COMPUTING', payload: false });
      alert('因子计算完成！');
    });

    socket.on('disconnect', () => {
      console.log('已断开与 Socket.IO 服务器的连接');
    });

    // 清理函数
    return () => {
      socket.disconnect();
    };
  }, [handleConfirmComput]);

  // 搜索因子
  const { searchFactor } = useSearchFactor(dispatch);

  // 移动因子：交换位置
  const moveFactor = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;

      const updatedLayout = [...state.layout];
      const temp = updatedLayout[fromIndex];
      updatedLayout[fromIndex] = updatedLayout[toIndex];
      updatedLayout[toIndex] = temp;

      dispatch({ type: 'SET_LAYOUT', payload: updatedLayout });

      // 向后端发送被交换的因子
      const movedFactor = updatedLayout[toIndex];
      const replacedFactor = updatedLayout[fromIndex];

      fetch('http://127.0.0.1:5000/api/move_factor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movedFactor, replacedFactor }),
      }).catch((err) => console.error('交换因子失败:', err));
    },
    [state.layout]
  );

  // 关闭模态框
  const handleModalClose = useCallback(() => {
    dispatch({ type: 'RESET_MODAL' });
  }, []);

  // 确认添加或编辑因子
  const handleConfirm = useCallback(() => {
    const { factor_name, factor, baseData, importFactors, algorithm, parameters, editingIndex } = state;
    if (!factor_name.trim()) return alert('因子名称不能为空！');

    // 创建新因子对象
    const newFactor: FactorItem = {
      factor_name,
      factor,
      baseData,
      importFactors,
      algorithm,
      parameters,
    };

    if (editingIndex !== null) {
      // 更新因子
      dispatch({ type: 'UPDATE_FACTOR', payload: { index: editingIndex, factor: newFactor } });

      fetch('http://127.0.0.1:5000/api/updatefactor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFactor),
      })
        .then((res) => (res.ok ? res.json() : res.text().then((text) => { throw new Error(text); })))
        .then((data) => {
          console.log('因子更新成功:', data);
          handleModalClose();
        })
        .catch((err) => {
          console.error('更新因子失败:', err);
          alert('更新因子失败，请稍后再试。');
        });
    } else {
      // 添加新因子
      fetch('http://127.0.0.1:5000/api/add_factor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFactor),
      })
        .then((res) => (res.ok ? res.json() : res.text().then((text) => { throw new Error(text); })))
        .then((data) => {
          dispatch({ type: 'ADD_FACTOR', payload: newFactor });
          handleModalClose();
        })
        .catch((err) => {
          console.error('添加因子失败:', err);
          alert('添加因子失败，请稍后再试。');
        });
    }
  }, [state, handleModalClose]);

  // 编辑因子点击事件
  const handleEditClick = useCallback(
    (index: number) => {
      const factor = state.layout[index];
      dispatch({ type: 'SET_EDITING_INDEX', payload: index });
      dispatch({ type: 'SET_FIELD', field: 'factor_name', value: factor.factor_name });
      dispatch({ type: 'SET_FIELD', field: 'factor', value: factor.factor });
      dispatch({ type: 'SET_FIELD', field: 'baseData', value: factor.baseData });
      dispatch({ type: 'SET_FIELD', field: 'importFactors', value: factor.importFactors });
      dispatch({ type: 'SET_FIELD', field: 'algorithm', value: factor.algorithm });
      dispatch({ type: 'SET_FIELD', field: 'parameters', value: factor.parameters });
      dispatch({ type: 'SET_MODAL_OPEN', payload: true });
    },
    [state.layout]
  );

  // 处理传入参数变化
  const handleParameterChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value.trim();
      dispatch({ type: 'SET_FIELD', field: 'parameters', value: input });

      if (input) {
        const params = input.split(',').map((p) => p.trim());
        const lastParam = params[params.length - 1];
        const filteredParams = parameterOptions.filter((param) => param.includes(lastParam));
        dispatch({ type: 'SET_PARAMETER_SUGGESTIONS', payload: filteredParams });
      } else {
        dispatch({ type: 'SET_PARAMETER_SUGGESTIONS', payload: [] });
      }
    },
    [parameterOptions]
  );

  // 添加传入参数
  const handleAddParameter = useCallback(
    (param: string) => {
      const params = state.parameters.split(',').map((p) => p.trim()).filter((p) => p);
      if (!params.includes(param)) {
        const updatedParams = [...params, param].join(', ');
        dispatch({ type: 'SET_FIELD', field: 'parameters', value: updatedParams });
      }
      dispatch({ type: 'SET_PARAMETER_SUGGESTIONS', payload: [] });
    },
    [state.parameters]
  );

  // 保存编辑
  const handleSaveEdit = useCallback(() => {
    handleConfirm();
  }, [handleConfirm]);

  // 获取字段名称对应的状态键
  const getFieldName = useCallback((label: string): keyof State => {
    const mapping: Record<string, keyof State> = {
      '因子名字': 'factor_name',
      '因子函数': 'factor',
      '基础数据': 'baseData',
      '引用因子': 'importFactors',
      '传入参数': 'parameters',
      '算法': 'algorithm',
    };
    return mapping[label] || 'factor_name';
  }, []);

  // 获取自动补全词汇
  const getAutocompleteWords = useCallback(() => {
    const importedFactors = state.layout.flatMap((item) => item.importFactors.split(',').map((f) => f.trim()));
    const baseDatas = state.layout.flatMap((item) => item.baseData.split(',').map((b) => b.trim()));
    return Array.from(new Set([...importedFactors, ...baseDatas]));
  }, [state.layout]);

  // 配置 Monaco Editor 的自动补全
  const handleEditorDidMount = useCallback(
    (editor: any, monacoInstance: any) => {
      if (!monacoInstance.languages.getLanguages().some((lang: any) => lang.id === 'python')) {
        monacoInstance.languages.register({ id: 'python' });
      }

      monacoInstance.languages.registerCompletionItemProvider('python', {
        provideCompletionItems: () => {
          const suggestions = getAutocompleteWords().map((word) => ({
            label: word,
            kind: monacoInstance.languages.CompletionItemKind.Variable,
            insertText: word,
          }));
          return { suggestions };
        },
      });
    },
    [getAutocompleteWords]
  );

  // 处理搜索输入变化
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: e.target.value });
  }, []);

  // 根据搜索查询过滤因子
  const filteredLayout = state.layout.filter(
    (item) =>
      item.factor_name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      item.factor.toLowerCase().includes(state.searchQuery.toLowerCase())
  );

  // 分页逻辑
  const indexOfLastItem = state.currentPage * state.itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - state.itemsPerPage;
  const currentFactors = filteredLayout.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredLayout.length / state.itemsPerPage);

  // 打开计算参数弹窗
  const openComputeModal = useCallback((factor: FactorItem) => {
    dispatch({ type: 'SET_CURRENT_COMPUTE_FACTOR', payload: factor });
    dispatch({ type: 'SET_COMPUTE_PARAMS', payload: {} });
    dispatch({ type: 'SET_COMPUTE_MODAL_OPEN', payload: true });
  }, []);

  // 关闭计算参数弹窗
  const closeComputeModal = useCallback(() => {
    dispatch({ type: 'SET_COMPUTE_MODAL_OPEN', payload: false });
    dispatch({ type: 'SET_CURRENT_COMPUTE_FACTOR', payload: null });
    dispatch({ type: 'SET_COMPUTE_PARAMS', payload: {} });
  }, []);

  // 处理计算参数变化
  const handleComputeParamChange = useCallback(
    (param: string, value: any) => {
      dispatch({
        type: 'SET_COMPUTE_PARAMS',
        payload: { ...state.computeParams, [param]: value },
      });
    },
    [state.computeParams]
  );

  // 确认计算
  const handleConfirmCompute = useCallback(() => {
    const factor = state.currentComputeFactor;
    if (!factor) return;

    // 解析原始参数字符串
    const originalParams = factor.parameters; // e.g., "df, column, moving_average_days=30"
    const paramsArray = originalParams.split(',').map((p) => p.trim());

    // 构建新的参数字符串，根据用户是否定义了值
    const reconstructedParameters = paramsArray
      .map((param) => {
        if (param.includes('=')) {
          const [key, defaultValue] = param.split('=').map((s) => s.trim());
          const userValue = state.computeParams[key];
          if (userValue !== undefined && userValue !== '') {
            return `${key}=${userValue}`;
          } else {
            return `${key}=${defaultValue}`;
          }
        } else {
          const userValue = state.computeParams[param];
          if (userValue !== undefined && userValue !== '') {
            return `${param}=${userValue}`;
          } else {
            return param;
          }
        }
      })
      .join(', ');

    // 发送计算请求，确保所有字段位于顶层，parameters 为字符串
    const computeData = {
      factor_name: factor.factor_name,
      factor: factor.factor,
      baseData: factor.baseData,
      importFactors: factor.importFactors,
      algorithm: factor.algorithm,
      parameters: reconstructedParameters,
    };

    socketRef.current?.emit('api/factor/compute_factor', computeData);

    // 更新状态为正在计算
    dispatch({ type: 'SET_IS_COMPUTING', payload: true });
    dispatch({ type: 'SET_COMPUTE_PROGRESS', payload: 0 });

    // 关闭计算参数弹窗
    closeComputeModal();
  }, [state.currentComputeFactor, state.computeParams, closeComputeModal]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex justify-center items-start p-5 bg-white min-h-screen overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-full relative">
          {/* 显示计算进度 */}
          {state.isComputing && (
            <div className="fixed top-0 left-0 w-full bg-blue-500 text-white text-center p-2 z-50">
              <div className="text-lg">计算中: {state.computeProgress}%</div>
              <div className="w-full bg-gray-200 h-4 rounded mt-2">
                <div
                  className="bg-green-500 h-4 rounded"
                  style={{ width: `${state.computeProgress}%`, transition: 'width 0.5s ease' }}
                ></div>
              </div>
            </div>
          )}

          {/* 搜索栏 */}
          <div className="mb-4">
            <input
              type="text"
              value={state.searchQuery}
              onChange={handleSearchChange}
              className="w-full p-2 bg-transparent"
              placeholder="搜索因子名称或函数"
            />
          </div>

          {/* 添加因子按钮 */}
          <button
            onClick={() => dispatch({ type: 'SET_MODAL_OPEN', payload: true })}
            className="w-12 h-12 text-2xl bg-blue-500 text-white rounded-full shadow fixed bottom-5 right-5 z-50"
            title="添加因子"
          >
            +
          </button>

          {/* 可滚动的因子展示区域 */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5 mt-5 max-h-[70vh] overflow-y-auto">
            {currentFactors.map((item, idx) => (
              <DraggableFactor
                key={item.factor_name}
                item={item}
                index={indexOfFirstItem + idx}
                moveFactor={moveFactor}
                onEdit={() => handleEditClick(indexOfFirstItem + idx)}
                onCompute={() => openComputeModal(item)}
                isComputing={state.isComputing}
              />
            ))}
          </div>

          {/* 分页控制 */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => dispatch({ type: 'SET_CURRENT_PAGE', payload: Math.max(state.currentPage - 1, 1) })}
                disabled={state.currentPage === 1}
                className="px-3 py-1 mx-1 bg-gray-200 rounded disabled:opacity-50"
              >
                上一页
              </button>
              <span className="px-3 py-1 mx-1">
                第 {state.currentPage} 页，共 {totalPages} 页
              </span>
              <button
                onClick={() =>
                  dispatch({ type: 'SET_CURRENT_PAGE', payload: Math.min(state.currentPage + 1, totalPages) })
                }
                disabled={state.currentPage === totalPages}
                className="px-3 py-1 mx-1 bg-gray-200 rounded disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          )}
        </div>

        {/* 编辑/添加模态框 */}
        {state.isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-5 rounded-lg shadow-md w-11/12 max-w-3xl h-4/5 flex flex-col">
              <h2 className="text-lg">
                {state.editingIndex !== null
                  ? `编辑因子: ${state.layout[state.editingIndex].factor_name}`
                  : '添加因子'}
              </h2>
              <div className="mt-4 flex-1 overflow-y-auto">
                {['因子名字', '因子函数', '基础数据', '引用因子', '传入参数', '算法'].map((label) => (
                  <label key={label} className="block mb-4">
                    <span className="block mb-1">{label}:</span>
                    {label === '因子名字' ? (
                      <input
                        type="text"
                        value={state.factor_name}
                        readOnly={state.editingIndex !== null} // 只在编辑状态下设置只读
                        onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'factor_name', value: e.target.value })}
                        className={`mt-1 p-2 w-full bg-transparent ${state.editingIndex !== null ? 'bg-gray-200 cursor-not-allowed' : 'bg-white'}`} // 添加背景颜色和光标样式
                        placeholder="输入因子名称"
                      />
                    ) : label === '基础数据' || label === '引用因子' ? (
                      <Select
                        isMulti
                        options={label === '基础数据' ? state.baseDataOptions : state.importFileOptions}
                        value={(label === '基础数据' ? state.baseData : state.importFactors)
                          .split(',')
                          .map((item) => item.trim())
                          .filter((item) => item)
                          .map((item) => ({ value: item, label: item }))}
                        onChange={(selectedOptions) => {
                          const values = selectedOptions ? selectedOptions.map((option) => option.value) : [];
                          const joinedValues = values.join(', ');
                          dispatch({
                            type: 'SET_FIELD',
                            field: label === '基础数据' ? 'baseData' : 'importFactors',
                            value: joinedValues,
                          });
                        }}
                        className="mt-1"
                        classNamePrefix="select"
                        placeholder={`选择${label}`}
                        styles={{
                          control: (provided) => ({
                            ...provided,
                            backgroundColor: 'transparent',
                            border: 'none',
                            boxShadow: 'none',
                          }),
                          menu: (provided) => ({
                            ...provided,
                            backgroundColor: '#fff',
                          }),
                          option: (provided, state) => ({
                            ...provided,
                            backgroundColor: state.isFocused ? '#f0f0f0' : '#fff',
                          }),
                        }}
                      />
                    ) : label === '传入参数' ? (
                      <>
                        <input
                          type="text"
                          value={state.parameters}
                          onChange={handleParameterChange}
                          className="mt-1 p-2 w-full bg-transparent"
                          placeholder="输入传入参数，用逗号分隔"
                        />
                        {state.parameterSuggestions.length > 0 && (
                          <ul className="border bg-white mt-2 max-h-40 overflow-y-auto">
                            {state.parameterSuggestions.map((param, idx) => (
                              <li
                                key={idx}
                                className="p-2 hover:bg-gray-200 cursor-pointer"
                                onClick={() => handleAddParameter(param)}
                              >
                                {param}
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    ) : label === '算法' ? (
                      <div className="h-64"> {/* 设置一个容器高度 */}
                        <MonacoEditor
                          height="100%"
                          defaultLanguage="python"
                          value={state.algorithm}
                          onChange={(value) => dispatch({ type: 'SET_FIELD', field: 'algorithm', value: value || '' })}
                          onMount={handleEditorDidMount}
                          options={{
                            automaticLayout: true,
                            fontSize: 14,
                            minimap: { enabled: false },
                            wordWrap: 'on',
                          }}
                          theme="vs-light"
                          className="resize-editor"
                        />
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={state[getFieldName(label)]}
                        onChange={(e) => dispatch({ type: 'SET_FIELD', field: getFieldName(label), value: e.target.value })}
                        className="mt-1 p-2 w-full bg-transparent"
                        placeholder={`输入${label}`}
                      />
                    )}
                  </label>
                ))}

              </div>

              <div className="mt-5 text-right">
                <button
                  onClick={state.editingIndex !== null ? handleSaveEdit : handleConfirm}
                  className="mr-2 px-4 py-2 bg-blue-500 text-white rounded"
                >
                  {state.editingIndex !== null ? '保存' : '确定'}
                </button>
                <button onClick={handleModalClose} className="px-4 py-2 bg-gray-300 rounded">
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 计算参数弹窗 */}
        {state.isComputeModalOpen && state.currentComputeFactor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-5 rounded-lg shadow-md w-11/12 max-w-md overflow-y-auto max-h-full">
              <h2 className="text-lg">定义计算参数: {state.currentComputeFactor.factor_name}</h2>
              <div className="mt-4">
                {state.currentComputeFactor.parameters
                  .split(',')
                  .map((param) => param.trim())
                  .filter((param) => param)
                  .map((param, idx) => {
                    const [key, defaultValue] = param.split('=').map((s) => s.trim());
                    return (
                      <div key={idx} className="mb-4">
                        <label className="block mb-1">
                          {key}:
                          <input
                            type="text"
                            value={state.computeParams[key] || ''}
                            onChange={(e) => handleComputeParamChange(key, e.target.value)}
                            className="mt-1 p-2 w-full bg-transparent"
                            placeholder={`输入${key}`}
                          />
                        </label>
                      </div>
                    );
                  })}
              </div>
              <div className="mt-5 text-right">
                <button
                  onClick={handleConfirmCompute}
                  className="mr-2 px-4 py-2 bg-blue-500 text-white rounded"
                >
                  确定
                </button>
                <button onClick={closeComputeModal} className="px-4 py-2 bg-gray-300 rounded">
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
}

// 优化后的 DraggableFactor 组件，使用 React.memo 避免不必要的重新渲染
const DraggableFactor = React.memo(
  ({
    item,
    index,
    moveFactor,
    onEdit,
    onCompute,
    isComputing,
  }: {
    item: FactorItem;
    index: number;
    moveFactor: (from: number, to: number) => void;
    onEdit: () => void;
    onCompute: () => void;
    isComputing: boolean;
  }) => {
    const ref = useRef<HTMLDivElement>(null);

    const [{ handlerId }, drop] = useDrop({
      accept: 'FACTOR',
      collect(monitor) {
        return {
          handlerId: monitor.getHandlerId(),
        };
      },
      hover(draggedItem: { index: number }, monitor: DropTargetMonitor) {
        if (!ref.current) {
          return;
        }
        const dragIndex = draggedItem.index;
        const hoverIndex = index;

        if (dragIndex === hoverIndex) {
          return;
        }

        // 仅在鼠标释放时触发交换
        // 这里不在 hover 时触发交换
      },
      drop(draggedItem: { index: number }, monitor: DropTargetMonitor) {
        if (!ref.current) {
          return;
        }
        const dragIndex = draggedItem.index;
        const hoverIndex = index;

        if (dragIndex === hoverIndex) {
          return;
        }

        // 触发交换
        moveFactor(dragIndex, hoverIndex);

        // 更新拖拽项的索引
        draggedItem.index = hoverIndex;
      },
    });

    const [{ isDragging }, drag] = useDrag({
      type: 'FACTOR',
      item: () => {
        return { index };
      },
      collect: (monitor: DragSourceMonitor) => ({
        isDragging: monitor.isDragging(),
      }),
    });

    drag(drop(ref));

    // 将 baseData 和 importFactors 从字符串拆分为数组
    const baseDataArray = item.baseData.split(',').map((s) => s.trim()).filter((s) => s);
    const importFactorsArray = item.importFactors.split(',').map((s) => s.trim()).filter((s) => s);

    return (
      <div
        ref={ref}
        className={`relative bg-white p-5 rounded-lg cursor-pointer select-none flex flex-col items-start justify-start shadow transition-transform ${isDragging ? 'opacity-50' : ''
          }`}
        data-handler-id={handlerId}
        onClick={onEdit}
      >
        <div className="text-lg font-medium">{item.factor_name}</div>
        <div className="mt-2">
          <strong>基础数据:</strong>
          <div className="flex flex-wrap mt-1">
            {baseDataArray.map((data, idx) => (
              <span key={idx} className="bg-blue-200 text-blue-800 px-2 py-1 rounded mr-2 mb-2 text-sm">
                {data}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-2">
          <strong>引用因子:</strong>
          <div className="flex flex-wrap mt-1">
            {importFactorsArray.map((file, idx) => (
              <span key={idx} className="bg-green-200 text-green-800 px-2 py-1 rounded mr-2 mb-2 text-sm">
                {file}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation(); // 防止触发编辑
            onCompute();
          }}
          className="absolute bottom-2 right-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-blue-600 disabled:bg-blue-300"
          title="计算"
          disabled={isComputing}
        >
          📈
        </button>
      </div>
    );
  }
);
