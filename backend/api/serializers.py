# api/serializers.py

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Aluno, Servidor, Digital

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

# Serializer para o modelo User do Django
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name']

# Serializer para o nosso modelo Servidor, incluindo os dados do User
class ServidorSerializer(serializers.ModelSerializer):
    user = UserSerializer()
    digitais_count = serializers.SerializerMethodField()

    class Meta:
        model = Servidor
        fields = ['id', 'nome_completo', 'user', 'digitais_count']

    def get_digitais_count(self, obj):
        return obj.digitais.count()

# Serializer específico para criar novos Servidores (com senha)
class ServidorRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    username = serializers.CharField(source='user.username', required=True)
    nome_completo = serializers.CharField(source='user.first_name', required=True)

    class Meta:
        model = User
        fields = ('username', 'password', 'nome_completo')

    def create(self, validated_data):
        user_data = validated_data.pop('user')
        user = User.objects.create_user(
            username=user_data['username'],
            password=validated_data['password'],
            first_name=user_data['first_name']
        )
        # Linkamos o Servidor ao User recém-criado
        Servidor.objects.create(user=user, nome_completo=user_data['first_name'])
        return user