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

// Carrinho de Compras
let carrinho = [];

function adicionarAoCarrinho(nome, preco) {
    carrinho.push({ nome, preco: parseFloat(preco.replace('R$', '').replace(',', '.')) });
    atualizarCarrinho();
}

function atualizarCarrinho() {
    const lista = document.getElementById('itens-carrinho');
    lista.innerHTML = '';
    let total = 0;

    carrinho.forEach((item, index) => {
        const li = document.createElement('li');
        li.innerHTML = `${item.nome} - R$ ${item.preco.toFixed(2)} <button onclick="removerItem(${index})">🗑️</button>`;
        lista.appendChild(li);
        total += item.preco;
    });

    document.getElementById('total-carrinho').innerText = `Total: R$ ${total.toFixed(2)}`;
}

function removerItem(index) {
    carrinho.splice(index, 1);
    atualizarCarrinho();
}

// Formulário
function abrirFormulario() {
    document.getElementById('formulario').style.display = 'flex';
}

function fecharFormulario() {
    document.getElementById('formulario').style.display = 'none';
}

// Enviar para WhatsApp
function enviarPedido() {
    const nome = document.getElementById('nome').value;
    const endereco = document.getElementById('endereco').value;
    const pagamento = document.getElementById('pagamento').value;

    if (!nome || !endereco) {
        alert('Por favor, preencha nome e endereço.');
        return;
    }

    let mensagem = `*Pedido - GordoBurger*%0A%0A`;
    carrinho.forEach(item => {
        mensagem += `🍔 ${item.nome} - R$ ${item.preco.toFixed(2)}%0A`;
    });

    const total = carrinho.reduce((sum, item) => sum + item.preco, 0);
    mensagem += `%0A*Total: R$ ${total.toFixed(2)}*%0A%0A`;
    mensagem += `🧑 *Nome:* ${nome}%0A🏠 *Endereço:* ${endereco}%0A💰 *Pagamento:* ${pagamento}%0A`;

    const numero = '5531999149772'; // Substitua pelo número da hamburgueria
    window.open(`https://wa.me/${numero}?text=${mensagem}`, '_blank');

    carrinho = [];
    atualizarCarrinho();
    fecharFormulario();
}

