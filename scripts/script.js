// Animação Scroll
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
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

    botoesCategoria.forEach(botao => {
        if (botao.getAttribute('data-filter') === categoria) {
            botao.classList.add('active');
        } else {
            botao.classList.remove('active');
        }
    });

    itens.forEach(item => {
        const itemCategoria = item.getAttribute('data-category');
        if (categoria === 'todos' || itemCategoria === categoria) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

/* --------------------------------------------------------------------------- */
// Modal
function abrirModal(titulo, descricao, preco) {
    document.getElementById('modal').style.display = 'flex';
    document.getElementById('modal-title').innerText = titulo;
    // Se a descrição não existir para um item (ex: bebidas no seu HTML atual), não mostre "undefined"
    document.getElementById('modal-desc').innerText = descricao || ''; 
    document.getElementById('modal-price').innerText = preco;
}

function fecharModal() {
    document.getElementById('modal').style.display = 'none';
}

/* --------------------------------------------------------------------------- */
// Variáveis Globais para o Pedido e Carrinho
let carrinho = [];
let tipoEntregaSelecionado = null; // 'retirada' ou 'entrega'
const taxaEntregaFixa = 5.00;    // SEU VALOR DE FRETE FIXO PARA ENTREGA
let taxaEntregaAtual = taxaEntregaFixa; // Valor que será usado, pode mudar para 0 se for retirada


// Funções do Carrinho Flutuante (já presentes no seu script)
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
            contadorElement.style.display = 'flex';
        } else {
            contadorElement.style.display = 'none';
        }
    }
}

function abrirFormularioEFecharDetalhes() {
    abrirFormulario();
    const detalhes = document.getElementById('carrinho-detalhes');
    if (detalhes.classList.contains('aberto')) {
        detalhes.classList.remove('aberto');
    }
}

/* --------------------------------------------------------------------------- */
// Lógica do Pedido 

// Chamada quando o usuário clica em "Retirada no Local" ou "Entrega"
function selecionarTipoEntrega(tipo) {
    tipoEntregaSelecionado = tipo;
    const btnRetirada = document.getElementById('btn-retirada');
    const btnEntrega = document.getElementById('btn-entrega');
    const camposEnderecoContainer = document.getElementById('campos-endereco-container');
    const displayTaxaElement = document.getElementById('display-taxa-entrega'); // No formulário
    const containerPagamento = document.getElementById('container-pagamento');

    if (tipo === 'retirada') {
        btnRetirada.classList.add('selecionado');
        btnEntrega.classList.remove('selecionado');
        if(camposEnderecoContainer) camposEnderecoContainer.style.display = 'none';
        taxaEntregaAtual = 0.00;
        if (displayTaxaElement) displayTaxaElement.innerHTML = `🏍️ Taxa de Entrega: R$ ${taxaEntregaAtual.toFixed(2).replace('.', ',')} (Retirada)`;
    } else { // 'entrega'
        btnEntrega.classList.add('selecionado');
        btnRetirada.classList.remove('selecionado');
        if(camposEnderecoContainer) camposEnderecoContainer.style.display = 'block';
        taxaEntregaAtual = taxaEntregaFixa;
        if (displayTaxaElement) displayTaxaElement.innerHTML = `🏍️ Taxa de Entrega: R$ ${taxaEntregaAtual.toFixed(2).replace('.', ',')}`;
    }

    if (containerPagamento) containerPagamento.style.display = 'block';
    verificarCampoTroco();
    atualizarCarrinho();
}

// Mostra/oculta o campo "Troco para:"
function verificarCampoTroco() {
    const formaPagamentoElement = document.getElementById('pagamento');
    const campoTrocoDiv = document.getElementById('campo-troco');

    if (formaPagamentoElement && campoTrocoDiv) { // Verifica se os elementos existem
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
// Carrinho de Compras (Funções adicionarAoCarrinho, atualizarCarrinho, removerItem)

function adicionarAoCarrinho(nome, preco) {
    carrinho.push({ nome, preco: parseFloat(preco.replace('R$', '').replace(',', '.')) });
    atualizarCarrinho();
    // Opcional: Feedback visual ao adicionar ao carrinho
    const iconeCarrinho = document.getElementById('carrinho-icone');
    if(iconeCarrinho){
        iconeCarrinho.classList.add('shake'); // Adiciona uma classe para animar
        setTimeout(() => iconeCarrinho.classList.remove('shake'), 500); // Remove após a animação
    }
}

// Função atualizarCarrinho() para usar a `taxaEntregaAtual`
function atualizarCarrinho() {
    const lista = document.getElementById('itens-carrinho');
    if (!lista) return; // Sai se o elemento não existir
    
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
            totalFinal += 0; // taxaEntregaAtual é 0 para retirada
        } else if (tipoEntregaSelecionado === 'entrega') {
            textoTaxaCarrinho = `Taxa de Entrega: R$ ${taxaEntregaAtual.toFixed(2).replace('.', ',')}`; // taxaEntregaAtual é a taxa fixa
            totalFinal += taxaEntregaAtual;
        } else { // Nenhum tipo de entrega selecionado ainda
            textoTaxaCarrinho = "(Escolha Retirada ou Entrega para ver frete)";
            // Não somamos a taxa ao totalFinal ainda, apenas mostramos o subtotal + frete (ou apenas subtotal)
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
// Formulário (Funções abrirFormulario, fecharFormulario, formatarCEP, buscarCep)

//Função abrirFormulario() para resetar os novos campos e estados
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
    
    // Limpar campos específicos do formulário
    const form = formularioElement.querySelector('.form-content');
    if (form) {
      // Limpa campos um por um para mais controle
      const fieldsToClear = ['nome', 'observacoes', 'cep', 'rua', 'bairro', 'numero', 'complemento', 'troco_para'];
      fieldsToClear.forEach(id => {
        const field = form.querySelector(`#${id}`);
        if (field) field.value = '';
      });
      const pagamentoSelect = form.querySelector('#pagamento');
      if (pagamentoSelect) pagamentoSelect.selectedIndex = 0; // Reseta para a primeira opção
    }
    
    const displayTaxaElement = document.getElementById('display-taxa-entrega');
    if (displayTaxaElement) displayTaxaElement.innerText = '🏍️ Taxa de Entrega: (Escolha Retirada ou Entrega)';
    
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

function buscarCep() {
    const cepInput = document.getElementById('cep');
    const cep = cepInput.value.replace(/\D/g, '');

    if (cep.length !== 8) {
        // Removido alert daqui, pode ser que o onblur do input já trate ou o usuário só corrigiu
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
        mensagem += `🍔 ${item.nome} - R$ ${item.preco.toFixed(2).replace('.', ',')}%0A`;
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

    const numeroWhatsApp = '5531999149772'; // SEU NÚMERO DO WHATSAPP

    window.open(`https://wa.me/${numeroWhatsApp}?text=${mensagem}`, '_blank');

    // Limpar e resetar
    carrinho = [];
    const form = document.getElementById('formulario').querySelector('.form-content');
    if(form) form.reset();
    if(document.getElementById('observacoes')) document.getElementById('observacoes').value = '';

    atualizarCarrinho(); 
    fecharFormulario(); // Isso esconde o formulário
    
}


