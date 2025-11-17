# 📌 Projeto LancheGO — Status de Desenvolvimento

---

## 🐞 Erros e Análises (02/10/2025)

*(Registrar aqui os erros detectados com data e análise do problema. A seção serve como histórico de bugs encontrados e diagnosticados.)*

* **Correções críticas:**

O objetivo principal é corrigir funcionalidades que pararam de funcionar corretamente após a implementação da detecção automática da porta serial do hardware.

Os problemas notados são:


* **Correções para Decidir:*
1.  **Regras de Permissão Incorretas:** O objetivo era implementar novas regras de segurança, QUE JÁ EXISTEM, como na exclusão em massa dos alunos, mas não nos pontos abaixo:
    * Apenas `superusers` podem cadastrar, apagar alunos ou editar(pedir digital de superuser como confirmação como na exlusão em massa). - O login dirá -


----------




* *Correções de Usabilidade*
1.  * Corrigir sons, muito ruim sempre ter que clicar na tela para eles funcionarem. Procurar uma melhor opção. Não tem, talvez colocar um botão de enfeite pra clicar.

- 



---

* **Página Administrators:**

  * (http://127.0.0.1:8000/admin/) Tanto esse link quanto os outros (http://localhost:3000/dashboard) tem como mascarar esse nome pra outro? http://lanchego.bd/... e http://lanchego/dash...?  

* **Fluxo de Adição de Servidor:**

  * Aplicar o mesmo padrão de **adição de aluno + digital**. Ou seja, ao cadastrar servidor, também forçar o cadastro da digital em sequência.

---

## 🎨 Correções de Usabilidade


-----

## **Correções de Futuras**

*Implementar pequenos times de carregamento certas ações para melhorar o tempo de resposta da pagina com o dispositivo.

****https://g.co/gemini/share/6b29d1ed8178****

***https://www.docker.com/***

---

## 🎨 Correções de Layout



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

