# api/serializers.py (VERSÃO CORRIGIDA E ROBUSTA)

from rest_framework import serializers
from django.contrib.auth.models import User
from django.db import transaction
from .models import Aluno, Servidor, Digital

# --- SERIALIZERS EXISTENTES (SEM MUDANÇAS) ---

class DigitalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Digital
        fields = ['sensor_id']

class AlunoSerializer(serializers.ModelSerializer):
    digitais_count = serializers.SerializerMethodField()

    class Meta:
        model = Aluno
        fields = ['id', 'nome_completo', 'matricula', 'turma', 'digitais_count']

    def get_digitais_count(self, obj):
        return obj.digitais.count()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username'] # Removido first_name para consistência, nome_completo vem do Servidor

# Serializer para listar/detalhar Servidores
class ServidorSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True) # user é apenas para leitura aqui
    digitais_count = serializers.SerializerMethodField()

    class Meta:
        model = Servidor
        fields = ['id', 'nome_completo', 'user', 'digitais_count']

    def get_digitais_count(self, obj):
        return obj.digitais.count()

# --- SERIALIZER DE REGISTRO (VERSÃO CORRIGIDA) ---
# Este serializer agora lida com a criação de um Servidor e seu User associado.
class ServidorRegisterSerializer(serializers.ModelSerializer):
    # Campos que vamos receber do frontend. Nenhum deles pertence diretamente ao modelo Servidor,
    # por isso são 'write_only'.
    username = serializers.CharField(write_only=True, required=True)
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    class Meta:
        model = Servidor
        # O 'nome_completo' é o único campo que de fato pertence ao modelo Servidor
        fields = ('nome_completo', 'username', 'password')

    def validate_username(self, value):
        """ Valida se o nome de usuário já existe para evitar erros de banco de dados. """
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Este nome de usuário já está em uso.")
        return value

    @transaction.atomic # Garante que ou tudo é criado com sucesso, ou nada é salvo.
    def create(self, validated_data):
        """
        Cria um novo objeto User e depois um objeto Servidor associado a ele.
        """
        # Cria o usuário com o método seguro que criptografa a senha
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password']
        )
        # Define o usuário como staff para que possa acessar o admin do Django, se necessário
        user.is_staff = True
        user.save()

        # Cria o servidor, associando o usuário recém-criado
        servidor = Servidor.objects.create(
            user=user,
            nome_completo=validated_data['nome_completo']
        )
        return servidor