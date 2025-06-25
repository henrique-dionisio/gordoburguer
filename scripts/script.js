// Animação Scroll
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("show")
    }
  })
})
const hiddenElements = document.querySelectorAll(".item, .hero h2, .hero p, .hero .btn, h2")
hiddenElements.forEach((el) => observer.observe(el))

/* --------------------------------------------------------------------------- */
// Filtrar Cardápio por Categoria
function filtrarCardapio(categoria) {
  const itens = document.querySelectorAll("#cardapio .itens-cardapio .item")
  const botoesCategoria = document.querySelectorAll(".categorias-cardapio .btn-categoria")

  botoesCategoria.forEach((botao) => {
    botao.classList.toggle("active", botao.getAttribute("data-filter") === categoria)
  })

  itens.forEach((item) => {
    const itemCategoria = item.getAttribute("data-category")
    item.style.display = categoria === "todos" || itemCategoria === categoria ? "" : "none"
  })
}

/* --------------------------------------------------------------------------- */
// Modal
function abrirModal(titulo, descricao, preco) {
  const modal = document.getElementById("modal")
  const modalTitle = document.getElementById("modal-title")
  const modalDesc = document.getElementById("modal-desc")
  const modalPrice = document.getElementById("modal-price")

  if (modal && modalTitle && modalDesc && modalPrice) {
    modalTitle.innerText = titulo || ""
    modalDesc.innerText = descricao || ""
    modalPrice.innerText = preco || ""
    modal.style.display = "flex"
  }
}

function fecharModal() {
  const modal = document.getElementById("modal")
  if (modal) modal.style.display = "none"
}

/* --------------------------------------------------------------------------- */

//CÓDIGO DE CONFIGURAÇÃO DO FIREBASE NO INÍCIO DO SEU SCRIPT

const firebaseConfig = {
  apiKey: "AIzaSyD0JDcCA7FjUPK5b4lcMYVlHhmZEAS60x4",
  authDomain: "gordoburguer-4507f.firebaseapp.com",
  projectId: "gordoburguer-4507f",
  storageBucket: "gordoburguer-4507f.firebasestorage.app",
  messagingSenderId: "1099483216594",
  appId: "1:1099483216594:web:00dddf848624d880814b0b",
}

// 2. Inicialize o Firebase
firebase.initializeApp(firebaseConfig)

// 3. Crie referências para os serviços do Firebase que vamos usar
const auth = firebase.auth()
const db = firebase.firestore()

/* --------------------------------------------------------------------------- */

// Variáveis Globais e Configurações do Pedido e Horários
let carrinho = []
let tipoEntregaSelecionado = null
const taxaEntregaFixa = 5.0
let taxaEntregaAtual = taxaEntregaFixa
const LOCAL_STORAGE_KEY_USER_INFO = "gordoBurgerUserInfo"

const horariosFuncionamento = {
  0: { nomeDia: "Domingo", abre: { h: 10, m: 0 }, fecha: { h: 22, m: 0 } },
  1: { nomeDia: "Segunda-feira", abre: { h: 11, m: 30 }, fecha: { h: 22, m: 0 } },
  2: { nomeDia: "Terça-feira", abre: { h: 11, m: 30 }, fecha: { h: 22, m: 0 } },
  3: { nomeDia: "Quarta-feira", abre: { h: 9, m: 30 }, fecha: { h: 22, m: 0 } },
  4: { nomeDia: "Quinta-feira", abre: { h: 11, m: 30 }, fecha: { h: 22, m: 0 } },
  5: { nomeDia: "Sexta-feira", abre: { h: 11, m: 30 }, fecha: { h: 22, m: 0 } },
  6: { nomeDia: "Sábado", abre: { h: 10, m: 0 }, fecha: { h: 22, m: 0 } },
}

/* --------------------------------------------------------------------------- */
// Funções de Verificação de Horário e Gerenciamento da Loja

function estamosAbertosAgora() {
  const agora = new Date()
  const diaHoje = agora.getDay()
  const horaHoje = agora.getHours()
  const minutoHoje = agora.getMinutes()
  const configHoje = horariosFuncionamento[diaHoje]

  if (!configHoje || !configHoje.abre || !configHoje.fecha) {
    return { status: false, proximoHorario: "Horário de funcionamento não definido para hoje." }
  }

  const agoraEmMinutos = horaHoje * 60 + minutoHoje
  const abreEmMinutos = configHoje.abre.h * 60 + configHoje.abre.m
  const fechaEmMinutos = configHoje.fecha.h * 60 + configHoje.fecha.m

  if (agoraEmMinutos >= abreEmMinutos && agoraEmMinutos < fechaEmMinutos) {
    return { status: true, proximoHorario: "" }
  } else {
    let proximoHorarioMsg = ""
    if (agoraEmMinutos < abreEmMinutos) {
      // Ainda não abriu hoje
      proximoHorarioMsg = `Abriremos hoje (${configHoje.nomeDia}) às ${String(configHoje.abre.h).padStart(2, "0")}:${String(configHoje.abre.m).padStart(2, "0")}.`
    } else {
      // Já fechou hoje, verificar o próximo dia
      let diaSeguinte = (diaHoje + 1) % 7
      let tentativas = 0
      while (tentativas < 7) {
        const configDiaSeguinte = horariosFuncionamento[diaSeguinte]
        if (configDiaSeguinte && configDiaSeguinte.abre) {
          proximoHorarioMsg = `Abriremos ${configDiaSeguinte.nomeDia} às ${String(configDiaSeguinte.abre.h).padStart(2, "0")}:${String(configDiaSeguinte.abre.m).padStart(2, "0")}.`
          break
        }
        diaSeguinte = (diaSeguinte + 1) % 7
        tentativas++
      }
      if (!proximoHorarioMsg) proximoHorarioMsg = "Consulte nossos horários."
    }
    return { status: false, proximoHorario: proximoHorarioMsg }
  }
}

