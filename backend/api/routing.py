# api/routing.py

from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path('ws/hardware/', consumers.SerialConsumer.as_asgi()),
]