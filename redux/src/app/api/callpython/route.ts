import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { x, y } = req.body;

    try {
      // 发送请求到 Flask 后端
      const response = await axios.post('http://localhost:5000/api/process', {
        x, 
        y
      });

      // 返回 Flask 后端的响应
      res.status(200).json(response.data);
    } catch (error) {
      console.error('Error during request:', error); // 记录错误
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
