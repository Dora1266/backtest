import pandas as pd
from db import read_table_range_df_mysql, create_db_connection, add_df_mysql

def backtest_all(stock_list, read_db_name, write_db_name, buy_condition_str, sell_condition_str, start_date, end_date,
                 table_prefix, filter_first_n=0, filter_last_n=0, initial_cash=100000.0):

    def backtest_strategy(stock_id, df, buy_signals, sell_signals):

        # 过滤前filter_first_n行和后filter_last_n行的数据
        if filter_first_n > 0:
            df = df.iloc[filter_first_n:]
        if filter_last_n > 0:
            df = df.iloc[:-filter_last_n]

        # 过滤指定日期范围内的数据
        df = df[(df['日期'] >= pd.to_datetime(start_date)) & (df['日期'] <= pd.to_datetime(end_date))]

        cash = initial_cash  # 使用传入的初始资金
        position = 0  # 持有的股票数量
        records = []

        for index, row in df.iterrows():
            total_assets = cash + position * row['收盘_不复权']
            is_last_day = (index == len(df) - 1)
            has_traded_today = False

            if buy_signals.loc[index] and cash >= row['收盘_不复权'] and not has_traded_today and not is_last_day:
                num_to_buy = cash // row['收盘_不复权']
                cash -= num_to_buy * row['收盘_不复权']
                cash = round(cash, 2)
                position += num_to_buy
                records.append({
                    '日期': row['日期'],
                    '操作': '买入',
                    '价格': round(row['收盘_不复权'], 2),
                    '数量': num_to_buy,
                    '现金余额': round(cash, 2),
                    '持仓': position,
                    '总资产': round(total_assets, 2)
                })
                has_traded_today = True

            elif sell_signals.loc[index] and position > 0 and not has_traded_today:
                cash += position * row['收盘_不复权']
                cash = round(cash, 2)
                total_assets = cash
                records.append({
                    '日期': row['日期'],
                    '操作': '卖出',
                    '价格': round(row['收盘_不复权'], 2),
                    '数量': position,
                    '现金余额': round(cash, 2),
                    '持仓': 0,
                    '总资产': round(total_assets, 2)
                })
                position = 0
                has_traded_today = True

        # 如果持仓未清算，在最后一天卖出
        if position > 0:
            last_row = df.iloc[-1]
            cash += position * last_row['收盘_不复权']
            cash = round(cash, 2)
            total_assets = cash
            records.append({
                '日期': last_row['日期'],
                '操作': '卖出',
                '价格': round(last_row['收盘_不复权'], 2),
                '数量': position,
                '现金余额': round(cash, 2),
                '持仓': 0,
                '总资产': round(total_assets, 2)
            })
            position = 0

        return pd.DataFrame(records), total_assets

    all_trades = {}
    total_returns = {}
    individual_returns = {}

    for stock_id in stock_list:
        # 尝试读取数据，如果失败则跳过并记录警告
        try:
            df1 = read_table_range_df_mysql(stock_id, read_db_name, '日期', start_date, end_date)
            df1['日期'] = pd.to_datetime(df1['日期'])
        except Exception as e:
            print(
                f"警告: 无法读取股票 {stock_id} 的数据，可能是数据库 {read_db_name} 不存在。跳过该股票的回测。错误信息: {e}")
            continue  # 跳过当前股票的处理

        # 尝试读取因子数据，不存在则设置为None
        try:
            df2 = read_table_range_df_mysql(stock_id, 'factor', '日期', start_date, end_date)
            df2['日期'] = pd.to_datetime(df2['日期'])
            df = pd.merge(df1, df2, on='日期', how='inner')
        except Exception as e:
            print(f"警告: 因子数据不可用股票 {stock_id}，仅使用价格数据。")
            df2 = None
            df = df1

        # 检查 DataFrame 是否为空
        if df.empty:
            print(f"警告: 股票 {stock_id} 在指定日期范围内没有数据，跳过该股票的回测。")
            continue  # 跳过当前股票的处理

        # 计算买卖信号
        try:
            # 如果没有因子数据，只根据价格数据生成信号
            buy_signals = df.eval(buy_condition_str)
            sell_signals = df.eval(sell_condition_str)
        except Exception as e:
            print(f"错误: 评估买卖条件时出错，股票 {stock_id} 跳过。错误信息: {e}")
            continue  # 跳过当前股票的处理

        # 确保买卖信号为布尔类型
        buy_signals = buy_signals.astype(bool)
        sell_signals = sell_signals.astype(bool)

        trade_records, final_assets = backtest_strategy(stock_id, df, buy_signals, sell_signals)

        initial_price = df.iloc[0]['开盘_不复权']
        final_price = df.iloc[-1]['收盘_不复权']
        individual_returns[stock_id] = round((final_price - initial_price) / initial_price * 100, 2)

        all_trades[stock_id] = trade_records
        total_returns[stock_id] = round(final_assets, 2)

    returns_df = pd.DataFrame(total_returns.items(), columns=['股票代码', '最终总资产'])
    returns_df['收益率'] = round((returns_df['最终总资产'] - initial_cash) / initial_cash * 100, 2)
    returns_df['个股自身收益率'] = returns_df['股票代码'].map(individual_returns)

    # 计算持有天数和年化收益率
    for stock_id in stock_list:
        if stock_id in all_trades:
            trades = all_trades[stock_id]
            if not trades.empty:
                start_date_trade = trades['日期'].iloc[0]
                end_date_trade = trades['日期'].iloc[-1]
                holding_days = (end_date_trade - start_date_trade).days + 1
                if holding_days > 0:
                    annualized_return = (1 + returns_df.loc[returns_df['股票代码'] == stock_id, '收益率'].values[
                        0] / 100) ** (365 / holding_days) - 1
                    returns_df.loc[returns_df['股票代码'] == stock_id, '年化收益率'] = round(annualized_return * 100, 2)
                else:
                    returns_df.loc[returns_df['股票代码'] == stock_id, '年化收益率'] = -1  # 设置为-1
            else:
                returns_df.loc[returns_df['股票代码'] == stock_id, '年化收益率'] = -1  # 设置为-1
        else:
            returns_df.loc[returns_df['股票代码'] == stock_id, '年化收益率'] = -1  # 设置为-1

    returns_df['跑赢自身收益率'] = round(returns_df['收益率'] - returns_df['个股自身收益率'], 2)
    returns_df = returns_df.sort_values(by='收益率', ascending=False)

    wins_df = returns_df[returns_df['跑赢自身收益率']].sort_values(by='收益率', ascending=False)

    individual_returns_df = pd.DataFrame(individual_returns.items(), columns=['股票代码', '个股自身收益率'])
    individual_returns_df = individual_returns_df.sort_values(by='个股自身收益率', ascending=False)
    individual_returns_df = individual_returns_df.merge(
        returns_df[['股票代码', '最终总资产', '收益率', '年化收益率', '跑赢自身收益率']],
        on='股票代码', how='left'
    ).sort_values(by='个股自身收益率', ascending=False)

    # 将交易记录和收益数据写入数据库
    for stock_id, trades in all_trades.items():
        try:
            add_df_mysql(trades, write_db_name, f"{table_prefix}_{stock_id}")
        except Exception as e:
            print(f"警告: 写入交易记录 {table_prefix}_{stock_id} 时失败，错误信息: {e}")

    try:
        add_df_mysql(returns_df, write_db_name, f"{table_prefix}_收益排行")
    except Exception as e:
        print(f"警告: 写入收益排行 {table_prefix}_收益排行 时失败，错误信息: {e}")

    try:
        add_df_mysql(wins_df, write_db_name, f"{table_prefix}_跑赢自身收益排行")
    except Exception as e:
        print(f"警告: 写入跑赢自身收益排行 {table_prefix}_跑赢自身收益排行 时失败，错误信息: {e}")

    try:
        add_df_mysql(individual_returns_df, write_db_name, f"{table_prefix}_个股自身收益总榜")
    except Exception as e:
        print(f"警告: 写入个股自身收益总榜 {table_prefix}_个股自身收益总榜 时失败，错误信息: {e}")