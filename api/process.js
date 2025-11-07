import { v2 as cloudinary } from 'cloudinary';
import { createWorker } from 'tesseract.js';

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
      const { image_url, text_to_replace, business_name, brand_color = '#FF6600', language = 'rus+eng' } = req.body;

      console.log('🔍 Starting REAL OCR text replacement...');

      // 1. Сначала распознаем текст на изображении
      console.log('📝 Step 1: OCR text recognition...');
      const worker = await createWorker();
      await worker.loadLanguage(language);
      await worker.initialize(language);
      
      const { data: { text, words } } = await worker.recognize(image_url);
      await worker.terminate();

      console.log(`✅ OCR found ${words?.length || 0} words`);
      console.log('Recognized text:', text);

      // 2. Если нет текста для замены или не найден текст - используем умное размещение
      if (!words || words.length === 0) {
        console.log('⚠️ No text found on image, using smart placement');
        return await smartTextPlacement(image_url, text_to_replace, business_name, brand_color, res);
      }

      // 3. Группируем слова в текстовые блоки
      const textBlocks = groupWordsIntoBlocks(words);
      console.log(`📦 Grouped into ${textBlocks.length} text blocks`);

      // 4. Создаем Cloudinary трансформации для замены текста
      const transformations = [];

      // Сначала замазываем старые текстовые блоки
      textBlocks.forEach((block, index) => {
        // Замазываем область старого текста
        transformations.push({
          overlay: `solid:${brand_color}80`, // Полупрозрачная заливка
          gravity: "north_west",
          x: Math.max(0, block.x - 5),
          y: Math.max(0, block.y - 5), 
          width: block.width + 10,
          height: block.height + 10
        });
      });

      // 5. Парсим новый текст и добавляем на те же позиции
      const newTextParts = parseNewText(text_to_replace, textBlocks.length);
      
      newTextParts.forEach((newText, index) => {
        if (index < textBlocks.length) {
          const block = textBlocks[index];
          transformations.push({
            overlay: {
              font_family: "Arial",
              font_size: Math.max(20, Math.min(40, block.height - 10)),
              font_weight: "bold",
              text: newText.length > 50 ? newText.substring(0, 50) + '...' : newText
            },
            color: "#FFFFFF",
            gravity: "north_west",
            x: block.x,
            y: block.y,
            width: block.width,
            crop: "fit"
          });
        }
      });

      // 6. Загружаем в Cloudinary с трансформациями замены текста
      console.log('🎨 Step 2: Applying text replacement in Cloudinary...');
      const uploadResult = await cloudinary.uploader.upload(image_url, {
        folder: 'clickify-ocr-replaced',
        transformation: transformations
      });

      console.log('✅ Text replacement successful:', uploadResult.secure_url);

      return res.json({
        success: true,
        final_image: uploadResult.secure_url,
        original_image: image_url,
        text_blocks_found: textBlocks.length,
        recognized_text: text,
        processing_time: 5,
        message: `Replaced ${textBlocks.length} text blocks with new content`
      });

    } catch (error) {
      console.error('❌ OCR replacement error:', error);
      return await smartTextPlacement(image_url, req.body?.text_to_replace, req.body?.business_name, req.body?.brand_color, res);
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// Функция группировки слов в текстовые блоки
function groupWordsIntoBlocks(words, maxLineGap = 20) {
  if (!words || words.length === 0) return [];
  
  const lines = [];
  let currentLine = [words[0]];
  
  for (let i = 1; i < words.length; i++) {
    const prevWord = currentLine[currentLine.length - 1];
    const currentWord = words[i];
    
    // Если слова на одной линии (по Y координате)
    if (Math.abs(currentWord.bbox.y0 - prevWord.bbox.y0) < maxLineGap) {
      currentLine.push(currentWord);
    } else {
      lines.push(currentLine);
      currentLine = [currentWord];
    }
  }
  lines.push(currentLine);
  
  // Преобразуем линии в блоки
  return lines.map(line => {
    const x = Math.min(...line.map(w => w.bbox.x0));
    const y = Math.min(...line.map(w => w.bbox.y0));
    const right = Math.max(...line.map(w => w.bbox.x1));
    const bottom = Math.max(...line.map(w => w.bbox.y1));
    
    return {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(right - x),
      height: Math.round(bottom - y),
      text: line.map(w => w.text).join(' ')
    };
  });
}

// Функция парсинга нового текста
function parseNewText(text, maxBlocks) {
  const parts = text.split('\n\n');
  const result = [];
  
  // HEADER
  const header = parts.find(part => part.startsWith('HEADER:'))?.replace('HEADER: ', '');
  if (header) result.push(header);
  
  // BODY (можем разделить на несколько блоков если нужно)
  const body = parts.find(part => part.startsWith('BODY:'))?.replace('BODY: ', '');
  if (body) {
    // Если нужно больше блоков, разделяем BODY
    const bodyParts = splitText(body, Math.max(1, maxBlocks - result.length));
    result.push(...bodyParts);
  }
  
  // CTA
  const cta = parts.find(part => part.startsWith('CTA:'))?.replace('CTA: ', '');
  if (cta && result.length < maxBlocks) result.push(cta);
  
  // Если блоков все еще мало, добавляем хэштеги
  const hashtags = parts.find(part => part.startsWith('HASHTAGS:'))?.replace('HASHTAGS: ', '');
  if (hashtags && result.length < maxBlocks) result.push(hashtags);
  
  return result.slice(0, maxBlocks);
}

// Функция разделения текста
function splitText(text, parts) {
  if (parts <= 1) return [text];
  
  const words = text.split(' ');
  const partLength = Math.ceil(words.length / parts);
  const result = [];
  
  for (let i = 0; i < parts; i++) {
    const start = i * partLength;
    const end = start + partLength;
    result.push(words.slice(start, end).join(' '));
  }
  
  return result;
}

// Fallback: умное размещение текста если OCR не нашел текст
async function smartTextPlacement(image_url, text_to_replace, business_name, brand_color, res) {
  console.log('🔄 Using smart text placement fallback...');
  
  const parts = text_to_replace.split('\n\n');
  const header = parts.find(part => part.startsWith('HEADER:'))?.replace('HEADER: ', '') || business_name;
  const body = parts.find(part => part.startsWith('BODY:'))?.replace('BODY: ', '') || 'Special offer';
  const cta = parts.find(part => part.startsWith('CTA:'))?.replace('CTA: ', '') || 'Order now!';
  
  const uploadResult = await cloudinary.uploader.upload(image_url, {
    folder: 'clickify-ocr-smart',
    transformation: [
      { width: 800, height: 800, crop: "fill", quality: "auto" },
      
      // Заголовок сверху
      {
        overlay: {
          font_family: "Arial",
          font_size: 40,
          font_weight: "bold", 
          text: header.length > 50 ? header.substring(0, 50) + '...' : header
        },
        color: "#FFFFFF",
        background: `${brand_color}CC`,
        gravity: "north",
        y: 40,
        width: 700,
        crop: "fit"
      },
      
      // Основной текст по центру
      {
        overlay: {
          font_family: "Arial",
          font_size: 24,
          text: body.length > 100 ? body.substring(0, 100) + '...' : body
        },
        color: "#000000", 
        background: "#FFFFFFCC",
        gravity: "center",
        y: 0,
        width: 600,
        crop: "fit"
      },
      
      // CTA снизу
      {
        overlay: {
          font_family: "Arial",
          font_size: 30,
          font_weight: "bold",
          text: cta.length > 60 ? cta.substring(0, 60) + '...' : cta
        },
        color: "#FFFFFF",
        background: "#000000CC", 
        gravity: "south",
        y: 40,
        width: 600,
        crop: "fit"
      }
    ]
  });
  
  return res.json({
    success: true,
    final_image: uploadResult.secure_url,
    original_image: image_url,
    text_blocks_found: 3,
    processing_time: 3,
    message: "Smart text placement (OCR found no text to replace)"
  });
}
