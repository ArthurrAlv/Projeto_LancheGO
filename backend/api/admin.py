# api/admin.py (Versão Melhorada)

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import Servidor, Aluno, Digital, RegistroRetirada

# Define um "inline" para o modelo Servidor.
# Isso permite que ele seja editado na mesma página que o User.
class ServidorInline(admin.StackedInline):
    model = Servidor
    can_delete = False
    verbose_name_plural = 'servidores'

# Define uma nova classe de admin para o User que inclui o ServidorInline
class UserAdmin(BaseUserAdmin):
    inlines = (ServidorInline,)

# Re-registra o admin do User com nossa versão personalizada
admin.site.unregister(User)
admin.site.register(User, UserAdmin)

# Registra os outros modelos para que apareçam na interface de administração
@admin.register(Aluno)
class AlunoAdmin(admin.ModelAdmin):
    list_display = ('nome_completo', 'matricula', 'turma')
    search_fields = ('nome_completo', 'matricula')

@admin.register(Digital)
class DigitalAdmin(admin.ModelAdmin):
    list_display = ('sensor_id', 'aluno', 'servidor')

admin.site.register(RegistroRetirada)