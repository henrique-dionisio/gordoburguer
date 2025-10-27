// ===================================================================
// GORDOBURGER - SCRIPT.JS 
// ===================================================================

// Animação Scroll
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add("show");
        }
    });
});
const hiddenElements = document.querySelectorAll(".item, .hero h2, .hero p, .hero .btn, h2");
hiddenElements.forEach((el) => observer.observe(el));

/* --------------------------------------------------------------------------- */
// CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyD0JDcCA7FjUPK5b4lcMYVlHhmZEAS60x4",
    authDomain: "gordoburguer-4507f.firebaseapp.com",
    projectId: "gordoburguer-4507f",
    storageBucket: "gordoburguer-4507f.firebasestorage.app",
    messagingSenderId: "1099483216594",
    appId: "1:1099483216594:web:00dddf848624d880814b0b",
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

/* --------------------------------------------------------------------------- */
// VARIÁVEIS GLOBAIS
let carrinho = [];
let tipoEntregaSelecionado = null;
const taxaEntregaFixa = 5.0;
let taxaEntregaAtual = taxaEntregaFixa;
let ultimoStatusConhecido = {};
let unsubscribeMonitorStatus = () => {}; // Função vazia para desligar o listener


let horariosDaLoja = null; // Vamos preencher isso com os dados do Firebase

/* --------------------------------------------------------------------------- */
// FUNÇÕES DO SITE
/* --------------------------------------------------------------------------- */

function filtrarCardapio(categoria) {
    const itens = document.querySelectorAll("#cardapio .itens-cardapio .item");
    const botoesCategoria = document.querySelectorAll(".categorias-cardapio .btn-categoria");
    botoesCategoria.forEach((botao) => {
        botao.classList.toggle("active", botao.getAttribute("data-filter") === categoria);
    });
    itens.forEach((item) => {
        const itemCategoria = item.getAttribute("data-category");
        item.style.display = categoria === "todos" || itemCategoria === categoria ? "" : "none";
    });
}

function abrirModal(titulo, descricao, preco) {
    const modal = document.getElementById("modal");
    if (modal) {
        document.getElementById("modal-title").innerText = titulo || "";
        document.getElementById("modal-desc").innerText = descricao || "";
        document.getElementById("modal-price").innerText = preco || "";
        modal.style.display = "flex";
    }
}

function fecharModal() {
    const modal = document.getElementById("modal");
    if (modal) modal.style.display = "none";
}

function estamosAbertosAgora() {
    const agora = new Date();
    const diaHoje = agora.getDay();
    const horaHoje = agora.getHours();
    const minutoHoje = agora.getMinutes();
    const configHoje = horariosDaLoja[diaHoje];
    if (!configHoje) return { status: false, proximoHorario: "Consulte nossos horários." };
    const agoraEmMinutos = horaHoje * 60 + minutoHoje;
    const abreEmMinutos = configHoje.abre.h * 60 + configHoje.abre.m;
    const fechaEmMinutos = configHoje.fecha.h * 60 + configHoje.fecha.m;
    if (agoraEmMinutos >= abreEmMinutos && agoraEmMinutos < fechaEmMinutos) {
        return { status: true, proximoHorario: "" };
    } else {
        let proximoHorarioMsg = "";
        if (agoraEmMinutos < abreEmMinutos) {
            proximoHorarioMsg = `Abriremos hoje (${configHoje.nomeDia}) às ${String(configHoje.abre.h).padStart(2, "0")}:${String(configHoje.abre.m).padStart(2, "0")}.`;
        } else {
            let diaSeguinte = (diaHoje + 1) % 7;
            let tentativas = 0;
            while (tentativas < 7) {
                const configDiaSeguinte = horariosDaLoja[diaSeguinte];
                if (configDiaSeguinte) {
                    proximoHorarioMsg = `Abriremos ${configDiaSeguinte.nomeDia} às ${String(configDiaSeguinte.abre.h).padStart(2, "0")}:${String(configDiaSeguinte.abre.m).padStart(2, "0")}.`;
                    break;
                }
                diaSeguinte = (diaSeguinte + 1) % 7;
                tentativas++;
            }
        }
        return { status: false, proximoHorario: proximoHorarioMsg || "Consulte nossos horários." };
    }
}

function gerenciarEstadoLoja() {
    const resultado = estamosAbertosAgora();
    const botoesAdicionar = document.querySelectorAll(".item button");
    const iconeCarrinho = document.getElementById("carrinho-icone");
    const btnFinalizar = document.querySelector(".btn-finalizar-pedido-carrinho");
    let msgFechado = document.getElementById("mensagem-loja-fechada");
    if (!msgFechado) {
        msgFechado = document.createElement("div");
        msgFechado.id = "mensagem-loja-fechada";
        document.body.prepend(msgFechado);
    }
    if (resultado.status) {
        msgFechado.style.display = "none";
        if (iconeCarrinho) { iconeCarrinho.classList.remove("desabilitado"); iconeCarrinho.onclick = toggleCarrinhoDetalhes; }
        botoesAdicionar.forEach(b => b.disabled = false);
        if (btnFinalizar) btnFinalizar.disabled = false;
    } else {
        msgFechado.innerHTML = `ESTAMOS FECHADOS NO MOMENTO.<br>${resultado.proximoHorario}`;
        msgFechado.style.display = "block";
        if (iconeCarrinho) { iconeCarrinho.classList.add("desabilitado"); iconeCarrinho.onclick = () => alert(`Estamos fechados!\n${resultado.proximoHorario}`); }
        botoesAdicionar.forEach(b => b.disabled = true);
        if (btnFinalizar) btnFinalizar.disabled = true;
    }
}

// --- LÓGICA DO MODAL LOGIN OBRIGATÓRIO ---

