# Projeto LancheGO: Status de Desenvolvimento

---

## 🐞 Erros e Análises (21/09/2025)

### **1. Falha ao associar digital**

- **Problema:** Ao associar uma digital, o dispositivo registra a digital com sucesso, mas o vínculo com o usuário no banco de dados falha. Isso resulta em digitais "sem dono" que não podem ser apagadas via interface.
- **Log de Erro:**

        page.tsx:170  POST http://127.0.0.1:8000/api/digitais/associar/ 500 (Internal Server Error)
        dispatchXhrRequest @ xhr.js:209
        xhr @ xhr.js:26
        dispatchRequest @ dispatchRequest.js:61
        Promise.then
        _request @ Axios.js:172
        request @ Axios.js:49
        httpMethod @ Axios.js:233
        wrap @ bind.js:9
        handleAssociateFingerprint @ page.tsx:170
        ws.current.onmessage @ page.tsx:76Understand this error
        page.tsx:180 Falha ao associar digital: AxiosError {message: 'Request failed with status code 500', name: 'AxiosError', code: 'ERR_BAD_RESPONSE', config: {…}, request: XMLHttpRequest, …}

- **Análise:** O erro `500 Internal Server Error` aponta para um problema no **backend (Django)**. A lógica de associação de digitais (provavelmente no endpoint `/api/digitais/associar/`) falha ao salvar a associação no banco de dados. Isso pode ser causado por um erro na manipulação da transação, uma restrição de chave estrangeira, ou um bug na lógica que vincula a digital ao servidor.

### **2. Problemas de atualização do modal em Gestão de Servidores**

- **Problema:** Após cadastrar a primeira digital, o modal de edição não atualiza. É necessário fechá-lo e reabri-lo para que o botão "Cadastrar 2º Digital" apareça.
- **Análise:** Trata-se de um problema no **frontend (React)**. O estado da interface (modal) não está sendo atualizado após o sucesso da operação de cadastro da digital. O `modal` precisa ser re-renderizado com as novas informações, o que exige um controle de estado eficiente.

### **3. Falha ao cadastrar novo servidor**

- **Problema:** Ao cadastrar um novo servidor na página "Adicionar Servidor", a operação falha, e o frontend exibe um alerta genérico.
- **Log de Erro:**

        POST http://127.0.0.1:8000/api/servidores/register/ 500 (Internal Server Error)
        dispatchXhrRequest @ xhr.js:209
        xhr @ xhr.js:26
        dispatchRequest @ dispatchRequest.js:61
        Promise.then
        _request @ Axios.js:172
        request @ Axios.js:49
        httpMethod @ Axios.js:233
        wrap @ bind.js:9
        handleSaveServer @ page.tsx:125
        callCallback @ react-dom.development.js:20565
        invokeGuardedCallbackImpl @ react-dom.development.js:20614
        invokeGuardedCallback @ react-dom.development.js:20689
        invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:20703
        executeDispatch @ react-dom.development.js:32128
        processDispatchQueueItemsInOrder @ react-dom.development.js:32160
        processDispatchQueue @ react-dom.development.js:32173
        dispatchEventsForPlugins @ react-dom.development.js:32184
        eval @ react-dom.development.js:32374
        batchedUpdates$1 @ react-dom.development.js:24953
        batchedUpdates @ react-dom.development.js:28844
        dispatchEventForPluginEventSystem @ react-dom.development.js:32373
        dispatchEvent @ react-dom.development.js:30141
        dispatchDiscreteEvent @ react-dom.development.js:30112Understand this error
        page.tsx:131 Falha ao salvar servidor: AxiosError {message: 'Request failed with status code 500', name: 'AxiosError', code: 'ERR_BAD_RESPONSE', config: {…}, request: XMLHttpRequest, …}


- **Análise:** Assim como na associação da digital, o erro `500` indica uma falha no **backend** ao processar a requisição `POST` para `/api/servidores/register/`. O problema não está relacionado à validação de senha no frontend, mas sim a uma exceção não tratada na lógica de registro do Django. Possíveis causas incluem validação falha no modelo, um campo obrigatório faltando ou um erro na transação de banco de dados.

---

## 🛠️ Próximas Implementações

- [ ] **Importação de dados de alunos via planilha:**
  - Desenvolver um processo para importar dados de alunos a partir de uma planilha, de forma recorrente.
  - Implementar uma interface no frontend para que a planilha possa ser enviada ao sistema.
  - Criar uma rotina no backend para ler a planilha, validar os dados e atualizar o banco de dados.
  - O processo deve ser robusto para ser utilizado tanto no ambiente de desenvolvimento quanto em produção.

- [ ] **Filtro de digitais:** Criar filtros para identificar servidores com `0 digitais` (Não Cadastradas) e `1 digital` (Parcialmente Cadastradas). O filtro deve persistir ao longo da navegação.

---

## 🐛 Correções Futuras

- [ ] Impedir a exclusão de servidores se restarem apenas o superusuário e mais um.
- [ ] Adicionar um campo de confirmação de senha (`"digite a senha novamente"`).
- [ ] Implementar a exclusão em lote de servidores com base nos filtros.
- [ ] Corrigir o indicador de status do leitor na página de Alunos.

---

## 🎨 Correções de Layout

- [ ] Melhorar o contraste e destaque das cores na página de Distribuição de Lanches.

---

## ⚠️ Assuntos Importantes

### **Processo do Redis**
- **Sintoma:** O comando `redis-server` na linha de comando falha porque o Redis já está rodando como um serviço do Windows.
- **Solução:** Em vez de iniciar o servidor manualmente, use o cliente `redis-cli.exe` para interagir com a instância que já está em execução. Verifique a porta com `netstat -ano | findstr 6379`.

### **Gerenciamento de Processos**
- **Dúvida:** Como rodar comandos de execução contínua (`listen_serial`) sem precisar ficar com o terminal aberto?
- **Resposta:** Use um gerenciador de processos para rodar o comando em segundo plano. Opções incluem:
  - **`tmux` ou `screen` (Linux/WSL):** Para manter a sessão ativa.
  - **Serviço do Windows:** Para rodar a aplicação em segundo plano automaticamente.

### **Funcionalidade de Apagar Digitais** 
- **Necessidade:** Implementar a funcionalidade de apagar digitais, com opções para:
  - Apagar **todas as digitais** (dentro do painel de superusuário).
  - Apagar digitais **por filtro** (ex: por turma). --Pedir digital do servidor--

### **Acesso ao Banco de Dados em Rede Local**
- **Consideração:** O banco de dados precisará estar acessível na rede local, não apenas na máquina onde o servidor está rodando.
- **Solução:**
  - **Configure o banco de dados:** Use um banco de dados que suporte acesso em rede, como o PostgreSQL ou MySQL. Se usar o SQLite (padrão do Django), a abordagem é mais complexa e não recomendada para acesso remoto.
  - **Ajuste o `settings.py`:** Edite a configuração `DATABASES` para apontar para o endereço IP da máquina do banco de dados na rede local, e não para `127.0.0.1`.
