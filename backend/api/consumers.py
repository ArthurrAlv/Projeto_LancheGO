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

    # Este método recebe mensagens DO FRONTEND
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')

        # Se for um comando para o hardware, encaminha para o nosso gerenciador
        if message_type == 'hardware.command':
            command = data.get('command')
            await self.channel_layer.group_send(
                'serial_worker_group',  # Um "canal de rádio" interno
                {
                    'type': 'execute.command',
                    'command': command
                }
            )
            print(f"➡️ Comando '{command}' recebido do frontend e encaminhado para o worker.")


    async def broadcast_message(self, event):
        message_data = event['message']
        await self.send(text_data=json.dumps(message_data))
        # O print foi removido daqui para evitar poluir o log do Daphne. 
        # Os prints úteis agora estão no listen_serial.py