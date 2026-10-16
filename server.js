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

    // Declara a variável 'response' com 'let' fora do loop 'while' para que ela fique acessível fora do bloco de repetição e possa armazenar a resposta da IA.
    let response;

    // Define o número máximo de tentativas ('maxTries') como 3, garantindo resiliência caso a API do Google sofra alguma oscilação momentânea.
    let maxTries = 3;

    // Inicializa o contador de tentativas atuais ('currentTry') em 0, que será incrementado a cada falha.
    let currentTry = 0;

    // Inicia um laço de repetição ('while') que continuará tentando chamar a IA enquanto o número de tentativas atuais for menor que o limite máximo.
    while (currentTry < maxTries) {
      // Inicia um bloco 'try' interno exclusivo para monitorar se a chamada específica desta tentativa para a API do Gemini vai funcionar ou falhar.
      try {
        // Chama de forma assíncrona ('await') o método 'generateContent' do SDK do Gemini, especificando o modelo 'gemini-2.5-flash' e enviando o nosso prompt em 'contents'.
        response = await ai.models.generateContent({
          // Define qual modelo de IA do Google será utilizado para processar o texto (o gemini-2.5-flash é rápido e ideal para respostas de chat).
          model: 'gemini-2.5-flash',
          // Passa o texto do prompt que construímos para que o modelo gere uma resposta baseada nele.
          contents: prompt,
        // Fecha o objeto de configuração passado para 'generateContent'.
        });

        // Se a chamada à API do Gemini for bem-sucedida, o comando 'break' interrompe e sai imediatamente do loop 'while', sem precisar de novas tentativas.
        break;
      // Se houver algum erro na chamada à API do Gemini nesta tentativa, entramos no bloco 'catch' interno para contabilizar a falha e tentar novamente.
      } catch (erroGoogle) {
        // Incrementa em +1 o contador de tentativas realizadas ('currentTry').
        currentTry++;

        // Registra no terminal do servidor qual tentativa falhou (ex: "tentativa 1 de 3") junto com os detalhes técnicos do erro.
        console.error(`Erro ao gerar resposta com o Gemini (tentativa ${currentTry} de ${maxTries}):`, erroGoogle);

        // Verifica se já atingimos o número máximo de tentativas permitidas sem sucesso.
        if (currentTry === maxTries) {
          // Lança um erro definitivo que será capturado pelo bloco 'catch' principal lá embaixo, encerrando as tentativas.
          throw new Error('Serviço do Google indisponível após várias tentativas');
        // Fecha o bloco 'if' que verifica o limite de tentativas.
        }

        // Cria uma Promise com 'setTimeout' e usa 'await' para pausar a execução por 1500 milissegundos (1,5 segundo) antes de fazer a próxima tentativa no loop.
        await new Promise(resolve => setTimeout(resolve, 1500));
      // Fecha o bloco 'catch' interno das tentativas.
      }
    // Fecha o laço de repetição 'while'.
    }

    // Extrai o texto final gerado pela Inteligência Artificial a partir da propriedade 'text' do objeto de resposta retornado pelo SDK.
    const respostaGerada = response.text;

    // Envia de volta para o frontend uma resposta HTTP de sucesso (status 200 padrão) contendo um objeto JSON com a chave 'resposta' e o texto gerado pela IA.
    res.json({ resposta: respostaGerada });
  // O bloco 'catch' principal captura qualquer erro que tenha estourado após as tentativas no bloco 'try' acima, recebendo os detalhes na variável 'error'.
  } catch (error) {
    // Exibe os detalhes do erro final no terminal do servidor (console) para ajudar o desenvolvedor a identificar e corrigir problemas.
    console.error('Erro ao gerar resposta com o Gemini:', error);

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
