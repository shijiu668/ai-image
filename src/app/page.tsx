'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ErrorResponse {
  error?: string;
  details?: unknown;
  timestamp?: string;
}

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateImage = async () => {
    const MAX_RETRIES = 2;
    const handleGenerate = async (retryCount = 0) => {
      if (!prompt) {
        setError('请输入图片描述');
        return;
      }

      let response;
      try {
        setLoading(true);
        setError('');
        
        const currentRequestId = Math.random().toString(36).substring(7);
        
        response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt, requestId: currentRequestId }),
        });

        // 如果返回202状态码，说明请求正在处理中，需要轮询检查状态
        if (response.status === 202) {
          const pollInterval = setInterval(async () => {
            try {
              const pollResponse = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ requestId: currentRequestId }),
              });

              if (pollResponse.status === 202) {
                // 请求仍在处理中，继续等待
                return;
              }

              clearInterval(pollInterval);
              
              const pollData = await pollResponse.json();
              if (!pollResponse.ok) {
                throw new Error(pollData.error || '图片生成失败');
              }
              
              setImageUrl(pollData.data[0].url);
              setLoading(false);
            } catch (pollError) {
              clearInterval(pollInterval);
              throw pollError;
            }
          }, 2000); // 每2秒检查一次状态
          
          // 设置最大轮询时间为3分钟
          setTimeout(() => {
            clearInterval(pollInterval);
            if (loading) {
              setError('请求超时，请重试');
              setLoading(false);
            }
          }, 180000);
          
          return;
        }
    
        const data = await response.json();
    
        if (!response.ok) {
          throw new Error(data.error || '图片生成失败');
        }
    
        setImageUrl(data.data[0].url);
      } catch (err) {
        let errorMessage = '图片生成失败，请稍后重试';
        
        // 如果是超时错误且未超过最大重试次数，则进行重试
        if (err instanceof Error && err.message.includes('超时') && retryCount < MAX_RETRIES) {
          console.log(`请求超时，正在进行第${retryCount + 1}次重试...`);
          return handleGenerate(retryCount + 1);
        }
        
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === 'object' && err !== null && response) {
          try {
            const data = await response.json();
            const errorData = data as ErrorResponse;
            if (errorData.error) {
              errorMessage = errorData.error;
              if (errorData.details) {
                errorMessage += `\n详细信息：${JSON.stringify(errorData.details, null, 2)}`;
              }
            }
          } catch {
            // 如果解析响应失败，使用默认错误信息
          }
        }
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    
    handleGenerate();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">AI 图片生成</h1>
          <p className="text-lg text-gray-600 mb-8">输入描述，让AI为您创造独特的图片</p>
        </div>

        <div className="mt-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="描述您想要生成的图片..."
              className="flex-1 min-w-0 block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            <button
              onClick={generateImage}
              disabled={loading}
              className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? '生成中...' : '生成图片'}
            </button>
          </div>

          {error && (
            <div className="mt-4 text-red-600 text-center">{error}</div>
          )}

          {imageUrl && (
            <div className="mt-8">
              <div className="relative aspect-square w-full max-w-2xl mx-auto overflow-hidden rounded-lg shadow-lg">
                <Image
                  src={imageUrl}
                  alt="生成的图片"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="mt-4 text-center">
                <a
                  href={imageUrl}
                  download="generated-image.png"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  下载图片
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
