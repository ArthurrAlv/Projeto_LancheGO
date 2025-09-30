# 📌 Projeto LancheGO — Status de Desenvolvimento

---

## 🐞 Erros e Análises (21/09/2025)

*(Registrar aqui os erros detectados com data e análise do problema. A seção serve como histórico de bugs encontrados e diagnosticados.)*

* **Correções críticas:**

  * Botão de cadastro de digital não está conseguindo estabelecer/pedir conexão com o dispositivo. Só fica disponivel quando eu reinicio o dispositivo.
  * Corrigir: não permitir que servidor apague aluno, permitir que o Superuser faça isso com sua confirmação de digital. O mesmo se aplica para apagar digital do aluno.
  * Corrigir: Não permitir que servidor cadastre novo aluno. Apenas o superuser(com confirmação de digital também).

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
* Status do leitor parou de funcionar novamente
* Corrigir sons, muito ruim sempre ter que clicar na tela para eles funcionarem

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

