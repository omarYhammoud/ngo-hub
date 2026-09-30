from django.urls import path

from .views import OperationsAssistantView


urlpatterns = [
    path(
        "analyze/",
        OperationsAssistantView.as_view(),
        name="operations-assistant-analyze",
    ),
]