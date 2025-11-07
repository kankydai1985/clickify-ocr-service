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
        language = 'rus+eng'
      } = req.body;
      
      console.log('🔍 Starting OCR processing for:', business_name || 'Unknown business');

      if (!image_url) {
        return res.status(400).json({
          success: false,
          error: 'Image URL is required'
        });
      }

      // 1. Download image
      console.log('📥 Downloading image...');
      const imageResponse = await axios({
        method: 'GET',
        url: image_url,
        responseType: 'arraybuffer',
        timeout: 30000
      });

      // 2. Process image with Jimp
      console.log('🖼️ Processing image...');
      let image;
      try {
        image = await Jimp.read(imageResponse.data);
        // Enhance image for better OCR
        image.contrast(0.3);
        image.normalize();
      } catch (jimpError) {
        console.error('Jimp processing error:', jimpError);
        // Continue with original image if Jimp fails
      }

      const imageBuffer = image ? await image.getBufferAsync(Jimp.MIME_JPEG) : imageResponse.data;

      // 3. OCR with Tesseract
      console.log('📝 Starting OCR recognition...');
      const worker = await createWorker();
      
      await worker.loadLanguage(language === 'RU' ? 'rus+eng' : 'eng+rus');
      await worker.initialize(language === 'RU' ? 'rus+eng' : 'eng+rus');
      
      const { data: { text, words, confidence } } = await worker.recognize(imageBuffer);
      await worker.terminate();

      console.log(`✅ OCR completed. Found ${words?.length || 0} words with ${confidence}% confidence`);
      
      if (text) {
        console.log('📄 Recognized text:', text.substring(0, 200) + '...');
      }

      // 4. Prepare response
      const response = {
        success: true,
        final_image: image_url, // For now return original
        original_image: image_url,
        text_blocks_found: words?.length || 0,
        confidence: confidence,
        recognized_text: text,
        processing_time: 0,
        message: `OCR processing successful. Found ${words?.length || 0} text elements.`
      };

      // 5. If we have text to replace and found text blocks, simulate processing
      if (text_to_replace && words && words.length > 0) {
        console.log('🎨 Text replacement would happen here');
        // In a real implementation, you'd replace text on the image
        response.message += ' Text replacement ready.';
      }

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
