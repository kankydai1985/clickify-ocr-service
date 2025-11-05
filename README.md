# Clickify OCR Service

AI-powered text replacement service for WordPress Clickify plugin.

## Deploy on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

## API

**POST** `/api/process`

```json
{
  "image_url": "https://example.com/image.jpg",
  "text_to_replace": "HEADER: New Header\nBODY: New Body\nCTA: Click Now",
  "business_name": "Business Name",
  "language": "RU"
}
