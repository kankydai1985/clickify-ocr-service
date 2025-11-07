import { v2 as cloudinary } from 'cloudinary';

// Конфигурация Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

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
      const { 
        image_url, 
        text_to_replace, 
        business_name, 
        brand_color = '#FF6600' 
      } = req.body;

      console.log('🚀 Starting Cloudinary image processing...');
      console.log('Business:', business_name);
      console.log('Text length:', text_to_replace?.length);

      // Парсим текст на части
      const textParts = text_to_replace.split('\n\n');
      const header = textParts.find(part => part.startsWith('HEADER:'))?.replace('HEADER: ', '') || business_name;
      const body = textParts.find(part => part.startsWith('BODY:'))?.replace('BODY: ', '') || 'Special offer';
      const cta = textParts.find(part => part.startsWith('CTA:'))?.replace('CTA: ', '') || 'Order now!';
      const hashtags = textParts.find(part => part.startsWith('HASHTAGS:'))?.replace('HASHTAGS: ', '');

      console.log('Parsed text - Header:', header.substring(0, 50));
      console.log('Body:', body.substring(0, 50));
      console.log('CTA:', cta);

      // Обрабатываем изображение в Cloudinary
      const uploadResult = await cloudinary.uploader.upload(image_url, {
        transformation: [
          // Базовые улучшения изображения
          { width: 800, height: 800, crop: "fill", quality: "auto" },
          { effect: "improve:50" },
          
          // Фон для текста (полупрозрачный)
          {
            overlay: {
              font_family: "Arial",
              font_size: 60,
              font_weight: "bold",
              text: header
            },
            color: "#FFFFFF",
            background: "rgba(0,0,0,0.6)",
            gravity: "north",
            y: 40,
            width: 700,
            crop: "fit"
          },
          
          // Основной текст
          {
            overlay: {
              font_family: "Arial",
              font_size: 28,
              text: body
            },
            color: "#FFFFFF", 
            background: "rgba(0,0,0,0.5)",
            gravity: "center",
            y: 0,
            width: 600,
            crop: "fit"
          },
          
          // Призыв к действию
          {
            overlay: {
              font_family: "Arial",
              font_size: 36,
              font_weight: "bold",
              text: cta
            },
            color: brand_color,
            background: "rgba(255,255,255,0.9)",
            gravity: "south",
            y: 50,
            width: 600,
            crop: "fit"
          },
          
          // Хэштеги (если есть)
          ...(hashtags ? [{
            overlay: {
              font_family: "Arial",
              font_size: 20,
              text: hashtags
            },
            color: "#CCCCCC",
            gravity: "south_west",
            x: 20,
            y: 20
          }] : [])
        ]
      });

      console.log('✅ Cloudinary processing successful:', uploadResult.secure_url);

      return res.json({
        success: true,
        final_image: uploadResult.secure_url, // Реальное обработанное изображение!
        original_image: image_url,
        text_blocks_found: 3,
        processing_time: 2.5,
        message: "Text successfully added to image via Cloudinary",
        cloudinary_url: uploadResult.secure_url
      });

    } catch (error) {
      console.error('❌ Cloudinary processing error:', error);
      
      // Fallback - возвращаем оригинальное изображение
      return res.json({
        success: false,
        final_image: req.body?.image_url,
        original_image: req.body?.image_url,
        error: error.message,
        message: "Cloudinary processing failed"
      });
    }
  }

  return res.status(405).json({ 
    success: false,
    error: 'Method not allowed' 
  });
}
