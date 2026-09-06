import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary server-side
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const isCloudinaryConfigured = Boolean(cloudName && apiKey && apiSecret);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se envió ningún archivo' }, { status: 400 });
    }

    const isVideo = file.type.startsWith('video');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // If Cloudinary credentials are configured, attempt upload to Cloudinary
    if (isCloudinaryConfigured) {
      try {
        const uploadPromise = new Promise<{ secure_url: string }>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: 'nossa_historia',
              resource_type: isVideo ? 'video' : 'image',
              transformation: isVideo ? undefined : [{ quality: 'auto', fetch_format: 'auto' }],
            },
            (error, result) => {
              if (error || !result) {
                reject(error || new Error('Error al subir a Cloudinary'));
              } else {
                resolve(result);
              }
            }
          );
          stream.end(buffer);
        });

        const uploaded = await uploadPromise;
        return NextResponse.json({
          url: uploaded.secure_url,
          type: isVideo ? 'video' : 'image',
          provider: 'cloudinary',
        });
      } catch (cloudErr: any) {
        console.error('Cloudinary upload error:', cloudErr);
        // If Cloudinary credentials mismatch, return informative error
        return NextResponse.json(
          {
            error: cloudErr?.message || 'Error de autenticación con Cloudinary. Revisa tu API Key y API Secret.',
            details: cloudErr,
          },
          { status: 400 }
        );
      }
    }

    // Fallback: If Cloudinary keys are not set in .env yet, return base64 data url
    console.warn('Cloudinary keys not set in .env.local; using local buffer fallback.');
    const mimeType = file.type || (isVideo ? 'video/mp4' : 'image/jpeg');
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return NextResponse.json({
      url: dataUrl,
      type: isVideo ? 'video' : 'image',
      provider: 'local-fallback',
      warning: 'Configura CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en .env.local para producción.',
    });
  } catch (error: any) {
    console.error('Upload route error:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al procesar el archivo' },
      { status: 500 }
    );
  }
}
