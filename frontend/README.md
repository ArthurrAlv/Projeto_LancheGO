# 📌 Projeto LancheGO — Status de Desenvolvimento

---

## 🐞 Erros e Análises (21/09/2025)

*(Registrar aqui os erros detectados com data e análise do problema. A seção serve como histórico de bugs encontrados e diagnosticados.)*

---

## 🛠️ Próximas Implementações

* [ ] **Importação de Dados de Alunos via Planilha**

  * Desenvolver um processo de importação recorrente a partir de planilhas.
  * Implementar interface no frontend para upload da planilha.
  * Lidar com diferenças nos dados da planilha (ex.: nome da turma diferente do padrão interno).
  * Avaliar se esse recurso deve estar no **superuser** ou em **servidores**.
  * A implementação precisa ser robusta, compatível com **ambiente de desenvolvimento** e **produção**.
  * **Nota:** Verificar se o Django já oferece uma solução adequada (ex.: `django-import-export`).

* [ ] **Filtro de Digitais (Alunos)**

  * Criar filtros para identificar:

    * Alunos com **0 digitais** → *Não cadastrados*.
    * Alunos com **1 digital** → *Parcialmente cadastrados*.
  * O filtro deve **persistir durante a navegação**.

---

## 🔑 Funcionalidade de Apagar Digitais

* Implementar exclusão de **alunos e suas digitais** **por filtro** (ex.: por turma).

  * Exigir **digital de servidor (superuser)** para confirmar exclusão. ⚠️
* Implementar exclusão de **todas as digitais**.

  * Também deve exigir confirmação com **digital de superuser**. ⚠️

---

## 🐛 Correções Necessárias

* **Página Administrators:**

  * Remover a forma atual de exibir o **Superuser**.
  * Torná-lo visível novamente, mas com **marcação de “superuser”**.
  * Qualquer alteração deve **exigir senha do superuser**.
  * **Superuser não pode ser excluído**.

* **Fluxo de Adição de Servidor:**

  * Aplicar o mesmo padrão de **adição de aluno + digital**.
  * Ou seja, ao cadastrar servidor, também forçar o cadastro da digital em sequência.

---

## 🎨 Correções de Usabilidade

* Ajustar a página do **Superuser**:

  * Atualmente há **duas opções de “Sair”**.
  * Melhor solução: o **cabeçalho** deve mudar o botão “Sair” para **sair da página do Superuser**, sem confundir com o logout de servidor.

---

## 🎨 Correções de Layout

* Melhorar **contraste** e **destaque das cores** na página de **Distribuição de Lanches**.

---

## 🚀 Etapa Final

* Preparar o projeto para **rodar localmente em máquina de produção** assim que o desenvolvimento for concluído.

---

## 🌐 Acesso ao Banco de Dados em Rede Local

* **Consideração:** O banco precisa estar acessível na rede local, não apenas na máquina do servidor.
* **Solução:**

  * Usar banco que suporte acesso em rede (**PostgreSQL** ou **MySQL**).
  * Evitar SQLite (não recomendado para acesso remoto).
  * Ajustar `settings.py` → em `DATABASES`, trocar `127.0.0.1` pelo **IP da máquina do banco** na rede local.

---

