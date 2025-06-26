// --- INICIALIZAÇÃO DO FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyD0JDcCA7FjUPK5b4lcMYVlHhmZEAS60x4",
    authDomain: "gordoburguer-4507f.firebaseapp.com",
    projectId: "gordoburguer-4507f",
    storageBucket: "gordoburguer-4507f.firebasestorage.app",
    messagingSenderId: "1099483216594",
    appId: "1:1099483216594:web:00dddf848624d880814b0b"
};

// Inicialize o Firebase
firebase.initializeApp(firebaseConfig);

// Crie referências para os serviços do Firebase
const auth = firebase.auth();
const db = firebase.firestore();


// --- SELETORES DE ELEMENTOS HTML ---
const loginContainer = document.getElementById('login-container');
const adminPanel = document.getElementById('admin-panel');
const adminUserEmailSpan = document.getElementById('admin-user-email');

// Tela de Login
const adminEmailInput = document.getElementById('admin-email');
const adminSenhaInput = document.getElementById('admin-senha');
const btnAdminLogin = document.getElementById('btn-admin-login');
const loginErrorMessage = document.getElementById('login-error-message');

// Painel Principal
const btnAdminLogout = document.getElementById('btn-admin-logout');
const pedidosContainer = document.getElementById('pedidos-container');


// --- LÓGICA DE AUTENTICAÇÃO DO ADMIN ---

function fazerLoginAdmin() {
    const email = adminEmailInput.value;
    const senha = adminSenhaInput.value;
    const btnText = btnAdminLogin.querySelector('.btn-text');
    const spinner = btnAdminLogin.querySelector('.spinner');

    if (!email || !senha) {
        loginErrorMessage.innerText = "Por favor, preencha e-mail e senha.";
        return;
    }
    loginErrorMessage.innerText = "";

    // Mostra o spinner e esconde o texto
    btnText.style.display = 'none';
    spinner.style.display = 'block';
    btnAdminLogin.disabled = true;

    auth.signInWithEmailAndPassword(email, senha)
        .catch((error) => {
            console.error("Erro no login do admin:", error);
            loginErrorMessage.innerText = "E-mail ou senha inválidos.";
        })
        .finally(() => {
            // Esconde o spinner e mostra o texto novamente, independentemente do resultado
            btnText.style.display = 'inline';
            spinner.style.display = 'none';
            btnAdminLogin.disabled = false;
        });
}

function fazerLogoutAdmin() {
    auth.signOut().catch(error => console.error("Erro ao fazer logout:", error));
}


// --- LÓGICA DO PAINEL DE PEDIDOS --

let filtroStatusAtual = 'todos'; // Começa mostrando 'Todos Ativos'

function filtrarPedidosPorStatus(status) {
    filtroStatusAtual = status; // Atualiza o filtro global

    // Atualiza o estado 'active' dos botões
    const botoesFiltro = document.querySelectorAll('.btn-filtro-status');
    botoesFiltro.forEach(botao => {
        botao.classList.toggle('active', botao.dataset.status === status);
    });

    // Chama a função carregarPedidos para que ela refaça a busca com o novo filtro
    // Precisamos primeiro pegar o usuário logado para passar o UID dele
    const user = auth.currentUser;
    if (user) {
        carregarPedidos(); // A função carregarPedidos agora usará o filtroStatusAtual
    }
}


