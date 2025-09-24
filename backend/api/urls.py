# api/urls.py

from django.urls import path
from . import views
from .views import AlunoListCreate, AlunoRetrieveUpdateDestroy, AssociateFingerprintView, FingerprintLoginView, DeleteStudentFingerprintsView, DeleteServerFingerprintsView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    # Rotas de Autenticação (Login)
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/fingerprint/', FingerprintLoginView.as_view(), name='token_fingerprint'),

    # Rotas para Alunos (CRUD completo)
    path('alunos/', views.AlunoListCreate.as_view(), name='aluno-list-create'),
    path('alunos/<int:pk>/', views.AlunoRetrieveUpdateDestroy.as_view(), name='aluno-detail'),
    path('alunos/<int:aluno_id>/delete-fingerprints/', views.DeleteStudentFingerprintsView.as_view(), name='delete-student-fingerprints'),

    # Rotas para Servidores (CRUD completo para Admins)
    path('servidores/', views.ServidorList.as_view(), name='servidor-list'),
    path('servidores/register/', views.ServidorRegisterView.as_view(), name='servidor-register'),
    path('servidores/<int:pk>/', views.ServidorRetrieveUpdateDestroy.as_view(), name='servidor-detail'),
    path('servidores/<int:servidor_id>/delete-fingerprints/', views.DeleteServerFingerprintsView.as_view(), name='delete-server-fingerprints'),

    # ROTAS PARA COMANDOS DO HARDWARE
    # path('hardware/start-enroll/', views.StartEnrollView.as_view(), name='start-enroll'),
    # path('hardware/delete-fingerprint/', views.DeleteFingerprintView.as_view(), name='delete-fingerprint'),
    path('digitais/associar/', AssociateFingerprintView.as_view(), name='associate-fingerprint'),
    path('hardware/clear-all-fingerprints/', views.ClearAllFingerprintsView.as_view(), name='clear-all-fingerprints'),

    # ROTAS PARA INICIAR AÇÕES CRÍTICAS (COM CONFIRMAÇÃO BIOMÉTRICA)
    path('actions/initiate-delete-by-turma/', views.InitiateDeleteByTurmaView.as_view(), name='initiate-delete-by-turma'),
    path('actions/initiate-clear-all/', views.InitiateClearAllView.as_view(), name='initiate-clear-all'),
]