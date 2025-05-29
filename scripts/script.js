// Animação Scroll
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('show');
        }
    });
});
const itemElements = document.querySelectorAll('.item, .hero h2, .hero p, .hero .btn, h2');
hiddenElements.forEach((el) => observer.observe(el));

/* --------------------------------------------------------------------------- */
// Filtrar Cardápio por Categoria
function filtrarCardapio(categoria) {
    const itens = document.querySelectorAll('#cardapio .itens-cardapio .item');
    const botoesCategoria = document.querySelectorAll('.categorias-cardapio .btn-categoria');

    botoesCategoria.forEach(botao => {
        botao.classList.toggle('active', botao.getAttribute('data-filter') === categoria);
    });

    itens.forEach(item => {
        const itemCategoria = item.getAttribute('data-category');
        item.style.display = (categoria === 'todos' || itemCategoria === categoria) ? '' : 'none';
    });
}

/* --------------------------------------------------------------------------- */
// Modal
function abrirModal(titulo, descricao, preco) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalDesc = document.getElementById('modal-desc');
    const modalPrice = document.getElementById('modal-price');

    if (modal && modalTitle && modalDesc && modalPrice) {
        modalTitle.innerText = titulo || '';
        modalDesc.innerText = descricao || '';
        modalPrice.innerText = preco || '';
        modal.style.display = 'flex';
    }
}

function fecharModal() {
    const modal = document.getElementById('modal');
    if (modal) modal.style.display = 'none';
}

/* --------------------------------------------------------------------------- */
// Variáveis Globais e Configurações do Pedido e Horários
let carrinho = [];
let tipoEntregaSelecionado = null;
const taxaEntregaFixa = 5.00;
let taxaEntregaAtual = taxaEntregaFixa;
const LOCAL_STORAGE_KEY_USER_INFO = 'gordoBurgerUserInfo';

const horariosFuncionamento = {
    0: { nomeDia: "Domingo", abre: { h: 10, m: 0 }, fecha: { h: 22, m: 0 } },
    1: { nomeDia: "Segunda-feira", abre: { h: 13, m: 0 }, fecha: { h: 20, m: 0 } },
    2: { nomeDia: "Terça-feira", abre: { h: 13, m: 0 }, fecha: { h: 20, m: 0 } },
    3: { nomeDia: "Quarta-feira", abre: { h: 13, m: 0 }, fecha: { h: 20, m: 0 } },
    4: { nomeDia: "Quinta-feira", abre: { h: 13, m: 0 }, fecha: { h: 20, m: 0 } },
    5: { nomeDia: "Sexta-feira", abre: { h: 13, m: 0 }, fecha: { h: 20, m: 0 } },
    6: { nomeDia: "Sábado", abre: { h: 10, m: 0 }, fecha: { h: 22, m: 0 } }
};

/* --------------------------------------------------------------------------- */
// Funções de Verificação de Horário e Gerenciamento da Loja

function estamosAbertosAgora() {
    const agora = new Date();
    const diaHoje = agora.getDay();
    const horaHoje = agora.getHours();
    const minutoHoje = agora.getMinutes();
    const configHoje = horariosFuncionamento[diaHoje];

    if (!configHoje || !configHoje.abre || !configHoje.fecha) {
        return { status: false, proximoHorario: "Horário de funcionamento não definido para hoje." };
    }

    const agoraEmMinutos = horaHoje * 60 + minutoHoje;
    const abreEmMinutos = configHoje.abre.h * 60 + configHoje.abre.m;
    const fechaEmMinutos = configHoje.fecha.h * 60 + configHoje.fecha.m;

    if (agoraEmMinutos >= abreEmMinutos && agoraEmMinutos < fechaEmMinutos) {
        return { status: true, proximoHorario: "" };
    } else {
        let proximoHorarioMsg = "";
        if (agoraEmMinutos < abreEmMinutos) { // Ainda não abriu hoje
            proximoHorarioMsg = `Abriremos hoje (${configHoje.nomeDia}) às ${String(configHoje.abre.h).padStart(2, '0')}:${String(configHoje.abre.m).padStart(2, '0')}.`;
        } else { // Já fechou hoje, verificar o próximo dia
            let diaSeguinte = (diaHoje + 1) % 7;
            let tentativas = 0;
            while (tentativas < 7) {
                const configDiaSeguinte = horariosFuncionamento[diaSeguinte];
                if (configDiaSeguinte && configDiaSeguinte.abre) {
                    proximoHorarioMsg = `Abrimos ${configDiaSeguinte.nomeDia} às ${String(configDiaSeguinte.abre.h).padStart(2, '0')}:${String(configDiaSeguinte.abre.m).padStart(2, '0')}.`;
                    break;
                }
                diaSeguinte = (diaSeguinte + 1) % 7;
                tentativas++;
            }
            if (!proximoHorarioMsg) proximoHorarioMsg = "Consulte nossos horários.";
        }
        return { status: false, proximoHorario: proximoHorarioMsg };
    }
}

