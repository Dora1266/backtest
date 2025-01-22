from gevent import monkey  # gevent 的猴子补丁
import concurrent
import re
from gevent.pool import Pool  # gevent 限制并发数
import json
import asyncio
from db.operations import (  # 数据库操作
    read_matching_column,
    swap_rows,
    upsert_dataframe_to_mysql
)

from db.stock_operations import (  # 股票数据操作
    add_data_mysql,
    add_json_mysql,
    delete_json_mysql,
    delete_rows_from_table_mysql,
    read_matching_rows_from_mysql,
    read_last_row_mysql,
    read_specific_columns_from_mysql,
    read_specific_rows_from_mysql,
    read_table_df_mysql,
    read_table_range_df_mysql,
    replace_json_mysql
)

from data_processor import (  # 数据处理功能
    df2c,
    filldates,
    json2stringlist,
    merge_df_columns,
    str2list
)
from factor import create_file, get_info  # 因子操作
from flask import Flask, jsonify, request  # Flask 核心库
from flask_cors import CORS  # 支持跨域的库
from flask_socketio import SocketIO, emit  # SocketIO 库
from backtest.backtest import backtest_all  # 回测功能
from get_data.add_base import update_stock_data
from get_data.get_base import get_stock_data  # 数据获取
app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, async_mode='gevent', cors_allowed_origins="*")
SYSTEM_DB_NAME = 'system'
SYSTEM_TABLE_NAME = "system"
SYSTEM_MATCH_COLUMN = "config_name"
def get_system_config(config_key):
    try:
        return read_matching_column(SYSTEM_DB_NAME, SYSTEM_TABLE_NAME, SYSTEM_MATCH_COLUMN, config_key)
    except Exception as e:
        app.logger.error(f"获取系统配置项 {config_key} 时出错: {e}")
        return None

@app.route('/api/getheader', methods=['POST'])
def getheader():
    df = read_table_df_mysql('headers', 'user')
    result = df.to_dict(orient='records')
    return jsonify(result)

@app.route('/api/getallheader', methods=['POST'])
def getallheader():
    user_db = get_system_config('user_db')
    headers = get_system_config('baseData_db')
    df = read_table_df_mysql(headers, user_db)
    result = df.to_dict(orient='records')
    return jsonify(result)

@app.route('/api/updateheader', methods=['POST'])
def updateheader():
    data = request.json
    user_db = get_system_config('user_db')
    headers = get_system_config('headers_table')
    replace_json_mysql(data,headers,user_db,'header')
    return jsonify({'update': '成功'})

@app.route('/api/get_index', methods=['POST'])
def get_index():
    my_index_table = get_system_config('my_index_table')
    df = read_table_df_mysql(my_index_table, 'user')
    df = df.to_json(orient='records')
    return jsonify(df)

@app.route('/api/delete_index', methods=['POST'])
def delete_index():
    my_index_table = get_system_config('my_index_table')
    code=request.json.get('code')
    delete_rows_from_table_mysql(my_index_table, 'user','code',[code])
    return jsonify({'update': '成功'})


@app.route('/api/get_index_constituent', methods=['POST'])
def get_index_constituent():
    self_stocks_table_name = get_system_config('self_stocks_table')
    user_db = get_system_config('user_db')
    china_db = get_system_config('china_db_name')
    headers = get_system_config('headers_table')
    index_table = request.json.get('code')
    stocks = read_specific_columns_from_mysql('index', index_table, ['品种代码','品种名称'])
    # 使用 Pandas 过滤掉以“9”开头的代码
    stocks_filtered = stocks[~stocks['品种代码'].str.startswith('9')]
    stocks_filtered.rename(columns={'品种代码': 'code', '品种名称': 'name'}, inplace=True)
    stocks_filtered.reset_index(drop=True, inplace=True)
    df = read_table_df_mysql(headers, user_db)
    headers = df['header'].tolist()

    information = read_last_row_mysql(
        stocks_filtered['code'],
        china_db,
        headers,
        '日期'
    )
    print(stocks_filtered)
    print(information)
    df = merge_df_columns(stocks_filtered, information)
    df = df.to_json(orient='records')
    print(df)
    return jsonify(df)


