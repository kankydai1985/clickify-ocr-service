import { createWorker } from 'tesseract.js';

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
        language = 'eng+rus'
      } = req.body;
      
      console.log('🔍 Starting OCR processing for:', business_name || 'Unknown business');

      if (!image_url) {
        return res.status(400).json({
          success: false,
          error: 'Image URL is required'
        });
      }

      // 1. Download image using native fetch
      console.log('📥 Downloading image...');
      const imageResponse = await fetch(image_url);
      
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`);
      }

      const imageBuffer = await imageResponse.arrayBuffer();

      // 2. OCR with Tesseract
      console.log('📝 Starting OCR recognition...');
      const worker = await createWorker();
      
      await worker.loadLanguage(language);
      await worker.initialize(language);
      
      const { data: { text, words, confidence } } = await worker.recognize(imageBuffer);
      await worker.terminate();

      console.log(`✅ OCR completed. Found ${words?.length || 0} words with ${confidence}% confidence`);
      
      if (text) {
        console.log('📄 Recognized text sample:', text.substring(0, 100) + '...');
      }

      // 3. Prepare response
      const response = {
        success: true,
        final_image: image_url, // Return original for now
        original_image: image_url,
        text_blocks_found: words?.length || 0,
        confidence: confidence,
        recognized_text: text,
        processing_time: 0,
        message: `OCR processing successful. Found ${words?.length || 0} text elements with ${confidence}% confidence.`
      };

      return res.json(response);

    } catch (error) {
      console.error('❌ OCR Service error:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        final_image: req.body?.image_url,
        message: 'OCR processing failed'
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
}
