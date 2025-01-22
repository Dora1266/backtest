import pandas as pd
from sqlalchemy import inspect, text
from db.connection import create_db_connection
import re
import json
def add_df_mysql(df, db_name, table_name):
    """ 将 DataFrame 追加到 MySQL 数据库 """
    engine = create_db_connection(db_name)
    inspector = inspect(engine)

    # 检查表是否存在
    if table_name not in inspector.get_table_names():
        # 如果表不存在，创建表
        df.head(0).to_sql(table_name, con=engine, if_exists='fail', index=False)
        print(f"表 '{table_name}' 不存在，已创建表。")

    # 将 df 追加到 MySQL 数据库
    df.to_sql(name=table_name, con=engine, if_exists='append', index=False)
    print(f"数据已成功追加到表 '{table_name}'。")

def replace_df_mysql(df, db_name, table_name):
    """ 将 DataFrame 写入 MySQL 数据库 """
    engine = create_db_connection(db_name)
    inspector = inspect(engine)
    if table_name not in inspector.get_table_names():
        # 如果表不存在，创建表
        df.head(0).to_sql(table_name, con=engine, if_exists='fail', index=False)
        print(f"表 '{table_name}' 不存在，已创建表。")
    # 将 df 写入 MySQL 数据库，如果表存在则替换
    df.to_sql(name=table_name, con=engine, if_exists='replace', index=False)

def add_or_replace_df_mysql(df, db_name, table_name):
    """ 将 DataFrame 追加到 MySQL 数据库，如果主键重复则覆盖 """
    engine = create_db_connection(db_name)
    inspector = inspect(engine)

    # 检查表是否存在
    if table_name not in inspector.get_table_names():
        # 如果表不存在，创建表
        df.head(0).to_sql(table_name, con=engine, if_exists='fail', index=False)
        print(f"表 '{table_name}' 不存在，已创建表。")

    # 将 DataFrame 写入 MySQL 数据库
    with engine.connect() as connection:
        for index, row in df.iterrows():
            # 生成插入语句，使用 REPLACE 语句处理重复主键
            sql = f"""
            REPLACE INTO {table_name} ({', '.join(df.columns)})
            VALUES ({', '.join(['%s'] * len(row))})
            """
            connection.execute(sql, tuple(row))

    print(f"数据已成功追加到表 '{table_name}'，并且覆盖了重复主键的数据。")

def check_duplicate_primary_key(engine, table_name, df, primary_key, db_name):
    """ 检查 DataFrame 中的主键是否在数据库中已存在 """
    existing_keys = read_specific_columns_from_mysql(table_name, [primary_key], db_name)[primary_key].tolist()
    # 将重复行过滤掉
    duplicates = df[df[primary_key].isin(existing_keys)]
    return duplicates[primary_key].tolist()

def add_columns_if_needed(engine, table_name, df):
    """ 根据 DataFrame 的列更新表结构，自动添加缺失的列 """
    inspector = inspect(engine)
    existing_columns = inspector.get_columns(table_name)
    existing_column_names = [col['name'] for col in existing_columns]

    for column in df.columns:
        if column not in existing_column_names:
            # 如果列不存在，则添加新列
            add_column_sql = f'ALTER TABLE {table_name} ADD COLUMN {column} FLOAT'  # 根据需要设置数据类型
            with engine.connect() as connection:
                connection.execute(text(add_column_sql))

