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
  // Inicia um bloco 'try' principal para executar a lógica da rota e capturar qualquer erro fatal sem derrubar o servidor.
  try {
    // Extrai a propriedade 'mensagem' enviada pelo frontend dentro do corpo da requisição ('req.body') e a armazena em uma constante para fácil acesso.
    const mensagemCliente = req.body.mensagem;

    // Verifica se a mensagem do cliente está vazia, nula ou não foi enviada; se não houver mensagem, precisamos interromper o fluxo e avisar o frontend.
    if (!mensagemCliente) {
      // Retorna imediatamente o código de status HTTP 400 (Bad Request / Requisição Inválida) junto com um objeto JSON explicando o erro.
      return res.status(400).json({ erro: 'A mensagem do cliente é obrigatória.' });
    // Fecha o bloco condicional 'if'.
    }

    // Instancia o cliente da IA do Google passando um objeto de configuração com a chave de API lida de forma segura das variáveis de ambiente ('process.env.GEMINI_API_KEY').
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Monta o texto de comando (prompt) combinando instruções de comportamento para a IA (atuar como atendente de loja educado no WhatsApp) com a mensagem real enviada pelo cliente.
    const prompt = `Você é um atendente virtual muito educado, prestativo e simpático de uma loja atendendo pelo WhatsApp. Responda de forma clara, natural e cordial à seguinte mensagem do cliente: "${mensagemCliente}"`;

    // Declara uma lista (array) de modelos em ordem de prioridade: tenta primeiro o 'gemini-3.5-flash', e se ele estiver sobrecarregado (erro 503), usa o 'gemini-3.5-flash-lite' e o 'gemini-3-flash-preview' como reservas (fallback).
    const modelosFallback = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3-flash-preview'];

    // Declara a variável 'response' com 'let' fora do loop 'while' para que ela fique acessível fora do bloco de repetição e possa armazenar a resposta da IA.
    let response;

    // Define o número máximo de tentativas ('maxTries') igual à quantidade de modelos na nossa lista (3 tentativas).
    let maxTries = modelosFallback.length;

    // Inicializa o contador de tentativas atuais ('currentTry') em 0, que também servirá como índice para escolher o modelo da vez na lista 'modelosFallback'.
    let currentTry = 0;

    // Inicia um laço de repetição ('while') que continuará tentando chamar a IA enquanto o número de tentativas atuais for menor que o limite máximo.
    while (currentTry < maxTries) {
      // Seleciona o modelo da tentativa atual usando 'currentTry' como posição do array (0 = gemini-3.5-flash, 1 = gemini-3.5-flash-lite, 2 = gemini-3-flash-preview).
      const modeloAtual = modelosFallback[currentTry];

      // Inicia um bloco 'try' interno exclusivo para monitorar se a chamada com o modelo desta tentativa vai funcionar ou falhar.
      try {
        // Exibe no terminal qual modelo está sendo consultado nesta tentativa para facilitar o acompanhamento em tempo real.
        console.log(`Consultando IA (tentativa ${currentTry + 1} de ${maxTries}) usando o modelo: ${modeloAtual}...`);

        // Chama de forma assíncrona ('await') o método 'generateContent' do SDK do Gemini, passando o 'modeloAtual' e o nosso prompt em 'contents'.
        response = await ai.models.generateContent({
          // Define dinamicamente o modelo de IA do Google da tentativa atual.
          model: modeloAtual,
          // Passa o texto do prompt que construímos para que o modelo gere uma resposta baseada nele.
          contents: prompt,
        // Fecha o objeto de configuração passado para 'generateContent'.
        });

        // Se a chamada à API do Gemini for bem-sucedida, o comando 'break' interrompe e sai imediatamente do loop 'while', pois já temos a resposta!
        break;
      // Se houver algum erro na chamada à API do Gemini nesta tentativa (como erro 503 de sobrecarga), entramos no bloco 'catch' interno para passar para o próximo modelo reserva.
      } catch (erroGoogle) {
        // Incrementa em +1 o contador de tentativas realizadas ('currentTry'), avançando para o próximo modelo da lista na próxima volta do loop.
        currentTry++;

        // Registra no terminal um aviso mostrando que o modelo atual falhou e qual foi o status do erro.
        console.error(`Falha no modelo ${modeloAtual} (tentativa ${currentTry} de ${maxTries}):`, erroGoogle.message || erroGoogle);

        // Verifica se já esgotamos todas as tentativas (todos os modelos da lista falharam).
        if (currentTry === maxTries) {
          // Lança um erro definitivo que será capturado pelo bloco 'catch' principal lá embaixo, encerrando as tentativas.
          throw new Error('Serviço do Google indisponível após tentar todos os modelos de fallback');
        // Fecha o bloco 'if' que verifica o limite de tentativas.
        }

        // Cria uma Promise com 'setTimeout' e usa 'await' para aguardar 1500 milissegundos (1,5 segundo) antes de tentar o próximo modelo reserva no loop.
        await new Promise(resolve => setTimeout(resolve, 1500));
      // Fecha o bloco 'catch' interno das tentativas.
      }
    // Fecha o laço de repetição 'while'.
    }

    // Extrai o texto final gerado pela Inteligência Artificial a partir da propriedade 'text' do objeto de resposta retornado pelo SDK.
    const respostaGerada = response.text;

    // Envia de volta para o frontend uma resposta HTTP de sucesso (status 200 padrão) contendo um objeto JSON com a chave 'resposta' e o texto gerado pela IA.
    res.json({ resposta: respostaGerada });
  // O bloco 'catch' principal captura qualquer erro que tenha estourado após esgotar todas as tentativas no bloco 'try' acima.
  } catch (error) {
    // Exibe os detalhes do erro final no terminal do servidor (console) para ajudar o desenvolvedor a identificar e corrigir problemas.
    console.error('Erro final ao gerar resposta com o Gemini:', error);

    // Retorna para o frontend o status HTTP 500 (Internal Server Error / Erro Interno do Servidor) com uma mensagem amigável em formato JSON.
    res.status(500).json({ erro: 'Falha ao gerar resposta com a IA. Verifique sua GEMINI_API_KEY no arquivo .env.' });
  // Fecha o bloco try/catch principal.
  }
// Fecha a declaração da rota POST '/gerar-resposta'.
});

// Inicia o servidor HTTP fazendo-o "escutar" conexões na porta definida e executa uma função de retorno (callback) assim que estiver pronto.
app.listen(PORT, () => {
  // Imprime uma mensagem no terminal informando ao desenvolvedor que o servidor está online e qual endereço abrir no navegador.
  console.log(`Servidor rodando com sucesso em http://localhost:${PORT}`);
// Fecha o método app.listen.
});
