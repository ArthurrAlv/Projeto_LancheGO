import os
import pathspec

def get_gitignore_spec(base_path):
    gitignore_path = os.path.join(base_path, '.gitignore')
    patterns = []
    if os.path.exists(gitignore_path):
        with open(gitignore_path, 'r', encoding='utf-8') as f:
            patterns = f.read().splitlines()
    # Adiciona extras
    patterns.extend(['venv/', 'node_modules/', '__pycache__/', '.next/'])
    return pathspec.PathSpec.from_lines('gitwildmatch', patterns)

def list_relevant_files(base_dir, spec):
    relevant_files = []
    for root, _, files in os.walk(base_dir):
        for file in files:
            rel_path = os.path.relpath(os.path.join(root, file), base_dir)
            if not spec.match_file(rel_path):
                relevant_files.append(rel_path)
    return relevant_files

if __name__ == '__main__':
    project_root = os.getcwd()
    spec = get_gitignore_spec(project_root)

    print("Listando arquivos pertinentes do backend:")
    backend_path = os.path.join(project_root, 'backend')
    if os.path.exists(backend_path):
        for file in list_relevant_files(backend_path, spec):
            print(f"- backend/{file}")

    print("\nListando arquivos pertinentes do frontend:")
    frontend_path = os.path.join(project_root, 'frontend')
    if os.path.exists(frontend_path):
        for file in list_relevant_files(frontend_path, spec):
            print(f"- frontend/{file}")


# backend\venv\Scripts\python listar_arquivos.py (LancheGO_Projeto)