function abrirModalLoginObrigatorio() {
    const modal = document.getElementById("modal-login-obrigatorio");
    if (modal) {
        modal.style.display = "flex";
        // Adiciona o listener ao botão DENTRO do modal
        const btnLogin = document.getElementById("btn-login-modal");
        if (btnLogin) {
            // Remove listener antigo para evitar duplicação
            btnLogin.removeEventListener("click", fazerLoginComGoogle); 
            // Adiciona o listener novo
            btnLogin.addEventListener("click", fazerLoginComGoogle);
        }
    }
}

function fecharModalLoginObrigatorio() {
    const modal = document.getElementById("modal-login-obrigatorio");
    if (modal) modal.style.display = "none";
}

// Modifica a função de login para fechar o modal DEPOIS do login
function fazerLoginComGoogle() {
    fecharModalLoginObrigatorio(); // Fecha o modal ANTES de abrir o pop-up do Google
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .catch((error) => {
            console.error("Erro ao fazer login com Google:", error);
            if (error.code !== 'auth/popup-closed-by-user') alert(`Erro ao fazer login: ${error.message}`);
        });
}

function toggleCarrinhoDetalhes() { if (document.getElementById("carrinho-detalhes")) document.getElementById("carrinho-detalhes").classList.toggle("aberto"); }

function atualizarContadorCarrinho() {
    const el = document.getElementById("contador-itens-carrinho");
    if (el) {
        const totalItens = carrinho.reduce((total, item) => total + item.quantidade, 0);
        el.innerText = totalItens;
        el.style.display = totalItens > 0 ? "flex" : "none";
    }
}

function abrirFormularioEFecharDetalhes() {
    if (!estamosAbertosAgora().status) {
        alert(`Desculpe, estamos fechados!\n${estamosAbertosAgora().proximoHorario}`);
        return;
    }
    abrirFormulario();
    const detalhes = document.getElementById("carrinho-detalhes");
    if (detalhes && detalhes.classList.contains("aberto")) detalhes.classList.remove("aberto");
}

function selecionarTipoEntrega(tipo) {
    tipoEntregaSelecionado = tipo;
    document.getElementById("btn-retirada")?.classList.toggle("selecionado", tipo === "retirada");
    document.getElementById("btn-entrega")?.classList.toggle("selecionado", tipo === "entrega");
    const camposEnd = document.getElementById("campos-endereco-container");
    const displayTaxa = document.getElementById("display-taxa-entrega");
    if (tipo === "retirada") { if (camposEnd) camposEnd.style.display = "none"; taxaEntregaAtual = 0.0; } 
    else { if (camposEnd) camposEnd.style.display = "block"; taxaEntregaAtual = taxaEntregaFixa; }
    if (displayTaxa) displayTaxa.innerHTML = `🏍️ Taxa de Entrega: R$ ${taxaEntregaAtual.toFixed(2).replace(".", ",")}${tipo === "retirada" ? " (Retirada)" : ""}`;
    const contPagamento = document.getElementById("container-pagamento"); if (contPagamento) contPagamento.style.display = "block";
    verificarCampoTroco();
    atualizarCarrinho();
}

function verificarCampoTroco() {
    const el = document.getElementById("campo-troco");
    if (el) {
        el.style.display = (tipoEntregaSelecionado && document.getElementById("pagamento")?.value === "Dinheiro") ? "block" : "none";
        if (el.style.display === "none") document.getElementById("troco_para").value = "";
    }
}

function mostrarNotificacaoCarrinho(nomeItem) {
    const notification = document.getElementById("cart-notification");
    const itemNameElement = document.getElementById("notification-item-name");
    if (notification && itemNameElement) {
        itemNameElement.textContent = nomeItem;
        notification.classList.add("show");
        setTimeout(() => { notification.classList.remove("show"); }, 2000);
    }
}

function balançarCarrinho() {
    const icone = document.getElementById("carrinho-icone");
    if (icone && !icone.classList.contains("desabilitado")) {
        icone.classList.add("shake");
        setTimeout(() => { icone.classList.remove("shake"); }, 500);
    }
}

function adicionarAoCarrinho(nome, preco) {

    // --- VERIFICAÇÃO DE LOGIN ---
    const user = auth.currentUser;
    if (!user) {
        // Usuário NÃO está logado
        abrirModalLoginObrigatorio(); // Chama a função para mostrar o pop-up de login
        return; // Interrompe a função aqui
    }
    // --- FIM DA VERIFICAÇÃO ---

    if (!estamosAbertosAgora().status) {
        const msg = document.getElementById("mensagem-loja-fechada");
        if (msg) { msg.style.transform = "scale(1.05)"; setTimeout(() => { msg.style.transform = "scale(1)"; }, 200); }
        return;
    }
    const precoNum = parseFloat(preco.replace("R$", "").replace(",", "."));
    const itemExistente = carrinho.find(item => item.nome === nome);
    if (itemExistente) itemExistente.quantidade++;
    else carrinho.push({ nome, preco: precoNum, quantidade: 1 });
    atualizarCarrinho();
    mostrarNotificacaoCarrinho(nome);
    balançarCarrinho();
}

function atualizarQuantidadeItem(nome, novaQuantidade) {
    const item = carrinho.find(i => i.nome === nome);
    if (item) {
        if (novaQuantidade <= 0) removerItem(nome);
        else { item.quantidade = novaQuantidade; atualizarCarrinho(); }
    }
}

