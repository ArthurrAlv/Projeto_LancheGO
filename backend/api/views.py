# api/views.py (VERSÃO FINAL COM EXCLUSÃO COMPLETA)

import openpyxl
from rest_framework.parsers import MultiPartParser, FormParser
from datetime import datetime, time
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Aluno, Servidor, Digital
from .serializers import AlunoSerializer, ServidorSerializer, ServidorRegisterSerializer, RegistroRetiradaSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone
from .models import RegistroRetirada
from .serializers import MyTokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


# ---- Views para Alunos ----
class AlunoListCreate(generics.ListCreateAPIView):
    queryset = Aluno.objects.all()
    serializer_class = AlunoSerializer
    
    # --- CORREÇÃO PRINCIPAL AQUI ---
    def get_permissions(self):
        """
        Define permissões diferentes para cada tipo de requisição:
        - GET (listar alunos): Permite qualquer usuário autenticado.
        - POST (criar aluno): Permite apenas superusuários.
        """
        if self.request.method == 'POST':
            # Apenas superusuários podem criar alunos (ex: via API, sem ser pela planilha)
            return [permissions.IsAdminUser()]
        
        # Qualquer usuário logado (servidor ou superuser) pode ver a lista de alunos
        return [permissions.IsAuthenticated()]

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
                    {'type': 'execute.command', 'command': command}
                )
        return super().destroy(request, *args, **kwargs)


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

# ---- Views para Servidores ----
class ServidorRegisterView(generics.CreateAPIView):
    serializer_class = ServidorRegisterSerializer
    permission_classes = [permissions.IsAdminUser]

class ServidorList(generics.ListAPIView):
    queryset = Servidor.objects.all()
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
                
                # --- MUDANÇA CRÍTICA: Usando o serializer customizado ---
                # Em vez de criar um token simples, usamos nosso serializer para
                # criar um token completo com 'username' e 'is_superuser'.
                serializer = MyTokenObtainPairSerializer(context={'request': request})
                refresh = serializer.get_token(user)

                return Response({
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                })
            else:
                return Response({"error": "Digital não associada a um operador"}, status=status.HTTP_404_NOT_FOUND)
        except Digital.DoesNotExist:
            return Response({"error": "Digital não encontrada"}, status=status.HTTP_404_NOT_FOUND)



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

class InitiateDeleteStudentFingerprintsView(APIView):
    """ Inicia a exclusão segura das digitais de um aluno específico. """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        aluno_id = kwargs.get('aluno_id')
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'serial_worker_group',
            {
                'type': 'arm.action',
                'action': {
                    'type': 'delete_student_fingerprints',
                    'aluno_id': aluno_id
                }
            }
        )
        return Response({"message": "Ação de exclusão de digitais iniciada. Aguardando confirmação biométrica."}, status=status.HTTP_202_ACCEPTED)

class InitiateDeleteServerFingerprintsView(APIView):
    """ Inicia a exclusão segura das digitais de um servidor específico. """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, *args, **kwargs):
        servidor_id = kwargs.get('servidor_id')
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'serial_worker_group',
            {
                'type': 'arm.action',
                'action': {
                    'type': 'delete_server_fingerprints',
                    'servidor_id': servidor_id
                }
            }
        )
        return Response({"message": "Ação de exclusão de digitais iniciada. Aguardando confirmação biométrica."}, status=status.HTTP_202_ACCEPTED)
    

class AlunoUploadPlanilhaView(APIView):
    permission_classes = [permissions.IsAdminUser]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        planilha_file = request.FILES.get('planilha')
        if not planilha_file:
            return Response({"error": "Nenhuma planilha enviada."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            workbook = openpyxl.load_workbook(planilha_file)

            # --- MUDANÇA PRINCIPAL: Inicializa os contadores fora do loop ---
            alunos_criados = 0
            alunos_existentes = 0
            alunos_turma_invalida = 0
            erros_reais = []

            # --- MUDANÇA PRINCIPAL: Itera sobre TODAS as planilhas (abas) no arquivo ---
            for sheet in workbook.worksheets:
                
                # A lógica de mapeamento e leitura de colunas agora acontece para cada aba
                current_year = datetime.now().year
                ano_1 = current_year % 100
                ano_2 = (current_year - 1) % 100
                ano_3 = (current_year - 2) % 100

                turma_map = {
                    f"MIEL1{ano_1}IA": "1E", f"MIII1{ano_1}IA": "1I",
                    f"MIEL1{ano_2}IA": "2E", f"MIII1{ano_2}IA": "2I",
                    f"MIEL1{ano_3}IA": "3E", f"MIII1{ano_3}IA": "3I",
                }

                headers = [str(cell.value).strip().lower() if cell.value else "" for cell in sheet[1]]
                try:
                    nome_col_index = headers.index("nome")
                    turma_col_index = headers.index("turma")
                except ValueError:
                    # Se uma aba não tiver os cabeçalhos corretos, ela é pulada
                    erros_reais.append(f"Aba '{sheet.title}' ignorada: Cabeçalhos 'Nome' e/ou 'Turma' não encontrados.")
                    continue

                # Itera sobre as linhas da aba atual
                for row_index, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
                    try:
                        nome_completo = row[nome_col_index]
                        codinome_turma = row[turma_col_index]

                        if not nome_completo or not codinome_turma:
                            continue
                        
                        codinome_turma_str = str(codinome_turma).strip()
                        turma = turma_map.get(codinome_turma_str)

                        if not turma:
                            alunos_turma_invalida += 1
                            continue

                        if Aluno.objects.filter(nome_completo__iexact=nome_completo, turma=turma).exists():
                            alunos_existentes += 1
                            continue
                        
                        Aluno.objects.create(nome_completo=nome_completo, turma=turma)
                        alunos_criados += 1
                    
                    except Exception as e:
                        erros_reais.append(f"Aba '{sheet.title}', Linha {row_index}: Erro inesperado - {str(e)}")

            # O relatório final agora é um resumo de todas as abas processadas
            return Response({
                "message": "Processamento da planilha concluído.",
                "criados": alunos_criados,
                "existentes_ignorados": alunos_existentes,
                "turmas_invalidas_ignoradas": alunos_turma_invalida,
                "erros": erros_reais
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"Erro grave ao abrir ou processar a planilha: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

class RegistrosDeHojeView(generics.ListAPIView):
    serializer_class = RegistroRetiradaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Esta view agora usa o 'time' correto de 'datetime'
        hoje = timezone.localtime(timezone.now()).date()
        agora_time = timezone.localtime(timezone.now()).time()
        if agora_time.hour < 12:
            periodo_inicio = timezone.make_aware(datetime.combine(hoje, time.min))
        else:
            periodo_inicio = timezone.make_aware(datetime.combine(hoje, time(12, 0)))
        return RegistroRetirada.objects.filter(data_retirada__gte=periodo_inicio).order_by('-data_retirada')[:5]
    

class InitiateDeleteStudentView(APIView):
    """ Inicia a exclusão segura de um aluno completo (registro e digitais). """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        aluno_id = kwargs.get('aluno_id')
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'serial_worker_group',
            {
                'type': 'arm.action',
                'action': {
                    'type': 'delete_student', # Novo tipo de ação
                    'aluno_id': aluno_id
                }
            }
        )
        return Response({"message": "Ação de exclusão de aluno iniciada. Aguardando confirmação biométrica."}, status=status.HTTP_202_ACCEPTED)