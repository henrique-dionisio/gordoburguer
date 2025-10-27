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
const storage = firebase.storage();


// --- SELETORES DE ELEMENTOS HTML ---
const loginContainer = document.getElementById('login-container');
const adminPanel = document.getElementById('admin-panel');
const adminUserEmailSpan = document.getElementById('admin-user-email');
const horariosInputsContainer = document.getElementById('horarios-inputs-container');
let pedidosRecebidosJaNotificados = new Set();
let primeiroCarregamentoPedidos = true; // Flag para evitar notificação na carga inicial

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


// --- VERSÃO ATUALIZADA de carregarPedidos ---
function carregarPedidos() {
    const pedidosContainer = document.getElementById('pedidos-container');
    const badgePedidosRecebidos = document.getElementById('badge-pedidos-recebidos'); // Pega o span do badge
    if (!pedidosContainer || !badgePedidosRecebidos) return;

    let query = db.collection("pedidos");

    // Lógica de filtro (não muda)
    if (filtroStatusAtual === 'todos') {
        query = query.where("status", "in", ["Recebido", "Em Preparo", "Pronto para Retirada", "Saiu para Entrega"]);
    } else {
        query = query.where("status", "==", filtroStatusAtual);
    }

    query.orderBy("timestamp", "desc")
      .onSnapshot((querySnapshot) => {

          // Flag para saber se um *novo* pedido "Recebido" chegou nesta atualização
          let novoPedidoRecebidoDetectado = false;
          // Contador para o badge
          let contadorRecebidos = 0;

          if (querySnapshot.empty) {
              pedidosContainer.innerHTML = `<p>Nenhum pedido encontrado com o status "${filtroStatusAtual}".</p>`;
          } else {
              pedidosContainer.innerHTML = ""; // Limpa antes de redesenhar
          }

          // Usar docChanges para detectar adições
          querySnapshot.docChanges().forEach((change) => {
              const pedidoId = change.doc.id;
              const pedido = change.doc.data();

              // Contar TODOS os recebidos (para o badge)
              if (pedido.status === 'Recebido') {
                  contadorRecebidos++;
              }

              // Lógica de Notificação de NOVO pedido recebido
              if (change.type === 'added' && pedido.status === 'Recebido') {
                  if (!pedidosRecebidosJaNotificados.has(pedidoId)) {
                      // É um pedido 'Recebido' que nunca vimos antes
                      pedidosRecebidosJaNotificados.add(pedidoId);
                      
                      // Só notifica se NÃO for o primeiro carregamento da página
                      if (!primeiroCarregamentoPedidos) {
                          novoPedidoRecebidoDetectado = true;
                      }
                  }
              }
              
              // Lógica para desenhar/atualizar/remover o card (ajustada para docChanges)
              // Só desenha se o pedido corresponder ao filtro atual ou se o filtro for 'todos'
              const correspondeAoFiltro = (filtroStatusAtual === 'todos' && ["Recebido", "Em Preparo", "Pronto para Retirada", "Saiu para Entrega"].includes(pedido.status)) ||
                                         (pedido.status === filtroStatusAtual);

              if (change.type === 'added' || change.type === 'modified') {
                  if (correspondeAoFiltro) {
                      // Se já existe um card com esse ID, remove antes de adicionar o novo/modificado
                      const cardExistente = pedidosContainer.querySelector(`.pedido-card[data-id="${pedidoId}"]`);
                      if (cardExistente) {
                          cardExistente.remove();
                      }

                      // Cria e adiciona o card (seu código de criação do innerHTML)
                      const pedidoCard = document.createElement('div');
                      pedidoCard.className = `pedido-card status-${pedido.status.toLowerCase().replace(/ /g, '-')}`;
                      pedidoCard.dataset.id = pedidoId;
                      const dataPedido = pedido.timestamp ? pedido.timestamp.toDate().toLocaleString('pt-BR') : 'Data indisponível';

                      // --- COLE SEU INNERHTML DO CARD AQUI ---
                      // (O mesmo código gigante que gera o card)
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
                      
                      // Adiciona ao container (idealmente ordenado por data, mas simples por agora)
                      pedidosContainer.appendChild(pedidoCard); 
                  } else {
                      // Se foi modificado para um status FORA do filtro atual, remove o card
                       const cardExistente = pedidosContainer.querySelector(`.pedido-card[data-id="${pedidoId}"]`);
                      if (cardExistente) {
                          cardExistente.remove();
                      }
                  }
              } else if (change.type === 'removed') {
                  // Remove o card se o documento foi deletado
                  const cardExistente = pedidosContainer.querySelector(`.pedido-card[data-id="${pedidoId}"]`);
                  if (cardExistente) {
                      cardExistente.remove();
                  }
              }
          }); // Fim do loop docChanges

          // Atualizar o contador no badge
          const badgeAtual = parseInt(badgePedidosRecebidos.textContent || '0');
          badgePedidosRecebidos.textContent = contadorRecebidos;
          if (contadorRecebidos > 0) {
             badgePedidosRecebidos.style.display = 'inline-block'; // Garante visibilidade
             // Animação de pulso se o número mudou
             if (contadorRecebidos !== badgeAtual && !primeiroCarregamentoPedidos) {
                 badgePedidosRecebidos.classList.add('updated');
                 setTimeout(() => badgePedidosRecebidos.classList.remove('updated'), 500);
             }
          } else {
             badgePedidosRecebidos.style.display = 'none'; // Esconde se for 0
          }

          // Tocar som se um novo pedido "Recebido" foi detectado
          if (novoPedidoRecebidoDetectado) {
              tocarSomAdmin();
              // Opcional: Animar o link do menu
              const linkPedidos = document.querySelector('.nav-link[data-section="section-pedidos"]');
              if(linkPedidos){
                  linkPedidos.style.animation = 'pulse 1s 2'; // Pisca 2 vezes
                  setTimeout(()=> linkPedidos.style.animation = '', 2000);
              }
          }
          
          // Marca que o primeiro carregamento já foi feito
          primeiroCarregamentoPedidos = false;

      }, (error) => {
          console.error("Erro ao buscar pedidos:", error);
          pedidosContainer.innerHTML = "<p>Ocorreu um erro ao carregar os pedidos.</p>";
          badgePedidosRecebidos.textContent = '?'; // Indica erro no badge
          badgePedidosRecebidos.style.display = 'inline-block';
          badgePedidosRecebidos.style.backgroundColor = 'gray';
      });
}

