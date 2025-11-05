from http.server import BaseHTTPRequestHandler
import json
import requests
import cv2
import numpy as np
import pytesseract
from PIL import Image, ImageDraw, ImageFont
import base64
import io

class Handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            result = self.process_image(data)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                'success': False,
                'error': str(e)
            }).encode())

    def process_image(self, data):
        # Для Vercel временно возвращаем оригинальное изображение
        # В реальной реализации здесь будет OCR логика
        
        return {
            'success': True,
            'final_image': data.get('image_url'),
            'original_image': data.get('image_url'),
            'text_blocks_found': 0,
            'message': 'OCR service deployed on Vercel - text replacement coming soon'
        }

def main(request, response):
    handler = Handler(request, response, {})
    handler.handle()
