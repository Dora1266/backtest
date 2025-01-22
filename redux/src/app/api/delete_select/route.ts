import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const data = await req.json();  // 从请求体中获取 JSON 数据
  const codes = data.codes;  // 获取搜索字符串
  const tablename = data.table_name;  // 获取搜索字符串
  const userdbname = data.user_db_name;
  console.log(userdbname)
  if (!codes) {
    return NextResponse.json({ error: "codes是必需的" }, { status: 400 });
  }

  try {
    const response = await fetch(
        `http://127.0.0.1:5000/api/delete_select`, {
          method: 'POST',  // 向后端服务发送 POST 请求
          headers: {
            'Content-Type': 'application/json',  // 设置内容类型
          },
          body: JSON.stringify({
            key:'code',
            codes:codes,
            user_db_name:userdbname,
            table_name:tablename,
          }),
        }
      );
      

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: errorData.error || "搜索失败" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "搜索时发生错误" }, { status: 500 });
  }
}
