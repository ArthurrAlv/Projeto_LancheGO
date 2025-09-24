# api/views.py (VERSÃO FINAL COM EXCLUSÃO COMPLETA)

from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Aluno, Servidor, Digital
from .serializers import AlunoSerializer, ServidorSerializer, ServidorRegisterSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

# ---- Views para Alunos ----
class AlunoListCreate(generics.ListCreateAPIView):
    queryset = Aluno.objects.all()
    serializer_class = AlunoSerializer
    permission_classes = [permissions.IsAuthenticated]

# 🔽 --- LÓGICA DE EXCLUSÃO ATUALIZADA AQUI --- 🔽
class AlunoRetrieveUpdateDestroy(generics.RetrieveUpdateDestroyAPIView):
    queryset = Aluno.objects.all()
    serializer_class = AlunoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        aluno = self.get_object()
        # Pega a lista de IDs das digitais ANTES de deletar o aluno
        digitais_para_deletar = list(aluno.digitais.all())

        if digitais_para_deletar:
            channel_layer = get_channel_layer()
            # Envia o comando de exclusão para o hardware para cada digital
            for digital in digitais_para_deletar:
                command = f"DELETAR:{digital.sensor_id}"
                async_to_sync(channel_layer.group_send)(
                    'serial_worker_group',
                    {
                        'type': 'execute.command',
                        'command': command
                    }
                )
        
        # Agora, prossegue com a exclusão do aluno do banco de dados
        return super().destroy(request, *args, **kwargs)


# ---- Views para Servidores ----
class ServidorRegisterView(generics.CreateAPIView):
    serializer_class = ServidorRegisterSerializer
    permission_classes = [permissions.IsAdminUser]

class ServidorList(generics.ListAPIView):
    queryset = Servidor.objects.filter(user__is_superuser=False)
    serializer_class = ServidorSerializer
    permission_classes = [permissions.IsAdminUser]

# 🔽 --- LÓGICA DE EXCLUSÃO ATUALIZADA AQUI --- 🔽
class ServidorRetrieveUpdateDestroy(generics.RetrieveUpdateDestroyAPIView):
    queryset = Servidor.objects.all()
    serializer_class = ServidorSerializer
    permission_classes = [permissions.IsAdminUser]

    def destroy(self, request, *args, **kwargs):
        servidor = self.get_object()
        digitais_para_deletar = list(servidor.digitais.all())

        if digitais_para_deletar:
            channel_layer = get_channel_layer()
            for digital in digitais_para_deletar:
                command = f"DELETAR:{digital.sensor_id}"
                async_to_sync(channel_layer.group_send)(
                    'serial_worker_group',
                    {'type': 'execute.command', 'command': command}
                )

        return super().destroy(request, *args, **kwargs)


# ---- VIEWS PARA COMANDOS DO HARDWARE (JÁ CORRIGIDAS ANTERIORMENTE) ----