function gerenciarEstadoLoja() {
    const resultadoVerificacao = estamosAbertosAgora();
    const todosBotoesAdicionar = document.querySelectorAll('.item button');
    const iconeCarrinho = document.getElementById('carrinho-icone');
    const btnFinalizarCarrinho = document.querySelector('.btn-finalizar-pedido-carrinho');
    let mensagemFechadoElement = document.getElementById('mensagem-loja-fechada');

    if (!mensagemFechadoElement) {
        mensagemFechadoElement = document.createElement('div');
        mensagemFechadoElement.id = 'mensagem-loja-fechada';
        document.body.prepend(mensagemFechadoElement);
    }

    if (resultadoVerificacao.status) { // Loja Aberta
        mensagemFechadoElement.style.display = 'none';
        if (iconeCarrinho) {
            iconeCarrinho.style.display = 'flex';
            iconeCarrinho.classList.remove('desabilitado');
            iconeCarrinho.onclick = toggleCarrinhoDetalhes; // Restaura clique original
        }
        todosBotoesAdicionar.forEach(botao => { botao.disabled = false; });
        if (btnFinalizarCarrinho) btnFinalizarCarrinho.disabled = false;
    } else { // Loja Fechada
        mensagemFechadoElement.innerHTML = `ESTAMOS FECHADOS NO MOMENTO.<br>${resultadoVerificacao.proximoHorario}`;
        mensagemFechadoElement.style.display = 'block';
        if (iconeCarrinho) {
            iconeCarrinho.classList.add('desabilitado');
            iconeCarrinho.onclick = () => { // Impede abrir carrinho e mostra alerta
                alert(`Estamos fechados!\n${resultadoVerificacao.proximoHorario}`);
            };
        }
        todosBotoesAdicionar.forEach(botao => { botao.disabled = true; });
        if (btnFinalizarCarrinho) btnFinalizarCarrinho.disabled = true;

        const detalhesCarrinho = document.getElementById('carrinho-detalhes');
        if (detalhesCarrinho && detalhesCarrinho.classList.contains('aberto')) {
            toggleCarrinhoDetalhes(); // Fecha o carrinho se estiver aberto
        }
    }
}

/* --------------------------------------------------------------------------- */
// Funções do Carrinho Flutuante 
function toggleCarrinhoDetalhes() {
    const detalhes = document.getElementById('carrinho-detalhes');
    if(detalhes) detalhes.classList.toggle('aberto');
}

function atualizarContadorCarrinho() {
    const contadorElement = document.getElementById('contador-itens-carrinho');
    if (contadorElement) {
        contadorElement.innerText = carrinho.length;
        contadorElement.style.display = carrinho.length > 0 ? 'flex' : 'none';
    }
}

