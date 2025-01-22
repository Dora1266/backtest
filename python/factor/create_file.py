import os

def create_file(file_name, content, imports=None, function_name=None, params=None):
    # 确保文件名以 .py 结尾
    if not file_name.endswith('.py'):
        file_name += '.py'

    # 获取当前脚本的目录
    current_directory = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(current_directory, file_name)

    # 组织导入语句，默认导入 numpy 和 pandas
    default_imports = "import numpy as np\nimport pandas as pd\n"
    import_statements = default_imports
    if imports and any(imports):  # ��保 imports 不为 None 且至少有一个非空项
        import_statements += "\n".join([f"import factor.{module}" for module in imports if module]) + "\n\n"

    # 处理函数定义
    if function_name and params is not None:
        # 确保 params 是一个包含参数名的列表
        params_str = ', '.join(params)  # 形式如 'df, frequency'
        function_definition = f"def {function_name}({params_str}):\n"
        # 缩进处理：内容部��要缩进
        indented_content = "    " + content.replace('\n', '\n    ')
        content = function_definition + indented_content

    # 最终文件内容
    final_content = f"{import_statements}{content}".strip()  # 去除首尾空白

    # 在指定目录创建文件
    with open(file_path, 'w', encoding='utf-8') as file:
        file.write(final_content)

    print(f"文件 '{file_path}' 创建成功！")

    # 自动更新 __init__.py 文件
    update_init_file(current_directory, file_name, function_name)

def update_init_file(directory, module_name, function_name):
    """
    自动更新目录中的 __init__.py 文件，添加或更新对创建的模块的引用。
    """
    init_file_path = os.path.join(directory, "__init__.py")

    # 如果 __init__.py 文件不存在，则创建一个空的
    if not os.path.exists(init_file_path):
        with open(init_file_path, 'w', encoding='utf-8') as init_file:
            pass  # 创建空的 __init__.py 文件

    # 读取现有的 __init__.py
    with open(init_file_path, 'r', encoding='utf-8') as init_file:
        init_content = init_file.readlines()

    # 预期需要添加的导入语句
    module_name_without_ext = os.path.splitext(module_name)[0]
    new_import_statement = f"from .{module_name_without_ext} import {function_name}\n"

    # 检查导入语句是否已经存在，防止���复导入
    module_exists = False
    for i, line in enumerate(init_content):
        if line.startswith(f"from .{module_name_without_ext} import"):
            # 找到同一模块，替换函数名
            init_content[i] = f"from .{module_name_without_ext} import {function_name}\n"
            module_exists = True
            break

    # 如果模块不存在，添加新的导入语句
    if not module_exists:
        init_content.append(new_import_statement)

    # 写回更新后的 __init__.py 内容
    with open(init_file_path, 'w', encoding='utf-8') as init_file:
        init_file.writelines(init_content)

    print(f"文件 '{init_file_path}' 更新成功，添加或更新了对模块 '{module_name}' 中的 '{function_name}' 的引用！")