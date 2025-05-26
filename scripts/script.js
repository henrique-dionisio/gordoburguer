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
    lista.innerHTML = ''; // Limpa a lista para reconstruir
    let subtotal = 0;

    carrinho.forEach((item, index) => {
        const li = document.createElement('li');
        // MODIFICAÇÃO 1: Melhor formatação do item na lista (com <span> para o texto)
        // e uso de vírgula como separador decimal para os preços.
        li.innerHTML = `<span>${item.nome} - R$ ${item.preco.toFixed(2).replace('.', ',')}</span> <button onclick="removerItem(${index})">🗑️</button>`;
        lista.appendChild(li);
        subtotal += item.preco;
    });

    const totalCarrinhoElement = document.getElementById('total-carrinho');
    const taxaEntrega = 5.00; // Definir a taxa de entrega aqui
    let totalFinal = subtotal;

    // MODIFICAÇÃO 2: Lógica para exibir subtotal, taxa e total (com vírgula)
    // somente se houver itens no carrinho.
    if (carrinho.length > 0) { // Verifica se o carrinho não está vazio
        totalFinal += taxaEntrega;
        // Usar innerHTML para permitir quebras de linha com <br> se desejar
        totalCarrinhoElement.innerHTML = `Subtotal: R$ ${subtotal.toFixed(2).replace('.', ',')}<br>Taxa de Entrega: R$ ${taxaEntrega.toFixed(2).replace('.', ',')}<br>Total: R$ ${totalFinal.toFixed(2).replace('.', ',')}`;
    } else {
        totalCarrinhoElement.innerText = `Total: R$ ${totalFinal.toFixed(2).replace('.', ',')}`;
    }

    // MODIFICAÇÃO 3: Chamar a nova função para atualizar o contador no ícone do carrinho.
    // Certifique-se de que a função atualizarContadorCarrinho() que te passei antes
    // também esteja no seu arquivo script.js.
    atualizarContadorCarrinho();
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
    const cep = document.getElementById('cep').value;
    const rua = document.getElementById('rua').value;
    const numeroCasa = document.getElementById('numero').value;
    const complemento = document.getElementById('complemento').value;
    const bairro = document.getElementById('bairro').value;
    const pagamento = document.getElementById('pagamento').value;

    // Validação dos campos obrigatórios
    if (!nome || !cep || !rua || !numeroCasa || !bairro) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    const taxaEntrega = 5;

    let mensagem = `*Pedido - GordoBurguer*%0A%0A`;

    let total = 0;

    carrinho.forEach(item => {
        mensagem += `🍔 ${item.nome} - R$ ${item.preco.toFixed(2)}%0A`;
        total += item.preco;
    });

    total += taxaEntrega;

    mensagem += `%0A🚚 *Taxa de Entrega:* R$ ${taxaEntrega.toFixed(2)}`;
    mensagem += `%0A*Total: R$ ${total.toFixed(2)}*%0A%0A`;

    mensagem += `🧑 *Nome:* ${nome}%0A`;
    mensagem += `🏠 *Endereço:* ${rua}, Nº ${numeroCasa}${complemento ? ', ' + complemento : ''}, Bairro ${bairro}, CEP ${cep}%0A`;
    mensagem += `💰 *Forma de Pagamento:* ${pagamento}%0A`;

    const numero = '5531999149772'; // ✅ Substitua pelo número da hamburgueria

    window.open(`https://wa.me/${numero}?text=${mensagem}`, '_blank');

    // Limpa carrinho e fecha o formulário após enviar
    carrinho = [];
    atualizarCarrinho();
    fecharFormulario();
}