class AssociateFingerprintView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        sensor_id = request.data.get('sensor_id')
        aluno_id = request.data.get('aluno_id')
        servidor_id = request.data.get('servidor_id')

        if not sensor_id:
            return Response({"error": "sensor_id é obrigatório"}, status=status.HTTP_400_BAD_REQUEST)
        if not aluno_id and not servidor_id:
            return Response({"error": "aluno_id ou servidor_id é obrigatório"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            digital, created = Digital.objects.update_or_create(
                sensor_id=sensor_id,
                defaults={'aluno_id': aluno_id, 'servidor_id': servidor_id}
            )
            return Response({"message": "Digital associada com sucesso"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class FingerprintLoginView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        sensor_id = request.data.get('sensor_id')
        if not sensor_id:
            return Response({"error": "sensor_id é obrigatório"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            digital = Digital.objects.select_related('servidor__user').get(sensor_id=sensor_id)
            if digital.servidor and digital.servidor.user:
                user = digital.servidor.user
                refresh = RefreshToken.for_user(user)
                return Response({
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                })
            else:
                return Response({"error": "Digital não associada a um operador"}, status=status.HTTP_404_NOT_FOUND)
        except Digital.DoesNotExist:
            return Response({"error": "Digital não encontrada"}, status=status.HTTP_404_NOT_FOUND)

class DeleteStudentFingerprintsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        aluno_id = kwargs.get('aluno_id')
        try:
            aluno = Aluno.objects.get(pk=aluno_id)
        except Aluno.DoesNotExist:
            return Response({"error": "Aluno não encontrado."}, status=status.HTTP_404_NOT_FOUND)

        digitais_para_deletar = list(aluno.digitais.all())
        if not digitais_para_deletar:
            return Response({"message": "Aluno não possui digitais cadastradas."}, status=status.HTTP_200_OK)

        channel_layer = get_channel_layer()
        for digital in digitais_para_deletar:
            command = f"DELETAR:{digital.sensor_id}"
            async_to_sync(channel_layer.group_send)(
                'serial_worker_group',
                {'type': 'execute.command','command': command}
            )
        
        return Response({"message": "Comandos para deletar digitais foram enviados ao hardware."}, status=status.HTTP_200_OK)

class DeleteServerFingerprintsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        servidor_id = kwargs.get('servidor_id')
        try:
            servidor = Servidor.objects.get(pk=servidor_id)
        except Servidor.DoesNotExist:
            return Response({"error": "Servidor não encontrado."}, status=status.HTTP_404_NOT_FOUND)

        digitais_para_deletar = list(servidor.digitais.all())
        if not digitais_para_deletar:
            return Response({"message": "Servidor não possui digitais cadastradas."}, status=status.HTTP_200_OK)

        channel_layer = get_channel_layer()
        for digital in digitais_para_deletar:
            command = f"DELETAR:{digital.sensor_id}"
            async_to_sync(channel_layer.group_send)(
                'serial_worker_group',
                {'type': 'execute.command', 'command': command}
            )
        
        return Response({"message": "Comandos de exclusão foram enviados ao hardware."}, status=status.HTTP_200_OK)

# --- MUDANÇA: VIEW ANTIGA MANTIDA POR COMPATIBILIDADE, MAS SERÁ SUBSTITUÍDA PELO FLUXO DE INICIAÇÃO ---
class ClearAllFingerprintsView(APIView):
    permission_classes = [permissions.IsAdminUser]
    def post(self, request, *args, **kwargs):
        channel_layer = get_channel_layer()
        command = "LIMPAR"
        async_to_sync(channel_layer.group_send)('serial_worker_group', {'type': 'execute.command','command': command})
        return Response({"message": f"Comando '{command}' enviado ao hardware."}, status=status.HTTP_200_OK)

# --- NOVA FUNCIONALIDADE: VIEWS PARA INICIAR AÇÕES CRÍTICAS ---

class InitiateDeleteByTurmaView(APIView):
    """
    Inicia o processo de exclusão em massa de alunos de uma turma específica.
    Não executa a exclusão, apenas "arma" o worker para aguardar a confirmação biométrica.
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, *args, **kwargs):
        turma = request.data.get('turma')
        if not turma:
            return Response({"error": "O campo 'turma' é obrigatório."}, status=status.HTTP_400_BAD_REQUEST)

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'serial_worker_group',
            {
                'type': 'arm.action',
                'action': {
                    'type': 'delete_by_turma',
                    'turma': turma
                }
            }
        )
        return Response({"message": f"Ação de exclusão para a turma '{turma}' iniciada. Aguardando confirmação biométrica no leitor."}, status=status.HTTP_202_ACCEPTED)

class InitiateClearAllView(APIView):
    """
    Inicia o processo de limpeza total do leitor com confirmação biométrica.
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, *args, **kwargs):
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'serial_worker_group',
            {
                'type': 'arm.action',
                'action': {
                    'type': 'clear_all_fingerprints'
                }
            }
        )
        return Response({"message": "Ação de limpeza total iniciada. Aguardando confirmação biométrica no leitor."}, status=status.HTTP_202_ACCEPTED)
