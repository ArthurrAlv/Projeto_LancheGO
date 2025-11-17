import os
import pathspec

# --------------------------------------
# 🔧 Funções auxiliares
# --------------------------------------

def get_gitignore_spec(base_path):
    """Lê o .gitignore e retorna o PathSpec com padrões adicionais."""
    gitignore_path = os.path.join(base_path, ".gitignore")
    patterns = []
    if os.path.exists(gitignore_path):
        with open(gitignore_path, "r", encoding="utf-8") as f:
            patterns = f.read().splitlines()

    # Padrões extras para garantir que builds e caches sejam ignorados
    patterns.extend([
        "venv/", "node_modules/", "__pycache__/",
        ".next/", "dist/", "build/", "staticfiles/",
        ".DS_Store", "*.lock"
    ])
    return pathspec.PathSpec.from_lines("gitwildmatch", patterns)


def is_functional_file(filename):
    """Retorna True apenas para arquivos realmente editáveis."""
    functional_exts = (".py", ".ts", ".tsx", ".js", ".mjs", ".json", ".css")
    excluded_exts = (
        ".map", ".svg", ".png", ".jpg", ".jpeg", ".gif",
        ".ico", ".woff", ".woff2", ".ttf", ".eot",
        ".txt", ".md", ".rst", ".pdf", ".csv", ".sql",
        ".sqlite3", ".rdb"
    )

    name = os.path.basename(filename).lower()
    if name.startswith("000") and "migrations" in filename:
        return False
    if name in ("db.sqlite3", "dump.rdb"):
        return False
    return filename.endswith(functional_exts) and not filename.endswith(excluded_exts)


def list_relevant_files(base_dir, spec):
    """Percorre a árvore e coleta apenas arquivos realmente úteis."""
    relevant_files = []

    ignored_dirs = {
        "staticfiles", "__pycache__", "node_modules",
        ".next", "dist", "build", "venv"
    }

    for root, dirs, files in os.walk(base_dir):
        # remove pastas indesejadas para não descer nelas
        dirs[:] = [d for d in dirs if d not in ignored_dirs]

        for file in files:
            rel_path = os.path.relpath(os.path.join(root, file), base_dir)
            if not spec.match_file(rel_path) and is_functional_file(rel_path):
                relevant_files.append(rel_path)

    return sorted(relevant_files)


# --------------------------------------
# 🚀 Execução principal
# --------------------------------------

if __name__ == "__main__":
    project_root = os.getcwd()
    spec = get_gitignore_spec(project_root)

    backend_path = os.path.join(project_root, "backend")
    frontend_path = os.path.join(project_root, "frontend")

    if os.path.exists(backend_path):
        print("\n Arquivos funcionais do BACKEND:\n")
        for file in list_relevant_files(backend_path, spec):
            print(f"- backend/{file}")

    if os.path.exists(frontend_path):
        print("\n Arquivos funcionais do FRONTEND:\n")
        for file in list_relevant_files(frontend_path, spec):
            print(f"- frontend/{file}")

    print("\n✅ Listagem concluída.")


# backend\venv\Scripts\python listar_arquivos.py (LancheGO_Projeto)