import fetch from 'node-fetch';
import sharp from 'sharp';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'POST') {
    try {
      const { image_url, text_to_replace } = req.body;
      
      // Пока просто возвращаем оригинальное изображение
      // В следующих шагах добавим обработку через sharp
      
      res.json({
        success: true,
        final_image: image_url,
        original_image: image_url,
        text_blocks_found: 0,
        message: 'OCR service ready - image processing coming soon'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        final_image: req.body.image_url
      });
    }
  }
}