// abrirFormularioEFecharDetalhes para checar estado da loja
function abrirFormularioEFecharDetalhes() {
    const resultadoVerificacao = estamosAbertosAgora();
    if (!resultadoVerificacao.status) {
        alert(`Desculpe, estamos fechados e não é possível finalizar o pedido agora.\n${resultadoVerificacao.proximoHorario}`);
        return; 
    }
    abrirFormulario(); 
    const detalhes = document.getElementById('carrinho-detalhes');
    if (detalhes && detalhes.classList.contains('aberto')) {
        detalhes.classList.remove('aberto');
    }
}

/* --------------------------------------------------------------------------- */
// Lógica do Pedido (selecionarTipoEntrega, verificarCampoTroco)
function selecionarTipoEntrega(tipo) {
    tipoEntregaSelecionado = tipo;
    const btnRetirada = document.getElementById('btn-retirada');
    const btnEntrega = document.getElementById('btn-entrega');
    const camposEnderecoContainer = document.getElementById('campos-endereco-container');
    const displayTaxaElement = document.getElementById('display-taxa-entrega');
    const containerPagamento = document.getElementById('container-pagamento');

    if (tipo === 'retirada') {
        if(btnRetirada) btnRetirada.classList.add('selecionado');
        if(btnEntrega) btnEntrega.classList.remove('selecionado');
        if(camposEnderecoContainer) camposEnderecoContainer.style.display = 'none';
        taxaEntregaAtual = 0.00;
        if (displayTaxaElement) displayTaxaElement.innerHTML = `🏍️ Taxa de Entrega: R$ ${taxaEntregaAtual.toFixed(2).replace('.', ',')} (Retirada)`;
    } else { // 'entrega'
        if(btnEntrega) btnEntrega.classList.add('selecionado');
        if(btnRetirada) btnRetirada.classList.remove('selecionado');
        if(camposEnderecoContainer) camposEnderecoContainer.style.display = 'block';
        taxaEntregaAtual = taxaEntregaFixa;
        if (displayTaxaElement) displayTaxaElement.innerHTML = `🏍️ Taxa de Entrega: R$ ${taxaEntregaAtual.toFixed(2).replace('.', ',')}`;
    }

    if (containerPagamento) containerPagamento.style.display = 'block';
    verificarCampoTroco();
    atualizarCarrinho();
}

function verificarCampoTroco() {
    const formaPagamentoElement = document.getElementById('pagamento');
    const campoTrocoDiv = document.getElementById('campo-troco');

    if (formaPagamentoElement && campoTrocoDiv) {
        const formaPagamento = formaPagamentoElement.value;
        if (tipoEntregaSelecionado && formaPagamento === 'Dinheiro') {
            campoTrocoDiv.style.display = 'block';
        } else {
            campoTrocoDiv.style.display = 'none';
            const trocoParaElement = document.getElementById('troco_para');
            if (trocoParaElement) trocoParaElement.value = '';
        }
    }
}

/* --------------------------------------------------------------------------- */
// Carrinho de Compras (adicionarAoCarrinho, atualizarCarrinho, removerItem)

// adicionarAoCarrinho para checar estado da loja
function adicionarAoCarrinho(nome, preco) {
    const resultadoVerificacao = estamosAbertosAgora();
    if (!resultadoVerificacao.status) {
        // A barra de mensagem já deve estar visível. Um alerta adicional pode ser redundante
        // mas pode ser útil se o usuário tentar clicar muito rápido.
        const msgFechado = document.getElementById('mensagem-loja-fechada');
        if (msgFechado && msgFechado.style.display === 'block') {
             msgFechado.style.transform = 'scale(1.05)';
             setTimeout(() => { msgFechado.style.transform = 'scale(1)';}, 200);
        } else { // Caso a barra não esteja visível por algum motivo (improvável)
            alert(`Desculpe, estamos fechados!\n${resultadoVerificacao.proximoHorario}`);
        }
        return; 
    }

    carrinho.push({ nome, preco: parseFloat(preco.replace('R$', '').replace(',', '.')) });
    atualizarCarrinho();
    
    const iconeCarrinhoElem = document.getElementById('carrinho-icone');
    if(iconeCarrinhoElem && !iconeCarrinhoElem.classList.contains('desabilitado')){ // Só anima se não estiver desabilitado
        iconeCarrinhoElem.classList.add('shake'); 
        setTimeout(() => iconeCarrinhoElem.classList.remove('shake'), 500);
    }
}