// --- ADICIONE esta nova função para tocar o som ---
function tocarSomAdmin() {
    const audio = document.getElementById('admin-notification-sound');
    if (audio) {
        audio.currentTime = 0; // Reinicia caso já esteja tocando
        audio.play().catch(e => console.error("Erro ao tocar som de notificação:", e));
    }
}

function carregarItensCardapio() {
    const container = document.getElementById('lista-itens-cardapio');
    if (!container) return;

    db.collection("cardapio").orderBy("nome").onSnapshot(snapshot => {
        if (snapshot.empty) {
            container.innerHTML = "<p>Nenhum item cadastrado.</p>";
            return;
        }

        container.innerHTML = ""; // Limpa a lista
        snapshot.forEach(doc => {
            const item = doc.data();
            const card = document.createElement('div');
            card.className = 'pedido-card'; // Reutilizando seu CSS de card
            card.innerHTML = `
                <div style="display: flex; gap: 15px; align-items: center;">
                    <img src="${item.imagemURL}" alt="${item.nome}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
                    <div>
                        <h3>${item.nome}</h3>
                        <p><strong>Preço:</strong> R$ ${item.preco.toFixed(2).replace('.', ',')}</p>
                        <p><strong>Categoria:</strong> ${item.categoria}</p>
                    </div>
                </div>
                <div style="margin-top: 15px; display: flex; gap: 10px;">
                    <button class="btn-editar-item" data-id="${doc.id}">Editar</button>
                    <button class="btn-excluir-item" data-id="${doc.id}">Excluir</button>
                </div>
            `;
            container.appendChild(card);
        });
    }, error => {
        console.error("Erro ao carregar itens: ", error);
        container.innerHTML = "<p>Erro ao carregar itens.</p>";
    });
}

// ADICIONE este código para fazer os botões de filtro funcionarem
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.admin-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); // Impede que o '#' vá para a URL

            const targetSectionId = link.dataset.section;

            // 1. Remove 'active' de todos os links e seções
            navLinks.forEach(nav => nav.classList.remove('active'));
            sections.forEach(sec => sec.classList.remove('active'));

            // 2. Adiciona 'active' ao link clicado e à seção alvo
            link.classList.add('active');
            document.getElementById(targetSectionId).classList.add('active');
        });
    });
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
        adminPanel.style.display = 'flex';
        if (adminUserEmailSpan) adminUserEmailSpan.innerText = user.email; // Mostra o e-mail do admin logado
        
        carregarPedidos(); // Chama a função para carregar os pedidos
        carregarItensCardapio();
        carregarFormHorarios();

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