function atualizarCarrinho() {
    const lista = document.getElementById("itens-carrinho"); if (!lista) return; lista.innerHTML = "";
    let subtotal = 0;
    carrinho.forEach(item => {
        const li = document.createElement("li");
        subtotal += item.preco * item.quantidade;
        li.innerHTML = `<div class="item-info"><span class="item-name">${item.nome}</span><span class="item-price">R$ ${item.preco.toFixed(2).replace(".", ",")}</span></div><div class="quantity-controls"><div class="quantity-buttons"><button class="quantity-btn minus" onclick="atualizarQuantidadeItem('${item.nome}', ${item.quantidade - 1})">-</button><span class="quantity-display">${item.quantidade}</span><button class="quantity-btn plus" onclick="atualizarQuantidadeItem('${item.nome}', ${item.quantidade + 1})">+</button></div><button class="remove-item-btn" onclick="removerItem('${item.nome}')">🗑️</button></div>`;
        lista.appendChild(li);
    });
    const totalEl = document.getElementById("total-carrinho"); if (!totalEl) return; let totalFinal = subtotal; let textoTaxa = "";
    if (carrinho.length > 0) {
        if (tipoEntregaSelecionado) { totalFinal += taxaEntregaAtual; textoTaxa = `Taxa de Entrega: R$ ${taxaEntregaAtual.toFixed(2).replace(".", ",")}${tipoEntregaSelecionado === "retirada" ? " (Retirada)" : ""}`; } 
        else { textoTaxa = "(Escolha Retirada ou Entrega para ver frete)"; }
        totalEl.innerHTML = `Subtotal: R$ ${subtotal.toFixed(2).replace(".", ",")}<br>${textoTaxa}<br>Total: R$ ${totalFinal.toFixed(2).replace(".", ",")}${tipoEntregaSelecionado === null ? " + Frete" : ""}`;
    } else totalEl.innerText = `Total: R$ 0,00`;
    atualizarContadorCarrinho();
}

function removerItem(nome) {
    carrinho = carrinho.filter(item => item.nome !== nome);
    atualizarCarrinho();
}

function mostrarPopupConfirmacao(orderId) {
    const popup = document.getElementById("order-confirmation-popup");
    if (popup) {
        const idDisplay = document.getElementById("order-id-display");
        if(idDisplay) idDisplay.textContent = `#${orderId}`;
        popup.style.display = "flex";
        tocarSomNotificacao();
    }
}

function fecharPopupConfirmacao() { document.getElementById("order-confirmation-popup").style.display = "none"; }
function irParaPainelPedidos() { fecharPopupConfirmacao(); document.getElementById("perfil-cliente")?.scrollIntoView({ behavior: "smooth" }); }
function tocarSomNotificacao() { try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.frequency.setValueAtTime(800,ctx.currentTime); g.gain.setValueAtTime(0.3,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01,ctx.currentTime+0.3); o.start(); o.stop(ctx.currentTime+0.3); } catch(e){ console.log("Erro ao tocar som:", e); } }
function tocarSomStatusPedido() { tocarSomNotificacao(); }

// --- VERSÃO ATUALIZADA do abrirFormulario ---
async function abrirFormulario() { // Adiciona 'async'
    const formEl = document.getElementById("formulario");
    if (!formEl) return;

    // Limpa o formulário e reseta seleções (seu código original)
    formEl.style.display = "flex";
    tipoEntregaSelecionado = null;
    taxaEntregaAtual = taxaEntregaFixa;
    ['btn-retirada', 'btn-entrega'].forEach(id => document.getElementById(id)?.classList.remove("selecionado"));
    ['campos-endereco-container', 'container-pagamento', 'campo-troco'].forEach(id => document.getElementById(id) ? document.getElementById(id).style.display = 'none' : null);
    const form = formEl.querySelector(".form-content");
    if (form) {
        // Remove 'telefone' e campos de endereço da limpeza inicial, pois serão preenchidos
        ['nome', 'observacoes', 'troco_para'].forEach(id => { const f = form.querySelector(`#${id}`); if (f) f.value = ""; });
         // Limpa manualmente os campos de endereço que *podem* ser preenchidos
         if (form.querySelector("#cep")) form.querySelector("#cep").value = "";
         if (form.querySelector("#rua")) form.querySelector("#rua").value = "";
         if (form.querySelector("#bairro")) form.querySelector("#bairro").value = "";
         if (form.querySelector("#numero")) form.querySelector("#numero").value = "";
         if (form.querySelector("#complemento")) form.querySelector("#complemento").value = "";
         // Limpa telefone manualmente
         if (form.querySelector("#telefone")) form.querySelector("#telefone").value = "";

        const pSelect = form.querySelector("#pagamento"); if (pSelect) pSelect.selectedIndex = 0;
    }
    const taxaDisplay = document.getElementById("display-taxa-entrega"); if (taxaDisplay) taxaDisplay.innerText = "🏍️ Taxa de Entrega: (Escolha Retirada ou Entrega)";

    // Esconde o checkbox 'Lembrar informações'
    const lembrarContainer = document.querySelector(".lembrar-info-container");
    if (lembrarContainer) lembrarContainer.style.display = "none";

    // --- LÓGICA CORRETA: Preencher com dados do Firestore ---
    const user = auth.currentUser;
    if (user) {
        try {
            const userRef = db.collection("usuarios").doc(user.uid);
            const doc = await userRef.get();
            if (doc.exists) {
                const data = doc.data();

                // Preenche nome e telefone
                if (document.getElementById("nome")) document.getElementById("nome").value = data.nome || user.displayName || "";
                if (document.getElementById("telefone")) document.getElementById("telefone").value = data.telefone || "";

                // Preenche endereço padrão se existir
                const endereco = data.enderecoPadrao || {};
                if (document.getElementById("cep")) document.getElementById("cep").value = endereco.cep || "";
                if (document.getElementById("rua")) document.getElementById("rua").value = endereco.rua || "";
                if (document.getElementById("bairro")) document.getElementById("bairro").value = endereco.bairro || "";
                if (document.getElementById("numero")) document.getElementById("numero").value = endereco.numero || "";
                if (document.getElementById("complemento")) document.getElementById("complemento").value = endereco.complemento || "";
            } else {
                 // Se não encontrou perfil no Firestore, preenche só o nome do Auth
                 if (document.getElementById("nome")) document.getElementById("nome").value = user.displayName || "";
            }
        } catch (error) {
            console.error("Erro ao pré-preencher formulário com dados do perfil:", error);
            // Mesmo se falhar, preenche o nome do Auth
            if (document.getElementById("nome")) document.getElementById("nome").value = user.displayName || "";
        }
    }
    // --- FIM DO PREENCHIMENTO ---

    atualizarCarrinho(); // (Seu código original)
}

