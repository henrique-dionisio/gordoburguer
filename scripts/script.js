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
    lista.innerHTML = '';
    let subtotal = 0; // Usaremos subtotal para os itens

    carrinho.forEach((item, index) => {
        const li = document.createElement('li');
        li.innerHTML = `${item.nome} - R$ ${item.preco.toFixed(2)} <button onclick="removerItem(${index})">🗑️</button>`;
        lista.appendChild(li);
        subtotal += item.preco;
    });

    let totalFinal;
    const totalCarrinhoElement = document.getElementById('total-carrinho');

    if (subtotal > 0) {
        const taxaEntrega = 5; // Definir a taxa de entrega aqui
        totalFinal = subtotal + taxaEntrega;
        totalCarrinhoElement.innerText = `Subtotal: R$ ${subtotal.toFixed(2)}\nTaxa de Entrega: R$ ${taxaEntrega.toFixed(2)}\nTotal: R$ ${totalFinal.toFixed(2)}`;
    } else {
        totalFinal = 0;
        totalCarrinhoElement.innerText = `Total: R$ ${totalFinal.toFixed(2)}`;
    }
}

function removerItem(index) {
    carrinho.splice(index, 1);
    atualizarCarrinho();
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

    let mensagem = `*Pedido - GordoBurger*%0A%0A`;

    let total = 0;

    carrinho.forEach(item => {
        mensagem += `🍔 ${item.nome} - R$ ${item.preco.toFixed(2)}%0A`;
        total += item.preco;
    });

    total += taxaEntrega;

    mensagem += `%0A🚚 *Taxa de Entrega:* R$ ${taxaEntrega.toFixed(2)}`;
    mensagem += `%0A*Total: R$ ${total.toFixed(2)}*%0A%0A`;

    mensagem += `🧑 *Nome:* ${nome}%0A`;
    mensagem += `🏠 *Endereço:* Rua ${rua}, Nº ${numeroCasa}${complemento ? ', ' + complemento : ''}, Bairro ${bairro}, CEP ${cep}%0A`;
    mensagem += `💰 *Forma de Pagamento:* ${pagamento}%0A`;

    const numero = '5531999149772'; // ✅ Substitua pelo número da hamburgueria

    window.open(`https://wa.me/${numero}?text=${mensagem}`, '_blank');

    // Limpa carrinho e fecha o formulário após enviar
    carrinho = [];
    atualizarCarrinho();
    fecharFormulario();
}