@app.route('/api/get_self_stocks', methods=['POST'])
def get_self_stocks():
    try:
        self_stocks_table_name = get_system_config('self_stocks_table')
        user_db = get_system_config('user_db')
        china_db = get_system_config('china_db_name')
        headers = get_system_config('headers_table')
        df = read_table_df_mysql(headers, user_db)
        headers=df['header'].tolist()
        if not all([headers]):
            return jsonify({'error': '请提供 columns.'}), 400
        stocks = read_table_df_mysql(self_stocks_table_name, user_db)
        print(stocks)
        information = read_last_row_mysql(
            stocks['code'], china_db,
            headers,
            '日期'
        )
        print(information)
        df = merge_df_columns(stocks, information)
        print(df)
        df=df.to_json(orient='records')
        return jsonify(df)
    except Exception as e:
        app.logger.error(f"获取自选股票时出错: {e}")
        return jsonify({'error': '无法获取自选股票数据。'}), 500

@app.route('/random-stock-data', methods=['POST'])
def get_random_stock_data():
    try:
        data = request.json
        stock_code = data['stock_code']
        db_name = get_system_config('china_db_name')
        sd = data['start_date']
        ed = data['end_date']

        if not all([stock_code, db_name, sd, ed]):
            return jsonify({'error': '缺少必要的参数。'}), 400

        df = read_table_range_df_mysql(
            stock_code, db_name, '日期', sd, ed,
            ['日期', '开盘_不复权', '收盘_不复权', '最高_不复权', '最低_不复权', '成交量_不复权']
        )
        df = filldates(df)
        df = df2c(df)

        return jsonify(df)
    except Exception as e:
        app.logger.error(f"获取随机股票数据时出错: {e}")
        return jsonify({'error': '无法获取股票数据。'}), 500


@app.route('/api/add_select', methods=['POST'])
def add_select():
    try:
        data = request.json
        print(data)
        self_stocks_table_name = get_system_config('self_stocks_table')
        user_db = get_system_config('user_db')
        key = request.json.get('code')

        if not all([data, key]):
            return jsonify({'error': '请提供 data, table_name, db_name 和 key.'}), 400

        add_json_mysql(data, self_stocks_table_name, user_db, 'code')
        return jsonify({'message': '数据已成功添加到数据库。'}), 200
    except Exception as e:
        app.logger.error(f"添加数据时出错: {e}")
        return jsonify({'error': '无法添加数据到数据库。'}), 500



@app.route('/api/add_select_index', methods=['POST'])
def add_select_index():
        try:
            data = request.json
            print(data)
            self_stocks_table_name = get_system_config('my_index_table')
            user_db = get_system_config('user_db')
            key = request.json.get('code')
            name = request.json.get('name')
            key = re.sub(r'[a-zA-Z]', '', key)  # 清理 key 中的字母

            if not all([data, key]):
                return jsonify({'error': '请提供 data 和 key.'}), 400

            # 假设 data 需要用 key 替换 'code' 字段
            data['code'] = key  # 直接替换 data 中的 'code' 字段为 key

            add_json_mysql(data, self_stocks_table_name, user_db, 'code')
            return jsonify({'message': '数据已成功添加到数据库。'}), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500

@app.route('/api/get_select_indexcode', methods=['POST'])
def add_select_indexcode():
    index_table = request.json.get('code')

    # 从数据库读取特定的列
    stocks = read_specific_columns_from_mysql('index', index_table, ['品种代码'])

    # 使用 Pandas 过滤掉以“9”开头的代码
    stocks_filtered = stocks[~stocks['品种代码'].str.startswith('9')]

    # 重命名列
    stocks_filtered.rename(columns={'品种代码': 'code'}, inplace=True)

    # 重置索引
    stocks_filtered.reset_index(drop=True, inplace=True)

    # 将 DataFrame 转换为 JSON 格式
    df = stocks_filtered.to_json(orient='records')
    data = json.loads(df)

    # 提取所有的 code 值并连接
    codes = [item['code'] for item in data]
    joined_codes = ','.join(codes)

    # 构造新的 JSON 格式
    new_json = json.dumps({"code": joined_codes})

    # 直接返回 jsonify 对象，这会自动设置 Content-Type 和 JSON 编码
    return jsonify(json.loads(new_json))  # 返回字典而非字符串


