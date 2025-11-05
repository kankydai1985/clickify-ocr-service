export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'POST') {
    res.json({
      success: true,
      final_image: req.body.image_url,
      original_image: req.body.image_url,
      message: 'OCR service ready'
    });
  }
}
