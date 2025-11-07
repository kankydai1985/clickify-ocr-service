import { createWorker } from 'tesseract.js';
import Jimp from 'jimp';
import axios from 'axios';

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
        business_type, 
        language = 'rus',
        brand_color = '#000000'
      } = req.body;
      
      console.log('Starting OCR processing for:', image_url);

      if (!image_url) {
        return res.status(400).json({
          success: false,
          error: 'Image URL is required'
        });
      }

      // 1. Скачиваем изображение
      console.log('Downloading image...');
      const imageResponse = await axios({
        method: 'GET',
        url: image_url,
        responseType: 'arraybuffer',
        timeout: 30000
      });

      // 2. Обрабатываем изображение
      console.log('Processing image with Jimp...');
      const image = await Jimp.read(imageResponse.data);
      
      // Увеличиваем контраст для лучшего распознавания
      image.contrast(0.2);
      
      // Получаем buffer обработанного изображения
      const imageBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);

      // 3. Распознаем текст с Tesseract.js
      console.log('Starting OCR recognition...');
      const worker = await createWorker(language === 'RU' ? 'rus' : 'eng');
      
      const { data: { text, words } } = await worker.recognize(imageBuffer);
      await worker.terminate();

      console.log('OCR Result - Text found:', text);
      console.log('Words detected:', words?.length || 0);

      // 4. Если есть текст для замены и найденные слова, создаем новое изображение
      let finalImageUrl = image_url;
      let textBlocksFound = words?.length || 0;

      if (text_to_replace && words && words.length > 0) {
        console.log('Replacing text on image...');
        
        // Создаем новое изображение с замененным текстом
        const newImage = await replaceTextOnImage(image, words, text_to_replace, brand_color);
        
        // Конвертируем в base64 для возврата
        const base64Image = await newImage.getBase64Async(Jimp.MIME_JPEG);
        finalImageUrl = base64Image;
        
        console.log('Text replacement completed');
      }

      return res.json({
        success: true,
        final_image: finalImageUrl,
        original_image: image_url,
        text_blocks_found: textBlocksFound,
        processing_time: 0, // Можно добавить реальное время
        recognized_text: text,
        message: `OCR processing completed. Found ${textBlocksFound} text blocks.`
      });

    } catch (error) {
      console.error('OCR Service error:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        final_image: req.body?.image_url
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
}

// Функция для замены текста на изображении
async function replaceTextOnImage(image, words, newText, brandColor = '#000000') {
  const clone = image.clone();
  
  // Загружаем шрифт (используем встроенный или добавляем свой)
  const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
  
  // Вычисляем общую область текста
  const textRegions = calculateTextRegions(words);
  
  // Закрашиваем старые текстовые области
  textRegions.forEach(region => {
    clone.scan(region.x, region.y, region.width, region.height, function(x, y, idx) {
      // Делаем фон белым в области текста
      this.bitmap.data[idx] = 255;     // R
      this.bitmap.data[idx + 1] = 255; // G  
      this.bitmap.data[idx + 2] = 255; // B
    });
  });

  // Добавляем новый текст
  const textColor = hexToJimpColor(brandColor);
  const x = textRegions[0]?.x || 50;
  const y = textRegions[0]?.y || 50;
  
  clone.print(font, x, y, {
    text: newText,
    alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT,
    alignmentY: Jimp.VERTICAL_ALIGN_TOP
  }, clone.bitmap.width - 100); // Максимальная ширина текста

  return clone;
}

// Функция для вычисления текстовых регионов
function calculateTextRegions(words) {
  const regions = [];
  
  words.forEach(word => {
    regions.push({
      x: Math.max(0, word.bbox.x0 - 5),
      y: Math.max(0, word.bbox.y0 - 5),
      width: word.bbox.x1 - word.bbox.x0 + 10,
      height: word.bbox.y1 - word.bbox.y0 + 10
    });
  });
  
  return regions;
}

// Конвертер hex цвета в Jimp цвет
function hexToJimpColor(hex) {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return Jimp.rgbaToInt(r, g, b, 255);
}