@app.route('/search_tables', methods=['POST'])
def search_tables():
    try:
        data = request.get_json()
        search_string = data.get('search_string')
        db_name = data.get('core_db')
        user_table_name = data.get('core_chinalist_table')
        index_db=get_system_config('zh_index_table')

        if not all([search_string, db_name, user_table_name]):
            return jsonify({'error': '请提供 search_string, core_db 和 core_chinalist_table.'}), 400

        matching_tables1 = read_matching_rows_from_mysql(
            user_table_name, search_string, db_name, ['代码', '名称']
        )
        matching_tables1 = df2c(matching_tables1)
        matching_tables2 = read_matching_rows_from_mysql(
            index_db, search_string, db_name, ['代码', '名称']
        )
        matching_tables2 = df2c(matching_tables2)
        combined_results = {
            'stock': matching_tables1,
            'index': matching_tables2
        }
        return jsonify(combined_results)
    except Exception as e:
        app.logger.error(f"搜索表时出错: {e}")
        return jsonify({'error': '无法搜索表。'}), 500

@app.route('/api/delete_select', methods=['POST'])
def delete_select():
    try:
        data = request.get_json()
        key = data.get('key')
        codes = data.get('codes')
        table_name = data.get('table_name')
        user_db_name = data.get('user_db_name')

        if not all([key, codes, table_name, user_db_name]):
            return jsonify({'error': '请提供 key, codes, table_name 和 user_db_name.'}), 400

        delete_rows_from_table_mysql(table_name, user_db_name, key, codes)
        return jsonify({'message': '选定的数据已成功删除。'})
    except Exception as e:
        app.logger.error(f"删除选定数据时出错: {e}")
        return jsonify({'error': '无法删除选定的数据。'}), 500


@app.route('/api/add_factor', methods=['POST'])
def add_factor():
    try:
        data = request.json
        factor_name = data.get('factor_name')
        algorithm = data.get('algorithm')
        import_factors = str2list(data.get('importFactors'))
        factor = data.get('factor')
        parameters = str2list(data.get('parameters'))

        if not all([factor_name, algorithm, import_factors, factor, parameters]):
            return jsonify({'error': '请提供所有必要的因子参数。'}), 400

        table_name = get_system_config('factor_table')
        db_name = get_system_config('user_db')

        if not all([table_name, db_name]):
            return jsonify({'error': '系统配置缺失。'}), 500

        add_data_mysql(data, table_name, db_name, 'factor_name')
        create_file(factor_name, algorithm, import_factors, factor, parameters)

        return jsonify({'message': '因子已成功添加到数据库。'}), 200
    except Exception as e:
        app.logger.error(f"添加因子时出错: {e}")
        return jsonify({'error': '无法添加因子到数据库。'}), 500


@app.route('/api/get_factor', methods=['POST'])
def get_factor():
    try:
        table_name = get_system_config('factor_table')
        db_name = get_system_config('user_db')

        if not all([table_name, db_name]):
            return jsonify({'error': '系统配置缺失。'}), 500

        df = read_table_df_mysql(table_name, db_name)
        info = get_info()

        df = df2c(df)

        return jsonify(df)
    except Exception as e:
        app.logger.error(f"获取因子时出错: {e}")
        return jsonify({'error': '无法获取因子数据。'}), 500


@app.route('/api/updatefactor', methods=['POST'])
def update_factor():
    try:
        data = request.json
        factor_name = data.get('factor_name')
        algorithm = data.get('algorithm')
        import_factors = str2list(data.get('importFactors'))
        factor = data.get('factor')
        parameters = str2list(data.get('parameters'))
        print(parameters)

        if not all([factor_name, algorithm, import_factors, factor, parameters]):
            return jsonify({'error': '请提供所有必要的因子参数。'}), 400

        table_name = get_system_config('factor_table')
        db_name = get_system_config('user_db')

        if not all([table_name, db_name]):
            return jsonify({'error': '系统配置缺失。'}), 500

        add_json_mysql(data, table_name, db_name, 'factor_name')
        create_file(factor_name, algorithm, import_factors, factor, parameters)

        return jsonify({'message': '因子已成功更新。'}), 200
    except Exception as e:
        app.logger.error(f"更新因子时出错: {e}")
        return jsonify({'error': '无法更新因子。'}), 500

