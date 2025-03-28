import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

// 设置超时时间为25秒
const TIMEOUT_MS = 25000;

// 定义OpenAI API响应类型
type ImageResponse = {
  data: Array<{
    url: string;
    revised_prompt?: string;
  }>;
  created: number;
};

// 存储请求状态的Map
const requestStatus = new Map<string, {
  status: 'pending' | 'completed' | 'failed';
  result?: ImageResponse;
  error?: string;
  startTime: number;
}>();

// 清理过期的请求状态
setInterval(() => {
  const now = Date.now();
  for (const [id, data] of requestStatus) {
    if (now - data.startTime > 30 * 60 * 1000) { // 30分钟后清理
      requestStatus.delete(id);
    }
  }
}, 5 * 60 * 1000); // 每5分钟检查一次

// 带超时的Promise包装
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('请求超时，请稍后重试')), ms);
  });
  return Promise.race([promise, timeout]);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, requestId } = body;

    // 如果提供了requestId，检查是否有缓存的结果
    if (requestId && requestStatus.has(requestId)) {
      const status = requestStatus.get(requestId)!;
      if (status.status === 'completed') {
        return NextResponse.json(status.result);
      } else if (status.status === 'failed') {
        return NextResponse.json({ error: status.error }, { status: 500 });
      }
      // 如果状态是pending，返回202状态码表示请求正在处理中
      return NextResponse.json({ status: 'pending' }, { status: 202 });
    }

    // 为新请求创建状态记录
    const currentRequestId = requestId || Math.random().toString(36).substring(7);
    requestStatus.set(currentRequestId, {
      status: 'pending',
      startTime: Date.now()
    });

    if (!prompt) {
      return NextResponse.json(
        { error: '请提供图片描述' },
        { status: 400 }
      );
    }

    const client = new OpenAI({
      baseURL: process.env.OPENAI_API_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await withTimeout(client.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
    }), TIMEOUT_MS) as ImageResponse;

    if (!response || !response.data || !Array.isArray(response.data)) {
      requestStatus.set(currentRequestId, {
        status: 'failed',
        error: '无效的API响应格式',
        startTime: Date.now()
      });
      throw new Error('无效的API响应格式');
    }

    const result = {
      data: response.data,
      created: response.created
    };

    // 更新请求状态为完成
    requestStatus.set(currentRequestId, {
      status: 'completed',
      result,
      startTime: Date.now()
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('图片生成错误:', error);
    let errorMessage = '图片生成失败，请稍后重试';
    let errorDetails = null;

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = {
        name: error.name,
        stack: error.stack,
        cause: error.cause
      };
    }

    // 记录详细的错误信息
    console.error('详细错误信息:', {
      message: errorMessage,
      details: errorDetails,
      originalError: error
    });

    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}