def add_data_mysql(data, table_name, db_name, primary_key):
    # 将数据转换为 DataFrame
    df = pd.DataFrame([data])
    print(df)
    # 创建数据库连接
    engine = create_db_connection(db_name)
    inspector = inspect(engine)
    # 检查表是否存在，如果不存在则创建表
    if table_name not in inspector.get_table_names():
        df.head(0).to_sql(table_name, con=engine, if_exists='fail', index=False)
        print(f"表 '{table_name}' 不存在，已创建表。")
    add_columns_if_needed(engine, table_name, df)
    # 检查重复主键
    existing_keys = pd.read_sql(f"SELECT {primary_key} FROM {table_name}", con=engine)
    duplicates = df[df[primary_key].isin(existing_keys[primary_key])]

    # 保存不重复的记录
    if not duplicates.empty:
        print(f"以下主键在数据库中已存在，将处理这些记录: {duplicates[primary_key].tolist()}")
        # 进行更新操作
        for index, row in duplicates.iterrows():
            # 检查并更新数据
            set_clause = ', '.join([f'{col} = {repr(row[col])}' for col in df.columns if col != primary_key])
            update_sql = f"""
            UPDATE {table_name} 
            SET {set_clause} 
            WHERE {primary_key} = {repr(row[primary_key])}
            """
            with engine.begin() as connection:
                connection.execute(text(update_sql))
        # 从原始DataFrame中删除已经存在的记录
        df = df[~df[primary_key].isin(duplicates[primary_key])]

    # 将新的（非重复）数据插入到数据库中，如果表存在则追加
    df.to_sql(name=table_name, con=engine, if_exists='append', index=False)

def add_json_mysql(json_data, table_name, db_name, primary_key):
    # 检查 json_data 是否是字符串（如果是 JSON 字符串就解析）
    if isinstance(json_data, str):
        data = json.loads(json_data)  # 如果是字符串，进行 JSON 解析
    elif isinstance(json_data, (list, dict)):
        data = json_data  # 如果是列表或字典，直接使用
    else:
        raise TypeError("输入的 json_data 必须是字符串、字典或列表类型")

    # 如果 input data 是一个字典，将其转化为以该字典为元素的列表
    if isinstance(data, dict):
        data = [data]  # 将单个字典包装成列表

    # 将数据转换为 DataFrame
    df = pd.DataFrame(data)
    print("数据转换为 DataFrame：")
    print(df)

    # 创建数据库连接
    engine = create_db_connection(db_name)
    inspector = inspect(engine)

    # 检查表是否存在，如果不存在则创建表
    if table_name not in inspector.get_table_names():
        df.head(0).to_sql(table_name, con=engine, if_exists='fail', index=False)
        print(f"表 '{table_name}' 不存在，已创建表。")

    # 添加缺失的列
    add_columns_if_needed(engine, table_name, df)

    # 检查重复主键
    existing_keys = pd.read_sql(f"SELECT `{primary_key}` FROM `{table_name}`", con=engine)
    duplicates = df[df[primary_key].isin(existing_keys[primary_key])]

    # 处理重复主键记录
    if not duplicates.empty:
        print(f"以下主键在数据库中已存在，将处理这些记录: {duplicates[primary_key].tolist()}")

        # 进行更新操作
        for index, row in duplicates.iterrows():
            set_clause = ', '.join([f'`{col}` = {repr(row[col])}' for col in df.columns if col != primary_key and pd.notna(row[col])])

            if set_clause:  # 确保有字段需要更新
                update_sql = f"""
                UPDATE `{table_name}` 
                SET {set_clause} 
                WHERE `{primary_key}` = {repr(row[primary_key])}
                """
                with engine.begin() as connection:
                    connection.execute(text(update_sql.strip()))
            else:
                print(f"主键 '{row[primary_key]}' 的记录没有需要更新的字段，跳过更新。")

        # 从原始 DataFrame 中删除已经存在的记录
        df = df[~df[primary_key].isin(duplicates[primary_key])]

    # 将新的（非重复）数据插入到数据库中，如果表存在则追加
    if not df.empty:
        df.to_sql(name=table_name, con=engine, if_exists='append', index=False)
        print(f"已成功插入新数据到 '{table_name}' 表。")
    else:
        print("没有新数据需要插入。")

