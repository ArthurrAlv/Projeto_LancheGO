# api/management/commands/listen_serial.py (VERSÃO FINAL CORRIGIDA)
import serial
import asyncio
from django.core.management.base import BaseCommand
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync, sync_to_async
from api.models import Aluno, Digital, RegistroRetirada, Servidor
from api.serializers import AlunoSerializer
from datetime import time as dtime
from django.utils import timezone

SERIAL_PORT = 'COM3' # ❗ CONFIRME A PORTA CORRETA AQUI ❗
BAUD_RATE = 115200

# --- NOVA FUNÇÃO AUXILIAR ---
# Esta função síncrona isola a chamada ao serializer.
def get_aluno_data_sync(aluno):
    return AlunoSerializer(aluno).data

async def process_serial_data(line, channel_layer, command_instance):
    message_to_send = None
    target_group = 'dashboard_group'

    if line.startswith('MATCH:'):
        try:
            sensor_id = int(line.split(':')[1])
            digital = await sync_to_async(Digital.objects.select_related('aluno', 'servidor__user').get)(sensor_id=sensor_id)

            if digital.servidor:
                target_group = 'login_group'
                message_to_send = {'type': 'operador.login', 'status': 'MATCH', 'sensor_id': sensor_id}
            
            elif digital.aluno:
                aluno = digital.aluno
                agora_local = timezone.localtime(timezone.now())
                hoje = agora_local.date()
                agora_time = agora_local.time()
                
                periodo_manha_qs = RegistroRetirada.objects.filter(aluno=aluno, data_retirada__date=hoje, data_retirada__time__lt=dtime(12, 0))
                periodo_tarde_qs = RegistroRetirada.objects.filter(aluno=aluno, data_retirada__date=hoje, data_retirada__time__gte=dtime(12, 0))

                ja_retirou_hoje = await sync_to_async(periodo_manha_qs.exists)() if agora_time < dtime(12, 0) else await sync_to_async(periodo_tarde_qs.exists)()
                
                # --- CORREÇÃO APLICADA AQUI ---
                # Chamamos a nossa nova função auxiliar de forma assíncrona.
                aluno_data = await sync_to_async(get_aluno_data_sync)(aluno)
                
                if ja_retirou_hoje:
                    message_to_send = {'type': 'identificacao.result', 'status': 'JÁ RETIROU', 'aluno': aluno_data}
                else:
                    await sync_to_async(RegistroRetirada.objects.create)(aluno=aluno)
                    message_to_send = {'type': 'identificacao.result', 'status': 'LIBERADO', 'aluno': aluno_data}
            
            else:
                 message_to_send = {'type': 'identificacao.result', 'status': 'NAO_ENCONTRADO', 'aluno': None}

        except Digital.DoesNotExist:
            message_to_send = {'type': 'identificacao.result', 'status': 'NAO_ENCONTRADO', 'aluno': None}
    
    # O restante do arquivo continua exatamente igual...
    elif line == 'NAO_ENCONTRADO':
        message_to_send = {'type': 'identificacao.result', 'status': 'NAO_ENCONTRADO', 'aluno': None}

    elif line.startswith(('INFO:', 'CADASTRO_OK:', 'CADASTRO_ERRO:')):
        target_group = 'dashboard_group'
        if line.startswith('INFO:'):
            message_to_send = {'type': 'cadastro.feedback', 'message': line.split(':', 1)[1].strip()}
        elif line.startswith('CADASTRO_OK:'):
            message_to_send = {'type': 'cadastro.success', 'sensor_id': int(line.split(':')[1])}
        elif line.startswith('CADASTRO_ERRO:'):
            message_to_send = {'type': 'cadastro.error', 'message': line.split(':', 1)[1].strip()}

    if message_to_send:
        await channel_layer.group_send(
            target_group,
            {'type': 'broadcast_message', 'message': message_to_send}
        )
        command_instance.stdout.write(f"-> Mensagem enviada para '{target_group}'")


class Command(BaseCommand):
    help = 'Starts a unified worker to listen to serial port and receive commands via Channels.'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('Iniciando gerenciador de hardware unificado...'))
        asyncio.run(self.main_loop())

    async def main_loop(self):
        channel_layer = get_channel_layer()
        await channel_layer.group_add('serial_worker_group', 'serial_worker_channel')

        while True:
            ser = None
            try:
                ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=0.1)
                self.stdout.write(self.style.SUCCESS(f'Conectado com sucesso a {SERIAL_PORT}'))
                
                while True:
                    if ser.in_waiting > 0:
                        line = ser.readline().decode('utf-8').strip()
                        if line:
                            self.stdout.write(f'<< DADO DO HARDWARE: {line}')
                            await process_serial_data(line, channel_layer, self)

                    try:
                        message = await asyncio.wait_for(channel_layer.receive('serial_worker_channel'), timeout=0.01)
                        if message['type'] == 'execute.command':
                            command = message['command']
                            self.stdout.write(self.style.WARNING(f'>> COMANDO DO SITE: {command}'))
                            ser.write(f'{command}\n'.encode('utf-8'))
                    except asyncio.TimeoutError:
                        pass

            except serial.SerialException:
                self.stdout.write(self.style.ERROR(f'Falha ao conectar em {SERIAL_PORT}. Tentando novamente em 5s...'))
                await asyncio.sleep(5)
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Erro inesperado: {e}'))
                if ser and ser.is_open:
                    ser.close()
                await asyncio.sleep(5)