// função atualizarCarrinho (já adaptada para tipoEntregaSelecionado)
function atualizarCarrinho() {
    const lista = document.getElementById('itens-carrinho');
    if (!lista) return; 
    lista.innerHTML = '';
    let subtotal = 0;

    carrinho.forEach((item, index) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${item.nome} - R$ ${item.preco.toFixed(2).replace('.', ',')}</span> <button onclick="removerItem(${index})">🗑️</button>`;
        lista.appendChild(li);
        subtotal += item.preco;
    });

    const totalCarrinhoElement = document.getElementById('total-carrinho');
    if (!totalCarrinhoElement) return;

    let totalFinal = subtotal;
    let textoTaxaCarrinho = "";

    if (carrinho.length > 0) {
        if (tipoEntregaSelecionado === 'retirada') {
            textoTaxaCarrinho = `Taxa de Entrega: R$ 0,00 (Retirada)`;
            // totalFinal já é o subtotal, pois taxaEntregaAtual seria 0
        } else if (tipoEntregaSelecionado === 'entrega') {
            textoTaxaCarrinho = `Taxa de Entrega: R$ ${taxaEntregaAtual.toFixed(2).replace('.', ',')}`;
            totalFinal += taxaEntregaAtual;
        } else { 
            textoTaxaCarrinho = "(Escolha Retirada ou Entrega para ver frete)";
        }
        totalCarrinhoElement.innerHTML = `Subtotal: R$ ${subtotal.toFixed(2).replace('.', ',')}<br>${textoTaxaCarrinho}<br>Total: R$ ${totalFinal.toFixed(2).replace('.', ',')}${tipoEntregaSelecionado === null ? ' + Frete' : ''}`;
    } else {
        totalCarrinhoElement.innerText = `Total: R$ 0,00`;
    }
    atualizarContadorCarrinho();
}

function removerItem(index) {
    carrinho.splice(index, 1);
    atualizarCarrinho();
}

/* --------------------------------------------------------------------------- */
// Formulário (abrirFormulario, fecharFormulario, formatarCEP, buscarCep)

function abrirFormulario() { 
    const formularioElement = document.getElementById('formulario');
    if(!formularioElement) return;

    formularioElement.style.display = 'flex';
    
    tipoEntregaSelecionado = null;
    taxaEntregaAtual = taxaEntregaFixa; 

    const btnRetirada = document.getElementById('btn-retirada');
    const btnEntrega = document.getElementById('btn-entrega');
    if (btnRetirada) btnRetirada.classList.remove('selecionado');
    if (btnEntrega) btnEntrega.classList.remove('selecionado');

    const camposEnderecoContainer = document.getElementById('campos-endereco-container');
    const containerPagamento = document.getElementById('container-pagamento');
    const campoTrocoDiv = document.getElementById('campo-troco');

    if (camposEnderecoContainer) camposEnderecoContainer.style.display = 'none';
    if (containerPagamento) containerPagamento.style.display = 'none';
    if (campoTrocoDiv) campoTrocoDiv.style.display = 'none';
    
    const form = formularioElement.querySelector('.form-content');
    if (form) {
      const fieldsToClear = ['nome', 'observacoes', 'cep', 'rua', 'bairro', 'numero', 'complemento', 'troco_para'];
      fieldsToClear.forEach(id => {
        const field = form.querySelector(`#${id}`);
        if (field) field.value = '';
      });
      const pagamentoSelect = form.querySelector('#pagamento');
      if (pagamentoSelect) pagamentoSelect.selectedIndex = 0;
    }
    
    const displayTaxaElement = document.getElementById('display-taxa-entrega');
    if (displayTaxaElement) displayTaxaElement.innerText = '🏍️ Taxa de Entrega: (Escolha Retirada ou Entrega)';
    
    
    if (typeof carregarInformacoesCliente === 'function') {
        carregarInformacoesCliente(); 
    }
    
    atualizarCarrinho(); 
}

