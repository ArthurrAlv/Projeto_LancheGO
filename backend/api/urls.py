# api/urls.py

from django.urls import path
from . import views

# --- MUDANÇA: Simplificando os imports, já que algumas views serão removidas ---
from .views import (
    AlunoListCreate, AlunoRetrieveUpdateDestroy, AlunoUploadPlanilhaView,
    ServidorList, ServidorRegisterView, ServidorRetrieveUpdateDestroy,
    AssociateFingerprintView, FingerprintLoginView,
    InitiateDeleteByTurmaView, InitiateClearAllView,
    InitiateDeleteStudentFingerprintsView, InitiateDeleteServerFingerprintsView, # Novas views
    RegistrosDeHojeView, InitiateDeleteStudentView, InitiateDeleteServerView 
)

from rest_framework_simplejwt.views import TokenRefreshView
from .views import MyTokenObtainPairView # Importa a nossa view customizada

urlpatterns = [
    # Rotas de Autenticação (Login)
    path('token/', views.MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/fingerprint/', FingerprintLoginView.as_view(), name='token_fingerprint'),

    # Rotas para Alunos
    path('alunos/', views.AlunoListCreate.as_view(), name='aluno-list-create'),
    path('alunos/<int:pk>/', views.AlunoRetrieveUpdateDestroy.as_view(), name='aluno-detail'),
    path('alunos/upload-planilha/', views.AlunoUploadPlanilhaView.as_view(), name='aluno-upload-planilha'),

    # Rotas para Servidores
    path('servidores/', views.ServidorList.as_view(), name='servidor-list'),
    path('servidores/register/', views.ServidorRegisterView.as_view(), name='servidor-register'),
    path('servidores/<int:pk>/', views.ServidorRetrieveUpdateDestroy.as_view(), name='servidor-detail'),

    # Rotas para Ações de Hardware
    path('digitais/associar/', AssociateFingerprintView.as_view(), name='associate-fingerprint'),

    # --- ROTAS SEGURAS PARA INICIAR AÇÕES CRÍTICAS (COM CONFIRMAÇÃO BIOMÉTRICA) ---
    path('actions/initiate-clear-all/', views.InitiateClearAllView.as_view(), name='initiate-clear-all'),
    path('actions/initiate-delete-by-turma/', views.InitiateDeleteByTurmaView.as_view(), name='initiate-delete-by-turma'),
    # --- NOVO: Rotas para iniciar a exclusão de digitais de um único usuário ---
    path('actions/initiate-delete-student-fingerprints/<int:aluno_id>/', views.InitiateDeleteStudentFingerprintsView.as_view(), name='initiate-delete-student-fingerprints'),
    path('actions/initiate-delete-server-fingerprints/<int:servidor_id>/', views.InitiateDeleteServerFingerprintsView.as_view(), name='initiate-delete-server-fingerprints'),
    # --- Rota: confirmação de exclusão de aluno
    path('actions/initiate-delete-student/<int:aluno_id>/', views.InitiateDeleteStudentView.as_view(), name='initiate-delete-student'),
    # --- Rota: confirmação de exclusão de servidor
    path('actions/initiate-delete-server/<int:servidor_id>/', views.InitiateDeleteServerView.as_view(), name='initiate-delete-server'),


    path('registros/hoje/', views.RegistrosDeHojeView.as_view(), name='registros-hoje'),
]