def replace_json_mysql(json_data, table_name, db_name, primary_key):
    # 检查 json_data 是否是字符串（如果是 JSON 字符串就解析）
    if isinstance(json_data, str):
        data = json.loads(json_data)  # 如果是字符串，进行 JSON 解析
    elif isinstance(json_data, (list, dict)):
        data = json_data  # 如果是列表或字典，直接使用
    else:
        raise TypeError("输入的 json_data 必须是字符串、字典或列表类型")

    # 如果 input data 是一个字典，将其转化为以该字典为元素的列表
    if isinstance(data, dict):
        data = [data]  # 将单个字典包装成列表

    # 将数据转换为 DataFrame
    df = pd.DataFrame(data)
    print("数据转换为 DataFrame：")
    print(df)

    # 创建数据库连接
    engine = create_db_connection(db_name)
    inspector = inspect(engine)

    # 检查表是否存在，如果不存在则创建表
    if table_name not in inspector.get_table_names():
        df.head(0).to_sql(table_name, con=engine, if_exists='fail', index=False)
        print(f"表 '{table_name}' 不存在，已创建表。")

    # 清空表内容
    with engine.begin() as connection:
        connection.execute(text(f"TRUNCATE TABLE `{table_name}`"))
        print(f"表 '{table_name}' 的内容已被清空。")

    # 将新数据插入到数据库中
    df.to_sql(name=table_name, con=engine, if_exists='append', index=False)
    print(f"已成功插入新数据到 '{table_name}' 表。")

def delete_json_mysql(primary_key_value, table_name, db_name, primary_key):
    """
    从指定的 MySQL 表中根据主键值删除记录。

    :param primary_key_value: 要删除的记录的主键值
    :param table_name: 表名
    :param db_name: 数据库名称
    :param primary_key: 主键字段名
    """
    # 创建数据库连接
    engine = create_db_connection(db_name)

    # 使用上下文管理器来确保连接正确关闭
    with engine.begin() as connection:
        # 检查记录是否存在
        existing_record = connection.execute(
            text(f"SELECT * FROM `{table_name}` WHERE `{primary_key}` = :pk"),
            {'pk': primary_key_value}
        ).fetchone()

        if existing_record is None:
            print(f"记录 {primary_key_value} 不存在，无法删除。")
            return {'error': '记录不存在，无法删除。'}

        # 删除记录
        delete_sql = f"DELETE FROM `{table_name}` WHERE `{primary_key}` = :pk"
        connection.execute(text(delete_sql), {'pk': primary_key_value})
        print(f"记录 {primary_key_value} 已成功删除。")


def delete_rows_from_table_mysql(table_name, db_name, primary_key_column, primary_keys):
    """删除指定数据表中主键列对应的多个特定行，使用参数化查询"""
    engine = create_db_connection(db_name)

    # 构建 DELETE FROM 的 SQL 语句，使用参数化查询
    delete_rows_sql = f"DELETE FROM `{table_name}` WHERE `{primary_key_column}` IN :primary_key_values"

    try:
        with engine.begin() as connection:  # 确保自动提交
            result = connection.execute(text(delete_rows_sql), {"primary_key_values": tuple(primary_keys)})
            print(f"成功删除表 '{table_name}' 中主键值为 {primary_keys} 的行")
    except Exception as e:
        print(f"删除行失败: {e}")

def read_table_df_mysql(table_name, db_name):
    """ 从 MySQL 读取特定股票数据 """
    engine = create_db_connection(db_name)
    query = f"SELECT * FROM `{table_name}`"
    df = pd.read_sql(query, con=engine)
    return df

def read_specific_columns_from_mysql( db_name,table_name, columns):
    """ 从 MySQL 读取特定列的数据 """
    engine = create_db_connection(db_name)
    columns_str = ', '.join([f'`{col}`' for col in columns])  # 使用反引号保护列名
    query = f"SELECT {columns_str} FROM `{table_name}`"
    df = pd.read_sql(query, con=engine)
    return df