function fecharFormulario() { const el = document.getElementById("formulario"); if (el) el.style.display = "none"; }
function formatarCEP(campo) { let v = campo.value.replace(/\D/g, ""); if (v.length > 5) v = `${v.slice(0, 5)}-${v.slice(5, 8)}`; campo.value = v; }
function buscarCep() { const el = document.getElementById("cep"); if (!el) return; const cep = el.value.replace(/\D/g, ""); if (cep.length !== 8) return; fetch(`https://viacep.com.br/ws/${cep}/json/`).then(res => res.json()).then(data => { if (data.erro) { alert("CEP não encontrado."); return; } document.getElementById("rua").value = data.logradouro; document.getElementById("bairro").value = data.bairro; }).catch(() => alert("Erro ao buscar CEP.")); }

// NOVA FUNÇÃO: Formata o número de telefone enquanto o usuário digita
function formatarTelefone(event) {
    const input = event.target;
    // 1. Remove tudo que não é número e limita a 11 dígitos (DDD + 9 dígitos)
    let numeros = input.value.replace(/\D/g, '').substring(0, 11);

    // 2. Aplica a máscara de formatação dinamicamente
    let formatado = numeros;
    if (numeros.length > 2) {
        // Formato: (XX) X...
        formatado = `(${numeros.substring(0, 2)}) ${numeros.substring(2)}`;
    }
    if (numeros.length > 7) {
        // Formato: (XX) XXXXX-XXXX
        formatado = `(${numeros.substring(0, 2)}) ${numeros.substring(2, 7)}-${numeros.substring(7, 11)}`;
    }
    
    // 3. Atualiza o valor no campo
    input.value = formatado;
}

function exibirAlertaCustomizado(msg, tipo = "info", duracao = 3000) { let div = document.getElementById("alerta-customizado-localStorage"); if (!div) { div = document.createElement("div"); div.id = "alerta-customizado-localStorage"; document.body.appendChild(div); } div.textContent = msg; div.className = `alerta-ls ${tipo} show`; setTimeout(() => { div.classList.remove("show"); }, duracao); }

function enviarPedido() {
    const user = auth.currentUser; if (!user) { alert("Por favor, faça o login para finalizar seu pedido!"); return; }
    const nome = document.getElementById("nome").value, telefone = document.getElementById("telefone").value, observacoes = document.getElementById("observacoes").value, formaPagamento = document.getElementById("pagamento").value, trocoInput = document.getElementById("troco_para").value;
    if (!nome || !telefone || !tipoEntregaSelecionado || !formaPagamento) { alert("Preencha todos os campos obrigatórios."); return; } if (carrinho.length === 0) { alert("Seu carrinho está vazio!"); return; }
    const subtotal = carrinho.reduce((acc, i) => acc + i.preco * i.quantidade, 0); const total = subtotal + taxaEntregaAtual;
    const pedido = { userId: user.uid, userName: nome, userTelefone: telefone, userEmail: user.email, itens: carrinho, subtotal, taxaEntrega: taxaEntregaAtual, total, tipoEntrega: tipoEntregaSelecionado, formaPagamento, observacoes: observacoes || "Nenhuma", timestamp: firebase.firestore.FieldValue.serverTimestamp(), status: "Recebido" };
    if (tipoEntregaSelecionado === "entrega") {
        const end = { rua: document.getElementById("rua").value, numero: document.getElementById("numero").value, complemento: document.getElementById("complemento").value, bairro: document.getElementById("bairro").value, cep: document.getElementById("cep").value };
        if (!end.rua || !end.numero || !end.bairro || !end.cep) { alert("Para entrega, preencha o endereço completo."); return; }
        pedido.endereco = end;
    }
    if (formaPagamento === "Dinheiro" && trocoInput) { const troco = parseFloat(trocoInput.replace(",", ".")); if (!isNaN(troco) && troco > 0) pedido.trocoPara = troco; }
    db.collection("pedidos").add(pedido).then(docRef => {
        mostrarPopupConfirmacao(docRef.id.substring(0, 8));
        carrinho = []; fecharFormulario(); atualizarCarrinho();
    }).catch(err => { console.error("Erro ao salvar pedido: ", err); alert("Ocorreu um erro ao enviar seu pedido."); });
}

// Lógica de Autenticação
function fazerLoginComGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .catch((error) => {
            console.error("Erro ao fazer login com Google:", error);
            if (error.code !== 'auth/popup-closed-by-user') alert(`Erro ao fazer login: ${error.message}`);
        });
}

function fazerLogout() { auth.signOut(); }

