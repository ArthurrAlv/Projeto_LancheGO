# api/consumers.py

import json
from channels.generic.websocket import AsyncWebsocketConsumer

class SerialConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = 'serial_com'
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()
        print("✅ WebSocket CONECTADO e no grupo 'serial_com'") # <--- ADICIONE ESTE PRINT

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
        print("❌ WebSocket DESCONECTADO") # <--- ADICIONE ESTE PRINT

    # Este é o método que recebe a mensagem do listen_serial
    async def serial_message(self, event):
        # CORREÇÃO: Repassar o payload que já vem estruturado
        payload = event['payload']

        # Envia o payload diretamente para o navegador (JavaScript)
        await self.send(text_data=json.dumps(payload))
        print(f"✅ Payload enviado para o JS: {payload}")  # Print de depuração