@app.route('/api/addstrategy', methods=['POST'])
def addstrategy():
    try:
        data = request.json
        name = data.get('strategy_name')
        baseData = data.get('baseData')
        buy = str2list(data.get('buy'))
        sell = data.get('sell')

        if not all([name, baseData, buy, sell]):
            return jsonify({'error': '请提供所有必要的因子参数。'}), 400

        table = get_system_config('strategy_table')
        db = get_system_config('user_db')

        if not all([table, db]):
            return jsonify({'error': '系统配置缺失。'}), 500

        add_json_mysql(data, table, db, 'strategy_name')

        return jsonify({'message': '因子已成功更新。'}), 200
    except Exception as e:
        app.logger.error(f"更新因子时出错: {e}")
        return jsonify({'error': '无法更新因子。'}), 500

@app.route('/api/deletestrategy', methods=['POST'])
def deletestrategy():
    try:
        data = request.json
        name = data.get('strategy_name')

        if not name:
            return jsonify({'error': '请提供要删除的策略名称。'}), 400

        table = get_system_config('strategy_table')
        db = get_system_config('user_db')

        if not all([table, db]):
            return jsonify({'error': '系统配置缺失。'}), 500

        # 假设有一个 delete_json_mysql 函数用于从数据库中删除记录
        delete_json_mysql(name, table, db, 'strategy_name')

        return jsonify({'message': '策略已成功删除。'}), 200
    except Exception as e:
        app.logger.error(f"删除策略时出错: {e}")
        return jsonify({'error': '无法删除策略。'}), 500

@app.route('/api/getstrategy', methods=['POST'])
def getstrategy():
    table_name = get_system_config('strategy_table')
    db_name = get_system_config('user_db')
    df = read_table_df_mysql(table_name, db_name)
    result_json = df.to_json(orient='records', force_ascii=False)
    return jsonify(result_json)


@app.route('/api/addbacktest', methods=['POST'])
def addbacktest():
    try:
        data = request.json
        stockdb = get_system_config('china_db_name')
        backtestdb = get_system_config('backtest_db')
        db = get_system_config('user_db')
        strategyname = data.get('strategyname')
        backtestname = data.get('backtestname')
        date = data.get('date')
        startdate = data.get('startdate')
        enddate = data.get('enddate')
        stocklist = data.get('stocklist')
        stocklist = json2stringlist(stocklist)
        filter_first_n = data.get('filter_first_n')
        filter_last_n = data.get('filter_last_n')
        print(stocklist)

        if not all([strategyname, backtestname, date, startdate, enddate, stocklist]):
            return jsonify({'error': '请提供所有必要的回测参数。'}), 400

        strategy_table = get_system_config('strategy_table')
        df = read_specific_rows_from_mysql(db, strategy_table, 'strategy_name', strategyname)
        if df.empty:
            return jsonify({'error': '未找到策略信息。'}), 404

        buy = df.at[0, 'buy']
        sell = df.at[0, 'sell']
        print(sell)
        if __name__ == "__main__":
            backtest_all(stocklist, stockdb, backtestdb, buy, sell, startdate, enddate, backtestname,
                   filter_first_n=0, filter_last_n=0)

        backtest_table = get_system_config('backtest_table')
        db = get_system_config('user_db')

        if not all([backtest_table, db]):
            return jsonify({'error': '系统配置缺失。'}), 500

        add_json_mysql(data, backtest_table, db, 'backtestname')
        return jsonify({'message': '回测已开始。'}), 200

    except Exception as e:
        app.logger.error(f"回测时出错: {e}")
        return jsonify({'error': '无法回测。'}), 500

