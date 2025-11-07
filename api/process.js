// process.js - исправленная версия
import { v2 as cloudinary } from 'cloudinary';

// Явно устанавливаем конфигурацию
const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dmkd2jz5w',
  api_key: process.env.CLOUDINARY_API_KEY || '931954732557498',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'Cg6RrOWzw-m5av7x5qCkZerlU0c'
};

console.log('🔧 Cloudinary Config:', {
  cloud_name: cloudinaryConfig.cloud_name,
  api_key: cloudinaryConfig.api_key ? '***' + cloudinaryConfig.api_key.slice(-4) : 'MISSING',
  has_secret: !!cloudinaryConfig.api_secret
});

cloudinary.config(cloudinaryConfig);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { image_url, text_to_replace, business_name } = req.body;

      console.log('🚀 Starting Cloudinary processing...');
      console.log('Image URL:', image_url);
      console.log('Business:', business_name);

      // Проверяем конфигурацию
      if (!cloudinaryConfig.api_key) {
        throw new Error('Cloudinary API key is missing');
      }

      // Простая загрузка в Cloudinary
      console.log('📤 Uploading to Cloudinary...');
      const uploadResult = await cloudinary.uploader.upload(image_url, {
        folder: 'clickify-ocr',
        transformation: [
          { width: 800, height: 800, crop: "fill", quality: "auto" }
        ]
      });

      console.log('✅ Cloudinary upload successful:', uploadResult.secure_url);

      return res.json({
        success: true,
        final_image: uploadResult.secure_url,
        original_image: image_url,
        text_blocks_found: 1,
        processing_time: 2,
        message: "Image uploaded to Cloudinary successfully"
      });

    } catch (error) {
      console.error('❌ Cloudinary error:', error.message);
      console.error('Error details:', error);
      
      // Возвращаем детальную ошибку
      return res.status(500).json({
        success: false,
        error: error.message,
        final_image: req.body?.image_url,
        original_image: req.body?.image_url,
        message: `Cloudinary failed: ${error.message}`,
        debug: {
          has_cloud_name: !!process.env.CLOUDINARY_CLOUD_NAME,
          has_api_key: !!process.env.CLOUDINARY_API_KEY,
          has_api_secret: !!process.env.CLOUDINARY_API_SECRET
        }
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
