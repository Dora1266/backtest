import re

def str2list(input_str):
    if isinstance(input_str, list):
        # 如果输入已经是列表，则直接返回
        return input_str
    elif isinstance(input_str, str):
        # 如果输入是空字符串，返回包含一个空字符串的列表
        if input_str == "":
            return ['']
        # 使用正则表达式找到用单引号包围的部分，以及不包含逗号的文本部分
        matches = re.findall(r"'[^']*'|[^,]+", input_str)
        # 将每个匹配项去掉首尾空格，并保留单引号
        return [s.strip() for s in matches]
    else:
        raise TypeError("The input for str2list must be either a string or a list.")
