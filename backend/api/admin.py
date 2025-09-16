# api/admin.py (Versão Final Melhorada)

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import Servidor, Aluno, Digital, RegistroRetirada

# Define um "inline" para o modelo Servidor.
class ServidorInline(admin.StackedInline):
    model = Servidor
    can_delete = False
    verbose_name_plural = 'Perfil do Servidor'

# Define uma nova classe de admin para o User que inclui o ServidorInline
class UserAdmin(BaseUserAdmin):
    inlines = (ServidorInline,)

# Re-registra o admin do User com nossa versão personalizada
admin.site.unregister(User)
admin.site.register(User, UserAdmin)


# Melhora a exibição dos Alunos no painel de admin
@admin.register(Aluno)
class AlunoAdmin(admin.ModelAdmin):
    list_display = ('nome_completo', 'matricula', 'turma')
    search_fields = ('nome_completo', 'matricula')
    list_filter = ('turma',)

# Melhora a exibição das Digitais
@admin.register(Digital)
class DigitalAdmin(admin.ModelAdmin):
    list_display = ('sensor_id', 'aluno', 'servidor')
    search_fields = ('aluno__nome_completo', 'servidor__user__username')

# Registra o modelo de Retirada
admin.site.register(RegistroRetirada)