# api/views.py

from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Aluno, Servidor
from .serializers import AlunoSerializer, ServidorSerializer, ServidorRegisterSerializer
from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import Digital
from . import hardware_manager
from .models import Digital
from rest_framework_simplejwt.tokens import RefreshToken

# ---- Views para Alunos ----
# Permite Listar e Criar alunos (apenas para usuários autenticados)
class AlunoListCreate(generics.ListCreateAPIView):
    queryset = Aluno.objects.all()
    serializer_class = AlunoSerializer
    permission_classes = [permissions.IsAuthenticated]

# Permite Ver, Atualizar e Deletar um aluno específico
class AlunoRetrieveUpdateDestroy(generics.RetrieveUpdateDestroyAPIView):
    queryset = Aluno.objects.all()
    serializer_class = AlunoSerializer
    permission_classes = [permissions.IsAuthenticated]


# ---- Views para Servidores ----
# Permite que um admin (Superuser) crie um novo Servidor
class ServidorRegisterView(generics.CreateAPIView):
    serializer_class = ServidorRegisterSerializer
    permission_classes = [permissions.IsAdminUser]

# Permite que um admin liste todos os Servidores
class ServidorList(generics.ListAPIView):
    queryset = Servidor.objects.all()
    serializer_class = ServidorSerializer
    permission_classes = [permissions.IsAdminUser]

# Permite que um admin veja, atualize ou delete um Servidor específico
class ServidorRetrieveUpdateDestroy(generics.RetrieveUpdateDestroyAPIView):
    queryset = Servidor.objects.all()
    serializer_class = ServidorSerializer
    permission_classes = [permissions.IsAdminUser]



# ---- VIEWS PARA COMANDOS DO HARDWARE ----
class StartEnrollView(APIView):
    """
    View para iniciar o modo de cadastro no hardware.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        success = hardware_manager.send_command_to_hardware("CADASTRO")
        if success:
            return Response({"message": "Comando de cadastro enviado com sucesso."}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Falha ao se comunicar com o hardware."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DeleteFingerprintView(APIView):
    """
    View para deletar uma digital específica do hardware.
    Espera um corpo de requisição com {"sensor_id": X}
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        sensor_id = request.data.get('sensor_id')
        if sensor_id is None:
            return Response({"error": "O sensor_id é obrigatório."}, status=status.HTTP_400_BAD_REQUEST)

        command = f"DELETAR:{sensor_id}"
        success = hardware_manager.send_command_to_hardware(command)

        if success:
            # Aqui também deletaríamos a digital do nosso banco de dados
            # Digital.objects.filter(sensor_id=sensor_id).delete()
            return Response({"message": f"Comando para deletar ID {sensor_id} enviado."}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Falha ao se comunicar com o hardware."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
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
            # Cria ou atualiza a entrada da Digital
            digital, created = Digital.objects.update_or_create(
                sensor_id=sensor_id,
                defaults={'aluno_id': aluno_id, 'servidor_id': servidor_id}
            )
            return Response({"message": "Digital associada com sucesso"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
# Login com Digital
class FingerprintLoginView(APIView):
    # CORREÇÃO: Adicione estas duas linhas para tornar a view 100% pública
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        sensor_id = request.data.get('sensor_id')
        if not sensor_id:
            return Response({"error": "sensor_id é obrigatório"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # ... (o resto da sua lógica continua igual) ...
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