# api/consumers.py (VERSÃO COM ROTEAMENTO)

import json
from channels.generic.websocket import AsyncWebsocketConsumer

class HardwareConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Pega o nome da "sala" a partir da URL (ex: 'login' ou 'dashboard')
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        
        # Define o grupo do canal com base no nome da sala
        if self.room_name == 'login':
            self.group_name = 'login_group'
        else: # 'dashboard' ou qualquer outro
            self.group_name = 'dashboard_group'

        # Adiciona o canal ao grupo correspondente
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()
        print(f"✅ WebSocket CONECTADO. Cliente entrou no grupo '{self.group_name}'")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
        print(f"❌ WebSocket DESCONECTADO do grupo '{self.group_name}'")

    async def broadcast_message(self, event):
        message_data = event['message']
        await self.send(text_data=json.dumps(message_data))
        # O print foi removido daqui para evitar poluir o log do Daphne. 
        # Os prints úteis agora estão no listen_serial.py