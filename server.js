// Importa e executa a configuração do pacote 'dotenv' logo no início do arquivo, o que carrega as variáveis definidas no arquivo '.env' para dentro do objeto global 'process.env' do Node.js.
require('dotenv').config();

// Importa o framework 'express', que é a biblioteca base que usamos para criar nosso servidor HTTP, gerenciar rotas e lidar com requisições e respostas de forma simples.
const express = require('express');

// Importa o pacote 'cors' (Cross-Origin Resource Sharing), um middleware que permite que nosso servidor aceite requisições vindas de outros domínios ou origens no navegador sem bloqueios de segurança.
const cors = require('cors');

// Importa o módulo nativo 'path' do Node.js, que fornece utilitários para trabalhar com caminhos de arquivos e diretórios de maneira segura em qualquer sistema operacional (Windows, Linux ou Mac).
const path = require('path');

// Importa a classe 'GoogleGenAI' de dentro do SDK oficial '@google/genai' usando desestruturação de objetos, permitindo que nossa aplicação se comunique com os modelos de Inteligência Artificial do Google.
const { GoogleGenAI } = require('@google/genai');

// Inicializa uma instância da aplicação Express e a armazena na constante 'app', que será usada para configurar middlewares, rotas e iniciar o servidor.
const app = express();

// Define a porta em que o servidor vai rodar: tenta usar a variável de ambiente 'PORT' (caso exista) ou usa a porta 3000 como valor padrão.
const PORT = process.env.PORT || 3000;

// Registra o middleware do CORS na aplicação para que todas as rotas permitam requisições externas do frontend.
app.use(cors());

// Registra o middleware nativo 'express.json()', que é essencial para fazer o Express ler e converter automaticamente o corpo (body) das requisições recebidas no formato JSON para um objeto JavaScript acessível via 'req.body'.
app.use(express.json());

// Configura o Express para servir arquivos estáticos (HTML, CSS, imagens, JS) diretamente da pasta 'public', usando 'path.join' com '__dirname' para montar o caminho absoluto até a pasta.
app.use(express.static(path.join(__dirname, 'public')));

// Cria uma rota do tipo POST no endereço '/gerar-resposta' usando uma função assíncrona ('async'), pois a comunicação com a API do Gemini leva tempo e precisamos esperar ('await') pela resposta dela.
app.post('/gerar-resposta', async (req, res) => {
  // Inicia um bloco 'try' para tentar executar o código principal e capturar qualquer erro inesperado (como falha de rede ou chave inválida) sem derrubar o servidor.
  try {
    // Extrai a propriedade 'mensagem' enviada pelo frontend dentro do corpo da requisição ('req.body') e a armazena em uma constante para fácil acesso.
    const mensagemCliente = req.body.mensagem;

    // Verifica se a mensagem do cliente está vazia, nula ou não foi enviada; se não houver mensagem, precisamos interromper o fluxo e avisar o frontend.
    if (!mensagemCliente) {
      // Retorna imediatamente o código de status HTTP 400 (Bad Request / Requisição Inválida) junto com um objeto JSON explicando o erro.
      return res.status(400).json({ erro: 'A mensagem do cliente é obrigatória.' });
    }

    // Instancia o cliente da IA do Google passando um objeto de configuração com a chave de API lida de forma segura das variáveis de ambiente ('process.env.GEMINI_API_KEY').
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Monta o texto de comando (prompt) combinando instruções de comportamento para a IA (atuar como atendente de loja educado no WhatsApp) com a mensagem real enviada pelo cliente.
    const prompt = `Você é um atendente virtual muito educado, prestativo e simpático de uma loja atendendo pelo WhatsApp. Responda de forma clara, natural e cordial à seguinte mensagem do cliente: "${mensagemCliente}"`;

    // Chama de forma assíncrona ('await') o método 'generateContent' do SDK do Gemini, especificando o modelo 'gemini-2.5-flash' e enviando o nosso prompt em 'contents'.
    const response = await ai.models.generateContent({
      // Define qual modelo de IA do Google será utilizado para processar o texto (o gemini-2.5-flash é rápido e ideal para respostas de chat).
      model: 'gemini-2.5-flash',
      // Passa o texto do prompt que construímos para que o modelo gere uma resposta baseada nele.
      contents: prompt,
    });

    // Extrai o texto final gerado pela Inteligência Artificial a partir da propriedade 'text' do objeto de resposta retornado pelo SDK.
    const respostaGerada = response.text;

    // Envia de volta para o frontend uma resposta HTTP de sucesso (status 200 padrão) contendo um objeto JSON com a chave 'resposta' e o texto gerado pela IA.
    res.json({ resposta: respostaGerada });
  // O bloco 'catch' captura qualquer erro que tenha acontecido dentro do bloco 'try' acima, recebendo os detalhes na variável 'error'.
  } catch (error) {
    // Exibe os detalhes do erro no terminal do servidor (console) para ajudar o desenvolvedor a identificar e corrigir problemas.
    console.error('Erro ao gerar resposta com o Gemini:', error);

    // Retorna para o frontend o status HTTP 500 (Internal Server Error / Erro Interno do Servidor) com uma mensagem amigável em formato JSON.
    res.status(500).json({ erro: 'Falha ao gerar resposta com a IA. Verifique sua GEMINI_API_KEY no arquivo .env.' });
  // Fecha o bloco try/catch.
  }
// Fecha a declaração da rota POST '/gerar-resposta'.
});

// Inicia o servidor HTTP fazendo-o "escutar" conexões na porta definida e executa uma função de retorno (callback) assim que estiver pronto.
app.listen(PORT, () => {
  // Imprime uma mensagem no terminal informando ao desenvolvedor que o servidor está online e qual endereço abrir no navegador.
  console.log(`Servidor rodando com sucesso em http://localhost:${PORT}`);
// Fecha o método app.listen.
});
