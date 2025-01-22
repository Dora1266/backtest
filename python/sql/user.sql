/*
 Navicat Premium Dump SQL

 Source Server         : 1
 Source Server Type    : MySQL
 Source Server Version : 90001 (9.0.1)
 Source Host           : localhost:3306
 Source Schema         : user

 Target Server Type    : MySQL
 Target Server Version : 90001 (9.0.1)
 File Encoding         : 65001

 Date: 20/11/2024 00:19:52
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for basedata
-- ----------------------------
DROP TABLE IF EXISTS `basedata`;
CREATE TABLE `basedata`  (
  `baseData` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of basedata
-- ----------------------------
INSERT INTO `basedata` VALUES ('开盘_不复权');
INSERT INTO `basedata` VALUES ('收盘_不复权');
INSERT INTO `basedata` VALUES ('最高_不复权');
INSERT INTO `basedata` VALUES ('最低_不复权');
INSERT INTO `basedata` VALUES ('成交量_不复权');
INSERT INTO `basedata` VALUES ('成交额_不复权');
INSERT INTO `basedata` VALUES ('振幅_不复权');
INSERT INTO `basedata` VALUES ('涨跌幅_不复权');
INSERT INTO `basedata` VALUES ('涨跌额_不复权');
INSERT INTO `basedata` VALUES ('换手率_不复权');
INSERT INTO `basedata` VALUES ('开盘_前复权');
INSERT INTO `basedata` VALUES ('收盘_前复权');
INSERT INTO `basedata` VALUES ('最高_前复权');
INSERT INTO `basedata` VALUES ('最低_前复权');
INSERT INTO `basedata` VALUES ('成交量_前复权');
INSERT INTO `basedata` VALUES ('成交额_前复权');
INSERT INTO `basedata` VALUES ('振幅_前复权');
INSERT INTO `basedata` VALUES ('涨跌幅_前复权');
INSERT INTO `basedata` VALUES ('涨跌额_前复权');
INSERT INTO `basedata` VALUES ('换手率_前复权');

-- ----------------------------
-- Table structure for factor
-- ----------------------------
DROP TABLE IF EXISTS `factor`;
CREATE TABLE `factor`  (
  `factor_name` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `factor` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `baseData` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `importFactors` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `algorithm` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `parameters` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of factor
-- ----------------------------
INSERT INTO `factor` VALUES ('bollinger_bands', 'bollinger_bands', '开盘_不复权,收盘_不复权', 'moving_average', '    df[f\'{moving_average_days}日均线\']=factor.moving_average.moving_average(df, column, moving_average_days)\r\n\r\n    df[f\'{moving_average_days}日标准差\'] = df[column].rolling(window=moving_average_days).std()\r\n\r\n    df[f\'{moving_average_days}日上轨\'] = df[f\'{moving_average_days}日均线\'] + (\r\n\r\n                        k * df[f\'{moving_average_days}日标准差\'])\r\n\r\n    df[f\'{moving_average_days}日下轨\'] = df[f\'{moving_average_days}日均线\'] - (\r\n\r\n    \r\n\r\n                        k * df[f\'{moving_average_days}日标准差\'])\r\n\r\n    result = df[[df.columns[0], f\'{moving_average_days}日下轨\',f\'{moving_average_days}日上轨\']]  # 假设第一列是日期\r\n\r\n    return result', 'df, column, moving_average_days, k');
INSERT INTO `factor` VALUES ('calculate_smooth', 'calculate_profit', '开盘_前复权, 收盘_前复权, 成交量_前复权, 成交额_不复权', '', '    \"\"\"\r\n    基于筹码分布计算股票的获利盘比例，其优化版本。\r\n    \r\n    Parameters:\r\n    df: pandas DataFrame，包含股票的历史数据，必须包含以下列：\r\n        - \'日期\'\r\n        - \'开盘_前复权\'\r\n        - \'收盘_前复权\'\r\n        - \'成交量_前复权\'\r\n        - \'成交额_前复权\'\r\n\r\n    price_bins (int): 定义价格的区间数，用来划分每格之间的平均价格水平\r\n    window_size (int): 滚动窗口的大小\r\n    \r\n    Returns:\r\n    DataFrame: 包含日期和对应的获利盘比例\r\n    \"\"\"\r\n    \r\n    # 确保数据按日期升序排列\r\n    df = df.sort_values(by=\'日期\').reset_index(drop=True)\r\n\r\n    # 最小价到最大价，划分为price_bins个价格段\r\n    min_price = df[\'收盘_前复权\'].min()\r\n    max_price = df[\'收盘_前复权\'].max()\r\n    price_range = np.linspace(min_price, max_price, price_bins)\r\n    \r\n    # 存储每个价格区间的累计成交量\r\n    total_volume_at_price = np.zeros(price_bins)\r\n\r\n    # 结果列表\r\n    result_list = []\r\n\r\n    # 获取收盘价和成交量的数据\r\n    close_prices = df[\'收盘_前复权\'].values\r\n    volumes = df[\'成交量_前复权\'].values\r\n\r\n    # 将价格映射到相应区间\r\n    price_indices = np.digitize(close_prices, price_range) - 1  # 获取每个收盘价所在区间索引\r\n    \r\n    for idx in range(len(df)):\r\n        if idx >= window_size:\r\n            # 减去滑出窗口的旧索引成交量影响\r\n            old_idx = idx - window_size\r\n            total_volume_at_price[price_indices[old_idx]] -= volumes[old_idx]\r\n\r\n        # 增加当前价格区间的成交量\r\n        total_volume_at_price[price_indices[idx]] += volumes[idx]\r\n\r\n        # 计算当前滚动窗口内的总成交量\r\n        total_volume = np.sum(total_volume_at_price)\r\n\r\n        if total_volume > 0:\r\n            # 获利盘：小于当前收盘价的价格区间的成交量\r\n            profitable_volume = np.sum(total_volume_at_price[price_range < close_prices[idx]])\r\n            profit_plate_ratio = profitable_volume / total_volume\r\n        else:\r\n            profit_plate_ratio = 0\r\n\r\n        result_list.append([df.iloc[idx][\'日期\'], profit_plate_ratio])\r\n\r\n    # 返回获利盘比例的结果 DataFrame\r\n    result_df = pd.DataFrame(result_list, columns=[\'日期\', \'获利盘比例\'])\r\n\r\n    return result_df', 'df, price_bins=100, window_size=250');
INSERT INTO `factor` VALUES ('moving_average', 'moving_average', '收盘_不复权', '', 'df[f\'{moving_average_days}日均线\'] = df[column].rolling(window=moving_average_days).mean()\r\nresult = df[[df.columns[0], f\'{moving_average_days}日均线\']]  # 假设第一列是日期\r\nreturn result\r\n', 'df, column, moving_average_days');
INSERT INTO `factor` VALUES ('calculate_volume_ratio', 'calculate_volume_ratio', '成交量_不复权', '', '    if \'成交量_不复权\' not in df.columns:\r\n        raise ValueError(\"DataFrame中缺少\'成交量_不复权\'列\")\r\n    \r\n    # 计算5日均成交量\r\n    df[\'5日均成交量\'] = df[\'成交量_不复权\'].rolling(window=5).mean()\r\n    \r\n    # 计算量比\r\n    df[\'量比\'] = df[\'成交量_不复权\'] / df[\'5日均成交量\']\r\n    \r\n    # 构建包含日期和量比的新DataFrame\r\n    result = df[[\'日期\', \'量比\']].dropna()  # 删除因计算均值导致的NaN值\r\n    \r\n    return result', 'df');
INSERT INTO `factor` VALUES ('calculate_volatility', 'calculate_volatility', '收盘_不复权', '', '    \"\"\"\r\n    计算给定数据框中的波动率，并返回包含日期和收益率的 DataFrame。\r\n\r\n    参数：\r\n    df : pandas.DataFrame\r\n        应该包含 \'Date\' 和 \'Close\' 列，其中 \'Date\' 列为日期，\'Close\' 列为收盘价。\r\n    frequency : str\r\n        波动率计算的频率，可以是 \'D\'（每日）、\'W\'（每周）、\'M\'（每月）等。\r\n\r\n    返回：\r\n    tuple\r\n        - 波动率 (float)\r\n        - pandas.DataFrame\r\n            包含日期和收益率的 DataFrame\r\n    \"\"\"\r\n    # 确保 \'Date\' 列是日期类型\r\n    df[\'日期\'] = pd.to_datetime(df[\'日期\'])\r\n    df.set_index(\'日期\', inplace=True)\r\n\r\n    # 计算收益率\r\n    df[\'波动率\'] = df[\'收盘_不复权\'].pct_change()\r\n\r\n    # 按照指定频率重采样并计算收益率\r\n    if frequency == \'W\':\r\n        resampled_returns = df[\'波动率\'].resample(\'W\').agg(lambda x: (x + 1).prod() - 1)\r\n    elif frequency == \'M\':\r\n        resampled_returns = df[\'波动率\'].resample(\'M\').agg(lambda x: (x + 1).prod() - 1)\r\n    elif frequency == \'D\':\r\n        resampled_returns = df[\'波动率\']  # 不需要重采样\r\n    else:\r\n        raise ValueError(\"frequency 参数必须是 \'D\'、 \'W\' 或 \'M\'。\")\r\n\r\n    # 计算收益率的标准差作为波动率\r\n    volatility = resampled_returns.std()\r\n\r\n    # 创建返回的结果 DataFrame\r\n    result_df = resampled_returns.reset_index()\r\n    result_df.columns = [\'日期\', \'波动率\']\r\n\r\n    return result_df', 'df, frequency=\'D\'');
INSERT INTO `factor` VALUES ('bollinger_bands', 'bollinger_bands', '开盘_不复权,收盘_不复权', 'moving_average', '    df[f\'{moving_average_days}日均线\']=factor.moving_average.moving_average(df, column, moving_average_days)\r\n\r\n    df[f\'{moving_average_days}日标准差\'] = df[column].rolling(window=moving_average_days).std()\r\n\r\n    df[f\'{moving_average_days}日上轨\'] = df[f\'{moving_average_days}日均线\'] + (\r\n\r\n                        k * df[f\'{moving_average_days}日标准差\'])\r\n\r\n    df[f\'{moving_average_days}日下轨\'] = df[f\'{moving_average_days}日均线\'] - (\r\n\r\n    \r\n\r\n                        k * df[f\'{moving_average_days}日标准差\'])\r\n\r\n    result = df[[df.columns[0], f\'{moving_average_days}日下轨\',f\'{moving_average_days}日上轨\']]  # 假设第一列是日期\r\n\r\n    return result', 'df, column, moving_average_days, k');
INSERT INTO `factor` VALUES ('calculate_smooth', 'calculate_profit', '开盘_前复权, 收盘_前复权, 成交量_前复权, 成交额_不复权', '', '    \"\"\"\r\n    基于筹码分布计算股票的获利盘比例，其优化版本。\r\n    \r\n    Parameters:\r\n    df: pandas DataFrame，包含股票的历史数据，必须包含以下列：\r\n        - \'日期\'\r\n        - \'开盘_前复权\'\r\n        - \'收盘_前复权\'\r\n        - \'成交量_前复权\'\r\n        - \'成交额_前复权\'\r\n\r\n    price_bins (int): 定义价格的区间数，用来划分每格之间的平均价格水平\r\n    window_size (int): 滚动窗口的大小\r\n    \r\n    Returns:\r\n    DataFrame: 包含日期和对应的获利盘比例\r\n    \"\"\"\r\n    \r\n    # 确保数据按日期升序排列\r\n    df = df.sort_values(by=\'日期\').reset_index(drop=True)\r\n\r\n    # 最小价到最大价，划分为price_bins个价格段\r\n    min_price = df[\'收盘_前复权\'].min()\r\n    max_price = df[\'收盘_前复权\'].max()\r\n    price_range = np.linspace(min_price, max_price, price_bins)\r\n    \r\n    # 存储每个价格区间的累计成交量\r\n    total_volume_at_price = np.zeros(price_bins)\r\n\r\n    # 结果列表\r\n    result_list = []\r\n\r\n    # 获取收盘价和成交量的数据\r\n    close_prices = df[\'收盘_前复权\'].values\r\n    volumes = df[\'成交量_前复权\'].values\r\n\r\n    # 将价格映射到相应区间\r\n    price_indices = np.digitize(close_prices, price_range) - 1  # 获取每个收盘价所在区间索引\r\n    \r\n    for idx in range(len(df)):\r\n        if idx >= window_size:\r\n            # 减去滑出窗口的旧索引成交量影响\r\n            old_idx = idx - window_size\r\n            total_volume_at_price[price_indices[old_idx]] -= volumes[old_idx]\r\n\r\n        # 增加当前价格区间的成交量\r\n        total_volume_at_price[price_indices[idx]] += volumes[idx]\r\n\r\n        # 计算当前滚动窗口内的总成交量\r\n        total_volume = np.sum(total_volume_at_price)\r\n\r\n        if total_volume > 0:\r\n            # 获利盘：小于当前收盘价的价格区间的成交量\r\n            profitable_volume = np.sum(total_volume_at_price[price_range < close_prices[idx]])\r\n            profit_plate_ratio = profitable_volume / total_volume\r\n        else:\r\n            profit_plate_ratio = 0\r\n\r\n        result_list.append([df.iloc[idx][\'日期\'], profit_plate_ratio])\r\n\r\n    # 返回获利盘比例的结果 DataFrame\r\n    result_df = pd.DataFrame(result_list, columns=[\'日期\', \'获利盘比例\'])\r\n\r\n    return result_df', 'df, price_bins=100, window_size=250');
INSERT INTO `factor` VALUES ('moving_average', 'moving_average', '收盘_不复权', '', 'df[f\'{moving_average_days}日均线\'] = df[column].rolling(window=moving_average_days).mean()\r\nresult = df[[df.columns[0], f\'{moving_average_days}日均线\']]  # 假设第一列是日期\r\nreturn result\r\n', 'df, column, moving_average_days');
INSERT INTO `factor` VALUES ('calculate_volume_ratio', 'calculate_volume_ratio', '成交量_不复权', '', '    if \'成交量_不复权\' not in df.columns:\r\n        raise ValueError(\"DataFrame中缺少\'成交量_不复权\'列\")\r\n    \r\n    # 计算5日均成交量\r\n    df[\'5日均成交量\'] = df[\'成交量_不复权\'].rolling(window=5).mean()\r\n    \r\n    # 计算量比\r\n    df[\'量比\'] = df[\'成交量_不复权\'] / df[\'5日均成交量\']\r\n    \r\n    # 构建包含日期和量比的新DataFrame\r\n    result = df[[\'日期\', \'量比\']].dropna()  # 删除因计算均值导致的NaN值\r\n    \r\n    return result', 'df');
INSERT INTO `factor` VALUES ('calculate_volatility', 'calculate_volatility', '收盘_不复权', '', '    \"\"\"\r\n    计算给定数据框中的波动率，并返回包含日期和收益率的 DataFrame。\r\n\r\n    参数：\r\n    df : pandas.DataFrame\r\n        应该包含 \'Date\' 和 \'Close\' 列，其中 \'Date\' 列为日期，\'Close\' 列为收盘价。\r\n    frequency : str\r\n        波动率计算的频率，可以是 \'D\'（每日）、\'W\'（每周）、\'M\'（每月）等。\r\n\r\n    返回：\r\n    tuple\r\n        - 波动率 (float)\r\n        - pandas.DataFrame\r\n            包含日期和收益率的 DataFrame\r\n    \"\"\"\r\n    # 确保 \'Date\' 列是日期类型\r\n    df[\'日期\'] = pd.to_datetime(df[\'日期\'])\r\n    df.set_index(\'日期\', inplace=True)\r\n\r\n    # 计算收益率\r\n    df[\'波动率\'] = df[\'收盘_不复权\'].pct_change()\r\n\r\n    # 按照指定频率重采样并计算收益率\r\n    if frequency == \'W\':\r\n        resampled_returns = df[\'波动率\'].resample(\'W\').agg(lambda x: (x + 1).prod() - 1)\r\n    elif frequency == \'M\':\r\n        resampled_returns = df[\'波动率\'].resample(\'M\').agg(lambda x: (x + 1).prod() - 1)\r\n    elif frequency == \'D\':\r\n        resampled_returns = df[\'波动率\']  # 不需要重采样\r\n    else:\r\n        raise ValueError(\"frequency 参数必须是 \'D\'、 \'W\' 或 \'M\'。\")\r\n\r\n    # 计算收益率的标准差作为波动率\r\n    volatility = resampled_returns.std()\r\n\r\n    # 创建返回的结果 DataFrame\r\n    result_df = resampled_returns.reset_index()\r\n    result_df.columns = [\'日期\', \'波动率\']\r\n\r\n    return result_df', 'df, frequency=\'D\'');

-- ----------------------------
-- Table structure for headers
-- ----------------------------
DROP TABLE IF EXISTS `headers`;
CREATE TABLE `headers`  (
  `header` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of headers
-- ----------------------------
INSERT INTO `headers` VALUES ('开盘_不复权');
INSERT INTO `headers` VALUES ('收盘_不复权');
INSERT INTO `headers` VALUES ('涨跌幅_不复权');
INSERT INTO `headers` VALUES ('开盘_不复权');
INSERT INTO `headers` VALUES ('收盘_不复权');
INSERT INTO `headers` VALUES ('涨跌幅_不复权');

-- ----------------------------
-- Table structure for select
-- ----------------------------
DROP TABLE IF EXISTS `select`;
CREATE TABLE `select`  (
  `code` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `name` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of select
-- ----------------------------
INSERT INTO `select` VALUES ('000001', '平安银行');

-- ----------------------------
-- Table structure for strategy
-- ----------------------------
DROP TABLE IF EXISTS `strategy`;
CREATE TABLE `strategy`  (
  `strategy_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `baseData` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `buy` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `sell` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of strategy
-- ----------------------------
INSERT INTO `strategy` VALUES ('平衡投机', '收盘_不复权', '收盘_不复权 < 收盘_不复权.shift(1)', '收盘_不复权 > 收盘_不复权.shift(1)');
INSERT INTO `strategy` VALUES ('反向平衡投机', '收盘_不复权', '收盘_不复权 > 收盘_不复权.shift(1) & 收盘_不复权 < 收盘_不复权.shift(1) * 1.05', '收盘_不复权 < 收盘_不复权.shift(1)');
INSERT INTO `strategy` VALUES ('平衡投机', '收盘_不复权', '收盘_不复权 < 收盘_不复权.shift(1)', '收盘_不复权 > 收盘_不复权.shift(1)');
INSERT INTO `strategy` VALUES ('反向平衡投机', '收盘_不复权', '收盘_不复权 > 收盘_不复权.shift(1) & 收盘_不复权 < 收盘_不复权.shift(1) * 1.05', '收盘_不复权 < 收盘_不复权.shift(1)');

SET FOREIGN_KEY_CHECKS = 1;
