import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

// 设置超时时间为25秒
const TIMEOUT_MS = 25000;

// 带超时的Promise包装
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('请求超时，请稍后重试')), ms);
  });
  return Promise.race([promise, timeout]);
}

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

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
    }), TIMEOUT_MS);

    if (!response || !response.data || !Array.isArray(response.data)) {
      throw new Error('无效的API响应格式');
    }

    return NextResponse.json({
      data: response.data,
      created: response.created
    });
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