function gerenciarEstadoLoja() {
  const resultadoVerificacao = estamosAbertosAgora()
  const todosBotoesAdicionar = document.querySelectorAll(".item button")
  const iconeCarrinho = document.getElementById("carrinho-icone")
  const btnFinalizarCarrinho = document.querySelector(".btn-finalizar-pedido-carrinho")
  let mensagemFechadoElement = document.getElementById("mensagem-loja-fechada")

  if (!mensagemFechadoElement) {
    mensagemFechadoElement = document.createElement("div")
    mensagemFechadoElement.id = "mensagem-loja-fechada"
    document.body.prepend(mensagemFechadoElement)
  }

  if (resultadoVerificacao.status) {
    // Loja Aberta
    mensagemFechadoElement.style.display = "none"
    if (iconeCarrinho) {
      iconeCarrinho.style.display = "flex"
      iconeCarrinho.classList.remove("desabilitado")
      iconeCarrinho.onclick = toggleCarrinhoDetalhes // Restaura clique original
    }
    todosBotoesAdicionar.forEach((botao) => {
      botao.disabled = false
    })
    if (btnFinalizarCarrinho) btnFinalizarCarrinho.disabled = false
  } else {
    // Loja Fechada
    mensagemFechadoElement.innerHTML = `ESTAMOS FECHADOS NO MOMENTO.<br>${resultadoVerificacao.proximoHorario}`
    mensagemFechadoElement.style.display = "block"
    if (iconeCarrinho) {
      iconeCarrinho.classList.add("desabilitado")
      iconeCarrinho.onclick = () => {
        // Impede abrir carrinho e mostra alerta
        alert(`Estamos fechados!\n${resultadoVerificacao.proximoHorario}`)
      }
    }
    todosBotoesAdicionar.forEach((botao) => {
      botao.disabled = true
    })
    if (btnFinalizarCarrinho) btnFinalizarCarrinho.disabled = true

    const detalhesCarrinho = document.getElementById("carrinho-detalhes")
    if (detalhesCarrinho && detalhesCarrinho.classList.contains("aberto")) {
      toggleCarrinhoDetalhes() // Fecha o carrinho se estiver aberto
    }
  }
}

/* --------------------------------------------------------------------------- */
// Funções do Carrinho Flutuante
function toggleCarrinhoDetalhes() {
  const detalhes = document.getElementById("carrinho-detalhes")
  if (detalhes) detalhes.classList.toggle("aberto")
}

function atualizarContadorCarrinho() {
  const contadorElement = document.getElementById("contador-itens-carrinho")
  if (contadorElement) {
    const totalItens = carrinho.reduce((total, item) => total + item.quantidade, 0)
    contadorElement.innerText = totalItens
    contadorElement.style.display = totalItens > 0 ? "flex" : "none"
  }
}

// abrirFormularioEFecharDetalhes para checar estado da loja
function abrirFormularioEFecharDetalhes() {
  const resultadoVerificacao = estamosAbertosAgora()
  if (!resultadoVerificacao.status) {
    alert(
      `Desculpe, estamos fechados e não é possível finalizar o pedido agora.\n${resultadoVerificacao.proximoHorario}`,
    )
    return
  }
  abrirFormulario()
  const detalhes = document.getElementById("carrinho-detalhes")
  if (detalhes && detalhes.classList.contains("aberto")) {
    detalhes.classList.remove("aberto")
  }
}

