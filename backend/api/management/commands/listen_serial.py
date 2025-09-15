# api/management/commands/listen_serial.py

import serial
import time
import json
from datetime import date
from django.core.management.base import BaseCommand
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from api.models import Aluno, Digital, RegistroRetirada
from api.serializers import AlunoSerializer

# ⚠️ ATENÇÃO: Altere esta porta para a porta COM correta do seu dispositivo! ⚠️
SERIAL_PORT = 'COM5' # <--- MUDE AQUI PARA A PORTA QUE VOCÊ ENCONTROU
BAUD_RATE = 115200

class Command(BaseCommand):
    help = 'Listen to serial port for biometric scanner data'

    def handle(self, *args, **kwargs):
        self.stdout.write(f'Iniciando escuta na porta serial {SERIAL_PORT}...')

        while True:
            try:
                # Tenta conectar à porta serial
                ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
                self.stdout.write(self.style.SUCCESS(f'Conectado com sucesso a {SERIAL_PORT}'))

                # Só pega o channel_layer APÓS conectar com sucesso
                channel_layer = get_channel_layer()

                # Informa o frontend que o leitor está conectado
                async_to_sync(channel_layer.group_send)(
                    'hardware_updates',
                    {'type': 'broadcast_message', 'message': {'type': 'status.leitor', 'status': 'conectado'}}
                )

                while ser.is_open:
                    try:
                        if ser.in_waiting > 0:
                            line = ser.readline().decode('utf-8').strip()
                            if line:
                                self.stdout.write(f'Dado recebido: {line}')
                                self.process_serial_data(line, channel_layer)
                    except serial.SerialException:
                        self.stdout.write(self.style.ERROR('Leitor desconectado. Tentando reconectar...'))
                        break # Sai do loop interno para tentar reconectar

                ser.close()

            except serial.SerialException:
                self.stdout.write(self.style.ERROR(f'Não foi possível conectar a {SERIAL_PORT}. Tentando novamente em 5 segundos...'))

                # Pega o channel_layer aqui também para enviar o status de desconectado
                channel_layer = get_channel_layer()
                if channel_layer:
                    async_to_sync(channel_layer.group_send)(
                        'hardware_updates',
                        {'type': 'broadcast_message', 'message': {'type': 'status.leitor', 'status': 'desconectado'}}
                    )
                time.sleep(5)

    def process_serial_data(self, data, channel_layer):
        message_to_send = None
        if data.startswith('MATCH:'):
            try:
                sensor_id = int(data.split(':')[1])
                digital = Digital.objects.select_related('aluno').get(sensor_id=sensor_id)

                if digital.aluno:
                    aluno = digital.aluno
                    hoje = date.today()
                    ja_retirou = RegistroRetirada.objects.filter(aluno=aluno, data_retirada__date=hoje).exists()

                    aluno_data = AlunoSerializer(aluno).data

                    if ja_retirou:
                        message_to_send = {'type': 'identificacao.result', 'status': 'JÁ RETIROU', 'aluno': aluno_data}
                    else:
                        RegistroRetirada.objects.create(aluno=aluno)
                        message_to_send = {'type': 'identificacao.result', 'status': 'LIBERADO', 'aluno': aluno_data}
                else:
                    message_to_send = {'type': 'identificacao.result', 'status': 'NAO ENCONTRADO', 'aluno': None}

            except (Digital.DoesNotExist, ValueError):
                message_to_send = {'type': 'identificacao.result', 'status': 'NAO ENCONTRADO', 'aluno': None}

        elif data == 'NAO ENCONTRADO':
            message_to_send = {'type': 'identificacao.result', 'status': 'NAO ENCONTRADO', 'aluno': None}

        else:
            message_to_send = {'type': 'hardware.info', 'data': data}

        if message_to_send:
            async_to_sync(channel_layer.group_send)(
                'hardware_updates',
                {'type': 'broadcast_message', 'message': message_to_send}
            )