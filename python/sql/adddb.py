import pymysql
import os

# 连接数据库的配置信息
config = {
    'host': 'localhost',
    'user': 'root',
    'password': '123456',
    'charset': 'utf8mb4',
    'autocommit': True
}


# 尝试创建数据库并设置字符集和排序规则
def create_database(cursor, db_name):
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;")
    print(f"Database {db_name} created or already exists.")


# 执行SQL文件中的命令，并使用文件名作为数据库名
def execute_sql_file(cursor, sql_file_path):
    with open(sql_file_path, 'r', encoding='utf-8') as f:
        sql_commands = f.read()

    # 从文件路径中提取出文件名（不包括扩展名）作为数据库名
    file_name = os.path.basename(sql_file_path)
    database_name = os.path.splitext(file_name)[0]

    # 切换到对应的数据库
    try:
        cursor.execute(f"USE `{database_name}`;")
        print(f"Using database: {database_name}")
    except pymysql.MySQLError as e:
        print(f"Error selecting database {database_name}: {e}")
        return

    # 执行SQL命令
    commands = sql_commands.split(';')
    for command in commands:
        command = command.strip()
        if command:
            try:
                cursor.execute(command)
            except pymysql.MySQLError as e:
                print(f"Error executing command: {command}\nError: {e}")


try:
    # 创建数据库连接
    connection = pymysql.connect(**config)
    cursor = connection.cursor()

    # 尝试创建数据库
    for file_name in os.listdir(os.getcwd()):
        if file_name.endswith('.sql'):
            database_name = os.path.splitext(file_name)[0]
            create_database(cursor, database_name)

    # 遍历当前目录下所有以 .sql 结尾的文件
    for file_name in os.listdir(os.getcwd()):
        if file_name.endswith('.sql'):
            sql_file_path = os.path.join(os.getcwd(), file_name)
            print(f"Executing SQL commands from {file_name}...")
            execute_sql_file(cursor, sql_file_path)
            print(f"Finished executing {file_name}.")

except pymysql.MySQLError as e:
    print("Error occurred while interacting with MySQL:", e)
finally:
    cursor.close()
    connection.close()