/* --------------------------------------------------------------------------- */
// Lógica do Pedido (selecionarTipoEntrega, verificarCampoTroco)
function selecionarTipoEntrega(tipo) {
  tipoEntregaSelecionado = tipo
  const btnRetirada = document.getElementById("btn-retirada")
  const btnEntrega = document.getElementById("btn-entrega")
  const camposEnderecoContainer = document.getElementById("campos-endereco-container")
  const displayTaxaElement = document.getElementById("display-taxa-entrega")
  const containerPagamento = document.getElementById("container-pagamento")

  if (tipo === "retirada") {
    if (btnRetirada) btnRetirada.classList.add("selecionado")
    if (btnEntrega) btnEntrega.classList.remove("selecionado")
    if (camposEnderecoContainer) camposEnderecoContainer.style.display = "none"
    taxaEntregaAtual = 0.0
    if (displayTaxaElement)
      displayTaxaElement.innerHTML = `🏍️ Taxa de Entrega: R$ ${taxaEntregaAtual.toFixed(2).replace(".", ",")} (Retirada)`
  } else {
    // 'entrega'
    if (btnEntrega) btnEntrega.classList.add("selecionado")
    if (btnRetirada) btnRetirada.classList.remove("selecionado")
    if (camposEnderecoContainer) camposEnderecoContainer.style.display = "block"
    taxaEntregaAtual = taxaEntregaFixa
    if (displayTaxaElement)
      displayTaxaElement.innerHTML = `🏍️ Taxa de Entrega: R$ ${taxaEntregaAtual.toFixed(2).replace(".", ",")}`
  }

  if (containerPagamento) containerPagamento.style.display = "block"
  verificarCampoTroco()
  atualizarCarrinho()
}

function verificarCampoTroco() {
  const formaPagamentoElement = document.getElementById("pagamento")
  const campoTrocoDiv = document.getElementById("campo-troco")

  if (formaPagamentoElement && campoTrocoDiv) {
    const formaPagamento = formaPagamentoElement.value
    if (tipoEntregaSelecionado && formaPagamento === "Dinheiro") {
      campoTrocoDiv.style.display = "block"
    } else {
      campoTrocoDiv.style.display = "none"
      const trocoParaElement = document.getElementById("troco_para")
      if (trocoParaElement) trocoParaElement.value = ""
    }
  }
}

/* --------------------------------------------------------------------------- */
// Carrinho de Compras (adicionarAoCarrinho, atualizarCarrinho, removerItem)

// Função para mostrar notificação de item adicionado
function mostrarNotificacaoCarrinho(nomeItem) {
  const notification = document.getElementById("cart-notification")
  const itemNameElement = document.getElementById("notification-item-name")

  if (notification && itemNameElement) {
    itemNameElement.textContent = nomeItem
    notification.classList.add("show")

    // Remove a notificação após 2 segundos
    setTimeout(() => {
      notification.classList.remove("show")
    }, 2000)
  }
}

// Função para fazer o carrinho balançar
function balançarCarrinho() {
  const iconeCarrinho = document.getElementById("carrinho-icone")
  if (iconeCarrinho && !iconeCarrinho.classList.contains("desabilitado")) {
    iconeCarrinho.classList.add("shake")
    setTimeout(() => {
      iconeCarrinho.classList.remove("shake")
    }, 500)
  }
}

// adicionarAoCarrinho para checar estado da loja
function adicionarAoCarrinho(nome, preco) {
  const resultadoVerificacao = estamosAbertosAgora()
  if (!resultadoVerificacao.status) {
    // A barra de mensagem já deve estar visível. Um alerta adicional pode ser redundante
    // mas pode ser útil se o usuário tentar clicar muito rápido.
    const msgFechado = document.getElementById("mensagem-loja-fechada")
    if (msgFechado && msgFechado.style.display === "block") {
      msgFechado.style.transform = "scale(1.05)"
      setTimeout(() => {
        msgFechado.style.transform = "scale(1)"
      }, 200)
    } else {
      // Caso a barra não esteja visível por algum motivo (improvável)
      alert(`Desculpe, estamos fechados!\n${resultadoVerificacao.proximoHorario}`)
    }
    return
  }

  const precoNumerico = Number.parseFloat(preco.replace("R$", "").replace(",", "."))

  // Verificar se o item já existe no carrinho
  const itemExistente = carrinho.find((item) => item.nome === nome)

  if (itemExistente) {
    // Se existe, aumenta a quantidade
    itemExistente.quantidade += 1
  } else {
    // Se não existe, adiciona novo item
    carrinho.push({
      nome,
      preco: precoNumerico,
      quantidade: 1,
    })
  }

  atualizarCarrinho()
  mostrarNotificacaoCarrinho(nome)
  balançarCarrinho()
}

// Função para atualizar quantidade de um item
function atualizarQuantidadeItem(nome, novaQuantidade) {
  const item = carrinho.find((item) => item.nome === nome)
  if (item) {
    if (novaQuantidade <= 0) {
      removerItem(nome)
    } else {
      item.quantidade = novaQuantidade
      atualizarCarrinho()
    }
  }
}

