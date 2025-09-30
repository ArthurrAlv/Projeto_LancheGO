# api/urls.py

from django.urls import path
from . import views

# --- MUDANÇA: Simplificando os imports, já que algumas views serão removidas ---
from .views import (
    AlunoListCreate, AlunoRetrieveUpdateDestroy,
    ServidorList, ServidorRegisterView, ServidorRetrieveUpdateDestroy,
    AssociateFingerprintView, FingerprintLoginView,
    InitiateDeleteByTurmaView, InitiateClearAllView,
    InitiateDeleteStudentFingerprintsView, InitiateDeleteServerFingerprintsView # Novas views
)
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    # Rotas de Autenticação (Login)
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
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

    # --- MUDANÇA: ROTAS ANTIGAS E INSEGURAS FORAM REMOVIDAS ---
    # path('alunos/<int:aluno_id>/delete-fingerprints/', ...),
    # path('servidores/<int:servidor_id>/delete-fingerprints/', ...),
    # path('hardware/clear-all-fingerprints/', ...),

    # --- ROTAS SEGURAS PARA INICIAR AÇÕES CRÍTICAS (COM CONFIRMAÇÃO BIOMÉTRICA) ---
    path('actions/initiate-clear-all/', views.InitiateClearAllView.as_view(), name='initiate-clear-all'),
    path('actions/initiate-delete-by-turma/', views.InitiateDeleteByTurmaView.as_view(), name='initiate-delete-by-turma'),
    # --- NOVO: Rotas para iniciar a exclusão de digitais de um único usuário ---
    path('actions/initiate-delete-student-fingerprints/<int:aluno_id>/', views.InitiateDeleteStudentFingerprintsView.as_view(), name='initiate-delete-student-fingerprints'),
    path('actions/initiate-delete-server-fingerprints/<int:servidor_id>/', views.InitiateDeleteServerFingerprintsView.as_view(), name='initiate-delete-server-fingerprints'),
]