# api/management/commands/listen_serial.py (VERSÃO AJUSTADA PARA MAIS FLUIDEZ)

import serial
import time
from django.core.management.base import BaseCommand
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from api.models import Aluno, Digital, RegistroRetirada, Servidor
from api.serializers import AlunoSerializer
from datetime import time as dtime
from django.utils import timezone

SERIAL_PORT = 'COM3'
BAUD_RATE = 115200

class Command(BaseCommand):
    help = 'Listen to serial port for biometric scanner data'

    def process_serial_data(self, data, channel_layer):
        message_to_send = None
        target_group = 'dashboard_group'  # padrão: envia para o dashboard

        if data.startswith('MATCH:'):
            try:
                sensor_id = int(data.split(':')[1])
                self.stdout.write(f"-> MATCH recebido. ID do sensor: {sensor_id}")
                digital = Digital.objects.select_related('aluno', 'servidor__user').get(sensor_id=sensor_id)

                if digital.servidor:
                    self.stdout.write(f"-> Digital de OPERADOR: {digital.servidor.user.username}")
                    target_group = 'login_group'
                    message_to_send = {
                        'type': 'operador.login',
                        'status': 'MATCH',
                        'sensor_id': sensor_id
                    }

                elif digital.aluno:
                    aluno = digital.aluno
                    agora_local = timezone.localtime(timezone.now())
                    hoje = agora_local.date()
                    agora_time = agora_local.time()

                    periodo_manha = RegistroRetirada.objects.filter(
                        aluno=aluno, data_retirada__date=hoje,
                        data_retirada__time__lt=dtime(12, 0)
                    )
                    periodo_tarde = RegistroRetirada.objects.filter(
                        aluno=aluno, data_retirada__date=hoje,
                        data_retirada__time__gte=dtime(12, 0)
                    )

                    ja_retirou_hoje = periodo_manha.exists() if agora_time < dtime(12, 0) else periodo_tarde.exists()
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
            except Digital.DoesNotExist:
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

        elif data.startswith(('INFO:', 'CADASTRO_OK:', 'CADASTRO_ERRO:')):
            target_group = 'dashboard_group'
            if data.startswith('INFO:'):
                message_to_send = {
                    'type': 'cadastro.feedback',
                    'message': data.split(':', 1)[1].strip()
                }
            elif data.startswith('CADASTRO_OK:'):
                message_to_send = {
                    'type': 'cadastro.success',
                    'sensor_id': int(data.split(':')[1])
                }
            elif data.startswith('CADASTRO_ERRO:'):
                message_to_send = {
                    'type': 'cadastro.error',
                    'message': data.split(':', 1)[1].strip()
                }

        if message_to_send:
            self.stdout.write(
                f"-> Enviando para '{target_group}': {message_to_send.get('status') or message_to_send.get('type')}"
            )
            async_to_sync(channel_layer.group_send)(
                target_group,
                {'type': 'broadcast_message', 'message': message_to_send}
            )

    def handle(self, *args, **kwargs):
        self.stdout.write(f'Iniciando escuta na porta serial {SERIAL_PORT}...')
        while True:
            try:
                ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
                self.stdout.write(self.style.SUCCESS(f'Conectado com sucesso a {SERIAL_PORT}'))
                channel_layer = get_channel_layer()

                # Ao conectar, avisa AMBAS as possíveis páginas
                for group_name in ['login_group', 'dashboard_group']:
                    async_to_sync(channel_layer.group_send)(
                        group_name,
                        {'type': 'broadcast_message', 'message': {'type': 'status.leitor', 'status': 'conectado'}}
                    )

                last_heartbeat_time = time.time()

                while ser.is_open:
                    line = ser.readline().decode('utf-8').strip()
                    if line:
                        self.process_serial_data(line, channel_layer)

                    # Heartbeat a cada 5s → mantém o dashboard atualizado.
                    # ⚠️ No frontend, ignore status "conectado" repetidos.
                    current_time = time.time()
                    if current_time - last_heartbeat_time > 5:
                        async_to_sync(channel_layer.group_send)(
                            'dashboard_group',
                            {'type': 'broadcast_message', 'message': {'type': 'status.leitor', 'status': 'conectado'}}
                        )
                        last_heartbeat_time = current_time

                ser.close()

            except serial.SerialException:
                self.stdout.write(self.style.ERROR(
                    f'Não foi possível conectar a {SERIAL_PORT}. Tentando novamente...'
                ))
                channel_layer = get_channel_layer()
                if channel_layer:
                    for group_name in ['login_group', 'dashboard_group']:
                        async_to_sync(channel_layer.group_send)(
                            group_name,
                            {'type': 'broadcast_message', 'message': {'type': 'status.leitor', 'status': 'desconectado'}}
                        )
                time.sleep(1)  # pausa menor → mais fluido

            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Ocorreu um erro inesperado: {e}'))
                time.sleep(1)  # pausa menor → não trava leitura