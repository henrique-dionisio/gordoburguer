// Animação Scroll
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if(entry.isIntersecting){
            entry.target.classList.add('show');
        }
    });
});

const hiddenElements = document.querySelectorAll('.item, .hero h2, .hero p, .hero .btn, h2');
hiddenElements.forEach((el) => observer.observe(el));

/* --------------------------------------------------------------------------- */
// Filtrar Cardápio por Categoria

function filtrarCardapio(categoria) {
    const itens = document.querySelectorAll('#cardapio .itens-cardapio .item');
    const botoesCategoria = document.querySelectorAll('.categorias-cardapio .btn-categoria');

    // Atualiza o estado ativo dos botões
    botoesCategoria.forEach(botao => {
        if (botao.getAttribute('data-filter') === categoria) {
            botao.classList.add('active');
        } else {
            botao.classList.remove('active');
        }
    });

    // Filtra os itens
    itens.forEach(item => {
        const itemCategoria = item.getAttribute('data-category');
        // Verifica se o item possui a classe 'show' da animação de scroll
        const isItemVisibleByScroll = item.classList.contains('show');

        if (categoria === 'todos' || itemCategoria === categoria) {
            item.style.display = ''; // Reseta para o display padrão (flex item)
            // Se o item estava escondido pelo filtro e agora deve aparecer,
            // e já tinha a classe 'show' (ou seja, já passou pela animação de entrada),
            // ou se a animação de entrada só ocorre uma vez, não precisamos fazer nada extra aqui
            // para re-animar, a menos que desejado.
            // Se o item for revelado e estiver no viewport, o IntersectionObserver
            // deve adicionar a classe 'show' se ela não estiver presente.
        } else {
            item.style.display = 'none';
            // Opcional: se quiser que a animação de entrada possa ocorrer novamente
            // quando o item for re-exibido, você pode remover a classe 'show'.
            // item.classList.remove('show'); // Isso faria ele animar novamente ao ser re-exibido e scrollado.
        }
    });
}

// Define o botão "Todos" como ativo e mostra todos os itens ao carregar a página.
document.addEventListener('DOMContentLoaded', () => {
    const todosButton = document.querySelector(".btn-categoria[data-filter='todos']");
    if (todosButton) {
        todosButton.classList.add('active');
    }
    // Não é necessário chamar filtrarCardapio('todos') aqui se todos os itens
    // já estão visíveis por padrão no HTML. A função é para cliques.
});

/* --------------------------------------------------------------------------- */
// Modal
function abrirModal(titulo, descricao, preco){
    document.getElementById('modal').style.display = 'flex';
    document.getElementById('modal-title').innerText = titulo;
    document.getElementById('modal-desc').innerText = descricao;
    document.getElementById('modal-price').innerText = preco;
}

function fecharModal(){
    document.getElementById('modal').style.display = 'none';
}

/* --------------------------------------------------------------------------- */

let tipoEntregaSelecionado = null; // Pode ser 'retirada' ou 'entrega'
const taxaEntregaFixa = 5.00;    // SEU VALOR DE FRETE FIXO PARA ENTREGA
let taxaEntregaAtual = taxaEntregaFixa; // Valor que será usado, pode mudar para 0 se for retirada

// Esta função é chamada quando o usuário clica em "Retirada no Local" ou "Entrega"
function selecionarTipoEntrega(tipo) {
    tipoEntregaSelecionado = tipo;
    const btnRetirada = document.getElementById('btn-retirada');
    const btnEntrega = document.getElementById('btn-entrega');
    const camposEnderecoContainer = document.getElementById('campos-endereco-container');
    const displayTaxaElement = document.getElementById('display-taxa-entrega');
    const containerPagamento = document.getElementById('container-pagamento');

    if (tipo === 'retirada') {
        btnRetirada.classList.add('selecionado');
        btnEntrega.classList.remove('selecionado');
        camposEnderecoContainer.style.display = 'none'; // Esconde campos de endereço
        taxaEntregaAtual = 0.00; // Zera a taxa para retirada
        if (displayTaxaElement) displayTaxaElement.innerHTML = `🏍️ Taxa de Entrega: R$ ${taxaEntregaAtual.toFixed(2).replace('.', ',')} (Retirada)`;
    } else { // 'entrega'
        btnEntrega.classList.add('selecionado');
        btnRetirada.classList.remove('selecionado');
        camposEnderecoContainer.style.display = 'block'; // Mostra campos de endereço
        taxaEntregaAtual = taxaEntregaFixa; // Aplica a taxa fixa para entrega
        if (displayTaxaElement) displayTaxaElement.innerHTML = `🏍️ Taxa de Entrega: R$ ${taxaEntregaAtual.toFixed(2).replace('.', ',')}`;
    }

    if (containerPagamento) containerPagamento.style.display = 'block'; // Mostra opções de pagamento
    verificarCampoTroco(); // Verifica se o campo de troco deve ser exibido
    atualizarCarrinho();   // Atualiza o total no carrinho com a taxa correta
}

