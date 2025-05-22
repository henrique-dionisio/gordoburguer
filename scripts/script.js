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
