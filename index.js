// Importa as ferramentas do Firebase (Sintaxe V2, mais moderna)
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { getAuth } = require("firebase-admin/auth");
const { initializeApp } = require("firebase-admin/app");

// Inicializa o app de admin
initializeApp();

/**
 * Função automática (gatilho/trigger) - Sintaxe V2
 * Isso roda TODA VEZ que um documento é CRIADO na coleção 'admins'.
 */
exports.adicionarPrivilegioAdmin = onDocumentCreated("admins/{uid}", async (event) => {
  
  // Pega o UID do documento que foi criado
  // (Ex: 'tKgbQrrbtGNQsBxueZTkWl7MFAN93')
  const uid = event.params.uid;

  console.log(`Carimbando usuário ${uid} como admin...`);

  try {
    // Usa o 'admin' para carimbar o usuário no Authentication
    // Isso adiciona { admin: true } ao token do usuário
    await getAuth().setCustomUserClaims(uid, { admin: true });
    
    console.log(`Sucesso! Usuário ${uid} agora é um admin.`);
    return {
      message: `Sucesso! Usuário ${uid} agora é um admin.`,
    };
  } catch (error) {
    console.error("Erro ao carimbar usuário:", error);
    return { error: error.message };
  }
});