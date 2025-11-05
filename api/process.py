import json

def handler(request, response):
    try:
        data = json.loads(request.body)
        
        result = {
            'success': True,
            'final_image': data.get('image_url'),
            'original_image': data.get('image_url'), 
            'text_blocks_found': 0,
            'message': 'OCR service ready'
        }
        
        response.status = 200
        response.headers['Content-Type'] = 'application/json'
        response.headers['Access-Control-Allow-Origin'] = '*'
        return json.dumps(result)
        
    except Exception as e:
        response.status = 500
        return json.dumps({'success': False, 'error': str(e)})