@app.route('/api/deletebacktest', methods=['POST'])
def deletebacktest():
    data = request.json
    backtestname = data.get('backtestname')

    # 去掉开头和结尾的引号
    backtestname = backtestname.strip("'")

    # 将字符串拆分成单独的回测名称
    backtestnames = [name.strip() for name in backtestname.split(',')]

    table_name = get_system_config('backtest_table')
    db_name = get_system_config('user_db')

    # 删除每个回测名称对应的行
    for name in backtestnames:
        delete_rows_from_table_mysql(table_name, db_name, 'backtestname', [name])

    return jsonify({'message': 'Backtest(s) deleted successfully'}), 200

@app.route('/api/getbacktest', methods=['POST'])
def getbacktest():
    table_name = get_system_config('backtest_table')
    db_name = get_system_config('user_db')
    df = read_table_df_mysql(table_name, db_name)
    result_json = df.to_json(orient='records', force_ascii=False)
    return jsonify(result_json)

@app.route('/api/getbacktestall', methods=['POST'])
def getbacktestall():
    data = request.json
    db_name = get_system_config('backtest_db')
    backtestname = data.get('backtestname')
    table_name1 = f"{backtestname}_收益排行"
    table_name2 = f"{backtestname}_个股自身收益总榜"
    table_name3 = f"{backtestname}_跑赢自身收益排行"
    table_name4 = f"{backtestname}_连续盈利1次占比"
    df1 = read_table_df_mysql(table_name1, db_name)
    df2 = read_table_df_mysql(table_name2, db_name)
    df3 = read_table_df_mysql(table_name3, db_name)
    df4 = read_table_df_mysql(table_name4, db_name)
    收益排行_dict = df1.to_dict(orient='records')
    个股自身收益总榜_dict = df2.to_dict(orient='records')
    跑赢自身收益排行_dict = df3.to_dict(orient='records')
    连续盈利1次占比_dict = df4.to_dict(orient='records')


    # 创建结果字典
    result_dict = {
        '收益排行': 收益排行_dict,
        '个股自身收益排行': 个股自身收益总榜_dict,
        '跑赢自身收益排行': 跑赢自身收益排行_dict,
        '连续盈利1次占比': 连续盈利1次占比_dict
    }

    result_json = json.dumps(result_dict, ensure_ascii=False, indent=2)
    print(result_json)
    return jsonify(result_json)

@app.route('/api/getbacktestbuysell', methods=['POST'])
def getbacktestbuysell():
    data = request.json
    db_name = get_system_config('backtest_db')
    backtestname = data.get('backtestname')
    stock=data.get('stockcode')
    table_name = f"{backtestname}_{stock}"
    df = read_table_df_mysql(table_name, db_name)
    result_json = df.to_json(orient='records', force_ascii=False)
    print(result_json)
    return jsonify(result_json)

@app.route('/api/move_factor', methods=['POST'])
def move_factor_route():
    try:
        data = request.get_json()
        move_factor(data)
        return jsonify({"status": "success"})
    except Exception as e:
        app.logger.error(f"移动因子时出错: {e}")
        return jsonify({'error': '无法移动因子。'}), 500


def move_factor(data):
    try:
        moved_factor = data['movedFactor']['factor_name']
        replaced_factor = data['replacedFactor']['factor_name']

        db_name = get_system_config('user_db')
        table_name = get_system_config('factor_table')

        if not all([moved_factor, replaced_factor, db_name, table_name]):
            app.logger.error("移动因子时，参数不完整。")
            return

        columns_to_swap = ['factor_name', 'factor', 'baseData', 'importFactors', 'algorithm', 'parameters']
        factors = [moved_factor, replaced_factor]

        swap_rows(db_name, table_name, 'factor_name', columns_to_swap, factors)
    except KeyError as e:
        app.logger.error(f"移动因子时，缺少关键字段: {e}")
    except Exception as e:
        app.logger.error(f"移动因子时出错: {e}")


@app.route('/api/getsys', methods=['POST'])
def getsys():
    # 读取数据
    df = read_table_df_mysql('system', 'system')

    # 将 DataFrame 转换为 JSON 格式
    result = df.to_dict(orient='records')

    # 返回 JSON 响应
    return jsonify(result)




