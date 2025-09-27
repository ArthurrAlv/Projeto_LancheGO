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
  * Avaliar se esse recurso deve estar no **superuser** ou em **servidores**. Melhor que seja no superuser!
  * A implementação precisa ser robusta, compatível com **ambiente de desenvolvimento** e **produção**.
  * **Nota:** Verificar se o Django já oferece uma solução adequada.
  * A planilha não vai ter Matricula, então teremos que tirar. Pra não imterromper ou dar trabalho, talvez seja o caso de mudar para numeração mesmo, um marcador aleatório ou sequencial mesmo, ex: "id". A planilha não vai ter escrito turma como "3º Ano Eletro". Ela tem outro codinome exemplo "MIEL125IA". Teremos que tratar isso. Outro detalhe é que na planilha terá mais informações e sobre precisaremos de Nome(nome_completo), Turma. As turma são: 1º eletro(MIEL125IA), 2º eletro(MIEL124IA), 3º eltro(MIEL123IA); 1º info(MIII125IA), 2º info(MIII124IA), 3º info(MIII123IA); - "25, 24, 23" seria o ano que ingressou na escola então há um padrão pra proximas inserções de planilha.

* [ ] **Filtro de Digitais (Alunos)**

  * Criar filtros para identificar:

    * Alunos com **0 digitais** → *Não cadastrados*.
    * Alunos com **1 digital** → *Parcialmente cadastrados*.
  * O filtro deve **persistir durante a navegação**.

---

* **Página Administrators:**

  * Remover a forma atual de exibir o **Superuser**.
  * Torná-lo visível novamente, mas com **marcação de “superuser”**.
  * Qualquer alteração deve **exigir senha do superuser**.
  * **Superuser não pode ser excluído**.
  * implementar inserção de um novo superusuario(limite 3), mas com solicitação de senha do superuser. Ou isso não é necessario? Após implementado, tem como acessar o painel do django e fazer o processo? Criar um servidor e ir no django para marca-lo como superuser. Qual é a melhor forma?

* **Fluxo de Adição de Servidor:**

  * Aplicar o mesmo padrão de **adição de aluno + digital**.
  * Ou seja, ao cadastrar servidor, também forçar o cadastro da digital em sequência.

---

## 🎨 Correções de Usabilidade

* Ajustar a página do **Superuser**:

  * Atualmente há **duas opções de “Sair”**.
  * Melhor solução: o **cabeçalho** deve mudar o botão “Sair” para **sair da página do Superuser**, sem confundir com o logout de servidor.
  * Muitas das vezes tenho que fazer login novamente, porém se preciso porque já não joga na pagina de login ao invez de me permitir acessar a pagina porém sem ver os dados. Pode desconectar, mas direcione a pagina de login. Ou isso acontece pois estou construindo, ele não esta instaldo, fase de desenvolvimento?

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

