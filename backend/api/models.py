# api/models.py

from django.db import models
from django.contrib.auth.models import User

# Modelo para os Operadores do Sistema (Servidores)
class Servidor(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    nome_completo = models.CharField(max_length=255)

    def __str__(self):
        return self.nome_completo

# Modelo para os Alunos
class Aluno(models.Model):
    # Opções para o campo 'turma'
    TURMAS_CHOICES = [
        ('1E', '1º Ano Eletro'),
        ('2E', '2º Ano Eletro'),
        ('3E', '3º Ano Eletro'),
        ('1I', '1º Ano Info'),
        ('2I', '2º Ano Info'),
        ('3I', '3º Ano Info'),
    ]

    nome_completo = models.CharField(max_length=255)
    matricula = models.CharField(max_length=50, unique=True, null=True, blank=True) # Alterado
    turma = models.CharField(max_length=2, choices=TURMAS_CHOICES)

    def __str__(self):
        return self.nome_completo

# Modelo que armazena cada digital e a quem ela pertence
class Digital(models.Model):
    sensor_id = models.IntegerField(primary_key=True)
    aluno = models.ForeignKey(Aluno, on_delete=models.CASCADE, null=True, blank=True, related_name='digitais')
    servidor = models.ForeignKey(Servidor, on_delete=models.CASCADE, null=True, blank=True, related_name='digitais')

    def __str__(self):
        if self.aluno:
            return f"Digital ID {self.sensor_id} - Aluno: {self.aluno.nome_completo}"
        elif self.servidor:
            return f"Digital ID {self.sensor_id} - Servidor: {self.servidor.nome_completo}"
        return f"Digital ID {self.sensor_id} - Não associada"

# Modelo para registrar cada retirada de lanche
class RegistroRetirada(models.Model):
    aluno = models.ForeignKey(Aluno, on_delete=models.CASCADE)
    data_retirada = models.DateTimeField(auto_now_add=True) # Salva a data e hora automaticamente

    def __str__(self):
        return f"Retirada de {self.aluno.nome_completo} em {self.data_retirada.strftime('%d/%m/%Y %H:%M')}"