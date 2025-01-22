import React, { useEffect, useState, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../redux/Store";
import { setStockCode, setStartDate, setEndDate, fetchStockData } from "../redux/Slice";
import { ChartCanvas, Chart, CandlestickSeries, BarSeries, XAxis, YAxis, CrossHairCursor, MouseCoordinateX, MouseCoordinateY, EdgeIndicator, OHLCTooltip } from "react-financial-charts";
import { scaleTime } from "d3-scale";
import { timeFormat } from "d3-time-format";
import { format } from "d3-format";
import { DatePicker, Button, Row, Col, Typography, Radio, Spin, message } from "antd";
import { DownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Title } = Typography;
const { RangePicker } = DatePicker;

const StockChart = ({ className }) => {
  const dispatch = useDispatch();
  const { stockCode, startDate, endDate, data, loading, error } = useSelector((state: RootState) => state.stock);
  const [colorMode, setColorMode] = useState("涨红跌绿");

  useEffect(() => {
    if (stockCode && startDate && endDate) {
      dispatch(fetchStockData({ stockCode, startDate, endDate }));
    }
  }, [stockCode, startDate, endDate, dispatch]);

  const chartData = useMemo(() => {
    if (data?.日期?.length) {
      return data.日期.map((date, i) => ({
        date: new Date(date),
        open: data.开盘_不复权[i],
        high: data.最高_不复权[i],
        low: data.最低_不复权[i],
        close: data.收盘_不复权[i],
        volume: data.成交量_不复权[i],
      }));
    }
    return [];
  }, [data]);

  const handleColorModeChange = (e) => {
    setColorMode(e.target.value);
  };

  const xAccessor = d => d.date;
  const xExtents = [
    chartData[0]?.date ?? new Date(),
    chartData[chartData.length - 1]?.date ?? new Date(),
  ];

  if (loading) {
    return (
      <div className={className} style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (error) {
    message.error("数据加载失败，请重试！");
  }

  return (
    <div className={className} style={styles.container}>
      <Title level={3} style={styles.title}>股票图表</Title>
      <Row gutter={[16, 16]} style={styles.datePickerRow}>
        <Col xs={24} sm={12} md={10}>
          <RangePicker
            format="YYYY-MM-DD"
            allowClear
            style={{ width: "100%", border: "none", background: "#fff" }}
            onChange={(dates) => {
              if (dates) {
                dispatch(setStartDate(dayjs(dates[0].toDate()).format("YYYY-MM-DD")));
                dispatch(setEndDate(dayjs(dates[1].toDate()).format("YYYY-MM-DD")));
              }
            }}
            value={startDate && endDate ? [dayjs(startDate), dayjs(endDate)] : undefined}
          />
        </Col>
        <Col xs={24} sm={12} md={14} style={styles.buttonGroup}>
          <Radio.Group onChange={handleColorModeChange} value={colorMode} buttonStyle="solid">
            <Radio.Button value="涨红跌绿">涨红跌绿</Radio.Button>
            <Radio.Button value="涨绿跌红">涨绿跌红</Radio.Button>
          </Radio.Group>
          <Button type="primary" icon={<ReloadOutlined />} style={styles.button} onClick={() => dispatch(fetchStockData({ stockCode, startDate, endDate }))}>
            获取数据
          </Button>
          <Button icon={<DownloadOutlined />} onClick={() => message.info("导出功能尚未实现")}>
            导出图表
          </Button>
        </Col>
      </Row>
      {chartData.length > 0 ? (
        <ChartCanvas
          height={600}
          ratio={window.devicePixelRatio || 1}
          width={window.innerWidth > 800 ? 800 : window.innerWidth - 40}
          seriesName="股票数据"
          data={chartData}
          xAccessor={xAccessor}
          xScale={scaleTime()}
          xExtents={xExtents}
          margin={{ left: 0, right: 0, top: 10, bottom: 30 }}  // 去掉边框留空
        >
          <Chart id={1} yExtents={(d) => [d.high, d.low]}>
            <XAxis axisAt="bottom" orient="bottom" style={{ stroke: "none" }} />
            <YAxis axisAt="right" orient="right" ticks={5} style={{ stroke: "none" }} />
            <MouseCoordinateX at="bottom" orient="bottom" displayFormat={timeFormat("%Y-%m-%d")} />
            <MouseCoordinateY at="right" orient="right" displayFormat={format(".2f")} />
            <CandlestickSeries
              fill={d => (d.close > d.open ? (colorMode === "涨红跌绿" ? "#ff4d4f" : "#73d13d") : (colorMode === "涨红跌绿" ? "#73d13d" : "#ff4d4f"))}
              stroke={d => (d.close > d.open ? (colorMode === "涨红跌绿" ? "#ff4d4f" : "#73d13d") : (colorMode === "涨红跌绿" ? "#73d13d" : "#ff4d4f"))}
            />
            <EdgeIndicator
              itemType="last"
              orient="right"
              edgeAt="right"
              yAccessor={d => d.close}
              fill={d => (d.close > d.open ? (colorMode === "涨红跌绿" ? "#ff4d4f" : "#73d13d") : (colorMode === "涨红跌绿" ? "#73d13d" : "#ff4d4f"))}
            />
            <OHLCTooltip origin={[-40, 0]} />
          </Chart>
          <Chart
            id={2}
            height={150}
            origin={(w, h) => [0, h - 150]}
            yExtents={(d) => d.volume}
          >
            <XAxis axisAt="bottom" orient="bottom" showTicks={false} style={{ stroke: "none" }} />
            <YAxis axisAt="left" orient="left" ticks={5} tickFormat={format(".2s")} style={{ stroke: "none" }} />
            <MouseCoordinateY at="left" orient="left" displayFormat={format(".4s")} />
            <BarSeries
              yAccessor={d => d.volume}
              fill={d => (d.close > d.open ? (colorMode === "涨红跌绿" ? "#ff4d4f" : "#73d13d") : (colorMode === "涨红跌绿" ? "#73d13d" : "#ff4d4f"))}
            />
            <EdgeIndicator
              itemType="last"
              orient="left"
              edgeAt="left"
              yAccessor={d => d.volume}
              displayFormat={format(".4s")}
              fill={d => (d.close > d.open ? (colorMode === "涨红跌绿" ? "#ff4d4f" : "#73d13d") : (colorMode === "涨红跌绿" ? "#73d13d" : "#ff4d4f"))}
            />
          </Chart>
          <CrossHairCursor />
        </ChartCanvas>
      ) : (
        <div style={{ textAlign: "center", padding: "50px", color: "#999" }}>
          暂无数据显示，请选择股票代码和日期范围后获取数据。
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: "20px",
    background: "#1e1e1e", // 深色背景
    borderRadius: "10px",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
  },
  title: {
    textAlign: "center",
    marginBottom: "20px",
    color: "#fff", // 白色字体
  },
  datePickerRow: {
    marginBottom: "20px",
  },
  buttonGroup: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  button: {
    marginRight: "10px",
    background: "linear-gradient(45deg, #1890ff, #40a9ff)", // 渐变按钮
    border: "none",
    color: "#fff",
  },
};

export default StockChart;