function fecharFormulario() { 
    const formularioElement = document.getElementById('formulario');
    if (formularioElement) formularioElement.style.display = 'none';
}

function formatarCEP(campoCep) { 
    let cep = campoCep.value.replace(/\D/g, ''); 
    if (cep.length > 5) {
        cep = cep.substring(0, 5) + '-' + cep.substring(5, 8);
    }
    campoCep.value = cep;
}
/* --------------------------------------------------------------------------- */

function buscarCep() { 
    const cepInput = document.getElementById('cep');
    if(!cepInput) return;
    const cep = cepInput.value.replace(/\D/g, '');

    if (cep.length !== 8) {
        return;
    }

    fetch(`https://viacep.com.br/ws/${cep}/json/`)
        .then(response => response.json())
        .then(data => {
            const ruaElem = document.getElementById('rua');
            const bairroElem = document.getElementById('bairro');
            if (data.erro) {
                alert('CEP não encontrado.');
                if(ruaElem) ruaElem.value = '';
                if(bairroElem) bairroElem.value = '';
                return;
            }
            if(ruaElem) ruaElem.value = data.logradouro;
            if(bairroElem) bairroElem.value = data.bairro;
        })
        .catch(() => {
            alert('Erro ao buscar CEP.');
            const ruaElem = document.getElementById('rua');
            const bairroElem = document.getElementById('bairro');
            if(ruaElem) ruaElem.value = '';
            if(bairroElem) bairroElem.value = '';
        });
}
/* --------------------------------------------------------------------------- */

// NOVA FUNÇÃO: Para exibir alertas customizados
function exibirAlertaCustomizado(mensagem, tipo = 'info', duracao = 3000) {
    let alertaDiv = document.getElementById('alerta-customizado-localStorage');
    if (!alertaDiv) {
        alertaDiv = document.createElement('div');
        alertaDiv.id = 'alerta-customizado-localStorage';
        document.body.appendChild(alertaDiv);
    }

    alertaDiv.textContent = mensagem;
    alertaDiv.className = 'alerta-ls'; // Classe base
    alertaDiv.classList.add(tipo);     // Adiciona classe do tipo (success, info)
    alertaDiv.classList.add('show');   // Adiciona classe para mostrar com transição

    // Faz o alerta desaparecer após 'duracao' milissegundos
    setTimeout(() => {
        alertaDiv.classList.remove('show');
        // O CSS cuidará da transição de opacidade para esconder
    }, duracao);
}

// NOVA FUNÇÃO: Salvar informações do cliente no localStorage
function salvarInformacoesCliente() {
    const nome = document.getElementById('nome').value;
    const cep = document.getElementById('cep').value;
    const rua = document.getElementById('rua').value;
    const bairro = document.getElementById('bairro').value;
    const numeroCasa = document.getElementById('numero').value;
    const complemento = document.getElementById('complemento').value;

    if (nome && cep) { // Salva apenas se houver nome e CEP, no mínimo
        const infoCliente = {
            nome: nome.trim(),
            cep: cep.trim(),
            rua: rua.trim(),
            bairro: bairro.trim(),
            numero: numeroCasa.trim(),
            complemento: complemento.trim()
        };
        localStorage.setItem(LOCAL_STORAGE_KEY_USER_INFO, JSON.stringify(infoCliente));
        exibirAlertaCustomizado('Suas informações foram salvas para a próxima compra!', 'success');
    } else {
        const checkbox = document.getElementById('lembrar-info-checkbox');
        if (checkbox) checkbox.checked = false;
        exibirAlertaCustomizado('Preencha pelo menos Nome e CEP para salvar as informações.', 'info');
    }
}

