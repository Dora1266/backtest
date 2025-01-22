'use client';
import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../redux/Store";
import { setStockCode, setStartDate, setEndDate, fetchStockData } from "../../redux/Slice";
import { Chart, registerables } from "chart.js";
import "chartjs-adapter-luxon";
import zoomPlugin from "chartjs-plugin-zoom";
import { CandlestickController, CandlestickElement } from "chartjs-chart-financial";
import { DatePicker, Button, Row, Col, Typography, Radio, Switch, Select } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import dayjs from "dayjs";

Chart.register(...registerables, zoomPlugin, CandlestickController, CandlestickElement);

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const StockChart = ({ className }: { className?: string }) => {
    const candlestickRef = useRef<HTMLCanvasElement | null>(null);
    const volumeRef = useRef<HTMLCanvasElement | null>(null);
    const candlestickChart = useRef<Chart | null>(null);
    const volumeChart = useRef<Chart | null>(null);
    const dispatch = useDispatch();
    const { stockCode, startDate, endDate, data } = useSelector((state: RootState) => state.stock);
    const [colorMode, setColorMode] = useState<"涨红跌绿" | "涨绿跌红">("涨红跌绿");
    const [showClosingPrice, setShowClosingPrice] = useState<boolean>(false);
    const [timeFrame, setTimeFrame] = useState<"日线" | "周线" | "月线">("日线");
    const isSyncing = useRef(false); // 防止同步时循环触发

    useEffect(() => {
        if (stockCode && startDate && endDate) {
            dispatch(fetchStockData({ stockCode, startDate, endDate }));
        }
    }, [stockCode, startDate, endDate, dispatch]);

    // 数据处理：根据时间周期聚合数据
    const processData = (rawData: any, frame: "日线" | "周线" | "月线") => {
        if (!rawData?.日期?.length) return [];

        if (frame === "日线") {
            return rawData.日期.map((date, i) => {
                const open = rawData.开盘_不复权[i];
                const close = rawData.收盘_不复权[i];
                const isUp = close > open;

                const { upColor, downColor } = getCandleColors(colorMode);

                return {
                    x: new Date(date).getTime(),
                    o: open,
                    c: close,
                    h: rawData.最高_不复权[i],
                    l: rawData.最低_不复权[i],
                    v: rawData.成交量_不复权[i],
                    borderColor: isUp ? upColor.border : downColor.border,
                    backgroundColor: isUp ? upColor.background : downColor.background,
                };
            });
        } else {
            // 聚合周线或月线数据
            const groupedData: { [key: string]: any[] } = {};

            rawData.日期.forEach((dateStr, i) => {
                const date = dayjs(dateStr);
                let key = "";
                if (frame === "周线") {
                    key = date.startOf('week').format('YYYY-MM-DD');
                } else if (frame === "月线") {
                    key = date.startOf('month').format('YYYY-MM');
                }

                if (!groupedData[key]) {
                    groupedData[key] = [];
                }
                groupedData[key].push({
                    date: date,
                    open: rawData.开盘_不复权[i],
                    close: rawData.收盘_不复权[i],
                    high: rawData.最高_不复权[i],
                    low: rawData.最低_不复权[i],
                    volume: rawData.成交量_不复权[i],
                });
            });

            return Object.keys(groupedData).map(key => {
                const group = groupedData[key];
                const open = group[0].open;
                const close = group[group.length - 1].close;
                const high = Math.max(...group.map(item => item.high));
                const low = Math.min(...group.map(item => item.low));
                const volume = group.reduce((sum, item) => sum + item.volume, 0);
                const isUp = close > open;

                const { upColor, downColor } = getCandleColors(colorMode);

                return {
                    x: frame === "周线" ? group[group.length - 1].date.startOf('week').toDate().getTime()
                        : group[group.length - 1].date.endOf('month').toDate().getTime(),
                    o: open,
                    c: close,
                    h: high,
                    l: low,
                    v: volume,
                    borderColor: isUp ? upColor.border : downColor.border,
                    backgroundColor: isUp ? upColor.background : downColor.background,
                };
            }).sort((a, b) => a.x - b.x); // 确保数据按时间排序
        }
    };

    useEffect(() => {
        if (!data?.日期?.length) return;

        const transformed = processData(data, timeFrame);

        const candlestickCtx = candlestickRef.current?.getContext("2d");
        const volumeCtx = volumeRef.current?.getContext("2d");

        if (candlestickCtx) {
            if (candlestickChart.current) candlestickChart.current.destroy();

            candlestickChart.current = new Chart(candlestickCtx, {
                type: "candlestick",
                data: {
                    datasets: [
                        {
                            label: "蜡烛图",
                            data: transformed,
                            yAxisID: "y",
                        },
                        // 添加收盘价线
                        showClosingPrice && {
                            label: "收盘价",
                            data: transformed.map(item => ({ x: item.x, y: item.c })),
                            borderColor: "rgba(0, 0, 255, 1)",
                            fill: false,
                            type: 'line',
                            pointRadius: 0, // 去掉圆点
                        },
                    ].filter(Boolean), // 过滤掉为 false 的结果
                },
                options: getChartOptions(true),
            });
        }

        if (volumeCtx) {
            if (volumeChart.current) volumeChart.current.destroy();

            const volumeData = transformed.map(bar => ({
                x: bar.x,
                y: bar.v,
                backgroundColor: bar.c > bar.o ? getVolumeColor(colorMode, true) : getVolumeColor(colorMode, false),
            }));

            volumeChart.current = new Chart(volumeCtx, {
                type: "bar",
                data: {
                    datasets: [
                        {
                            label: "成交量",
                            data: volumeData,
                            yAxisID: "y1",
                        },
                    ],
                },
                options: getChartOptions(false),
            });

            // 初始化时同步 x 轴范围
            if (candlestickChart.current && volumeChart.current) {
                const { min, max } = candlestickChart.current.scales.x;
                volumeChart.current.scales.x.options.min = min;
                volumeChart.current.scales.x.options.max = max;
                volumeChart.current.update('none');
            }
        }
    }, [data, colorMode, showClosingPrice, timeFrame]);

    const getCandleColors = (mode: "涨红跌绿" | "涨绿跌红") => {
        if (mode === "涨红跌绿") {
            return {
                upColor: { border: "rgba(255,0,0,1)", background: "rgba(255,0,0,0.5)" },
                downColor: { border: "rgba(0,128,0,1)", background: "rgba(0,128,0,0.5)" },
            };
        } else {
            return {
                upColor: { border: "rgba(0,128,0,1)", background: "rgba(0,128,0,0.5)" },
                downColor: { border: "rgba(255,0,0,1)", background: "rgba(255,0,0,0.5)" },
            };
        }
    };

    const getVolumeColor = (mode: "涨红跌绿" | "涨绿跌红", isUp: boolean) => {
        const { upColor, downColor } = getCandleColors(mode);
        return isUp ? upColor.background : downColor.background;
    };

    const getChartOptions = (isMainChart: boolean) => ({
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                type: "time",
                time: { unit: timeFrame === "日线" ? "day" : timeFrame === "周线" ? "week" : "month" },
                ticks: { source: "data" },
                adapters: {
                    date: {
                        locale: 'zh-cn',
                    },
                },
                grid: {
                    display: false,
                },
                min: candlestickChart.current?.scales.x.min, // 同步最小值
                max: candlestickChart.current?.scales.x.max, // 同步最大值
            },
            y: isMainChart
                ? {
                    beginAtZero: false,
                    title: { display: true, text: "价格" },
                    position: "left",
                    grid: {
                        display: false,
                    },
                }
                : {
                    beginAtZero: true,
                    title: { display: true, text: "成交量" },
                    position: "left",
                    grid: {
                        display: false,
                    },
                    display: false,
                },
        },
        plugins: {
            zoom: {
                pan: {
                    enabled: true,
                    mode: "x",
                    onPan: ({ chart }) => handleZoomPan(chart, isMainChart),
                },
                zoom: {
                    wheel: {
                        enabled: true,
                    },
                    mode: "x",
                    onZoom: ({ chart }) => handleZoomPan(chart, isMainChart),
                },
            },
            tooltip: {
                mode: "nearest",
                intersect: false,
                callbacks: {
                    label: context => {
                        const bar = context.raw;
                        if (isMainChart) {
                            // 确认是否是收盘价线的tooltip
                            if (context.dataset.label === "收盘价") {
                                return [`收盘价: ${bar.y}`];
                            } else {
                                return [
                                    `开盘: ${bar.o}`,
                                    `收盘: ${bar.c}`,
                                    `最高: ${bar.h}`,
                                    `最低: ${bar.l}`,
                                ];
                            }
                        } else {
                            return [`成交量: ${bar.y}`];
                        }
                    },
                },
            },
        },
        categoryPercentage: 1.0,
        barPercentage: 1.0,
    });

    const handleZoomPan = (sourceChart: Chart, isMainChart: boolean) => {
        if (isSyncing.current) return;
        isSyncing.current = true;

        const targetChart = isMainChart ? volumeChart.current : candlestickChart.current;

        if (sourceChart && targetChart) {
            const { min, max } = sourceChart.scales.x;

            targetChart.scales.x.options.min = min;
            targetChart.scales.x.options.max = max;
            targetChart.update('none');
        }

        isSyncing.current = false;
    };

    const handleColorModeChange = (e: any) => {
        setColorMode(e.target.value);
    };

    const handleTimeFrameChange = (value: "日线" | "周线" | "月线") => {
        setTimeFrame(value);
    };

    const handleExport = () => {
        if (candlestickRef.current) {
            const link = document.createElement('a');
            link.href = candlestickRef.current.toDataURL('image/png');
            link.download = 'candlestick_chart.png';
            link.click();
        }
        if (volumeRef.current) {
            const link = document.createElement('a');
            link.href = volumeRef.current.toDataURL('image/png');
            link.download = 'volume_chart.png';
            link.click();
        }
    };

    return (
        <div className={`${className} h-full flex flex-col p-4`}>
            {/* 控制面板 */}
            <Row gutter={[16, 16]} style={{ marginBottom: "20px" }}>
                <Col xs={24} sm={12} md={8}>
                    <RangePicker
                        format="YYYY-MM-DD"
                        allowClear
                        style={{ width: "100%" }}
                        onChange={dates => {
                            if (dates) {
                                dispatch(setStartDate(dayjs(dates[0].toDate()).format("YYYY-MM-DD")));
                                dispatch(setEndDate(dayjs(dates[1].toDate()).format("YYYY-MM-DD")));
                            }
                        }}
                    />
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Select
                        value={timeFrame}
                        onChange={handleTimeFrameChange}
                        style={{ width: "100%" }}
                    >
                        <Option value="日线">日线</Option>
                        <Option value="周线">周线</Option>
                        <Option value="月线">月线</Option>
                    </Select>
                </Col>
                <Col xs={24} sm={24} md={8}>
                    <Radio.Group onChange={handleColorModeChange} value={colorMode} style={{ marginRight: "10px" }}>
                        <Radio.Button value="涨红跌绿">涨红跌绿</Radio.Button>
                        <Radio.Button value="涨绿跌红">涨绿跌红</Radio.Button>
                    </Radio.Group>
                    <Switch
                        checked={showClosingPrice}
                        onChange={setShowClosingPrice}
                        checkedChildren="显示收盘价"
                        unCheckedChildren="隐藏收盘价"
                        style={{ marginRight: "10px" }}
                    />
                    <Button
                        type="primary"
                        style={{ marginRight: "10px" }}
                        onClick={() => dispatch(fetchStockData({ stockCode, startDate, endDate }))}
                    >
                        获取数据
                    </Button>
                    <Button icon={<DownloadOutlined />} onClick={handleExport}>
                        导出图表
                    </Button>
                </Col>
            </Row>
            {/* 图表区域 */}
            <div className="flex-grow flex flex-col gap-4 overflow-hidden border rounded-lg p-4 bg-white shadow">
                <div className="relative flex-grow">
                    <canvas ref={candlestickRef} className="w-full h-full" />
                </div>
                <div className="relative h-1/3">
                    <canvas ref={volumeRef} className="w-full h-full" />
                </div>
            </div>
        </div>
    );
};

export default StockChart;
