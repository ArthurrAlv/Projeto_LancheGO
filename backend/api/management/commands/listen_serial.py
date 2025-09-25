# api/management/commands/listen_serial.py (VERSÃO FINAL COM LÓGICA DE CONFIRMAÇÃO)
import serial
import asyncio
import time
from django.core.management.base import BaseCommand
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync, sync_to_async
from api.models import Aluno, Digital, RegistroRetirada, Servidor
from api.serializers import AlunoSerializer
from datetime import time as dtime
from django.utils import timezone

SERIAL_PORT = 'COM3' # ❗ CONFIRME A PORTA CORRETA AQUI ❗
BAUD_RATE = 115200
ACTION_TIMEOUT = 30 # Segundos para aguardar a confirmação biométrica

def get_aluno_data_sync(aluno):
    return AlunoSerializer(aluno).data

async def process_serial_data(line, channel_layer, command_instance):
    # --- NOVA LÓGICA DE CONFIRMAÇÃO DE AÇÃO PENDENTE ---
    if line.startswith('MATCH:') and command_instance.pending_action:
        try:
            sensor_id = int(line.split(':')[1])
            digital = await sync_to_async(Digital.objects.select_related('servidor__user').get)(sensor_id=sensor_id)

            # Verifica se a digital pertence a um superusuário
            if digital.servidor and digital.servidor.user and digital.servidor.user.is_superuser:
                command_instance.stdout.write(command_instance.style.SUCCESS(f"CONFIRMAÇÃO ACEITA do superuser: {digital.servidor.user.username}"))
                await command_instance.execute_pending_action()
            else:
                command_instance.stdout.write(command_instance.style.ERROR("Confirmação negada. A digital não pertence a um superusuário."))
                await channel_layer.group_send('dashboard_group', {'type': 'broadcast_message', 'message': {'type': 'action.feedback', 'status': 'error', 'message': 'Acesso Negado: A digital não é de um superusuário.'}})
                await command_instance.cancel_pending_action(send_message=False) # Apenas cancela internamente
        except Digital.DoesNotExist:
            command_instance.stdout.write(command_instance.style.ERROR("Confirmação negada. Digital não encontrada no sistema."))
            await channel_layer.group_send('dashboard_group', {'type': 'broadcast_message', 'message': {'type': 'action.feedback', 'status': 'error', 'message': 'Acesso Negado: Digital não cadastrada.'}})
            await command_instance.cancel_pending_action(send_message=False)
        return # Impede que o resto da função seja executado

    # --- LÓGICA ORIGINAL (sem ação pendente) ---
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
                aluno_data = await sync_to_async(get_aluno_data_sync)(aluno)
                if ja_retirou_hoje: message_to_send = {'type': 'identificacao.result', 'status': 'JÁ RETIROU', 'aluno': aluno_data}
                else:
                    await sync_to_async(RegistroRetirada.objects.create)(aluno=aluno)
                    message_to_send = {'type': 'identificacao.result', 'status': 'LIBERADO', 'aluno': aluno_data}
            else: message_to_send = {'type': 'identificacao.result', 'status': 'NAO_ENCONTRADO', 'aluno': None}
        except Digital.DoesNotExist: message_to_send = {'type': 'identificacao.result', 'status': 'NAO_ENCONTRADO', 'aluno': None}
    elif line == 'NAO_ENCONTRADO': message_to_send = {'type': 'identificacao.result', 'status': 'NAO_ENCONTRADO', 'aluno': None}
    elif line.startswith(('INFO:', 'CADASTRO_OK:', 'CADASTRO_ERRO:')):
        if line.startswith('INFO:'): message_to_send = {'type': 'cadastro.feedback', 'message': line.split(':', 1)[1].strip()}
        elif line.startswith('CADASTRO_OK:'): message_to_send = {'type': 'cadastro.success', 'sensor_id': int(line.split(':')[1])}
        elif line.startswith('CADASTRO_ERRO:'): message_to_send = {'type': 'cadastro.error', 'message': line.split(':', 1)[1].strip()}
    elif line.startswith('DELETAR_OK:') or line.startswith('DELETAR_ERRO:'):
        parts = line.split(':'); status = 'OK' if parts[0] == 'DELETAR_OK' else 'ERROR'; sensor_id = int(parts[1])
        if status == 'OK':
            await sync_to_async(Digital.objects.filter(sensor_id=sensor_id).delete)()
            command_instance.stdout.write(f"-> Digital {sensor_id} deletada do banco (Hardware confirmou).")
        message_to_send = {'type': 'delete.result', 'status': status, 'sensor_id': sensor_id}
    elif line == 'LIMPAR_OK' or line == 'LIMPAR_ERRO':
        status = 'OK' if line == 'LIMPAR_OK' else 'ERROR'
        if status == 'OK':
            await sync_to_async(Digital.objects.all().delete)()
            command_instance.stdout.write(f"-> TODAS as digitais deletadas do banco (Hardware confirmou).")
        message_to_send = {'type': 'clearall.result', 'status': status}

    if message_to_send:
        await channel_layer.group_send(target_group, {'type': 'broadcast_message', 'message': message_to_send})
        command_instance.stdout.write(f"-> Mensagem enviada para '{target_group}'")

