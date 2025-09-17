# api/management/commands/listen_serial.py

import serial
import time
import json
from django.core.management.base import BaseCommand
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from api.models import Aluno, Digital, RegistroRetirada
from api.serializers import AlunoSerializer
from datetime import date, datetime, time as dtime

# ⚠️ ATENÇÃO: Altere esta porta para a porta COM correta do seu dispositivo! ⚠️
SERIAL_PORT = 'COM3'  # <--- MUDE AQUI PARA A PORTA QUE VOCÊ ENCONTROU
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
                    if ser.in_waiting > 0:
                        line = ser.readline().decode('utf-8').strip()
                        if line:
                            # Somente processa a linha → process_serial_data define a mensagem correta
                            self.process_serial_data(line, channel_layer)

                    time.sleep(0.1)

                ser.close()

            except serial.SerialException:
                self.stdout.write(self.style.ERROR(
                    f'Não foi possível conectar a {SERIAL_PORT}. Tentando novamente em 5 segundos...'
                ))

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

                    agora = datetime.now().time()
                    hoje = date.today()

                    # Define os períodos
                    periodo_manha = RegistroRetirada.objects.filter(
                        aluno=aluno,
                        data_retirada__date=hoje,
                        data_retirada__time__lt=dtime(12, 0)  # Antes do meio-dia
                    )
                    periodo_tarde = RegistroRetirada.objects.filter(
                        aluno=aluno,
                        data_retirada__date=hoje,
                        data_retirada__time__gte=dtime(12, 0)  # Depois do meio-dia
                    )

                    ja_retirou_hoje = False
                    if agora < dtime(12, 0):  # Se for de manhã
                        if periodo_manha.exists():
                            ja_retirou_hoje = True
                    else:  # Se for de tarde/noite
                        if periodo_tarde.exists():
                            ja_retirou_hoje = True

                    aluno_data = AlunoSerializer(aluno).data

                    if ja_retirou_hoje:
                        message_to_send = {
                            'type': 'identificacao.result',
                            'status': 'JÁ RETIROU',
                            'aluno': aluno_data
                        }
                    else:
                        RegistroRetirada.objects.create(aluno=aluno)
                        message_to_send = {
                            'type': 'identificacao.result',
                            'status': 'LIBERADO',
                            'aluno': aluno_data
                        }
                else:
                    message_to_send = {
                        'type': 'identificacao.result',
                        'status': 'NAO_ENCONTRADO',
                        'aluno': None
                    }

            except (Digital.DoesNotExist, ValueError):
                message_to_send = {
                    'type': 'identificacao.result',
                    'status': 'NAO_ENCONTRADO',
                    'aluno': None
                }

        elif data == 'NAO_ENCONTRADO':
            message_to_send = {
                'type': 'identificacao.result',
                'status': 'NAO_ENCONTRADO',
                'aluno': None
            }

        # --- Feedbacks de cadastro ---
        elif data.startswith('INFO:'):
            feedback_message = data.split(':', 1)[1].strip()
            message_to_send = {'type': 'cadastro.feedback', 'message': feedback_message}

        elif data.startswith('CADASTRO_OK:'):
            try:
                sensor_id = int(data.split(':')[1])
                message_to_send = {'type': 'cadastro.success', 'sensor_id': sensor_id}
            except (ValueError, IndexError):
                message_to_send = {'type': 'cadastro.error', 'message': 'ID de sensor inválido recebido.'}

        elif data.startswith('CADASTRO_ERRO:'):
            error_message = data.split(':', 1)[1].strip()
            message_to_send = {'type': 'cadastro.error', 'message': error_message}

        else:
            message_to_send = {'type': 'hardware.info', 'data': data}

        # Envia a mensagem para o grupo certo
        if message_to_send:
            async_to_sync(channel_layer.group_send)(
                'hardware_updates',
                {'type': 'broadcast_message', 'message': message_to_send}
            )