// NOVA FUNÇÃO: Carregar informações do cliente do localStorage
function carregarInformacoesCliente() {
    const infoSalva = localStorage.getItem(LOCAL_STORAGE_KEY_USER_INFO);
    const checkbox = document.getElementById('lembrar-info-checkbox');

    if (infoSalva) {
        try {
            const infoCliente = JSON.parse(infoSalva);
            // Preenche os campos apenas se eles existirem no DOM
            const nomeElem = document.getElementById('nome');
            const cepElem = document.getElementById('cep');
            const ruaElem = document.getElementById('rua');
            const bairroElem = document.getElementById('bairro');
            const numeroElem = document.getElementById('numero');
            const complementoElem = document.getElementById('complemento');

            if(nomeElem) nomeElem.value = infoCliente.nome || '';
            if(cepElem) cepElem.value = infoCliente.cep || '';
            if(ruaElem) ruaElem.value = infoCliente.rua || '';
            if(bairroElem) bairroElem.value = infoCliente.bairro || '';
            if(numeroElem) numeroElem.value = infoCliente.numero || '';
            if(complementoElem) complementoElem.value = infoCliente.complemento || '';

            if (checkbox) checkbox.checked = true;

            // Se carregou CEP e os campos de rua/bairro estão vazios (e a função buscarCep existe)
            if (infoCliente.cep && (!infoCliente.rua || !infoCliente.bairro) && typeof buscarCep === 'function') {
                // Disparar onblur do CEP para que buscarCep seja chamado se o campo CEP tiver valor
                if (cepElem && cepElem.value) {
                     cepElem.dispatchEvent(new Event('blur'));
                }
            }
        } catch (e) {
            console.error("Erro ao carregar informações do localStorage:", e);
            localStorage.removeItem(LOCAL_STORAGE_KEY_USER_INFO);
            if (checkbox) checkbox.checked = false;
        }
    } else {
        if (checkbox) checkbox.checked = false;
    }
}

// NOVA FUNÇÃO: Apagar informações do cliente do localStorage
function apagarInformacoesCliente() {
    localStorage.removeItem(LOCAL_STORAGE_KEY_USER_INFO);
    exibirAlertaCustomizado('Suas informações não serão mais lembradas.', 'info');
}