// --- VERSÃO FINAL do onAuthStateChanged ---
auth.onAuthStateChanged(async (user) => { 
    unsubscribeMonitorStatus(); 
    
    const perfilSection = document.getElementById("perfil-cliente");
    const menuLogin = document.getElementById("menu-login");
    
    if (!menuLogin) return;

    if (user) {
        
        // Atualiza menu (Nome, Meu Perfil, Sair)
        const nomeCurto = user.displayName ? user.displayName.split(" ")[0] : "Usuário";
        menuLogin.innerHTML = `
            <div class="user-greeting">Olá, ${nomeCurto}</div> 
            <div class="user-actions">
                <a href="#" id="link-meu-perfil" class="user-action-button">Meu Perfil</a>
                <a href="#" id="btn-logout" class="user-action-button">Sair</a>
            </div>
        `;
        const btnLogout = document.getElementById("btn-logout");
        const linkPerfil = document.getElementById("link-meu-perfil");
        if(btnLogout) btnLogout.addEventListener("click", fazerLogout);
        if(linkPerfil) linkPerfil.addEventListener('click', (e) => { e.preventDefault(); abrirModalEditarPerfil(); }); // Chama a função de EDIÇÃO agora

        if (perfilSection) perfilSection.style.display = "block"; 
        
        // --- VERIFICAÇÃO DE PERFIL ---
        const userRef = db.collection("usuarios").doc(user.uid);
        let precisaCompletarPerfil = false;
        try {
            const doc = await userRef.get();

            if (!doc.exists) {
                // Primeira vez logando, cria perfil básico
                console.log(`Perfil não encontrado para ${user.uid}. Criando...`);
                await userRef.set({ /* ... objeto básico ... */ 
                    nome: user.displayName || "Usuário", email: user.email, telefone: "", 
                    enderecoPadrao: { cep: "", rua: "", numero: "", bairro: "", complemento: "" } 
                }, { merge: true });
                precisaCompletarPerfil = true; // Força completar na primeira vez
            } else {
                // Perfil existe, verifica se está completo
                const data = doc.data();
                if (!data.telefone || !data.enderecoPadrao || !data.enderecoPadrao.cep || !data.enderecoPadrao.numero) {
                    console.log(`Perfil incompleto para ${user.uid}. Solicitando preenchimento.`);
                    precisaCompletarPerfil = true;
                } 
            }
        } catch (err) {
            console.error("Erro ao verificar/criar perfil no Firestore:", err);
            // Mesmo com erro, tentamos continuar
        }
        
        // --- CHAMA O MODAL SE NECESSÁRIO ---
        if (precisaCompletarPerfil) {
            abrirModalCompletarPerfil(); // Chama o novo modal
        } else {
            // Se o perfil já está completo, carrega pedidos e monitora
            carregarPedidoAtual(user.uid);
            monitorarMudancasStatus(user.uid);
        }
        
    } else {
        // Usuário DESLOGADO
        menuLogin.innerHTML = `<a href="#" id="btn-login"><img src="/assets/google-g-logo.webp" alt="Logo do Google" class="google-logo"><span>Entrar com Google</span></a>`;
        document.getElementById("btn-login").addEventListener("click", fazerLoginComGoogle);
        if (perfilSection) perfilSection.style.display = "none";
        ultimoStatusConhecido = {};
    }
});

function carregarPedidoAtual(userId) {
    const container = document.getElementById("info-pedido-container"); if (!container) return;
    db.collection("pedidos").where("userId", "==", userId).where("status", "in", ["Recebido", "Em Preparo", "Pronto para Retirada", "Saiu para Entrega"]).orderBy("timestamp", "desc").onSnapshot((snapshot) => {
        if (snapshot.empty) { container.innerHTML = "<p>Você não tem pedidos ativos no momento.</p>"; }
        else { let html = ""; snapshot.forEach(doc => { const p = doc.data(); const s = p.status || 'indefinido'; html += `<div class="pedido-card"><h3>Pedido #${doc.id.substring(0,6)}...</h3><p><strong>Status:</strong> <span class="status-pedido status-${s.toLowerCase().replace(/ /g,'-')}">${s}</span></p><p><strong>Itens:</strong></p><ul>${Array.isArray(p.itens) ? p.itens.map(i => `<li>${i.quantidade}x ${i.nome} - R$ ${i.preco.toFixed(2).replace('.',',')}</li>`).join('') : ''}</ul><br><p><strong>Total:</strong> R$ ${p.total.toFixed(2).replace('.',',')}</p></div>`; }); container.innerHTML = html; }
    }, err => { console.error("Erro ao buscar pedidos: ", err); container.innerHTML = "<p>Ocorreu um erro ao carregar seus pedidos.</p>"; });
}

function monitorarMudancasStatus(userId) {
    unsubscribeMonitorStatus = db.collection("pedidos").where("userId", "==", userId).where("status", "in", ["Recebido", "Em Preparo", "Pronto para Retirada", "Saiu para Entrega"]).onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
            const pedidoId = change.doc.id;
            const statusAtual = change.doc.data().status;
            if (change.type === "modified" && ultimoStatusConhecido[pedidoId] && ultimoStatusConhecido[pedidoId] !== statusAtual) {
                tocarSomStatusPedido();
                console.log(`Status do pedido ${pedidoId} mudou para: ${statusAtual}`);
            }
            ultimoStatusConhecido[pedidoId] = statusAtual;
        });
        if(Object.keys(ultimoStatusConhecido).length === 0){ snapshot.forEach(doc => { ultimoStatusConhecido[doc.id] = doc.data().status; }); }
    });
}