// função atualizarCarrinho (adaptada para o novo sistema de quantidades)
function atualizarCarrinho() {
  const lista = document.getElementById("itens-carrinho")
  if (!lista) return
  lista.innerHTML = ""
  let subtotal = 0

  carrinho.forEach((item) => {
    const li = document.createElement("li")

    const itemTotal = item.preco * item.quantidade
    subtotal += itemTotal

    li.innerHTML = `
            <div class="item-info">
                <span class="item-name">${item.nome}</span>
                <span class="item-price">R$ ${item.preco.toFixed(2).replace(".", ",")}</span>
            </div>
            <div class="quantity-controls">
                <div class="quantity-buttons">
                    <button class="quantity-btn minus" onclick="atualizarQuantidadeItem('${item.nome}', ${item.quantidade - 1})">-</button>
                    <span class="quantity-display">${item.quantidade}</span>
                    <button class="quantity-btn plus" onclick="atualizarQuantidadeItem('${item.nome}', ${item.quantidade + 1})">+</button>
                </div>
                <button class="remove-item-btn" onclick="removerItem('${item.nome}')">🗑️</button>
            </div>
        `

    lista.appendChild(li)
  })

  const totalCarrinhoElement = document.getElementById("total-carrinho")
  if (!totalCarrinhoElement) return

  let totalFinal = subtotal
  let textoTaxaCarrinho = ""

  if (carrinho.length > 0) {
    if (tipoEntregaSelecionado === "retirada") {
      textoTaxaCarrinho = `Taxa de Entrega: R$ 0,00 (Retirada)`
      // totalFinal já é o subtotal, pois taxaEntregaAtual seria 0
    } else if (tipoEntregaSelecionado === "entrega") {
      textoTaxaCarrinho = `Taxa de Entrega: R$ ${taxaEntregaAtual.toFixed(2).replace(".", ",")}`
      totalFinal += taxaEntregaAtual
    } else {
      textoTaxaCarrinho = "(Escolha Retirada ou Entrega para ver frete)"
    }
    totalCarrinhoElement.innerHTML = `Subtotal: R$ ${subtotal.toFixed(2).replace(".", ",")}<br>${textoTaxaCarrinho}<br>Total: R$ ${totalFinal.toFixed(2).replace(".", ",")}${tipoEntregaSelecionado === null ? " + Frete" : ""}`
  } else {
    totalCarrinhoElement.innerText = `Total: R$ 0,00`
  }
  atualizarContadorCarrinho()
}

function removerItem(nome) {
  carrinho = carrinho.filter((item) => item.nome !== nome)
  atualizarCarrinho()
}

/* --------------------------------------------------------------------------- */
// Popup de Confirmação de Pedido

function mostrarPopupConfirmacao(orderId) {
  const popup = document.getElementById("order-confirmation-popup")
  const orderIdContainer = document.getElementById("order-id-container")
  const orderIdDisplay = document.getElementById("order-id-display")

  if (popup) {
    if (orderId && orderIdContainer && orderIdDisplay) {
      orderIdContainer.style.display = "block"
      orderIdDisplay.textContent = `#${orderId}`
    }

    popup.style.display = "flex"

    // Tocar som de notificação
    tocarSomNotificacao()
  }
}

function fecharPopupConfirmacao() {
  const popup = document.getElementById("order-confirmation-popup")
  if (popup) {
    popup.style.display = "none"
  }
}

function irParaPainelPedidos() {
  fecharPopupConfirmacao()
  const perfilSection = document.getElementById("perfil-cliente")
  if (perfilSection) {
    perfilSection.scrollIntoView({ behavior: "smooth" })
  }
}

/* --------------------------------------------------------------------------- */
// Sistema de Som para Notificações

function tocarSomNotificacao() {
  try {
    // Criar som sintético usando Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    // Configurar frequências para um som agradável
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2)

    // Configurar volume
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)
  } catch (error) {
    console.log("Não foi possível reproduzir o som:", error)
  }
}

// Função para tocar som quando status do pedido mudar
function tocarSomStatusPedido() {
  tocarSomNotificacao()
}

/* --------------------------------------------------------------------------- */
// Formulário (abrirFormulario, fecharFormulario, formatarCEP, buscarCep)

function abrirFormulario() {
  const formularioElement = document.getElementById("formulario")
  if (!formularioElement) return

  formularioElement.style.display = "flex"

  tipoEntregaSelecionado = null
  taxaEntregaAtual = taxaEntregaFixa

  const btnRetirada = document.getElementById("btn-retirada")
  const btnEntrega = document.getElementById("btn-entrega")
  if (btnRetirada) btnRetirada.classList.remove("selecionado")
  if (btnEntrega) btnEntrega.classList.remove("selecionado")

  const camposEnderecoContainer = document.getElementById("campos-endereco-container")
  const containerPagamento = document.getElementById("container-pagamento")
  const campoTrocoDiv = document.getElementById("campo-troco")

  if (camposEnderecoContainer) camposEnderecoContainer.style.display = "none"
  if (containerPagamento) containerPagamento.style.display = "none"
  if (campoTrocoDiv) campoTrocoDiv.style.display = "none"

  const form = formularioElement.querySelector(".form-content")
  if (form) {
    const fieldsToClear = ["nome", "observacoes", "cep", "rua", "bairro", "numero", "complemento", "troco_para"]
    fieldsToClear.forEach((id) => {
      const field = form.querySelector(`#${id}`)
      if (field) field.value = ""
    })
    const pagamentoSelect = form.querySelector("#pagamento")
    if (pagamentoSelect) pagamentoSelect.selectedIndex = 0
  }

  const displayTaxaElement = document.getElementById("display-taxa-entrega")
  if (displayTaxaElement) displayTaxaElement.innerText = "🏍️ Taxa de Entrega: (Escolha Retirada ou Entrega)"

  if (typeof carregarInformacoesCliente === "function") {
    carregarInformacoesCliente()
  }

  const user = auth.currentUser
  if (user && document.getElementById("nome")) {
    document.getElementById("nome").value = user.displayName
  }

  atualizarCarrinho()
}

