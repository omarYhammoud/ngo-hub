from django.http import JsonResponse


def health_check(request):
    if request.method != 'GET':
        return JsonResponse({'detail': 'Method not allowed.'}, status=405)
    return JsonResponse({'status': 'ok', 'service': 'ngo-hub-api'})
