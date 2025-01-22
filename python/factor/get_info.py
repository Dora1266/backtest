import ast
import os


def get_last_function_from_ast(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        tree = ast.parse(file.read(), filename=file_path)

    functions = []
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            params = [arg.arg for arg in node.args.args]
            functions.append({
                "factor": os.path.splitext(os.path.basename(file_path))[0],
                "function_name": node.name,
                "params": params
            })

    return functions[-1] if functions else None


def get_info(specific_files=None):
    current_dir = os.path.dirname(os.path.abspath(__file__))
    functions_info = []

    # 指定要忽略的默认文件
    default_ignore_files = ['create_file.py', 'get_info.py', 'stock_analysis.py']

    # 如果传入了 specific_files，则仅处理这些文件
    if specific_files:
        py_files_to_process = [f"{file}.py" for file in specific_files]
    else:
        # 否则处理当前目录下所有 `.py` 文件，除去默认忽略的文件
        py_files_to_process = [filename for filename in os.listdir(current_dir) if
                               filename.endswith('.py') and filename not in default_ignore_files]

    # 处理需要处理的文件
    for filename in py_files_to_process:
        file_path = os.path.join(current_dir, filename)
        if os.path.isfile(file_path):
            last_function = get_last_function_from_ast(file_path)
            if last_function:
                functions_info.append(last_function)

    return functions_info