function fecharFormulario() {
  const formularioElement = document.getElementById("formulario")
  if (formularioElement) formularioElement.style.display = "none"
}

function formatarCEP(campoCep) {
  let cep = campoCep.value.replace(/\D/g, "")
  if (cep.length > 5) {
    cep = cep.substring(0, 5) + "-" + cep.substring(5, 8)
  }
  campoCep.value = cep
}
/* --------------------------------------------------------------------------- */

function buscarCep() {
  const cepInput = document.getElementById("cep")
  if (!cepInput) return
  const cep = cepInput.value.replace(/\D/g, "")

  if (cep.length !== 8) {
    return
  }

  fetch(`https://viacep.com.br/ws/${cep}/json/`)
    .then((response) => response.json())
    .then((data) => {
      const ruaElem = document.getElementById("rua")
      const bairroElem = document.getElementById("bairro")
      if (data.erro) {
        alert("CEP não encontrado.")
        if (ruaElem) ruaElem.value = ""
        if (bairroElem) bairroElem.value = ""
        return
      }
      if (ruaElem) ruaElem.value = data.logradouro
      if (bairroElem) bairroElem.value = data.bairro
    })
    .catch(() => {
      alert("Erro ao buscar CEP.")
      const ruaElem = document.getElementById("rua")
      const bairroElem = document.getElementById("bairro")
      if (ruaElem) ruaElem.value = ""
      if (bairroElem) bairroElem.value = ""
    })
}
/* --------------------------------------------------------------------------- */

// NOVA FUNÇÃO: Para exibir alertas customizados
function exibirAlertaCustomizado(mensagem, tipo = "info", duracao = 3000) {
  let alertaDiv = document.getElementById("alerta-customizado-localStorage")
  if (!alertaDiv) {
    alertaDiv = document.createElement("div")
    alertaDiv.id = "alerta-customizado-localStorage"
    document.body.appendChild(alertaDiv)
  }

  alertaDiv.textContent = mensagem
  alertaDiv.className = "alerta-ls" // Classe base
  alertaDiv.classList.add(tipo) // Adiciona classe do tipo (success, info)
  alertaDiv.classList.add("show") // Adiciona classe para mostrar com transição

  // Faz o alerta desaparecer após 'duracao' milissegundos
  setTimeout(() => {
    alertaDiv.classList.remove("show")
    // O CSS cuidará da transição de opacidade para esconder
  }, duracao)
}

// NOVA FUNÇÃO: Salvar informações do cliente no localStorage
function salvarInformacoesCliente() {
  const nome = document.getElementById("nome").value
  const cep = document.getElementById("cep").value
  const rua = document.getElementById("rua").value
  const bairro = document.getElementById("bairro").value
  const numeroCasa = document.getElementById("numero").value
  const complemento = document.getElementById("complemento").value

  if (nome && cep) {
    // Salva apenas se houver nome e CEP, no mínimo
    const infoCliente = {
      nome: nome.trim(),
      cep: cep.trim(),
      rua: rua.trim(),
      bairro: bairro.trim(),
      numero: numeroCasa.trim(),
      complemento: complemento.trim(),
    }
    localStorage.setItem(LOCAL_STORAGE_KEY_USER_INFO, JSON.stringify(infoCliente))
    exibirAlertaCustomizado("Suas informações foram salvas para a próxima compra!", "success")
  } else {
    const checkbox = document.getElementById("lembrar-info-checkbox")
    if (checkbox) checkbox.checked = false
    exibirAlertaCustomizado("Preencha pelo menos Nome e CEP para salvar as informações.", "info")
  }
}

