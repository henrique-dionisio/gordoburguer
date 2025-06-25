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
const LOCAL_STORAGE_KEY_USER_INFO = "gordoBurgerUserInfo";
let ultimoStatusConhecido = {};
let unsubscribeMonitorStatus = () => {}; // Função vazia para desligar o listener


const horariosFuncionamento = {
    0: { nomeDia: "Domingo", abre: { h: 10, m: 0 }, fecha: { h: 22, m: 0 } },
    1: { nomeDia: "Segunda-feira", abre: { h: 11, m: 30 }, fecha: { h: 22, m: 0 } },
    2: { nomeDia: "Terça-feira", abre: { h: 11, m: 30 }, fecha: { h: 22, m: 0 } },
    3: { nomeDia: "Quarta-feira", abre: { h: 11, m: 30 }, fecha: { h: 22, m: 0 } },
    4: { nomeDia: "Quinta-feira", abre: { h: 11, m: 30 }, fecha: { h: 22, m: 0 } },
    5: { nomeDia: "Sexta-feira", abre: { h: 11, m: 30 }, fecha: { h: 22, m: 0 } },
    6: { nomeDia: "Sábado", abre: { h: 10, m: 0 }, fecha: { h: 22, m: 0 } },
};

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
    const configHoje = horariosFuncionamento[diaHoje];
    if (!configHoje) return { status: false, proximoHorario: "Consulte nossos horários." };
    const agoraEmMinutos = horaHoje * 60 + minutoHoje;
    const abreEmMinutos = configHoje.abre.h * 60 + configHoje.abre.m;
    const fechaEmMinutos = configHoje.fecha.h * 60 + configHoje.fecha.m;
    if (agoraEmMinutos >= abreEmMinutos && agoraEmMinutos < fechaEmMinutos) {
        return { status: true, proximoHorario: "" };
    } else {
        let proximoHorarioMsg = "";
        if (agoraEmMinutos < abreEmMinutos) {
            proximoHorarioMsg = `Abrimos hoje (${configHoje.nomeDia}) às ${String(configHoje.abre.h).padStart(2, "0")}:${String(configHoje.abre.m).padStart(2, "0")}.`;
        } else {
            let diaSeguinte = (diaHoje + 1) % 7;
            let tentativas = 0;
            while (tentativas < 7) {
                const configDiaSeguinte = horariosFuncionamento[diaSeguinte];
                if (configDiaSeguinte) {
                    proximoHorarioMsg = `Abrimos ${configDiaSeguinte.nomeDia} às ${String(configDiaSeguinte.abre.h).padStart(2, "0")}:${String(configDiaSeguinte.abre.m).padStart(2, "0")}.`;
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

function abrirFormulario() {
    const formEl = document.getElementById("formulario"); if (!formEl) return;
    formEl.style.display = "flex"; tipoEntregaSelecionado = null; taxaEntregaAtual = taxaEntregaFixa;
    ['btn-retirada', 'btn-entrega'].forEach(id => document.getElementById(id)?.classList.remove("selecionado"));
    ['campos-endereco-container', 'container-pagamento', 'campo-troco'].forEach(id => document.getElementById(id) ? document.getElementById(id).style.display = 'none' : null);
    const form = formEl.querySelector(".form-content");
    if (form) {
      ['nome', 'observacoes', 'cep', 'rua', 'bairro', 'numero', 'complemento', 'troco_para'].forEach(id => { const f = form.querySelector(`#${id}`); if (f) f.value = ""; });
      const pSelect = form.querySelector("#pagamento"); if (pSelect) pSelect.selectedIndex = 0;
    }
    const taxaDisplay = document.getElementById("display-taxa-entrega"); if (taxaDisplay) taxaDisplay.innerText = "🏍️ Taxa de Entrega: (Escolha Retirada ou Entrega)";
    if (typeof carregarInformacoesCliente === "function") carregarInformacoesCliente();
    const user = auth.currentUser; if (user && document.getElementById("nome")) document.getElementById("nome").value = user.displayName;
    atualizarCarrinho();
}

function fecharFormulario() { const el = document.getElementById("formulario"); if (el) el.style.display = "none"; }
function formatarCEP(campo) { let v = campo.value.replace(/\D/g, ""); if (v.length > 5) v = `${v.slice(0, 5)}-${v.slice(5, 8)}`; campo.value = v; }
function buscarCep() { const el = document.getElementById("cep"); if (!el) return; const cep = el.value.replace(/\D/g, ""); if (cep.length !== 8) return; fetch(`https://viacep.com.br/ws/${cep}/json/`).then(res => res.json()).then(data => { if (data.erro) { alert("CEP não encontrado."); return; } document.getElementById("rua").value = data.logradouro; document.getElementById("bairro").value = data.bairro; }).catch(() => alert("Erro ao buscar CEP.")); }

function exibirAlertaCustomizado(msg, tipo = "info", duracao = 3000) { let div = document.getElementById("alerta-customizado-localStorage"); if (!div) { div = document.createElement("div"); div.id = "alerta-customizado-localStorage"; document.body.appendChild(div); } div.textContent = msg; div.className = `alerta-ls ${tipo} show`; setTimeout(() => { div.classList.remove("show"); }, duracao); }
function salvarInformacoesCliente() { const info = { nome: document.getElementById("nome").value.trim(), cep: document.getElementById("cep").value.trim(), rua: document.getElementById("rua").value.trim(), bairro: document.getElementById("bairro").value.trim(), numero: document.getElementById("numero").value.trim(), complemento: document.getElementById("complemento").value.trim() }; if (info.nome && info.cep) { localStorage.setItem(LOCAL_STORAGE_KEY_USER_INFO, JSON.stringify(info)); exibirAlertaCustomizado("Suas informações foram salvas!", "success"); } else { document.getElementById("lembrar-info-checkbox").checked = false; exibirAlertaCustomizado("Preencha nome e CEP para salvar.", "info"); } }
function carregarInformacoesCliente() { const infoSalva = localStorage.getItem(LOCAL_STORAGE_KEY_USER_INFO); const checkbox = document.getElementById("lembrar-info-checkbox"); if (infoSalva) { try { const info = JSON.parse(infoSalva); for (const key in info) { const el = document.getElementById(key); if (el) el.value = info[key]; } if (checkbox) checkbox.checked = true; if (info.cep && !info.rua) buscarCep(); } catch (e) { localStorage.removeItem(LOCAL_STORAGE_KEY_USER_INFO); if (checkbox) checkbox.checked = false; } } else if (checkbox) checkbox.checked = false; }
function apagarInformacoesCliente() { localStorage.removeItem(LOCAL_STORAGE_KEY_USER_INFO); exibirAlertaCustomizado("Suas informações não serão mais lembradas.", "info"); }

function enviarPedido() {
    const user = auth.currentUser; if (!user) { alert("Por favor, faça o login para finalizar seu pedido!"); return; }
    const nome = document.getElementById("nome").value, observacoes = document.getElementById("observacoes").value, formaPagamento = document.getElementById("pagamento").value, trocoInput = document.getElementById("troco_para").value;
    if (!nome || !tipoEntregaSelecionado || !formaPagamento) { alert("Preencha todos os campos obrigatórios."); return; } if (carrinho.length === 0) { alert("Seu carrinho está vazio!"); return; }
    const subtotal = carrinho.reduce((acc, i) => acc + i.preco * i.quantidade, 0); const total = subtotal + taxaEntregaAtual;
    const pedido = { userId: user.uid, userName: nome, userEmail: user.email, itens: carrinho, subtotal, taxaEntrega: taxaEntregaAtual, total, tipoEntrega: tipoEntregaSelecionado, formaPagamento, observacoes: observacoes || "Nenhuma", timestamp: firebase.firestore.FieldValue.serverTimestamp(), status: "Recebido" };
    if (tipoEntregaSelecionado === "entrega") {
        const end = { rua: document.getElementById("rua").value, numero: document.getElementById("numero").value, complemento: document.getElementById("complemento").value, bairro: document.getElementById("bairro").value, cep: document.getElementById("cep").value };
        if (!end.rua || !end.numero || !end.bairro || !end.cep) { alert("Para entrega, preencha o endereço completo."); return; }
        pedido.endereco = end;
    }
    if (formaPagamento === "Dinheiro" && trocoInput) { const troco = parseFloat(trocoInput.replace(",", ".")); if (!isNaN(troco) && troco > 0) pedido.trocoPara = troco; }
    db.collection("pedidos").add(pedido).then(docRef => {
        mostrarPopupConfirmacao(docRef.id.substring(0, 8));
        carrinho = []; fecharFormulario(); atualizarCarrinho();
        if(document.getElementById("lembrar-info-checkbox")?.checked) salvarInformacoesCliente();
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

auth.onAuthStateChanged((user) => {
    unsubscribeMonitorStatus(); // Desliga listener anterior
    const perfilSection = document.getElementById("perfil-cliente");
    const menuLogin = document.getElementById("menu-login");
    if (!menuLogin) return;
    if (user) {
        menuLogin.innerHTML = `<a href="#perfil-cliente">Olá, ${user.displayName.split(" ")[0]}</a> <a href="#" id="btn-logout" style="font-size: 0.8em; color: #ccc;">(Sair)</a>`;
        document.getElementById("btn-logout").addEventListener("click", fazerLogout);
        if (perfilSection) perfilSection.style.display = "block";
        carregarPedidoAtual(user.uid);
        monitorarMudancasStatus(user.uid);
        if (document.getElementById("nome")) document.getElementById("nome").value = user.displayName;
    } else {
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

// Inicialização da Página
document.addEventListener("DOMContentLoaded", () => {
    const todosButton = document.querySelector(".btn-categoria[data-filter='todos']");
    if (todosButton) todosButton.classList.add("active");
    if (typeof atualizarContadorCarrinho === "function") atualizarContadorCarrinho();
    if (typeof gerenciarEstadoLoja === "function") gerenciarEstadoLoja();
    const selectPagamento = document.getElementById("pagamento");
    if (selectPagamento) selectPagamento.addEventListener("change", verificarCampoTroco);
    const lembrarCheckbox = document.getElementById("lembrar-info-checkbox");
    if (lembrarCheckbox) {
        if (localStorage.getItem(LOCAL_STORAGE_KEY_USER_INFO)) lembrarCheckbox.checked = true;
        lembrarCheckbox.addEventListener("change", function () { this.checked ? salvarInformacoesCliente() : apagarInformacoesCliente(); });
    }
});