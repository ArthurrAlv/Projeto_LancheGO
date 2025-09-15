# api/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer

class HardwareConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_group_name = 'hardware_updates'
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
        print("Cliente WebSocket conectado!")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        print("Cliente WebSocket desconectado.")

    async def receive(self, text_data):
        # Lógica para receber comandos do frontend (ex: iniciar cadastro)
        # Será implementada no futuro
        print(f"Comando recebido do frontend: {text_data}")
        pass

    # Esta função é chamada pelo nosso script de escuta (listen_serial)
    async def broadcast_message(self, event):
        message = event['message']

        # Envia a mensagem para o cliente (navegador)
        await self.send(text_data=json.dumps(message))