// VERSÃO MODIFICADA (sem gerenciarEstadoLoja)
async function carregarCardapioDinamico() {
    const container = document.querySelector(".itens-cardapio");
    const loadingIndicator = document.getElementById("cardapio-loading");

    try {
        const snapshot = await db.collection("cardapio").orderBy("nome").get();
        if (snapshot.empty) {
            loadingIndicator.textContent = "Nenhum item no cardápio no momento. :(";
            return; // Retorna aqui em caso de erro/vazio
        }
        let htmlItens = "";
        snapshot.forEach(doc => {
            // ... (seu código de gerar o htmlItens) ...
            // ... (cole o código que você já tem aqui) ...
            const item = doc.data();
            const precoFormatado = `R$ ${item.preco.toFixed(2).replace(".", ",")}`;
            const nomeJS = item.nome.replace(/'/g, "\\'");
            const descJS = item.descricao.replace(/'/g, "\\'");
            htmlItens += `
            <div class="item" data-category="${item.categoria}" onclick="abrirModal('${nomeJS}', '${descJS}', '${precoFormatado}')">
                <img src="${item.imagemURL}" alt="${item.nome}">
                <div class="item-content">
                    <p class="aviso-ilustrativo">Imagens meramente ilustrativas</p>
                    <h3>${item.nome}</h3>
                    <p class="descricao-lanche">${item.descricao}</p>
                    <span>${precoFormatado}</span>
                    <button onclick="adicionarAoCarrinho('${nomeJS}', '${precoFormatado}'); event.stopPropagation();">
                        Adicionar ao Carrinho
                    </button>
                </div>
            </div>`;
        });

        loadingIndicator.style.display = "none";
        container.innerHTML = htmlItens;

        // REMOVEMOS AS CHAMADAS DE gerenciarEstadoLoja(), filtrarCardapio() e observer.observe() DAQUI

    } catch (error) {
        console.error("Erro ao carregar cardápio dinâmico: ", error);
        loadingIndicator.textContent = "Erro ao carregar o cardápio. Tente atualizar a página.";
    }
}

// Inicialização da Página
document.addEventListener("DOMContentLoaded", async () => {

    // 1. Inicia o carregamento do cardápio e dos horários EM PARALELO
    const promessaCardapio = carregarCardapioDinamico();
    const promessaHorarios = carregarHorariosDoSite();

    // 2. Espera que AMBOS terminem
    await Promise.all([promessaCardapio, promessaHorarios]);

    // 3. Agora que temos 100% de certeza que temos os horários e o cardápio,
    //    podemos rodar as funções que dependem deles:

    // Ativa/Desativa a loja (agora com os horários corretos)
    gerenciarEstadoLoja(); 

    // Preenche o HTML dos horários no rodapé
    atualizarDisplayHorariosHtml(); 

    // Ativa o filtro "Todos" do cardápio
    const todosButton = document.querySelector(".btn-categoria[data-filter='todos']");
    if (todosButton) todosButton.classList.add("active");

    // Liga a animação de scroll para os itens do cardápio
    const novosItens = document.querySelectorAll(".item");
    novosItens.forEach((el) => observer.observe(el));

    // Atualiza o contador do carrinho (para 0)
    atualizarContadorCarrinho();

    // Adiciona os listeners de pagamento e 'lembrar-info'
    const selectPagamento = document.getElementById("pagamento");
    if (selectPagamento) selectPagamento.addEventListener("change", verificarCampoTroco);


    const campoTelefone = document.getElementById('telefone');
    if (campoTelefone) {
        campoTelefone.addEventListener('input', formatarTelefone);
    }

    const formCompletarPerfil = document.getElementById('form-completar-perfil');
    if(formCompletarPerfil) {
        formCompletarPerfil.addEventListener('submit', salvarPerfilCompleto);
    }
    const completarTelefoneInput = document.getElementById('completar-telefone');
    if (completarTelefoneInput) {
        completarTelefoneInput.addEventListener('input', formatarTelefone);
    }
    
    // Renomeia a função do modal de edição para evitar conflito
    const linkEditarPerfil = document.getElementById("link-meu-perfil"); // Pega o link do header
    if(linkEditarPerfil) linkEditarPerfil.addEventListener('click', (e) => { 
        e.preventDefault(); 
        abrirModalEditarPerfil(); // Função que abre o modal de EDIÇÃO
    }); 

    const formEditarPerfil = document.getElementById('form-editar-perfil');
    if(formEditarPerfil) {
        formEditarPerfil.addEventListener('submit', salvarPerfilEditado);
    }
    const editarTelefoneInput = document.getElementById('editar-telefone');
    if (editarTelefoneInput) {
        editarTelefoneInput.addEventListener('input', formatarTelefone);
    }
});


// Função auxiliar (já deve estar no seu código)
function pad(num) {
    return String(num).padStart(2, '0');
}

// Função para preencher o HTML dos horários
function atualizarDisplayHorariosHtml() {

    const container = document.getElementById("horarios-display-container");
    
    // Verifica se encontrou o container HTML
    if (!container) {
        console.error("DEBUG HORARIOS: ERRO - Container #horarios-display-container NÃO encontrado!"); // <-- ADICIONE
        return;
    }
    
    // Verifica se os horários foram carregados do Firebase
    if (!horariosDaLoja) {
        container.innerHTML = '<h3>⏰ Horários de Funcionamento</h3><p>Erro ao carregar dados dos horários.</p>';
        return;
    }
    

    try { // Adiciona um try...catch para pegar erros inesperados
        let html = '<h3>⏰ Horários de Funcionamento</h3>';
        const agrupados = {};

        // Loop principal para agrupar horários
        for (let i = 0; i < 7; i++) {
            // Verifica se o dia existe nos dados carregados
            if (!horariosDaLoja[i] || !horariosDaLoja[i].abre || !horariosDaLoja[i].fecha) {
                 continue; // Pula para o próximo dia
            }

            const dia = horariosDaLoja[i];
            const horaStr = ` ${pad(dia.abre.h)}:${pad(dia.abre.m)} às ${pad(dia.fecha.h)}:${pad(dia.fecha.m)}`;
            
            if (agrupados[horaStr]) {
                agrupados[horaStr].dias.push(dia.nomeDia || `Dia ${i}`); // Usa nomeDia ou fallback
            } else {
                agrupados[horaStr] = { dias: [dia.nomeDia || `Dia ${i}`] };
            }
        }
        

        // Loop secundário para formatar o HTML (VERSÃO FINAL)
        for (const horaStr in agrupados) {
            const nomesDias = agrupados[horaStr].dias;
            let nomeFinal = ""; // Começa vazio

            // Tenta agrupar Segunda a Sexta
            if (nomesDias.length >= 5 && nomesDias.includes("Segunda-feira") && nomesDias.includes("Sexta-feira")) {
                nomeFinal = "Segunda a Sexta";
            } 
            // Tenta agrupar Terça a Sexta
            else if (nomesDias.length === 4 && nomesDias.includes("Terça-feira") && nomesDias.includes("Sexta-feira")) {
                nomeFinal = "Terça-feira a Sexta-feira";
            } 
            // Tenta agrupar Sábado e Domingo
            else if (nomesDias.length === 2 && nomesDias.includes("Sábado") && nomesDias.includes("Domingo")) {
                nomeFinal = "Sábado e Domingo";
            } 
            // --- NOVO CASO GENÉRICO ---
            // Se for mais de um dia, mas não se encaixou acima, junta TODOS com vírgula
            else if (nomesDias.length > 1) {
                nomeFinal = nomesDias.join(', '); // Ex: "Domingo, Segunda-feira, Sábado"
            }
            // Se for só um dia
            else if (nomesDias.length === 1) {
                nomeFinal = nomesDias[0]; // Mostra só o nome do dia único
            }

            // Só adiciona a linha se tivermos um nome de dia válido
            if (nomeFinal) {
                html += `<p>🗓️ ${nomeFinal}: ${horaStr}</p>`;
            }
        }
        
        html += '<p>📍 Estamos aguardando seu pedido!</p>';
        

        // A linha crucial:
        container.innerHTML = html;
        

    } catch (error) {
        container.innerHTML = '<h3>⏰ Horários de Funcionamento</h3><p>Ocorreu um erro ao formatar os horários.</p>';
    }
}

// NOVA FUNÇÃO para carregar horários no site do cliente
async function carregarHorariosDoSite() {
    try {
        const doc = await db.collection("configuracao").doc("horarios").get();
        if (doc.exists) {
            horariosDaLoja = doc.data();
        } else {
            console.error("Documento de horários não encontrado!");
            // Fallback para um objeto vazio se falhar
            horariosDaLoja = {}; 
        }
    } catch (error) {
        console.error("Erro ao buscar horários: ", error);
        horariosDaLoja = {}; // Fallback
    }
}


// --- LÓGICA DO MODAL COMPLETAR PERFIL (Pós-Login) ---

async function abrirModalCompletarPerfil() {
    const modal = document.getElementById("modal-completar-perfil");
    const form = document.getElementById("form-completar-perfil");
    const statusEl = document.getElementById("completar-perfil-status");
    if (!modal || !form || !statusEl) return;

    statusEl.textContent = "Carregando...";
    modal.style.display = "flex"; 

    const user = auth.currentUser;
    if (!user) { statusEl.textContent = "Erro: Usuário não logado."; return; }

    try {
        const userRef = db.collection("usuarios").doc(user.uid);
        const doc = await userRef.get();

        if (doc.exists) {
            const data = doc.data();
            // Preenche o formulário com dados existentes (inclusive nome do Google)
            document.getElementById("completar-nome").value = data.nome || user.displayName || "";
            document.getElementById("completar-telefone").value = data.telefone || "";
            const endereco = data.enderecoPadrao || {}; 
            document.getElementById("completar-cep").value = endereco.cep || "";
            document.getElementById("completar-rua").value = endereco.rua || "";
            document.getElementById("completar-bairro").value = endereco.bairro || "";
            document.getElementById("completar-numero").value = endereco.numero || "";
            document.getElementById("completar-complemento").value = endereco.complemento || "";
            statusEl.textContent = ""; 
        } else {
             statusEl.textContent = "Erro ao carregar dados. Tente recarregar.";
        }
    } catch (error) {
        console.error("Erro ao buscar dados para completar perfil:", error);
        statusEl.textContent = "Erro ao carregar.";
    }
}

async function salvarPerfilCompleto(event) {
    event.preventDefault(); 

    const btnSalvar = document.getElementById("btn-salvar-perfil-completo");
    const statusEl = document.getElementById("completar-perfil-status");
    if (!btnSalvar || !statusEl) return;

    // Validação básica (Telefone e Número são obrigatórios)
    const telefone = document.getElementById("completar-telefone").value;
    const numero = document.getElementById("completar-numero").value;
    const cep = document.getElementById("completar-cep").value;
    if (!telefone || !numero || !cep) {
        statusEl.textContent = "Telefone, CEP e Número são obrigatórios.";
        return;
    }


    btnSalvar.disabled = true;
    statusEl.textContent = "Salvando...";

    const user = auth.currentUser;
    if (!user) { /* ... (tratamento de erro) ... */ return; }

    const dadosAtualizados = {
        nome: document.getElementById("completar-nome").value,
        telefone: telefone,
        enderecoPadrao: {
            cep: cep,
            rua: document.getElementById("completar-rua").value,
            bairro: document.getElementById("completar-bairro").value,
            numero: numero,
            complemento: document.getElementById("completar-complemento").value
        }
    };

    try {
        const userRef = db.collection("usuarios").doc(user.uid);
        // Usamos SET com MERGE para garantir que criará ou atualizará corretamente
        await userRef.set(dadosAtualizados, { merge: true }); 
        
        statusEl.textContent = "Perfil salvo com sucesso!";

        // Fecha o modal e carrega os pedidos
        setTimeout(() => {
            fecharModalCompletarPerfil();
            // Agora que o perfil está completo, carrega os pedidos
            carregarPedidoAtual(user.uid);
            monitorarMudancasStatus(user.uid);
        }, 1500); 

    } catch (error) {
        /* ... (tratamento de erro) ... */
        console.error("Erro ao salvar perfil completo:", error);
        statusEl.textContent = "Erro ao salvar. Tente novamente.";
    } finally {
        // Re-habilita o botão APENAS se deu erro
        if (statusEl.textContent.startsWith("Erro")) {
             btnSalvar.disabled = false;
        }
    }
}

function fecharModalCompletarPerfil() {
    const modal = document.getElementById("modal-completar-perfil");
    if (modal) modal.style.display = "none";
    // Opcional: Limpar mensagem de status ao cancelar
    const statusEl = document.getElementById("completar-perfil-status");
    if(statusEl) statusEl.textContent = ""; 
}

// Adapta a busca de CEP para o novo modal
function buscarCepCompletarPerfil() {
    const cepInput = document.getElementById("completar-cep");
    // ... (lógica de fetch API igual à buscarCepPerfil) ...
    const cep = cepInput.value.replace(/\D/g, "");
    if (cep.length !== 8) return;
    fetch(`https://viacep.com.br/ws/${cep}/json/`)
        .then(res => res.json())
        .then(data => {
            if (data.erro) { alert("CEP não encontrado."); return; }
            document.getElementById("completar-rua").value = data.logradouro || "";
            document.getElementById("completar-bairro").value = data.bairro || "";
            document.getElementById("completar-numero").focus(); 
        })
        .catch(() => alert("Erro ao buscar CEP."));
}



async function abrirModalEditarPerfil() {
    const modal = document.getElementById("modal-editar-perfil");
    const form = document.getElementById("form-editar-perfil");
    const statusEl = document.getElementById("editar-perfil-status");
    if (!modal || !form || !statusEl) return;

    statusEl.textContent = "Carregando...";
    modal.style.display = "flex"; 

    const user = auth.currentUser;
    if (!user) { statusEl.textContent = "Erro: Usuário não logado."; return; }

    try {
        const userRef = db.collection("usuarios").doc(user.uid);
        const doc = await userRef.get();

        if (doc.exists) {
            const data = doc.data();
            // Preenche o formulário com dados existentes (inclusive nome do Google)
            document.getElementById("editar-nome").value = data.nome || user.displayName || "";
            document.getElementById("editar-telefone").value = data.telefone || "";
            const endereco = data.enderecoPadrao || {}; 
            document.getElementById("editar-cep").value = endereco.cep || "";
            document.getElementById("editar-rua").value = endereco.rua || "";
            document.getElementById("editar-bairro").value = endereco.bairro || "";
            document.getElementById("editar-numero").value = endereco.numero || "";
            document.getElementById("editar-complemento").value = endereco.complemento || "";
            statusEl.textContent = ""; 
        } else {
             statusEl.textContent = "Erro ao carregar dados. Tente recarregar.";
        }
    } catch (error) {
        console.error("Erro ao buscar dados para completar perfil:", error);
        statusEl.textContent = "Erro ao carregar.";
    }
}

async function salvarPerfilEditado(event) {
    event.preventDefault(); 

    const btnSalvar = document.getElementById("btn-salvar-perfil-editado");
    const statusEl = document.getElementById("editar-perfil-status");
    if (!btnSalvar || !statusEl) return;

    // Validação básica (Telefone e Número são obrigatórios)
    const telefone = document.getElementById("editar-telefone").value;
    const numero = document.getElementById("editar-numero").value;
    const cep = document.getElementById("editar-cep").value;
    if (!telefone || !numero || !cep) {
        statusEl.textContent = "Telefone, CEP e Número são obrigatórios.";
        return;
    }


    btnSalvar.disabled = true;
    statusEl.textContent = "Salvando...";

    const user = auth.currentUser;
    if (!user) { /* ... (tratamento de erro) ... */ return; }

    const dadosAtualizados = {
        nome: document.getElementById("editar-nome").value,
        telefone: telefone,
        enderecoPadrao: {
            cep: cep,
            rua: document.getElementById("editar-rua").value,
            bairro: document.getElementById("editar-bairro").value,
            numero: numero,
            complemento: document.getElementById("editar-complemento").value
        }
    };

    try {
        const userRef = db.collection("usuarios").doc(user.uid);
        // Usamos SET com MERGE para garantir que criará ou atualizará corretamente
        await userRef.set(dadosAtualizados, { merge: true }); 
        
        statusEl.textContent = "Perfil salvo com sucesso!";

        // Fecha o modal e carrega os pedidos
        setTimeout(() => {
            fecharModalEditarPerfil();
            // Agora que o perfil está completo, carrega os pedidos
            carregarPedidoAtual(user.uid);
            monitorarMudancasStatus(user.uid);
        }, 1500); 

    } catch (error) {
        /* ... (tratamento de erro) ... */
        console.error("Erro ao salvar perfil completo:", error);
        statusEl.textContent = "Erro ao salvar. Tente novamente.";
    } finally {
        // Re-habilita o botão APENAS se deu erro
        if (statusEl.textContent.startsWith("Erro")) {
             btnSalvar.disabled = false;
        }
    }
}

function fecharModalEditarPerfil() {
    const modal = document.getElementById("modal-editar-perfil");
    if (modal) modal.style.display = "none";
    // Opcional: Limpar mensagem de status ao cancelar
    const statusEl = document.getElementById("editar-perfil-status");
    if(statusEl) statusEl.textContent = ""; 
}

// Adapta a busca de CEP para o novo modal
function buscarCepEditarPerfil() {
    const cepInput = document.getElementById("editar-cep");
    // ... (lógica de fetch API igual à buscarCepPerfil) ...
    const cep = cepInput.value.replace(/\D/g, "");
    if (cep.length !== 8) return;
    fetch(`https://viacep.com.br/ws/${cep}/json/`)
        .then(res => res.json())
        .then(data => {
            if (data.erro) { alert("CEP não encontrado."); return; }
            document.getElementById("editar-rua").value = data.logradouro || "";
            document.getElementById("editar-bairro").value = data.bairro || "";
            document.getElementById("editar-numero").focus(); 
        })
        .catch(() => alert("Erro ao buscar CEP."));
}