// NOVA FUNÇÃO: Carregar informações do cliente do localStorage
function carregarInformacoesCliente() {
  const infoSalva = localStorage.getItem(LOCAL_STORAGE_KEY_USER_INFO)
  const checkbox = document.getElementById("lembrar-info-checkbox")

  if (infoSalva) {
    try {
      const infoCliente = JSON.parse(infoSalva)
      // Preenche os campos apenas se eles existirem no DOM
      const nomeElem = document.getElementById("nome")
      const cepElem = document.getElementById("cep")
      const ruaElem = document.getElementById("rua")
      const bairroElem = document.getElementById("bairro")
      const numeroElem = document.getElementById("numero")
      const complementoElem = document.getElementById("complemento")

      if (nomeElem) nomeElem.value = infoCliente.nome || ""
      if (cepElem) cepElem.value = infoCliente.cep || ""
      if (ruaElem) ruaElem.value = infoCliente.rua || ""
      if (bairroElem) bairroElem.value = infoCliente.bairro || ""
      if (numeroElem) numeroElem.value = infoCliente.numero || ""
      if (complementoElem) complementoElem.value = infoCliente.complemento || ""

      if (checkbox) checkbox.checked = true

      // Se carregou CEP e os campos de rua/bairro estão vazios (e a função buscarCep existe)
      if (infoCliente.cep && (!infoCliente.rua || !infoCliente.bairro) && typeof buscarCep === "function") {
        // Disparar onblur do CEP para que buscarCep seja chamado se o campo CEP tiver valor
        if (cepElem && cepElem.value) {
          cepElem.dispatchEvent(new Event("blur"))
        }
      }
    } catch (e) {
      console.error("Erro ao carregar informações do localStorage:", e)
      localStorage.removeItem(LOCAL_STORAGE_KEY_USER_INFO)
      if (checkbox) checkbox.checked = false
    }
  } else {
    if (checkbox) checkbox.checked = false
  }
}

// NOVA FUNÇÃO: Apagar informações do cliente do localStorage
function apagarInformacoesCliente() {
  localStorage.removeItem(LOCAL_STORAGE_KEY_USER_INFO)
  exibirAlertaCustomizado("Suas informações não serão mais lembradas.", "info")
}

/* --------------------------------------------------------------------------- */
// Enviar pedido
function enviarPedido() {
  const user = auth.currentUser

  if (!user) {
    alert("Por favor, faça o login com o Google para finalizar seu pedido!")
    return
  }

  // Coleta dos dados do formulário (mantida)
  const nome = document.getElementById("nome").value
  const observacoes = document.getElementById("observacoes").value
  const formaPagamento = document.getElementById("pagamento").value
  const trocoParaInput = document.getElementById("troco_para").value

  // Validações (mantidas)
  if (carrinho.length === 0) {
    alert("Seu carrinho está vazio!")
    return
  }
  if (!nome) {
    alert("Por favor, preencha seu nome.")
    return
  }
  if (!tipoEntregaSelecionado) {
    alert("Por favor, selecione se é para Entrega ou Retirada no Local.")
    return
  }
  if (!formaPagamento && tipoEntregaSelecionado) {
    alert("Por favor, selecione a forma de pagamento.")
    return
  }

  // Montagem do objeto do pedido (adaptada para o novo sistema de quantidades)
  const subtotalItens = carrinho.reduce((acc, item) => acc + item.preco * item.quantidade, 0)
  const taxaFinal = tipoEntregaSelecionado === "entrega" ? taxaEntregaAtual : 0
  const totalFinal = subtotalItens + taxaFinal

  const pedido = {
    userId: user.uid,
    userName: nome.trim(),
    userEmail: user.email,
    itens: carrinho.map((item) => ({
      nome: item.nome,
      preco: item.preco,
      quantidade: item.quantidade,
    })),
    subtotal: subtotalItens,
    taxaEntrega: taxaFinal,
    total: totalFinal,
    tipoEntrega: tipoEntregaSelecionado,
    formaPagamento: formaPagamento,
    observacoes: observacoes.trim() || "Nenhuma",
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    status: "Recebido",
  }

  if (pedido.tipoEntrega === "entrega") {
    const cep = document.getElementById("cep").value.trim()
    const rua = document.getElementById("rua").value.trim()
    const numeroCasa = document.getElementById("numero").value.trim()
    const bairro = document.getElementById("bairro").value.trim()
    const complemento = document.getElementById("complemento").value.trim()

    if (!cep || !rua || !numeroCasa || !bairro) {
      alert("Para entrega, por favor, preencha todos os campos de endereço obrigatórios.")
      return
    }
    pedido.endereco = { rua, numero: numeroCasa, complemento, bairro, cep }
  }

  if (formaPagamento === "Dinheiro" && trocoParaInput) {
    const trocoLimpo = trocoParaInput.replace(/[^\d,]/g, "").replace(",", ".")
    const trocoParaValor = Number.parseFloat(trocoLimpo)
    if (!isNaN(trocoParaValor) && trocoParaValor > 0) {
      pedido.trocoPara = trocoParaValor
    }
  }

  // SALVANDO O PEDIDO NO FIRESTORE
  db.collection("pedidos")
    .add(pedido)
    .then((docRef) => {
      console.log("Pedido salvo no Firestore com o ID: ", docRef.id)

      // Mostrar popup de confirmação em vez de alert
      mostrarPopupConfirmacao(docRef.id.substring(0, 8))

      // --- CORREÇÃO APLICADA AQUI ---
      // Limpando campos manualmente em vez de usar form.reset()
      carrinho = []
      const formInputs = ["nome", "observacoes", "cep", "rua", "bairro", "numero", "complemento", "troco_para"]
      formInputs.forEach((id) => {
        const element = document.getElementById(id)
        if (element) element.value = ""
      })
      const pagamentoSelect = document.getElementById("pagamento")
      if (pagamentoSelect) pagamentoSelect.selectedIndex = 0 // Reseta o <select>

      fecharFormulario()
      atualizarCarrinho() // Atualiza a UI do carrinho para mostrar que está vazio
    })
    .catch((error) => {
      console.error("Erro ao salvar o pedido: ", error)
      alert("Ocorreu um erro ao enviar seu pedido. Por favor, tente novamente.")
    })
}
/* -------------------------------------------------------------------  */