// Mostra/oculta o campo "Troco para:" baseado na forma de pagamento
function verificarCampoTroco() {
    const formaPagamento = document.getElementById('pagamento').value;
    const campoTrocoDiv = document.getElementById('campo-troco');

    if (tipoEntregaSelecionado && formaPagamento === 'Dinheiro') { // Só mostra se um tipo de entrega foi escolhido E pagamento é Dinheiro
        campoTrocoDiv.style.display = 'block';
    } else {
        campoTrocoDiv.style.display = 'none';
        if(document.getElementById('troco_para')) document.getElementById('troco_para').value = ''; // Limpa o valor se oculto
    }
}

// Adicionar listener ao select de pagamento para chamar verificarCampoTroco
const selectPagamento = document.getElementById('pagamento');
if (selectPagamento) {
    selectPagamento.addEventListener('change', verificarCampoTroco);
}


/* --------------------------------------------------------------------------- */
// Carrinho de Compras
let carrinho = [];

function adicionarAoCarrinho(nome, preco) {
    carrinho.push({ nome, preco: parseFloat(preco.replace('R$', '').replace(',', '.')) });
    atualizarCarrinho();
}

/* --------------------------------------------------------------------------- */
//Atualizar o carrinho
function atualizarCarrinho() {
    const lista = document.getElementById('itens-carrinho');
    lista.innerHTML = '';
    let subtotal = 0;

    carrinho.forEach((item, index) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${item.nome} - R$ ${item.preco.toFixed(2).replace('.', ',')}</span> <button onclick="removerItem(${index})">🗑️</button>`;
        lista.appendChild(li);
        subtotal += item.preco;
    });

    const totalCarrinhoElement = document.getElementById('total-carrinho');
    let totalFinal = subtotal;
    let textoTaxaCarrinho = ""; // Inicializa vazio

    if (carrinho.length > 0) {
        if (tipoEntregaSelecionado === 'retirada') {
            // taxaEntregaAtual já é 0.00
            textoTaxaCarrinho = `Taxa de Entrega: R$ 0,00 (Retirada)`;
            totalFinal += taxaEntregaAtual; // Adiciona 0
        } else if (tipoEntregaSelecionado === 'entrega') {
            // taxaEntregaAtual já é taxaEntregaFixa
            textoTaxaCarrinho = `Taxa de Entrega: R$ ${taxaEntregaAtual.toFixed(2).replace('.', ',')}`;
            totalFinal += taxaEntregaAtual;
        } else { // Nenhum tipo de entrega selecionado ainda
            textoTaxaCarrinho = "(Escolha Retirada ou Entrega para ver frete)";
            // Não somamos a taxa ao totalFinal ainda, apenas mostramos o subtotal + frete
        }
        totalCarrinhoElement.innerHTML = `Subtotal: R$ ${subtotal.toFixed(2).replace('.', ',')}<br>${textoTaxaCarrinho}<br>Total: R$ ${totalFinal.toFixed(2).replace('.', ',')}${tipoEntregaSelecionado === null ? ' + Frete' : ''}`;
    } else {
        totalCarrinhoElement.innerText = `Total: R$ 0,00`;
    }

    atualizarContadorCarrinho(); // Função que você já tem para o ícone do carrinho
}

function removerItem(index) {
    carrinho.splice(index, 1);
    atualizarCarrinho();
}
/* ---------------------- */

function toggleCarrinhoDetalhes() {
    const detalhes = document.getElementById('carrinho-detalhes');
    detalhes.classList.toggle('aberto');
}

function atualizarContadorCarrinho() {
    const contadorElement = document.getElementById('contador-itens-carrinho');
    if (contadorElement) {
        const numItens = carrinho.length;
        contadorElement.innerText = numItens;
        if (numItens > 0) {
            contadorElement.style.display = 'flex'; // Ou 'inline-block' dependendo do seu CSS
        } else {
            contadorElement.style.display = 'none';
        }
    }
}

function abrirFormularioEFecharDetalhes() {
    abrirFormulario(); // Sua função existente
    const detalhes = document.getElementById('carrinho-detalhes');
    if (detalhes.classList.contains('aberto')) {
        detalhes.classList.remove('aberto'); // Fecha o painel do carrinho
    }
}

/* --------------------------------------------------------------------------- */
// Formulário
function abrirFormulario() {
    document.getElementById('formulario').style.display = 'flex';
    
    // Resetar seleções e estados
    tipoEntregaSelecionado = null;
    taxaEntregaAtual = taxaEntregaFixa; // Volta para a taxa de entrega padrão ao abrir

    const btnRetirada = document.getElementById('btn-retirada');
    const btnEntrega = document.getElementById('btn-entrega');
    if (btnRetirada) btnRetirada.classList.remove('selecionado');
    if (btnEntrega) btnEntrega.classList.remove('selecionado');

    // Esconder campos condicionais
    const camposEnderecoContainer = document.getElementById('campos-endereco-container');
    const containerPagamento = document.getElementById('container-pagamento');
    const campoTrocoDiv = document.getElementById('campo-troco');

    if (camposEnderecoContainer) camposEnderecoContainer.style.display = 'none';
    if (containerPagamento) containerPagamento.style.display = 'none';
    if (campoTrocoDiv) campoTrocoDiv.style.display = 'none';
    
    // Limpar campos do formulário
    const form = document.getElementById('formulario').querySelector('.form-content');
    if (form) { // Verifica se 'form' não é null
        // Não vamos resetar o formulário inteiro para não perder o nome se já digitado,
        // mas vamos limpar campos específicos.
        // form.reset(); // Cuidado: Isso limpa TODOS os campos do formulário.
    }
    // Limpar campos específicos
    if(document.getElementById('observacoes')) document.getElementById('observacoes').value = '';
    if(document.getElementById('troco_para')) document.getElementById('troco_para').value = '';
    // Você pode adicionar outros campos para limpar aqui, se desejar, como os de endereço
    // Ex: document.getElementById('cep').value = '';
    
    const displayTaxaElement = document.getElementById('display-taxa-entrega');
    if (displayTaxaElement) displayTaxaElement.innerText = '🏍️ Taxa de Entrega: (Escolha Retirada ou Entrega)';
    
    atualizarCarrinho(); // Atualiza o carrinho (que pode estar vazio ou não)
}

function fecharFormulario() {
    document.getElementById('formulario').style.display = 'none';
}

/* --------------------------------------------------------------------------- */
//Formatar o CEP
function formatarCEP(campoCep) {
    let cep = campoCep.value.replace(/\D/g, ''); // Remove todos os caracteres não numéricos
    if (cep.length > 5) {
        cep = cep.substring(0, 5) + '-' + cep.substring(5, 8);
    }
    campoCep.value = cep;
}

/* --------------------------------------------------------------------------- */
//Buscar o CEP
function buscarCep() {
    const cepInput = document.getElementById('cep');
    const cep = cepInput.value.replace(/\D/g, ''); // Remove o hífen e qualquer outro não número para a API

    if (cep.length !== 8) {
        alert('CEP inválido. Digite 8 números.');
        return;
    }

    fetch(`https://viacep.com.br/ws/${cep}/json/`)
        .then(response => response.json())
        .then(data => {
            if (data.erro) {
                alert('CEP não encontrado.');
                document.getElementById('rua').value = '';
                document.getElementById('bairro').value = '';
                return;
            }

            document.getElementById('rua').value = data.logradouro;
            document.getElementById('bairro').value = data.bairro;
        })
        .catch(() => {
            alert('Erro ao buscar CEP.');
            document.getElementById('rua').value = '';
            document.getElementById('bairro').value = '';
        });
}

/* --------------------------------------------------------------------------- */
// Enviar para WhatsApp

function enviarPedido() {
    const nome = document.getElementById('nome').value;
    const observacoes = document.getElementById('observacoes').value;
    const formaPagamento = document.getElementById('pagamento').value;
    const trocoParaInput = document.getElementById('troco_para').value; // Pegar o valor do campo de troco

    // Validações básicas (mantidas)
    if (!nome) {
        alert('Por favor, preencha seu nome.');
        return;
    }
    if (!tipoEntregaSelecionado) { // tipoEntregaSelecionado é sua variável global
        alert('Por favor, selecione se é para Entrega ou Retirada no Local.');
        return;
    }
    if (!formaPagamento && tipoEntregaSelecionado) {
        alert('Por favor, selecione a forma de pagamento.');
        return;
    }

    // Construção da mensagem
    let mensagem = `*Pedido - GordoBurger*%0A%0A`; // Título e uma linha em branco
    let subtotalItens = 0;

    carrinho.forEach(item => {
        // Sem espaços extras antes do emoji ou do texto
        mensagem += `🍔 ${item.nome} - R$ ${item.preco.toFixed(2).replace('.', ',')}%0A`;
        subtotalItens += item.preco;
    });

    mensagem += `%0A*Subtotal dos Itens:* R$ ${subtotalItens.toFixed(2).replace('.', ',')}%0A`;

    // taxaEntregaAtual é sua variável global que guarda 0 para retirada ou a taxa fixa para entrega
    let totalComFrete = subtotalItens + taxaEntregaAtual;

    // Informações de Entrega ou Retirada
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
        mensagem += `🚚 *Tipo de Pedido:* Entrega%0A`;
        mensagem += `*Taxa de Entrega:* R$ ${taxaEntregaAtual.toFixed(2).replace('.', ',')}%0A`; // taxaEntregaAtual já terá o valor correto
        mensagem += `*Total Geral:* R$ ${totalComFrete.toFixed(2).replace('.', ',')}%0A%0A`; // Linha em branco após o total
        mensagem += `🏠 *Endereço:*%0A`; // Título do endereço
        mensagem += `${rua}, Nº ${numeroCasa}${complemento ? ', ' + complemento : ''}%0A`;
        mensagem += `${bairro}%0A`;
        mensagem += `Pirassununga - SP, CEP: ${cep}%0A`;
    } else { // Retirada no local
        mensagem += `🛍️ *Tipo de Pedido:* Retirada no Local%0A`;
        mensagem += `*Total Geral:* R$ ${totalComFrete.toFixed(2).replace('.', ',')}%0A%0A`; // Linha em branco após o total
    }

    // Detalhes do Cliente e Pagamento
    mensagem += `🧑 *Nome:* ${nome}%0A`;
    if (observacoes) {
        mensagem += `📝 *Observações:* ${observacoes}%0A`;
    }
    mensagem += `💰 *Forma de Pagamento:* ${formaPagamento}%0A`;
    if (formaPagamento === 'Dinheiro' && trocoParaInput) {
        const trocoParaValor = parseFloat(trocoParaInput.replace(',', '.'));
        if (!isNaN(trocoParaValor) && trocoParaValor > 0) {
            mensagem += `💵 *Troco para:* R$ ${trocoParaValor.toFixed(2).replace('.', ',')}%0A`;
        }
    }


    const numeroWhatsApp = '5531999149772'; // Número do GordoBurger
    // console.log("Mensagem Formatada (antes de encode):", mensagem.replace(/%0A/g, "\n")); // Para debug no console do navegador
    window.open(`https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`, '_blank');

    // Limpar carrinho e formulário após enviar (seu código existente)
    carrinho = [];
    const formInputs = ['nome', 'observacoes', 'cep', 'rua', 'bairro', 'numero', 'complemento', 'troco_para'];
    formInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
    });
    if (document.getElementById('pagamento')) document.getElementById('pagamento').selectedIndex = 0;

    fecharFormulario();
    // Ao reabrir o formulário com abrirFormulario(), os estados visuais e taxaEntregaAtual serão resetados.
    atualizarCarrinho(); // Limpa o carrinho visualmente e atualiza totais
}



