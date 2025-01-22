def json2stringlist(input_string):
    # 使用逗号分隔字符串并去除多余的空格
    return [item.strip() for item in input_string.split(',')]