document.addEventListener("DOMContentLoaded", () => {
  // Configuração do IntersectionObserver para animações de scroll
  const observerScroll = new IntersectionObserver((entries) => {
    //
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show")
      }
    })
  })
  const hiddenElementsScroll = document.querySelectorAll(".item, .hero h2, .hero p, .hero .btn, h2")
  hiddenElementsScroll.forEach((el) => observerScroll.observe(el))

  // Lógica para o botão "Todos" da categoria
  const todosButton = document.querySelector(".btn-categoria[data-filter='todos']")
  if (todosButton) {
    const botoesCategoria = document.querySelectorAll(".categorias-cardapio .btn-categoria")
    botoesCategoria.forEach((botao) => {
      botao.classList.toggle("active", botao.getAttribute("data-filter") === "todos")
    })
  }

  // Inicializações importantes
  if (typeof atualizarContadorCarrinho === "function") {
    atualizarContadorCarrinho()
  }
  if (typeof gerenciarEstadoLoja === "function") {
    gerenciarEstadoLoja()
  }

  // Listener para o select de pagamento
  const selectPagamentoElem = document.getElementById("pagamento")
  if (selectPagamentoElem) {
    selectPagamentoElem.addEventListener("change", verificarCampoTroco)
  }

  const lembrarInfoCheckbox = document.getElementById("lembrar-info-checkbox")
  if (lembrarInfoCheckbox) {
    // Verifica o estado inicial do checkbox baseado no localStorage ao carregar a página
    if (localStorage.getItem(LOCAL_STORAGE_KEY_USER_INFO)) {
      lembrarInfoCheckbox.checked = true
    } else {
      lembrarInfoCheckbox.checked = false
    }

    lembrarInfoCheckbox.addEventListener("change", function () {
      if (this.checked) {
        salvarInformacoesCliente()
      } else {
        apagarInformacoesCliente()
      }
    })
  }
})

/* -------------------------------------------------------------------  */
// Lógica de Autenticação com Firebase

const btnLogin = document.getElementById("btn-login")
const menuLogin = document.getElementById("menu-login")

// Função para fazer login com o Google
function fazerLoginComGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider() // Define o provedor de login do Google
  auth
    .signInWithPopup(provider)
    .then((result) => {
      // Login bem-sucedido
      console.log("Usuário logado com sucesso:", result.user)
      // O estado do usuário será atualizado pelo 'onAuthStateChanged'
    })
    .catch((error) => {
      // Trata erros aqui
      console.error("Erro ao fazer login com Google:", error)
      alert(`Erro ao fazer login: ${error.message}`)
    })
}

// Função para fazer logout
function fazerLogout() {
  auth
    .signOut()
    .then(() => {
      console.log("Logout bem-sucedido.")
      // O estado do usuário será atualizado pelo 'onAuthStateChanged'
    })
    .catch((error) => {
      console.error("Erro ao fazer logout:", error)
    })
}

// Observador do estado de autenticação (a mágica acontece aqui!)
// Este código verifica se o usuário está logado ou não, sempre que a página carrega ou o estado muda.
auth.onAuthStateChanged((user) => {
  const perfilSection = document.getElementById("perfil-cliente")
  const menuLogin = document.getElementById("menu-login")

  if (user) {
    // Usuário está logado
    console.log("Estado: Logado", user)
    if (menuLogin) {
      menuLogin.innerHTML = `
                <a href="#perfil-cliente">Olá, ${user.displayName.split(" ")[0]}</a> 
                <a href="#" id="btn-logout" style="font-size: 0.8em; color: #ccc;">(Sair)</a>
            `
      document.getElementById("btn-logout").addEventListener("click", fazerLogout)
    }
    if (perfilSection) perfilSection.style.display = "block" // Mostra a seção do perfil
    carregarPedidoAtual(user.uid) // Chama a função para carregar o pedido

    // Pré-preenche o campo "Nome" no formulário com o nome do Google
    const nomeForm = document.getElementById("nome")
    if (nomeForm) nomeForm.value = user.displayName
  } else {
    // Usuário está deslogado
    console.log("Estado: Deslogado")
    if (menuLogin) {
      menuLogin.innerHTML = `<a href="#" id="btn-login"><img src="/assets/google-g-logo.png" alt="Logo do Google" class="google-logo"><span>Entrar com Google</span></a>`
      document.getElementById("btn-login").addEventListener("click", fazerLoginComGoogle)
    }
    if (perfilSection) perfilSection.style.display = "none" // Esconde a seção do perfil
  }
})