function carregarPedidos() {
    const pedidosContainer = document.getElementById('pedidos-container');
    if (!pedidosContainer) return;

    let query = db.collection("pedidos");

    // Lógica de filtro (continua igual)
    if (filtroStatusAtual === 'todos') {
        query = query.where("status", "in", ["Recebido", "Em Preparo", "Pronto para Retirada", "Saiu para Entrega"]);
    } else {
        query = query.where("status", "==", filtroStatusAtual);
    }

    query.orderBy("timestamp", "desc")
      .onSnapshot((querySnapshot) => {

          if (querySnapshot.empty) {
              pedidosContainer.innerHTML = `<p>Nenhum pedido encontrado com o status "${filtroStatusAtual}".</p>`;
              return;
          }

          pedidosContainer.innerHTML = ""; // Limpa o container para redesenhar

          querySnapshot.forEach(doc => {
              const pedidoId = doc.id;

              const pedido = doc.data();
              const pedidoCard = document.createElement('div');
              
              // O restante do seu código para criar o pedidoCard continua exatamente igual...
              pedidoCard.className = `pedido-card status-${pedido.status.toLowerCase().replace(/ /g, '-')}`;
              pedidoCard.dataset.id = pedidoId;
              const dataPedido = pedido.timestamp ? pedido.timestamp.toDate().toLocaleString('pt-BR') : 'Data indisponível';

              pedidoCard.innerHTML = `
                  <div class="pedido-card-header">
                      <h3>Pedido #${pedidoId.substring(0, 6)}...</h3>
                      <button class="btn-imprimir" title="Imprimir Pedido">
                          <img src="/assets/icon-printer.webp" alt="Imprimir Pedido">
                      </button>
                  </div>
                  <p><strong>Cliente:</strong> ${pedido.userName || 'Não informado'}</p>
                  <p><strong>WhatsApp:</strong> ${pedido.userTelefone || 'Não informado'}<p><strong>Data:</strong> ${dataPedido}</p>
                  <p class="status-atual"><strong>Status Atual:</strong> <span class="status-texto">${pedido.status}</span></p>
                  <hr>
                  <h4>Itens:</h4>
                  <ul>
                      ${pedido.itens.map(item => `<li>${item.quantidade}x ${item.nome} - R$ ${item.preco.toFixed(2).replace('.', ',')}</li>`).join('')}
                  </ul>
                  ${pedido.observacoes && pedido.observacoes !== 'Nenhuma' ? `<hr><h4>Observações:</h4><p>${pedido.observacoes}</p>` : ''}
                  <hr>
                  <p><strong>Subtotal:</strong> R$ ${pedido.subtotal.toFixed(2).replace('.', ',')}</p>
                  <p><strong>Taxa de Entrega:</strong> R$ ${pedido.taxaEntrega.toFixed(2).replace('.', ',')}</p>
                  <p><strong>Total do Pedido:</strong> R$ ${pedido.total.toFixed(2).replace('.', ',')}</p>
                  <p><strong>Pagamento:</strong> ${pedido.formaPagamento || 'Não informado'}</p> ${pedido.trocoPara ? `<p><strong>Troco para:</strong> R$ ${pedido.trocoPara.toFixed(2).replace('.', ',')}</p>` : ''}
                  
                  ${pedido.tipoEntrega === 'entrega' ? `
                      <hr><h4>Endereço de Entrega:</h4>
                      <p>${pedido.endereco.rua}, Nº ${pedido.endereco.numero}, ${pedido.endereco.bairro}</p>
                      <p>CEP: ${pedido.endereco.cep}</p>
                      ${pedido.endereco.complemento ? `<p>Comp: ${pedido.endereco.complemento}</p>` : ''}
                  ` : `<hr><h4>Tipo de Pedido:</h4><p>Retirada no Local</p>`}
                  
                  <div class="status-select-container">
                      <label for="status-select-${pedidoId}">Mudar Status:</label>
                      <select id="status-select-${pedidoId}" class="status-select">
                          <option value="Recebido" ${pedido.status === 'Recebido' ? 'selected' : ''}>Recebido</option>
                          <option value="Em Preparo" ${pedido.status === 'Em Preparo' ? 'selected' : ''}>Em Preparo</option>
                          <option value="Pronto para Retirada" ${pedido.status === 'Pronto para Retirada' ? 'selected' : ''}>Pronto para Retirada</option>
                          <option value="Saiu para Entrega" ${pedido.status === 'Saiu para Entrega' ? 'selected' : ''}>Saiu para Entrega</option>
                          <option value="Concluído" ${pedido.status === 'Concluído' ? 'selected' : ''}>Concluído</option>
                      </select>
                      <button class="btn-atualizar-status" data-id="${pedidoId}">Atualizar</button>
                  </div>
              `;
              pedidosContainer.appendChild(pedidoCard);
          });
      }, (error) => {
          console.error("Erro ao buscar pedidos:", error);
          pedidosContainer.innerHTML = "<p>Ocorreu um erro ao carregar os pedidos.</p>";
      });
}

