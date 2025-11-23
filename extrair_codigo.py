import os

# Lista dos arquivos essenciais para as correções solicitadas
arquivos_para_ler = [
    # Backend - Lógica e Banco de Dados
    'backend/api/models.py',
    'backend/api/views.py',
    'backend/api/serializers.py',
    'backend/api/urls.py',
    'backend/api/management/commands/listen_serial.py', # O Cérebro do Hardware
    
    # Frontend - Interfaces
    'frontend/app/administrators/page.tsx', # Onde estão os bugs de servidor
    'frontend/app/students/page.tsx',       # Para comparação (modelo funcional)
    'frontend/context/AuthContext.tsx',     # Permissões
    'frontend/components/navigation.tsx',
    
    # Configurações
    'backend/lanchego_project/settings.py'
]

nome_arquivo_saida = 'contexto_projeto.txt'

def extrair_conteudo():
    with open(nome_arquivo_saida, 'w', encoding='utf-8') as arquivo_saida:
        for caminho in arquivos_para_ler:
            arquivo_saida.write(f"{'='*20} INICIO ARQUIVO: {caminho} {'='*20}\n")
            
            if os.path.exists(caminho):
                try:
                    with open(caminho, 'r', encoding='utf-8') as arquivo_entrada:
                        conteudo = arquivo_entrada.read()
                        arquivo_saida.write(conteudo)
                except Exception as e:
                    arquivo_saida.write(f"ERRO AO LER ARQUIVO: {e}")
            else:
                arquivo_saida.write("ARQUIVO NÃO ENCONTRADO.")
            
            arquivo_saida.write(f"\n{'='*20} FIM ARQUIVO: {caminho} {'='*20}\n\n")

    print(f"Arquivo '{nome_arquivo_saida}' gerado com sucesso!")

if __name__ == "__main__":
    extrair_conteudo()
