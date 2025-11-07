import { v2 as cloudinary } from 'cloudinary';

// Конфигурация Cloudinary
const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dmkd2jz5w',
  api_key: process.env.CLOUDINARY_API_KEY || '931954732557498',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'Cg6RrOWzw-m5av7x5qCkZerlU0c'
};

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
      const { image_url, text_to_replace, business_name, brand_color = '#FF6600' } = req.body;

      console.log('🚀 Starting Cloudinary text overlay...');

      // Парсим текст на части
      const textParts = text_to_replace.split('\n\n');
      const header = textParts.find(part => part.startsWith('HEADER:'))?.replace('HEADER: ', '') || business_name;
      const body = textParts.find(part => part.startsWith('BODY:'))?.replace('BODY: ', '') || 'Special offer';
      const cta = textParts.find(part => part.startsWith('CTA:'))?.replace('CTA: ', '') || 'Order now!';
      const hashtags = textParts.find(part => part.startsWith('HASHTAGS:'))?.replace('HASHTAGS: ', '');

      console.log('Text parts parsed:', { 
        header: header.substring(0, 30), 
        body: body.substring(0, 30), 
        cta: cta 
      });

      // Cloudinary трансформации для добавления текста
      const transformations = [
        // Базовые настройки изображения
        { width: 800, height: 800, crop: "fill", quality: "auto:good" },
        
        // Заголовок сверху
        {
          overlay: {
            font_family: "Arial",
            font_size: 45,
            font_weight: "bold",
            text: header.length > 40 ? header.substring(0, 40) + '...' : header
          },
          color: "#FFFFFF",
          background: `${brand_color}E6`, // Полупрозрачный оранжевый
          gravity: "north",
          y: 40,
          width: 700,
          crop: "fit"
        },
        
        // Основной текст по центру
        {
          overlay: {
            font_family: "Arial", 
            font_size: 28,
            text: body.length > 80 ? body.substring(0, 80) + '...' : body
          },
          color: "#000000",
          background: "#FFFFFFE6", // Полупрозрачный белый
          gravity: "center", 
          y: 0,
          width: 650,
          crop: "fit"
        },
        
        // Призыв к действию снизу
        {
          overlay: {
            font_family: "Arial",
            font_size: 32,
            font_weight: "bold", 
            text: cta.length > 50 ? cta.substring(0, 50) + '...' : cta
          },
          color: "#FFFFFF",
          background: "#000000E6", // Полупрозрачный черный
          gravity: "south",
          y: 50,
          width: 600,
          crop: "fit"
        }
      ];

      // Добавляем хэштеги если есть
      if (hashtags) {
        transformations.push({
          overlay: {
            font_family: "Arial",
            font_size: 20,
            text: hashtags
          },
          color: "#CCCCCC",
          gravity: "south_west",
          x: 20,
          y: 20
        });
      }

      // Загружаем в Cloudinary с текстовыми оверлеями
      console.log('📤 Uploading to Cloudinary with text overlays...');
      const uploadResult = await cloudinary.uploader.upload(image_url, {
        folder: 'clickify-ocr-processed',
        transformation: transformations
      });

      console.log('✅ Cloudinary processing successful:', uploadResult.secure_url);

      return res.json({
        success: true,
        final_image: uploadResult.secure_url,
        original_image: image_url,
        text_blocks_found: 3,
        processing_time: 3,
        message: "Text successfully added to image via Cloudinary"
      });

    } catch (error) {
      console.error('❌ Cloudinary error:', error);
      
      // Fallback - простая загрузка без текста
      try {
        const fallbackResult = await cloudinary.uploader.upload(image_url, {
          folder: 'clickify-ocr-fallback'
        });
        
        return res.json({
          success: true,
          final_image: fallbackResult.secure_url,
          original_image: image_url,
          text_blocks_found: 0,
          message: "Text overlay failed, but image uploaded"
        });
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        
        return res.json({
          success: false,
          final_image: image_url,
          original_image: image_url,
          error: fallbackError.message,
          message: "Cloudinary processing completely failed"
        });
      }
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
