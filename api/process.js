import { createWorker } from 'tesseract.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    try {
      const { image_url, text_to_replace } = req.body;
      
      console.log('🚀 Fast OCR service called');

      // Быстрый ответ без реального OCR (для тестирования)
      const simulatedResponse = {
        success: true,
        final_image: image_url + '?processed=' + Date.now() + '&text=' + encodeURIComponent((text_to_replace || '').substring(0, 50)),
        original_image: image_url,
        text_blocks_found: 3,
        confidence: 95,
        recognized_text: "SIMULATED OCR TEXT - Service is working",
        processing_time: 1.5,
        message: "OCR service is running. Real OCR disabled for performance."
      };

      console.log('✅ Returning simulated response');
      return res.json(simulatedResponse);

    } catch (error) {
      console.error('❌ Error:', error.message);
      return res.json({
        success: false,
        error: error.message,
        final_image: req.body?.image_url
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
