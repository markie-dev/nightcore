/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';
import { Readable } from 'stream';

const cookies = process.env.YOUTUBE_COOKIES 
  ? JSON.parse(process.env.YOUTUBE_COOKIES)
  : [];

const requestOptions = {
  agent: ytdl.createAgent(cookies),
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Cookie': cookies.map((cookie: any) => `${cookie.name}=${cookie.value}`).join('; '),
    'Referer': 'https://www.youtube.com/',
    'Origin': 'https://www.youtube.com'
  }
};

console.log('Number of cookies loaded:', cookies.length);
console.log('Cookie names loaded:', cookies.map((c: { name: string }) => c.name));

// Helper function to convert Node.js readable stream to Web Stream
function nodeStreamToWebStream(nodeStream: Readable) {
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk) => {
        controller.enqueue(chunk);
      });
      nodeStream.on('end', () => {
        controller.close();
      });
      nodeStream.on('error', (err) => {
        console.error('Stream error in nodeStreamToWebStream:', err);
        controller.error(err);
      });
    },
    cancel() {
      console.log('Stream cancelled, destroying nodeStream');
      nodeStream.destroy();
    }
  });
}

export async function GET(req: Request, context: any) {
  const { videoId } = await context.params;
  console.log('Streaming videoId:', videoId);

  try {
    console.log('Getting video info...');
    const info = await ytdl.getInfo(videoId, {
      ...requestOptions,
      playerClients: ['ANDROID'],
      lang: 'en'
    }).catch(error => {
      console.error('Error in getInfo:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        cause: error.cause,
      });
      throw error;
    });

    console.log('Video info received:', {
      title: info.videoDetails.title,
      length: info.videoDetails.lengthSeconds,
      formats: info.formats.length
    });

    console.log('Choosing format...');
    const format = ytdl.chooseFormat(info.formats, {
      quality: 'highestaudio',
      filter: 'audioonly',
    });

    console.log('Format selected:', {
      itag: format.itag,
      mimeType: format.mimeType,
      contentLength: format.contentLength
    });

    console.log('Creating stream...');
    const stream = ytdl.downloadFromInfo(info, {
      ...requestOptions,
      format,
      dlChunkSize: 1024 * 1024 * 10,
      highWaterMark: 1024 * 1024 * 5,
      playerClients: ['ANDROID']
    });

    // Add error handler to the stream
    stream.on('error', (error) => {
      console.error('Stream error event:', error);
      console.error('Stream error details:', {
        message: error.message,
        stack: error.stack,
        cause: error.cause
      });
    });

    let downloadedBytes = 0;
    const totalBytes = parseInt(format.contentLength);
    
    stream.on('data', (chunk) => {
      downloadedBytes += chunk.length;
      const progress = (downloadedBytes / totalBytes * 100).toFixed(2);
      console.log(`Download progress: ${progress}% (${downloadedBytes}/${totalBytes} bytes)`);
    });

    const webStream = nodeStreamToWebStream(stream);

    const headers = new Headers({
      'Content-Type': 'audio/webm',
      'Accept-Ranges': 'bytes',
      'Content-Length': format.contentLength,
    });

    console.log('Returning response...');
    return new NextResponse(webStream, {
      headers,
      status: 200,
    });

  } catch (error) {
    console.error('=== Detailed Stream Error ===');
    console.error('Error object:', error);
    console.error('Error name:', (error as any)?.name);
    console.error('Error message:', (error as any)?.message);
    console.error('Error stack:', (error as any)?.stack);
    console.error('Error cause:', (error as any)?.cause);
    if (error instanceof Error) {
      console.error('Is Error instance: true');
      console.error('Error properties:', Object.getOwnPropertyNames(error));
    }
    console.error('Full error stringify:', JSON.stringify(error, null, 2));
    console.error('=== End Error Details ===');

    return NextResponse.json(
      { 
        error: 'Failed to stream audio', 
        details: error instanceof Error ? error.message : 'Unknown error',
        cookiesLoaded: cookies.length,
        videoId,
        errorType: error?.constructor?.name,
        errorStack: (error as any)?.stack,
        errorCause: (error as any)?.cause
      },
      { status: 500 }
    );
  }
}