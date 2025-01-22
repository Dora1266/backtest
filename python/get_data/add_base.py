import akshare as ak
from db.stock_operations import read_last_row_mysql, add_df_mysql
from db.operations import read_matching_column
from data_processor.formatted_date import formatted_date
import pandas as pd
from datetime import timedelta

def get_recent_date(stock_code, db_name):
    """获取股票的最近更新日期并计算起始查询日期"""
    last_row = read_last_row_mysql([stock_code], db_name, ['日期'], '日期')

    if last_row.empty:
        raise ValueError(f"未找到股票 {stock_code} 的日期数据")

    recent_date = formatted_date(f"{last_row['日期'].iloc[0]}")  # 格式化日期
    return (pd.to_datetime(recent_date) + timedelta(days=1)).strftime('%Y%m%d')


def get_stock_data(stock_code, start_date, end_date, adjust):
    """获取并调整股票数据的列名"""
    stock_data = ak.stock_zh_a_hist(
        symbol=stock_code,
        period="daily",
        start_date=start_date,
        end_date=end_date,
        adjust=adjust
    )

    if stock_data is not None and not stock_data.empty:
        if adjust == "hfq":
            stock_data.columns = [f'{col}_后复权' if col not in ['日期', '股票代码'] else col for col in stock_data.columns]
        return stock_data

    return None


def merge_stock_data(stock_code, stock_results, adjust_types):
    """合并各调整类型的股票数据"""
    merged_df = stock_results[(stock_code, "")].merge(
        stock_results[(stock_code, "qfq")],
        on=['日期', '股票代码'],
        suffixes=('_不复权', '_前复权')
    )
    merged_df = merged_df.merge(stock_results[(stock_code, "hfq")], on=['日期', '股票代码'])
    return merged_df.drop(columns=['股票代码'])  # 删除不需要的股票代码列


def process_stock_code(stock_code, db_name, adjust_types, end_date, socketio):
    """针对单个股票代码进行数据获取与处理"""
    try:
        start_date = get_recent_date(stock_code, db_name)
    except ValueError as e:
        print(e)
        return

    stock_results = {}
    stock_fetched = False

    for adjust in adjust_types:
        try:
            stock_data = get_stock_data(stock_code, start_date, end_date, adjust)

            if stock_data is not None:
                stock_results[(stock_code, adjust)] = stock_data
                stock_fetched = True
            else:
                print(f"{stock_code} 在 {adjust} 调整选项下没有新数据")
        except Exception as exc:
            print(f"获取 {stock_code} 数据失败: {exc}")

    if not stock_fetched:
        print(f"{stock_code} 没有新数据需要更新")
        socketio.emit('stock_update', {'stock_code': stock_code, 'status': '已是最新数据'})
        return

    if not all((stock_code, adjust) in stock_results for adjust in adjust_types):
        print(f"{stock_code} 未能获取所有类型的调整数据")
        return

    merged_df = merge_stock_data(stock_code, stock_results, adjust_types)
    add_df_mysql(merged_df, db_name=db_name, table_name=stock_code)
    socketio.emit('stock_update', {'stock_code': stock_code, 'status': '完成'})


def update_stock_data(stock_codes, db_name, socketio):
    """从数据库和远程接口获取股票数据"""
    if not isinstance(stock_codes, list):
        stock_codes = [stock_codes]

    end_date = "20990909"
    adjust_types = ["", "qfq", "hfq"]

    for stock_code in stock_codes:
        process_stock_code(stock_code, db_name, adjust_types, end_date, socketio)

