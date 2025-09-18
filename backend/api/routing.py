# api/routing.py

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Esta rota captura a "sala" da URL e a passa para o consumer
    re_path(r'ws/hardware/(?P<room_name>\w+)/$', consumers.HardwareConsumer.as_asgi()),
]