// ADICIONE este código para fazer os botões de filtro funcionarem
document.addEventListener('DOMContentLoaded', () => {
    // Adiciona o evento de clique a todos os botões de filtro
    const botoesFiltro = document.querySelectorAll('.btn-filtro-status');
    botoesFiltro.forEach(botao => {
        botao.addEventListener('click', () => {
            filtrarPedidosPorStatus(botao.dataset.status);
        });
    });
});

// Função para atualizar o status de um pedido no Firestore
function atualizarStatusPedido(pedidoId, novoStatus) {
    if (!pedidoId || !novoStatus) {
        alert("Informações inválidas para atualizar o status.");
        return;
    }
    
    const pedidoRef = db.collection("pedidos").doc(pedidoId);

    pedidoRef.update({
        status: novoStatus
    })
    .then(() => {
        console.log(`Status do pedido ${pedidoId} atualizado para: ${novoStatus}`);
        
        // --- ADIÇÃO IMPORTANTE AQUI ---
        // Chama a função de filtro para "seguir" o pedido para sua nova categoria.
        // Isso vai atualizar o botão ativo e recarregar a lista de pedidos com o novo filtro.
        if (typeof filtrarPedidosPorStatus === 'function') {
            filtrarPedidosPorStatus(novoStatus);
        }

    })
    .catch((error) => {
        console.error("Erro ao atualizar status: ", error);
        alert("Ocorreu um erro ao atualizar o status do pedido.");
    });
}

// NOVA FUNÇÃO: Prepara um card de pedido para impressão
function imprimirPedido(cardElement) {
    // 1. Adiciona uma classe temporária ao card que queremos imprimir
    cardElement.classList.add('printable-area');
    
    // 2. Chama a função de impressão do navegador
    window.print();
    
    // 3. Remove a classe temporária logo após a janela de impressão ser chamada
    setTimeout(() => {
        cardElement.classList.remove('printable-area');
    }, 100);
}


// --- EVENT LISTENERS ---

// Listener de estado de autenticação
auth.onAuthStateChanged(user => {
    if (user) {
        loginContainer.style.display = 'none';
        adminPanel.style.display = 'block';
        if (adminUserEmailSpan) adminUserEmailSpan.innerText = user.email; // Mostra o e-mail do admin logado
        
        carregarPedidos(); // Chama a função para carregar os pedidos

    } else {
        loginContainer.style.display = 'block';
        adminPanel.style.display = 'none';
    }
});

// Adiciona evento de clique ao botão de login do admin
if (btnAdminLogin) {
    btnAdminLogin.addEventListener('click', fazerLoginAdmin);
}

// Adiciona evento de clique ao botão de logout do admin
if (btnAdminLogout) {
    btnAdminLogout.addEventListener('click', fazerLogoutAdmin);
}

// Adiciona um listener de eventos ao container de pedidos para lidar com os cliques nos botões de status
// Isso usa a delegação de eventos, que é mais eficiente do que adicionar um listener para cada botão.
if (pedidosContainer) {
    pedidosContainer.addEventListener('click', (event) => {
        // Verifica se o elemento clicado foi um botão de atualizar status
        if (event.target.classList.contains('btn-atualizar-status')) {
            const pedidoId = event.target.dataset.id;
            const selectElement = document.getElementById(`status-select-${pedidoId}`);
            if (selectElement) {
                const novoStatus = selectElement.value;
                atualizarStatusPedido(pedidoId, novoStatus);
            }
        }
    });
}


const containerDePedidos = document.getElementById('pedidos-container');
if (containerDePedidos) {
    containerDePedidos.addEventListener('click', (event) => {

        // Verifica se o elemento clicado é um botão de atualizar status
        if (event.target.classList.contains('btn-atualizar-status')) {
            const pedidoId = event.target.dataset.id;
            const selectElement = document.getElementById(`status-select-${pedidoId}`);
            
            if (selectElement) {
                const novoStatus = selectElement.value;
                atualizarStatusPedido(pedidoId, novoStatus);
            }
        }

        // Lógica para o botão de IMPRIMIR
        const btnImprimir = event.target.closest('.btn-imprimir');
        if (btnImprimir) {
            const pedidoCard = event.target.closest('.pedido-card');
            if (pedidoCard) {
                imprimirPedido(pedidoCard);
            }
        }

    });
}