@app.route('/api/update-configs', methods=['POST'])
def add_config():
    # 获取 JSON 数据
    json_data = request.get_json()
    print(json_data)

    if not isinstance(json_data, list):
        return jsonify({"error": "Invalid input format. Expected a list of JSON objects."}), 400

    try:
        for item in json_data:
            add_json_mysql(item, 'system', 'system', 'config_name')  # 假设 config_name 是主键
        return jsonify({"message": "Configs added/updated successfully."}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


from concurrent.futures import ThreadPoolExecutor, as_completed


@socketio.on('updata_stock')
def updata_stock():
    try:
        # 获取系统配置
        db_name = get_system_config('china_db_name')
        stock_list = get_system_config('stock_list')
        stock_list = str2list(stock_list)  # 将配置的股票列表转化为 Python 列表
        print(stock_list)

        if not all([db_name, stock_list]):
            emit('error', {'error': '系统配置缺失。'})
            return

        # 使用线程池更新股票数据
        with ThreadPoolExecutor(max_workers=8) as executor:  # max_workers 取决于您的需求
            # 为每个股票提交一个任务
            future_to_stock = {executor.submit(update_stock_data, stock, db_name, socketio): stock for stock in
                               stock_list}

            for future in as_completed(future_to_stock):
                stock = future_to_stock[future]
                try:
                    future.result()  # 获取任务的返回值，若有异常则抛出
                except Exception as e:
                    app.logger.error(f"更新股票 {stock} 时出错: {e}")
                    emit('error', {'error': f'无法更新股票 {stock} 的数据。'})

    except Exception as e:
        app.logger.error(f"处理 updata_stock 时出错: {e}\n{traceback.format_exc()}")
        emit('error', {'error': '无法更新股票数据。'})


@socketio.on('replace_stock')
def replace_stock():
    try:
        db_name = get_system_config('china_db_name')
        stock_list = get_system_config('stock_list')
        stock_list = str2list(stock_list)
        start_date = '19900101'
        end_date = '20250515'

        if not all([db_name, stock_list]):
            emit('error', {'error': '系统配置缺失。'})
            return

        # 直接调用，不使用Pool
        get_stock_data(stock_list, db_name, start_date, end_date, socketio)
    except Exception as e:
        app.logger.error(f"处理 replace_stock 时出错: {e}")
        emit('error', {'error': '无法替换股票数据。'})

from concurrent.futures import ProcessPoolExecutor
import importlib
import inspect
import traceback

def process_parameters(parameters_str, df, columns, a, factor_function):
    args = []
    kwargs = {}

    sig = inspect.signature(factor_function)
    param_dict = sig.parameters

    params_list = [p.strip() for p in parameters_str.split(',') if p.strip()]

    for param in params_list:
        if '=' in param:
            key, value = [s.strip() for s in param.split('=', 1)]
            if value.isdigit():
                kwargs[key] = int(value)
            else:
                kwargs[key] = value.strip('"\'')
        else:
            if param == 'df':
                args.append(df)
            elif param == 'column':
                column_name = a.get('column')
                if not column_name:
                    data_columns = [col for col in columns if col != '日期']
                    if len(data_columns) == 1:
                        column_name = data_columns[0]
                    else:
                        return {'error': '无法确定列名，请在参数中指定 column。'}, None
                args.append(column_name)
            else:
                value = a.get(param)
                if value is not None:
                    args.append(value)
                elif param in param_dict:
                    default_value = param_dict[param].default
                    if default_value is not inspect.Parameter.empty:
                        args.append(default_value)
                    else:
                        return {'error': f'缺少必要参数 {param}。'}, None

    return args, kwargs

@socketio.on('api/factor/compute_factor')
def compute_factor_event(data):
    try:
        result = compute_factor(data)
        if 'error' in result:
            emit('error', result)
        else:
            emit('response/compute_factor', result)
    except Exception as e:
        emit('error', {'error': '因子计算失败。'})
def compute_factor_for_stock(a, stock_code, db_name, columns, factor_function, parameters_str, total_stocks):
    try:
        # 从数据库读取股票数据
        df = read_table_range_df_mysql(stock_code, db_name, '日期', '19900101', '20291101', columns)
        # 处理函数参数
        args, kwargs = process_parameters(parameters_str, df, columns, a, factor_function)
        if isinstance(args, dict) and 'error' in args:
            return args

        # 执行因子函数计算
        df1 = factor_function(*args, **kwargs)
        # 插入数据到 MySQL 数据库
        upsert_dataframe_to_mysql('factor', stock_code, df1, '日期')

        return {'stock_code': stock_code, 'status': 'success'}
    except Exception as e:
        return {'stock_code': stock_code, 'status': 'failed', 'error': str(e)}


def compute_factor(a):
    try:
        db_name = get_system_config('china_db_name')
        factor_db = get_system_config('factor_db')
        stock_list_str = get_system_config('stock_list')
        stock_list = [stock.strip() for stock in stock_list_str.split(',')]
        factor_name = a.get('factor_name')
        factor_function_name = a.get('factor')
        parameters_str = a.get('parameters')
        base_data_str = a.get('baseData', '')
        base_data_columns = [col.strip() for col in base_data_str.split(',') if col.strip()]
        columns = ['日期'] + base_data_columns

        # 检查必要参数是否齐全
        if not all([db_name, factor_db, stock_list, factor_name, factor_function_name, parameters_str]):
            return {'error': '因子参数不完整。'}

        # 动态加载因子模块和函数
        factor_module = importlib.import_module(f"factor.{factor_name}")
        factor_function = getattr(factor_module, factor_function_name)
        if not callable(factor_function):
            return {'error': f"{factor_function_name} 不是一个可调用的函数。"}

        stock_count = len(stock_list)

        # 使用多进程处理每个股票的计算
        with ProcessPoolExecutor(max_workers=8) as executor:
            futures = {
                executor.submit(
                    compute_factor_for_stock,
                    a,
                    stock_code,
                    db_name,
                    columns,
                    factor_function,
                    parameters_str,
                    stock_count
                ): stock_code for stock_code in stock_list
            }

            for index, future in enumerate(concurrent.futures.as_completed(futures)):
                result = future.result()
                print(f"Stock {result['stock_code']} 计算完成。")
                progress_percentage = (index + 1) / stock_count * 100
                formatted_percentage = f"{progress_percentage:.1f}"
                emit('compute/progress', formatted_percentage)

        return {'message': '因子计算成功。'}
    except ImportError:
        return {'error': '导入因子模块失败。'}
    except AttributeError:
        return {'error': '因子函数不存在。'}
    except Exception as e:
        return {'error': f'因子计算过程中发生错误: {traceback.format_exc()}'}



@socketio.on('api/factor/baseData')
def handle_baseData():
    try:
        db_name = get_system_config('user_db')
        table_name = get_system_config('baseData_db')

        if not all([db_name, table_name]):
            emit('error', {'error': '系统配置缺失。'})
            return

        df = read_specific_columns_from_mysql(db_name, table_name, ['baseData'])
        data = df.to_json(orient='records')
        emit('response/baseData', data)
    except Exception as e:
        app.logger.error(f"处理 baseData 时出错: {e}")
        emit('error', {'error': '无法获取 baseData 数据。'})


@socketio.on('api/factor/importFactors')
def handle_importFactors():
    try:
        db_name = get_system_config('user_db')
        table_name = get_system_config('factor_table')
        if not all([db_name, table_name]):
            emit('error', {'error': '系统配置缺失。'})
            return
        df = read_specific_columns_from_mysql(db_name, table_name, ['factor_name'])
        data = df.to_json(orient='records')
        emit('response/importFactors', data)
    except Exception as e:
        app.logger.error(f"处理 importFactors 时出错: {e}")
        emit('error', {'error': '无法获取 importFactors 数据。'})


if __name__ == '__main__':
    try:
        socketio.run(app, debug=True)
    except Exception as e:
        app.logger.critical(f"应用启动失败: {e}")