class Command(BaseCommand):
    help = 'Starts a unified worker to listen to serial port and receive commands via Channels.'
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.pending_action = None
        self.action_timer = None
        self.ser = None # Para acessar o `ser` em outras funções
        self.channel_layer = get_channel_layer()

    async def cancel_pending_action(self, send_message=True):
        if self.pending_action:
            self.stdout.write(self.style.WARNING("Ação pendente cancelada por timeout ou nova ação."))
            if send_message:
                await self.channel_layer.group_send('dashboard_group', {'type': 'broadcast_message', 'message': {'type': 'action.feedback', 'status': 'info', 'message': 'Ação cancelada: tempo esgotado.'}})
            self.pending_action = None
        if self.action_timer:
            self.action_timer.cancel()
            self.action_timer = None

    async def execute_pending_action(self):
        if not self.pending_action: return
        action = self.pending_action
        action_type = action.get('type')
        
        # --- MUDANÇA: Adicionando as novas ações de exclusão individual ---
        if action_type == 'delete_by_turma': await self._execute_delete_by_turma(action)
        elif action_type == 'clear_all_fingerprints': await self._execute_clear_all()
        elif action_type == 'delete_student_fingerprints': await self._execute_delete_user_fingerprints(action, 'aluno')
        elif action_type == 'delete_server_fingerprints': await self._execute_delete_user_fingerprints(action, 'servidor')

        
        await self.cancel_pending_action(send_message=False) # Limpa a ação após execução

    @sync_to_async
    def _get_students_by_turma(self, turma):
        return list(Aluno.objects.filter(turma=turma).prefetch_related('digitais'))

    async def _execute_delete_by_turma(self, action):
        turma = action.get('turma')
        self.stdout.write(self.style.SUCCESS(f"EXECUTANDO exclusão em massa para a turma: {turma}"))
        students_to_delete = await self._get_students_by_turma(turma)
        
        if not students_to_delete:
            await self.channel_layer.group_send('dashboard_group', {'type': 'broadcast_message', 'message': {'type': 'action.feedback', 'status': 'info', 'message': f"Nenhum aluno encontrado para a turma '{turma}'."}})
            return

        for student in students_to_delete:
            for digital in student.digitais.all():
                command = f"DELETAR:{digital.sensor_id}\n"
                self.ser.write(command.encode('utf-8'))
                self.stdout.write(f"-> Comando enviado: DELETAR:{digital.sensor_id} (Aluno: {student.nome_completo})")
                await asyncio.sleep(0.1) # Pequena pausa para não sobrecarregar o sensor
        
        # Apaga os alunos do banco de dados (o cascade removerá as digitais)
        await sync_to_async(Aluno.objects.filter(turma=turma).delete)()
        
        message = f"{len(students_to_delete)} aluno(s) da turma '{turma}' e suas digitais foram removidos com sucesso."
        await self.channel_layer.group_send('dashboard_group', {'type': 'broadcast_message', 'message': {'type': 'action.feedback', 'status': 'success', 'message': message}})

    async def _execute_clear_all(self):
        self.stdout.write(self.style.SUCCESS("EXECUTANDO limpeza total do leitor..."))
        command = "LIMPAR\n"
        self.ser.write(command.encode('utf-8'))
        # A confirmação e exclusão do banco virão do `process_serial_data` ao receber `LIMPAR_OK`
        # Mas enviamos um feedback imediato de sucesso para o frontend
        await self.channel_layer.group_send('dashboard_group', {'type': 'broadcast_message', 'message': {'type': 'action.feedback', 'status': 'success', 'message': 'Comando para limpar leitor enviado. O sistema será atualizado após a confirmação do hardware.'}})

    # --- NOVO: Método genérico para apagar digitais de um usuário específico ---
    @sync_to_async
    def _get_user_and_digitais(self, user_id, user_type):
        model = Aluno if user_type == 'aluno' else Servidor
        try:
            user = model.objects.prefetch_related('digitais').get(pk=user_id)
            return user, list(user.digitais.all())
        except model.DoesNotExist:
            return None, []

    async def _execute_delete_user_fingerprints(self, action, user_type):
        user_id_key = 'aluno_id' if user_type == 'aluno' else 'servidor_id'
        user_id = action.get(user_id_key)
        
        user, digitais_to_delete = await self._get_user_and_digitais(user_id, user_type)

        if not user or not digitais_to_delete:
            message = f"{user_type.capitalize()} não encontrado ou não possui digitais."
            self.stdout.write(self.style.WARNING(message))
            await self.channel_layer.group_send('dashboard_group', {'type': 'broadcast_message', 'message': {'type': 'action.feedback', 'status': 'info', 'message': message}})
            return

        self.stdout.write(self.style.SUCCESS(f"EXECUTANDO exclusão de digitais para {user_type}: {user.nome_completo}"))
        
        for digital in digitais_to_delete:
            command = f"DELETAR:{digital.sensor_id}\n"
            self.ser.write(command.encode('utf-8'))
            self.stdout.write(f"-> Comando enviado: DELETAR:{digital.sensor_id}")
            await asyncio.sleep(0.1)
            
        # A exclusão do banco ocorrerá quando o hardware responder com DELETAR_OK.
        # Apenas enviamos um feedback de que os comandos foram enviados.
        message = f"Comandos para apagar as digitais de {user.nome_completo} foram enviados ao hardware."
        await self.channel_layer.group_send('dashboard_group', {'type': 'broadcast_message', 'message': {'type': 'action.feedback', 'status': 'success', 'message': message}})


    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('Iniciando gerenciador de hardware unificado...'))
        asyncio.run(self.main_loop())

    async def main_loop(self):
        await self.channel_layer.group_add('serial_worker_group', 'serial_worker_channel')
        while True:
            try:
                self.ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=0.1)
                self.stdout.write(self.style.SUCCESS(f'Conectado com sucesso a {SERIAL_PORT}'))
                for group_name in ['login_group', 'dashboard_group']: await self.channel_layer.group_send(group_name, {'type': 'broadcast_message', 'message': {'type': 'status.leitor', 'status': 'conectado'}})
                
                while True:
                    if self.ser.in_waiting > 0:
                        line = self.ser.readline().decode('utf-8').strip()
                        if line:
                            self.stdout.write(f'<< DADO DO HARDWARE: {line}')
                            await process_serial_data(line, self.channel_layer, self)
                    try:
                        message = await asyncio.wait_for(self.channel_layer.receive('serial_worker_channel'), timeout=0.01)
                        # --- NOVA LÓGICA PARA ARMAR AÇÕES ---
                        if message['type'] == 'arm.action':
                            await self.cancel_pending_action() # Cancela qualquer ação anterior
                            self.pending_action = message['action']
                            self.stdout.write(self.style.WARNING(f"AÇÃO ARMADA: {self.pending_action} - Aguardando confirmação por {ACTION_TIMEOUT}s"))
                            self.action_timer = asyncio.get_event_loop().call_later(ACTION_TIMEOUT, lambda: asyncio.create_task(self.cancel_pending_action()))
                            await self.channel_layer.group_send('dashboard_group', {'type': 'broadcast_message', 'message': {'type': 'action.feedback', 'status': 'info', 'message': 'Ação iniciada! Aproxime a digital de um SUPERUSUÁRIO para confirmar.'}})
                        
                        elif message['type'] == 'execute.command':
                            command = message['command']
                            self.stdout.write(self.style.WARNING(f'>> COMANDO DO SITE: {command}'))
                            self.ser.write(f'{command}\n'.encode('utf-8'))
                    except asyncio.TimeoutError: pass
            except serial.SerialException:
                self.stdout.write(self.style.ERROR(f'Não foi possível conectar a {SERIAL_PORT}. Tentando novamente...'))
                if self.channel_layer:
                    for group_name in ['login_group', 'dashboard_group']: await self.channel_layer.group_send(group_name, {'type': 'broadcast_message', 'message': {'type': 'status.leitor', 'status': 'desconectado'}})
                await asyncio.sleep(1)
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Ocorreu um erro inesperado: {e}'))
                if self.ser and self.ser.is_open: self.ser.close()
                await asyncio.sleep(1)