import { v2 as cloudinary } from 'cloudinary';

const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dmkd2jz5w',
  api_key: process.env.CLOUDINARY_API_KEY || '931954732557498',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'Cg6RrOWzw-m5av7x5qCkZerlU0c'
};

cloudinary.config(cloudinaryConfig);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    try {
      const { image_url, text_to_replace, business_name, brand_color = '#FF6600' } = req.body;

      console.log('🎨 Creating text replacement effect...');

      // Парсим текст
      const textParts = text_to_replace.split('\n\n');
      const header = textParts.find(part => part.startsWith('HEADER:'))?.replace('HEADER: ', '') || business_name;
      const body = textParts.find(part => part.startsWith('BODY:'))?.replace('BODY: ', '') || '';
      const cta = textParts.find(part => part.startsWith('CTA:'))?.replace('CTA: ', '') || '';
      const hashtags = textParts.find(part => part.startsWith('HASHTAGS:'))?.replace('HASHTAGS: ', '');

      // Создаем эффект "замены" текста через полупрозрачные плашки
      const transformations = [
        // Базовое изображение
        { width: 800, height: 1000, crop: "fill", quality: "auto:good" },
        
        // Плашка для "замены" верхнего текста (25% высоты)
        {
          effect: "colorize:40",
          color: brand_color.replace('#', 'rgb:'),
          gravity: "north",
          height: 200, // 20% высоты
          y: 0
        },
        
        // Новый заголовок поверх плашки
        {
          overlay: {
            font_family: "Arial",
            font_size: 48,
            font_weight: "bold",
            text: header.length > 35 ? header.substring(0, 35) + '...' : header
          },
          color: "#FFFFFF",
          gravity: "north",
          y: 60,
          width: 700,
          crop: "fit"
        },
        
        // Плашка для "замены" центрального текста (40% высоты)
        {
          effect: "colorize:30", 
          color: "rgb:FFFFFF",
          gravity: "center",
          height: 320, // 32% высоты
          y: 0
        },
        
        // Новый основной текст поверх плашки
        {
          overlay: {
            font_family: "Arial",
            font_size: 28,
            text: body.length > 120 ? body.substring(0, 120) + '...' : body
          },
          color: "#000000",
          gravity: "center",
          y: 0,
          width: 650,
          crop: "fit"
        },
        
        // Плашка для "замены" нижнего текста (25% высоты)
        {
          effect: "colorize:50",
          color: "rgb:000000", 
          gravity: "south",
          height: 200, // 20% высоты
          y: 0
        },
        
        // Новый призыв к действию поверх плашки
        {
          overlay: {
            font_family: "Arial",
            font_size: 36,
            font_weight: "bold",
            text: cta.length > 45 ? cta.substring(0, 45) + '...' : cta
          },
          color: "#FFFFFF",
          gravity: "south", 
          y: 70,
          width: 600,
          crop: "fit"
        }
      ];

      // Добавляем хэштеги в угол
      if (hashtags) {
        transformations.push({
          overlay: {
            font_family: "Arial",
            font_size: 18,
            text: hashtags
          },
          color: "#CCCCCC",
          gravity: "south_west",
          x: 20,
          y: 20
        });
      }

      const uploadResult = await cloudinary.uploader.upload(image_url, {
        folder: 'clickify-text-replaced',
        transformation: transformations
      });

      return res.json({
        success: true,
        final_image: uploadResult.secure_url,
        original_image: image_url,
        text_blocks_found: 3,
        processing_time: 3,
        message: "Text replacement effect created successfully"
      });

    } catch (error) {
      console.error('Error:', error);
      return res.json({
        success: false,
        final_image: req.body?.image_url,
        error: error.message
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
