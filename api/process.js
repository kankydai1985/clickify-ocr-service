export default async function handler(req, res) {
  // Устанавливаем CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Обрабатываем OPTIONS запрос (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Обрабатываем POST запрос
  if (req.method === 'POST') {
    try {
      const { image_url, text_to_replace } = req.body;
      
      console.log('OCR Service called with:', { image_url, text_to_replace });
      
      // Простой ответ для тестирования
      return res.json({
        success: true,
        final_image: image_url,
        original_image: image_url,
        text_blocks_found: 0,
        message: 'OCR service is working! Connection successful.'
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

  // Для других методов возвращаем ошибку
  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
}
