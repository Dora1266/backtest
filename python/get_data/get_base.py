from datetime import datetime
import akshare as ak
from db import read_specific_columns_from_mysql, replace_df_mysql
from concurrent.futures import ThreadPoolExecutor, as_completed
import multiprocessing

def fetch_and_push_stock(stock_code, db_name, start_date, end_date, sio):
    """获取单个股票的历史行情数据并推送到 MySQL"""

    print(f'开始抓取 {stock_code} 数据，日期范围: {start_date} 到 {end_date}')
    try:
        stock_df = ak.stock_zh_a_hist(stock_code, period="daily", start_date=start_date, end_date=end_date, adjust="")
        stock_qfq_df = ak.stock_zh_a_hist(stock_code, period="daily", start_date=start_date, end_date=end_date, adjust="qfq")
        stock_hfq_df = ak.stock_zh_a_hist(stock_code, period="daily", start_date=start_date, end_date=end_date, adjust="hfq")

        # 为后复权数据列添加后缀 '_后复权'
        stock_hfq_df.columns = [f'{col}_后复权' if col not in ['日期', '股票代码'] else col for col in stock_hfq_df.columns]

        # 合并数据
        merged_df = stock_df.merge(stock_qfq_df, on=['日期', '股票代码'], suffixes=('_不复权', '_前复权'))
        merged_df = merged_df.merge(stock_hfq_df, on=['日期', '股票代码'])

        # 删除股票代码列
        merged_df = merged_df.drop(columns=['股票代码'])

        # 将合并后的数据写入 MySQL
        replace_df_mysql(merged_df, db_name=db_name, table_name=stock_code)
        sio.emit('stock_update', {'stock_code': stock_code, 'status': 'completed'})
        print(f'{stock_code} 处理完成')
    except Exception as e:
        print(f'{stock_code} 处理时发生错误: {e}')
        sio.emit('stock_update', {'stock_code': stock_code, 'status': 'error', 'error': str(e)})

def get_stock_data(stock_list, db_name, start_date, end_date, sio):
    max_workers = min(32, multiprocessing.cpu_count() * 5)  # 根据实际情况调整
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_stock = {
            executor.submit(fetch_and_push_stock, stock_code, db_name, start_date, end_date, sio): stock_code
            for stock_code in stock_list
        }
        for future in as_completed(future_to_stock):
            stock_code = future_to_stock[future]
            try:
                future.result()
            except Exception as exc:
                print(f'{stock_code} 发生异常: {exc}')
                sio.emit('stock_update', {'stock_code': stock_code, 'status': 'error', 'error': str(exc)})

