# api/consumers.py

import json
from channels.generic.websocket import AsyncWebsocketConsumer

class SerialConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # PASSO 1: Usar o mesmo nome de grupo do listen_serial
        self.group_name = 'hardware_updates' 
        
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()
        print(f"✅ WebSocket CONECTADO e no grupo '{self.group_name}'")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
        print("❌ WebSocket DESCONECTADO")

    # PASSO 2: Renomear método para 'broadcast_message' e corrigir o payload
    async def broadcast_message(self, event):
        # A chave enviada pelo listen_serial é 'message'
        message_data = event['message']

        # Envia a mensagem diretamente para o navegador (JavaScript)
        await self.send(text_data=json.dumps(message_data))
        print(f"✅ Payload enviado para o JS: {message_data}")