/* --------------------------------------------------------------------------- */
// Enviar para WhatsApp 
function enviarPedido() {
    const nome = document.getElementById('nome').value;
    const observacoes = document.getElementById('observacoes').value;
    const formaPagamento = document.getElementById('pagamento').value;
    const trocoParaInput = document.getElementById('troco_para').value;

    // Validações
    if (!nome) {
        alert('Por favor, preencha seu nome.');
        return;
    }
    if (!tipoEntregaSelecionado) {
        alert('Por favor, selecione se é para Entrega ou Retirada no Local.');
        return;
    }
    if (!formaPagamento && tipoEntregaSelecionado) {
        alert('Por favor, selecione a forma de pagamento.');
        return;
    }
    if (carrinho.length === 0) {
        alert('Seu carrinho está vazio!');
        return;
    }

    // Montar mensagem
    let mensagem = `*Pedido - GordoBurguer*%0A%0A`;

    let subtotalItens = 0;
    carrinho.forEach(item => {
        mensagem += `🔸 ${item.nome} - R$ ${item.preco.toFixed(2).replace('.', ',')}%0A`;
        subtotalItens += item.preco;
    });

    mensagem += `%0A*Subtotal dos Itens:* R$ ${subtotalItens.toFixed(2).replace('.', ',')}%0A`;

    let totalComFrete = subtotalItens + taxaEntregaAtual; // taxaEntregaAtual já foi definida

    if (tipoEntregaSelecionado === 'entrega') {
        const cep = document.getElementById('cep').value;
        const rua = document.getElementById('rua').value;
        const numeroCasa = document.getElementById('numero').value;
        const bairro = document.getElementById('bairro').value;
        const complemento = document.getElementById('complemento').value;

        if (!cep || !rua || !numeroCasa || !bairro) {
            alert('Para entrega, por favor, preencha todos os campos de endereço obrigatórios.');
            return;
        }
        mensagem += `%0A🚚 *Tipo de Pedido:* Entrega`;
        mensagem += `%0A*Taxa de Entrega:* R$ ${taxaEntregaAtual.toFixed(2).replace('.', ',')}`;
        mensagem += `%0A*Total Geral:* R$ ${totalComFrete.toFixed(2).replace('.', ',')}%0A%0A`;
        
        mensagem += `🏠 *Endereço:* ${rua}, Nº ${numeroCasa}${complemento ? ', ' + complemento : ''}, Bairro ${bairro}, CEP ${cep}%0A`;
        
    } else { // Retirada
        mensagem += `%0A🛍️ *Tipo de Pedido:* Retirada no Local`;
        mensagem += `%0A*Total Geral:* R$ ${totalComFrete.toFixed(2).replace('.', ',')}%0A%0A`; // taxaEntregaAtual é 0
    }

    mensagem += `%0A🧑 *Nome:* ${nome}`;
    if (observacoes && observacoes.trim() !== "") {
        mensagem += `%0A📝 *Observações:* ${observacoes}`;
    }
    mensagem += `%0A💰 *Forma de Pagamento:* ${formaPagamento}`;
    if (formaPagamento === 'Dinheiro' && trocoParaInput) {
        const trocoLimpo = trocoParaInput.replace(/[^\d,]/g, '').replace(',', '.');
        const trocoParaValor = parseFloat(trocoLimpo);
        if (!isNaN(trocoParaValor) && trocoParaValor > 0) {
            mensagem += `%0A💵 *Troco para:* R$ ${trocoParaValor.toFixed(2).replace('.', ',')}`;
        }
    }

    const numeroWhatsApp = '5531999149772'; //NÚMERO DO WHATSAPP

    window.open(`https://wa.me/${numeroWhatsApp}?text=${mensagem}`, '_blank');

    // Limpar e resetar
    carrinho = [];
    const form = document.getElementById('formulario').querySelector('.form-content');
    if(form) form.reset();
    if(document.getElementById('observacoes')) document.getElementById('observacoes').value = '';

    atualizarCarrinho(); 
    fecharFormulario(); // Isso esconde o formulário
    
}
/* -------------------------------------------------------------------  */


document.addEventListener('DOMContentLoaded', () => {
    // Configuração do IntersectionObserver para animações de scroll 
    const observerScroll = new IntersectionObserver((entries) => { // 
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('show');
            }
        });
    });
    const hiddenElementsScroll = document.querySelectorAll('.item, .hero h2, .hero p, .hero .btn, h2'); 
    hiddenElementsScroll.forEach((el) => observerScroll.observe(el));

    // Lógica para o botão "Todos" da categoria 
    const todosButton = document.querySelector(".btn-categoria[data-filter='todos']");
    if (todosButton) {
        const botoesCategoria = document.querySelectorAll('.categorias-cardapio .btn-categoria');
        botoesCategoria.forEach(botao => {
            botao.classList.toggle('active', botao.getAttribute('data-filter') === 'todos');
        });
    }
    
    // Inicializações importantes
    if (typeof atualizarContadorCarrinho === 'function') {
        atualizarContadorCarrinho(); 
    }
    if (typeof gerenciarEstadoLoja === 'function') {
        gerenciarEstadoLoja();       
    }

    // Listener para o select de pagamento 
    const selectPagamentoElem = document.getElementById('pagamento');
    if (selectPagamentoElem) {
       selectPagamentoElem.addEventListener('change', verificarCampoTroco);
    }


    const lembrarInfoCheckbox = document.getElementById('lembrar-info-checkbox');
    if (lembrarInfoCheckbox) {
        // Verifica o estado inicial do checkbox baseado no localStorage ao carregar a página
        if (localStorage.getItem(LOCAL_STORAGE_KEY_USER_INFO)) {
            lembrarInfoCheckbox.checked = true;
        } else {
            lembrarInfoCheckbox.checked = false;
        }

        lembrarInfoCheckbox.addEventListener('change', function() {
            if (this.checked) {
                salvarInformacoesCliente();
            } else {
                apagarInformacoesCliente();
            }
        });
    }
});