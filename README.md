# 📌 Projeto LancheGO — Status de Desenvolvimento

---

## 🐞 Erros e Análises (02/10/2025)

*(Registrar aqui os erros detectados com data e análise do problema. A seção serve como histórico de bugs encontrados e diagnosticados.)*

* **Correções críticas:**

O objetivo principal é corrigir funcionalidades que pararam de funcionar corretamente após a implementação da detecção automática da porta serial do hardware.

Os problemas notados são:

1.  **Status do Leitor Não Atualiza Automaticamente:** O indicador de "Leitor Conectado" / "Leitor Desconectado" nas páginas web (`/dashboard`, `/students`, `/administrators`) não reflete mais o estado real do dispositivo em tempo real. Ele só atualiza o status corretamente se o dispositivo for desconectado e reconectado com a página aberta.

3.  **Regras de Permissão Incorretas:** O objetivo era implementar novas regras de segurança, QUE JÁ EXISTEM, como na exclusão em massa dos alunos, mas não nos pontos abaixo:
    * Apenas `superusers` podem cadastrar, apagar alunos ou editar(pedir digital de superuser como confirmação como na exlusão em massa). - O login dirá -

    * Corrigir sons, muito ruim sempre ter que clicar na tela para eles funcionarem. Procurar uma melhor opção.

---

* **Página Administrators:**

  * Remover a forma atual de exibir o **Superuser**.
  * Torná-lo visível novamente, mas com **marcação de “superuser”**.
  * Qualquer alteração deve **exigir senha do superuser**.
  * **Superuser não pode ser excluído**.
  * implementar inserção de um novo superusuario(limite 3), mas com solicitação de senha do superuser. Ou isso não é necessario? Após implementado, tem como acessar o painel do django e fazer o processo? Criar um servidor e ir no django para marca-lo como superuser. Qual é a melhor forma?

* **Fluxo de Adição de Servidor:**

  * Aplicar o mesmo padrão de **adição de aluno + digital**. Ou seja, ao cadastrar servidor, também forçar o cadastro da digital em sequência.

---

## 🎨 Correções de Usabilidade

* Muitas vezes o sistema me pede login novamente. O problema é que, quando isso acontece, ele me deixa continuar na página mas sem mostrar os dados e as vezes me mostra dados. O certo seria me desconectar e já me levar direto para a página de login, em vez de deixar a tela carregada sem nada ou com algo porém sem permissão. Segue a mesagem do terminal que ajuda você a entender o que digo:

2025-10-02 20:57:16,928 WARNING  Unauthorized: /api/alunos/17/
127.0.0.1:57275 - - [02/Oct/2025:20:57:16] "DELETE /api/alunos/17/" 401 172
Unauthorized: /api/alunos/17/
2025-10-02 20:57:21,846 WARNING  Unauthorized: /api/alunos/17/
127.0.0.1:57275 - - [02/Oct/2025:20:57:21] "DELETE /api/alunos/17/" 401 172
Unauthorized: /api/alunos/17/
2025-10-02 20:57:25,778 WARNING  Unauthorized: /api/alunos/17/
127.0.0.1:57275 - - [02/Oct/2025:20:57:25] "DELETE /api/alunos/17/" 401 172

 
Acho melhor que o sistema só peça login novamente quando eu fechar a página ou reiniciar o computador. Durante o uso normal, depois que eu já fiz o login, não é pra ficar desconectando sozinho.
-----


* Quero que na pagina students apareça o nome da turma completa, ex: "1º Ano Eletro".

* Ajustar a página do **Superuser**:

  * Atualmente há **duas opções de “Sair”**.
  * Melhor solução: o **cabeçalho** deve mudar o botão “Sair” para **sair da página do Superuser**, sem confundir com o logout de servidor.


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

