# Erros que notei no processo de cadastro:
    - Digital com falha ao associar. Desta forma há sucesso no dispositivo, mas não no vínculo da digital no bd. Isso é ruim devido ao fato da digital ficar "sem dono" e o site não conseguir acessa-la pra apagar. Vamoos ter que ver uma forma de resolver isso. Confira o log abaixo sobre o que eu falei:

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

        - Na página de Gestão de Servidores, ao fazer o cadastro da primeira digital o modal não fecha fecha como no do Aluno, até então tudo bem, eu preferi. Porém devido este fato, o botão não atualiza para Cadastrar 2º Digital, eu preciso fechar e ir na edição pra ver o botão mudar pra Cadastrar 2º Digital, e isso é ruim.

    - Ao apagar todas as digitais dentro do modal(Editar Servidor) na página Gestão de Servidores o modal não atualiza. Deve ter relação com o erro acima.

    - Em Adicionar Servidor não está disponivel a mesma funcionalidade que há em aluno; função de seguir pra o cadastro da digital. Neste mesmo local ao cadastrar com uma senha comum aparece um alerte: "Falha ao salvar servidor. Verifique se os dados estão corretos." porem não á regras enquanto a senha, deve adicionar(acho que há um padrão django pra simbolos, letras e número - confirme). Percebi que não te a ver com a senha, antes foi uma coincidência. Veja o log abaixo além do aler "Falha ao salvar servidor. Verifique se os dados estão corretos.":

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


# Implementação após correções:
    - Inserir tabela no bd. Ver uma foram mais prática.

# Correções futuras...
    - Não deixar apagar servidor sem deixar ao menos um(o superuser e mais um).
    - Adicinar "digite a senha novamente" pra comparar.
    - Corrigir Status do Leitor.
    - Implementar apagar em lote após filtragem.

# Correções de Layout importante! - Cores mais destacadas na Distribuição de Lanches


