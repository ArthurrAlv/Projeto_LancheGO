# api/routing.py
from django.urls import re_path
from .consumers import HardwareConsumer

websocket_urlpatterns = [
    re_path(r'ws/hardware/$', HardwareConsumer.as_asgi()),
]