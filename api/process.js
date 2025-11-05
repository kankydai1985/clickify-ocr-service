import fetch from 'node-fetch';
import { createCanvas, loadImage, registerFont } from 'canvas';
import Jimp from 'jimp';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'POST') {
    try {
      const { image_url, text_to_replace, business_name, language = 'RU' } = req.body;

      // 1. Скачиваем изображение
      const imageResponse = await fetch(image_url);
      const imageBuffer = await imageResponse.buffer();
      
      // 2. Создаем canvas для рисования
      const image = await loadImage(imageBuffer);
      const canvas = createCanvas(image.width, image.height);
      const ctx = canvas.getContext('2d');
      
      // 3. Рисуем оригинальное изображение
      ctx.drawImage(image, 0, 0);
      
      // 4. Парсим AI текст
      const sections = parseAIText(text_to_replace);
      
      // 5. Добавляем текст поверх изображения
      addTextToCanvas(ctx, sections, image.width, image.height);
      
      // 6. Конвертируем в base64
      const finalImageBuffer = canvas.toBuffer('image/jpeg');
      const finalImageBase64 = finalImageBuffer.toString('base64');
      
      res.json({
        success: true,
        final_image: `data:image/jpeg;base64,${finalImageBase64}`,
        original_image: image_url,
        text_blocks_found: Object.keys(sections).length,
        message: 'Text added successfully'
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

function parseAIText(aiText) {
  const sections = { header: '', body: '', cta: '', hashtags: '' };
  if (!aiText) return sections;
  
  const lines = aiText.split('\n');
  let currentSection = '';
  
  lines.forEach(line => {
    line = line.trim();
    if (line.toLowerCase().startsWith('header:')) {
      currentSection = 'header';
      sections.header = line.substring(7).trim();
    } else if (line.toLowerCase().startsWith('body:')) {
      currentSection = 'body';
      sections.body = line.substring(5).trim();
    } else if (line.toLowerCase().startsWith('cta:')) {
      currentSection = 'cta';
      sections.cta = line.substring(4).trim();
    } else if (line.toLowerCase().startsWith('hashtags:')) {
      currentSection = 'hashtags';
      sections.hashtags = line.substring(9).trim();
    } else if (currentSection && line) {
      sections[currentSection] += ' ' + line;
    }
  });
  
  return sections;
}

function addTextToCanvas(ctx, sections, width, height) {
  // Настройки текста
  const textConfig = {
    header: { size: width * 0.08, y: height * 0.2, color: '#FFFFFF' },
    body: { size: width * 0.04, y: height * 0.5, color: '#FFFFFF' },
    cta: { size: width * 0.05, y: height * 0.75, color: '#FF6600' },
    hashtags: { size: width * 0.03, y: height * 0.9, color: '#CCCCCC' }
  };
  
  // Добавляем тень для лучшей читаемости
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  Object.entries(sections).forEach(([key, text]) => {
    if (!text) return;
    
    const config = textConfig[key];
    ctx.font = `bold ${config.size}px Arial`;
    ctx.fillStyle = config.color;
    ctx.textAlign = 'center';
    
    // Перенос строк если текст длинный
    const maxWidth = width * 0.8;
    const lines = wrapText(ctx, text, maxWidth);
    
    lines.forEach((line, index) => {
      const y = config.y + (index * config.size * 1.2);
      ctx.fillText(line, width / 2, y);
    });
  });
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}