// Pega o formulário
const form = document.getElementById('form-item-cardapio');

// 1. Botão SALVAR
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const itemId = document.getElementById('item-id').value;
    const file = document.getElementById('item-imagem-upload').files[0];
    let imagemURL = document.getElementById('item-imagem-url-atual').value;

    // Pega o botão e mostra "Salvando..."
    const btnSalvar = document.getElementById('btn-salvar-item');
    btnSalvar.textContent = "Salvando...";
    btnSalvar.disabled = true;

    try {
        // 1. Se uma NOVA IMAGEM foi enviada, faça o upload
        if (file) {
            const storageRef = storage.ref(`imagens_cardapio/${Date.now()}_${file.name}`);
            const snapshot = await storageRef.put(file);
            imagemURL = await snapshot.ref.getDownloadURL();
        }

        // 2. Monte o objeto com os dados
        const itemData = {
            nome: document.getElementById('item-nome').value,
            descricao: document.getElementById('item-descricao').value,
            preco: parseFloat(document.getElementById('item-preco').value),
            categoria: document.getElementById('item-categoria').value,
            imagemURL: imagemURL
        };

        // 3. Salve no Firestore
        if (itemId) {
            // Atualiza um item existente
            await db.collection("cardapio").doc(itemId).update(itemData);
        } else {
            // Cria um novo item
            await db.collection("cardapio").add(itemData);
        }

        // 4. Limpe o formulário
        form.reset();
        document.getElementById('item-id').value = "";
        document.getElementById('item-imagem-url-atual').value = "";

        mostrarNotificacaoAdmin(itemId ? "Item atualizado com sucesso!" : "Item salvo com sucesso!");

    } catch (error) {
        console.error("Erro ao salvar item: ", error);
        mostrarNotificacaoAdmin("Erro ao salvar. Tente novamente.", "error");
    } finally {
        btnSalvar.textContent = "Salvar Item";
        btnSalvar.disabled = false;
    }
});

// 2. Botão NOVO ITEM (Limpar formulário)
document.getElementById('btn-novo-item').addEventListener('click', () => {
    form.reset();
    document.getElementById('item-id').value = "";
    document.getElementById('item-imagem-url-atual').value = "";
});

