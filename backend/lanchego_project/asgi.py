# lanchego_project/asgi.py

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import api.routing # Garanta que esta linha exista

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lanchego_project.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            api.routing.websocket_urlpatterns # Garanta que ele use as rotas da api
        )
    ),
})