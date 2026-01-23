from django.http import HttpResponse

class PreflightCorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Explicitly handle preflight
        if request.method == 'OPTIONS':
            response = HttpResponse()
            origin = request.headers.get('Origin')
            if origin:
                response['Access-Control-Allow-Origin'] = origin
            response['Access-Control-Allow-Credentials'] = 'true'
            response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'

            req_headers = request.headers.get('Access-Control-Request-Headers')
            if req_headers:
                response['Access-Control-Allow-Headers'] = req_headers
            else:
                response['Access-Control-Allow-Headers'] = 'authorization, content-type, x-csrftoken'

            return response

        # Normal request fallback
        response = self.get_response(request)
        origin = request.headers.get('Origin')
        if origin:
            response['Access-Control-Allow-Origin'] = origin
            response['Access-Control-Allow-Credentials'] = 'true'
        return response