// 3. Botões EDITAR e EXCLUIR (Delegação de Eventos)
const listaContainer = document.getElementById('lista-itens-cardapio');
listaContainer.addEventListener('click', async (e) => {

    // Botão EDITAR
    if (e.target.classList.contains('btn-editar-item')) {
        const id = e.target.dataset.id;
        const doc = await db.collection("cardapio").doc(id).get();
        if (doc.exists) {
            const item = doc.data();
            // Preenche o formulário
            document.getElementById('item-id').value = id;
            document.getElementById('item-nome').value = item.nome;
            document.getElementById('item-descricao').value = item.descricao;
            document.getElementById('item-preco').value = item.preco;
            document.getElementById('item-categoria').value = item.categoria;
            document.getElementById('item-imagem-url-atual').value = item.imagemURL;

            // Rola a página para o topo, para o formulário
            form.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // Botão EXCLUIR
    if (e.target.classList.contains('btn-excluir-item')) {
        const id = e.target.dataset.id;
        if (confirm("Tem certeza que deseja excluir este item?")) {
            try {
                await db.collection("cardapio").doc(id).delete();
                // Idealmente, você também deletaria a imagem do Storage aqui,
                // mas vamos manter simples por enquanto.
            } catch (error) {
                console.error("Erro ao excluir: ", error);
                alert("Erro ao excluir item.");
            }
        }
    }
});

// --- NOVA FUNÇÃO DE NOTIFICAÇÃO ---
function mostrarNotificacaoAdmin(mensagem, tipo = 'success') {
    const notification = document.getElementById('admin-notification');
    const icon = document.getElementById('notification-icon');
    const message = document.getElementById('notification-message');

    if (!notification || !icon || !message) return;

    // Definir a mensagem
    message.textContent = mensagem;

    // Definir o tipo (sucesso ou erro)
    if (tipo === 'error') {
        notification.classList.add('error');
        icon.textContent = 'X'; // Ícone de erro
    } else {
        notification.classList.remove('error');
        icon.textContent = '✓'; // Ícone de sucesso (visto)
    }

    // Mostrar a notificação
    notification.classList.add('show');

    // Esconder a notificação após 3 segundos
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}


// --- LÓGICA DO PAINEL DE HORÁRIOS ---

// Função para formatar números para 2 dígitos (ex: 8 -> "08")
function pad(num) {
    return num < 10 ? '0' + num : num;
}

// Carrega os horários do Firestore e preenche o formulário
async function carregarFormHorarios() {
    if (!horariosInputsContainer) return;

    try {
        const doc = await db.collection("configuracao").doc("horarios").get();
        if (!doc.exists) {
            horariosInputsContainer.innerHTML = "<p>Documento de horários não encontrado.</p>";
            return;
        }

        const horarios = doc.data();
        horariosInputsContainer.innerHTML = ""; // Limpa o "Carregando..."

        // Nomes dos dias para o loop
        const diasDaSemana = [
            "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", 
            "Quinta-feira", "Sexta-feira", "Sábado"
        ];

        // Loop de 0 a 6
        for (let i = 0; i < 7; i++) {
            const dia = horarios[i]; // Pega o objeto { nomeDia: "...", abre: {...}, fecha: {...} }
            const nomeDia = diasDaSemana[i];

            // Formata a hora para o formato "HH:MM" que o <input type="time"> espera
            const horaAbre = `${pad(dia.abre.h)}:${pad(dia.abre.m)}`;
            const horaFecha = `${pad(dia.fecha.h)}:${pad(dia.fecha.m)}`;

            const linhaHtml = `
            <div class="horario-dia-linha">
                <label for="dia-${i}-nome">${nomeDia}</label>
                <input type="time" id="dia-${i}-abre" value="${horaAbre}" required>
                <input type="time" id="dia-${i}-fecha" value="${horaFecha}" required>
            </div>
            `;
            horariosInputsContainer.innerHTML += linhaHtml;
        }

    } catch (error) {
        console.error("Erro ao carregar horários: ", error);
        horariosInputsContainer.innerHTML = "<p>Erro ao carregar horários. Tente recarregar a página.</p>";
    }
}

// Salva os horários do formulário de volta no Firestore
async function salvarHorarios(event) {
    event.preventDefault(); // Impede o recarregamento da página

    const btn = document.getElementById("btn-salvar-horarios");
    btn.disabled = true;
    btn.textContent = "Salvando...";

    try {
        const novosHorarios = {}; // Cria um novo objeto de horários

        for (let i = 0; i < 7; i++) {
            // Pega os valores do <input type="time"> (ex: "10:30")
            const horaAbre = document.getElementById(`dia-${i}-abre`).value;
            const horaFecha = document.getElementById(`dia-${i}-fecha`).value;

            // Quebra o "10:30" em partes e converte para número
            const [abreH, abreM] = horaAbre.split(':').map(Number);
            const [fechaH, fechaM] = horaFecha.split(':').map(Number);
            
            // Recria o objeto no formato que o Firestore espera
            novosHorarios[i] = {
                // O nome do dia não é pego do formulário, ele é fixo
                nomeDia: horariosInputsContainer.querySelector(`label[for="dia-${i}-nome"]`).textContent,
                abre: { h: abreH, m: abreM },
                fecha: { h: fechaH, m: fechaM }
            };
        }
        
        // Salva o objeto inteiro de volta no Firestore
        // Usamos .set() para sobrescrever o documento 'horarios' com os novos dados
        await db.collection("configuracao").doc("horarios").set(novosHorarios);

        // Mostra o popup de sucesso que já criamos
        mostrarNotificacaoAdmin("Horários de funcionamento atualizados com sucesso!");

    } catch (error) {
        console.error("Erro ao salvar horários: ", error);
        mostrarNotificacaoAdmin("Erro ao salvar horários.", "error");
    } finally {
        btn.disabled = false;
        btn.textContent = "Salvar Horários";
    }
}

// --- ADICIONE O EVENT LISTENER ---
// No final do seu arquivo, junto com os outros listeners
document.addEventListener('DOMContentLoaded', () => {
    // ... (seu código dos listeners do menu e filtros) ...

    const formHorarios = document.getElementById('form-horarios');
    if (formHorarios) {
        formHorarios.addEventListener('submit', salvarHorarios);
    }
});