// NOVA FUNÇÃO: Carregar e ouvir o pedido atual do cliente
function carregarPedidoAtual(userId) {
  const infoPedidoContainer = document.getElementById("info-pedido-container")
  if (!infoPedidoContainer) {
    console.error("Elemento 'info-pedido-container' não foi encontrado no HTML.")
    return
  }

  // A consulta ao banco de dados, agora usando a versão que passou no teste do índice
  db.collection("pedidos")
    .where("userId", "==", userId)
    .where("status", "in", ["Recebido", "Em Preparo", "Pronto para Retirada", "Saiu para Entrega"])
    .orderBy("timestamp", "desc")
    // .limit(1) // Removido para mostrar todos os pedidos ativos, como discutimos
    .onSnapshot(
      (querySnapshot) => {
        // A variável correta é querySnapshot
        if (querySnapshot.empty) {
          infoPedidoContainer.innerHTML =
            "<p>Você não tem pedidos ativos no momento. Que tal escolher algo do nosso cardápio?</p>"
        } else {
          let htmlPedidosAtivos = ""

          // Itera sobre cada documento ('doc') em querySnapshot.docs
          querySnapshot.forEach((doc) => {
            const pedido = doc.data()
            const pedidoId = doc.id

            // Monta um "card" para cada pedido ativo
            // Adicionada uma verificação para garantir que pedido.status existe
            const statusClass = pedido.status ? pedido.status.toLowerCase().replace(/ /g, "-") : "indefinido"

            htmlPedidosAtivos += `
                      <div class="pedido-card">
                          <h3>Pedido #${pedidoId.substring(0, 6)}...</h3>
                          <p><strong>Status:</strong> <span class="status-pedido ${statusClass}">${pedido.status || "Status Indefinido"}</span></p>
                          <p><strong>Itens:</strong></p>
                          <ul>
                  `

            // Adicionada uma verificação para garantir que pedido.itens é um array
            if (Array.isArray(pedido.itens)) {
              pedido.itens.forEach((item) => {
                const nome = item.nome || "Item sem nome"
                const preco = typeof item.preco === "number" ? item.preco : 0
                const quantidade = item.quantidade || 1
                htmlPedidosAtivos += `<li>${quantidade}x ${nome} - R$ ${preco.toFixed(2).replace(".", ",")}</li>`
              })
            }

            htmlPedidosAtivos += `</ul><br>`
            const total = typeof pedido.total === "number" ? pedido.total : 0
            htmlPedidosAtivos += `<p><strong>Total:</strong> R$ ${total.toFixed(2).replace(".", ",")}</p>`
            htmlPedidosAtivos += `</div>`
          })

          infoPedidoContainer.innerHTML = htmlPedidosAtivos
        }
      },
      (error) => {
        console.error("Erro ao buscar pedidos em tempo real: ", error)
        infoPedidoContainer.innerHTML = "<p>Ocorreu um erro ao carregar seus pedidos. Por favor, atualize a página.</p>"
      },
    )
}

// Listener para mudanças de status (simulação para demonstração)
// Em um app real, isso seria integrado com o sistema de atualização de status do Firebase
let ultimoStatusConhecido = {}

function monitorarMudancasStatus(userId) {
  db.collection("pedidos")
    .where("userId", "==", userId)
    .where("status", "in", ["Recebido", "Em Preparo", "Pronto para Retirada", "Saiu para Entrega"])
    .onSnapshot((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        const pedido = doc.data()
        const pedidoId = doc.id
        const statusAtual = pedido.status

        // Se já conhecemos este pedido e o status mudou
        if (ultimoStatusConhecido[pedidoId] && ultimoStatusConhecido[pedidoId] !== statusAtual) {
          // Tocar som de notificação
          tocarSomStatusPedido()
          console.log(`Status do pedido ${pedidoId} mudou para: ${statusAtual}`)
        }

        // Atualizar o último status conhecido
        ultimoStatusConhecido[pedidoId] = statusAtual
      })
    })
}

// Iniciar monitoramento quando usuário fizer login
auth.onAuthStateChanged((user) => {
  if (user) {
    // Aguardar um pouco antes de iniciar o monitoramento para evitar sons na primeira carga
    setTimeout(() => {
      monitorarMudancasStatus(user.uid)
    }, 2000)
  } else {
    // Limpar dados quando usuário fizer logout
    ultimoStatusConhecido = {}
  }
})
