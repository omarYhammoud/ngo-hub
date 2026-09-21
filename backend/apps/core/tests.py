from django.test import SimpleTestCase


class HealthCheckTests(SimpleTestCase):
    def test_health_check_returns_api_status(self):
        response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(response.content, {'status': 'ok', 'service': 'ngo-hub-api'})

    def test_health_check_rejects_non_get_requests(self):
        response = self.client.post('/api/health/')
        self.assertEqual(response.status_code, 405)