def read_table_range_df_mysql(table_name, db_name, primary_key, start_value, end_value, columns=None):
    engine = create_db_connection(db_name)

    # 如果没有传入列名，默认为 '*'
    if columns is None:
        columns = ['*']  # 如果没有提供列名，则读取全部列
    else:
        columns = [f"`{col}`" for col in columns]  # 确保列名格式正确

    columns_str = ', '.join(columns)  # 将列名列表转换为字符串
    query = f"""
    SELECT {columns_str} FROM `{table_name}`
    WHERE `{primary_key}` BETWEEN %s AND %s
    """

    # 使用参数化查询，可以有效防止 SQL 注入
    df = pd.read_sql(query, con=engine, params=(start_value, end_value))
    return df


def read_specific_rows_from_mysql(db_name, table_name, condition_column, condition_value, selected_columns=None):
    """
    从 MySQL 读取特定行的数据

    :param db_name: 数据库名称
    :param table_name: 表名称
    :param condition_column: 条件字段名
    :param condition_value: 条件值
    :param selected_columns: 可选，选择返回的列名列表，默认返回所有列
    :return: pandas DataFrame
    """
    engine = create_db_connection(db_name)

    # 处理 SELECT 列
    if selected_columns is None:
        selected_columns = '*'
    else:
        selected_columns = ', '.join(selected_columns)

    # 构建查询语句
    query = f"SELECT {selected_columns} FROM `{table_name}` WHERE `{condition_column}` = '{condition_value}'"

    # 从数据库读取数据
    df = pd.read_sql(query, con=engine)
    return df

def read_matching_rows_from_mysql(table_name, partial_stock_code, db_name, columns):
    """ 从 MySQL 读取部分股票代码匹配的行，并返回指定列的内容 """
    engine = create_db_connection(db_name)

    # 使用位置参数（?）格式化查询
    columns_str = ', '.join([f'`{col}`' for col in columns])  # 构建查询列字符串

    # 检查输入是代码还是名称
    if re.match(r'^\d+$', partial_stock_code):  # 如果输入是数字，认为是代码
        query = f"SELECT {columns_str} FROM `{table_name}` WHERE `代码` LIKE %s"
        params = (f"%{partial_stock_code}%",)
    else:  # 否则，认为是股票名称
        query = f"SELECT {columns_str} FROM `{table_name}` WHERE `名称` LIKE %s"
        params = (f"%{partial_stock_code}%",)

    df = pd.read_sql(query, con=engine, params=params)
    return df

def read_last_row_mysql(table_names, db_name, columns=None, order_by=None):
    engine = create_db_connection(db_name)
    last_rows = []

    # 如果没有指定列，则默认查询所有列
    columns_str = "*" if columns is None else ", ".join([f"`{col}`" for col in columns])

    for table_name in table_names:
        # 构造查询语句，允许用户传入排序列。如果没有传入，则不排序。
        query = f"SELECT {columns_str} FROM `{table_name}`"
        if order_by:
            query += f" ORDER BY `{order_by}` DESC"
        query += " LIMIT 1"

        try:
            last_row = pd.read_sql(query, con=engine)
            if last_row.empty:  # 如果查询结果为空（表有但无数据）
                empty_row = {col: 0 for col in columns} if columns else {}
                last_rows.append(pd.DataFrame([empty_row], columns=columns))
            else:
                last_rows.append(last_row)
        except Exception as e:
            print(f"查询表 {table_name} 时发生错误: {e}")
            # 在发生错误时返回一个0数据行
            empty_row = {col: 0 for col in columns} if columns else {}
            last_rows.append(pd.DataFrame([empty_row], columns=columns))

    # 根据请求的表名数量确保返回的行数一致
    while len(last_rows) < len(table_names):
        empty_row = {col: 0 for col in columns} if columns else {}
        last_rows.append(pd.DataFrame([empty_row], columns=columns))

    # 合并所有最后一行数据，并确保列顺序一致
    result_df = pd.concat(last_rows, ignore_index=True)
    if columns:
        result_df = result_df[columns]  # 重新排列列以确保顺序一致
    return result_df

