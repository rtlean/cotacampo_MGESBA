import fs from 'node:fs';
import path from 'node:path';

// Carrega variáveis do arquivo .env manualmente
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...values] = trimmed.split('=');
    if (key && values.length > 0) {
      let val = values.join('=').trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key.trim()] = val;
    }
  }
}

const apiUrl = process.env.EVOLUTION_API_URL;
const apiKey = process.env.EVOLUTION_API_KEY;
const instanceName = process.env.EVOLUTION_INSTANCE_NAME;

// Pega o número passado por parâmetro ou usa um padrão
const targetPhone = process.argv[2] || '5527998881001';

console.log('--------------------------------------------------');
console.log('🌾 CotaCampo - Teste de Disparo WhatsApp (Evolution API)');
console.log('--------------------------------------------------');
console.log(`🔗 URL Base:       ${apiUrl}`);
console.log(`🏷️ Instância:      ${instanceName}`);
console.log(`🔑 API Key:        ${apiKey ? 'Configurada (' + apiKey.slice(0, 6) + '...)' : 'NÃO ENCONTRADA'}`);
console.log(`📱 Telefone Alvo:  ${targetPhone}`);
console.log('--------------------------------------------------');

if (!apiUrl || !apiKey || !instanceName) {
  console.error('❌ Erro: Variáveis da Evolution API não encontradas no arquivo .env!');
  process.exit(1);
}

// Sanitiza número: remove caracteres não numéricos e garante DDI 55
let cleanPhone = targetPhone.replace(/\D/g, '');
if (!cleanPhone.startsWith('55')) {
  cleanPhone = '55' + cleanPhone;
}

// Endpoint oficial da Evolution API
const cleanBaseUrl = apiUrl.replace(/\/manager\/?$/, '').replace(/\/+$/, '');
const endpoint = `${cleanBaseUrl}/message/sendText/${instanceName}`;

const messageText = 
  '🚜 Novo Pedido no CotaCampo! \n' +
  'Uma nova cotação de Café Conilon foi aberta em Linhares/ES. \n' +
  'Itens: 3 \n' +
  'Frete: CIF \n' +
  'Acesse o app para enviar sua proposta: https://cotacampo-es-36ja.vercel.app/revenda/oportunidades';

const payload = {
  number: cleanPhone,
  text: messageText,
  options: {
    delay: 1200,
    presence: 'composing',
  },
  textMessage: {
    text: messageText,
  },
};

console.log(`🚀 Enviando requisição POST para: ${endpoint}`);
console.log('📦 Payload:', JSON.stringify(payload, null, 2));

try {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: apiKey,
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  console.log(`\n📡 Status da Resposta: ${response.status} ${response.statusText}`);

  let responseJson;
  try {
    responseJson = JSON.parse(responseText);
  } catch {
    responseJson = null;
  }

  if (response.ok) {
    console.log('✅ Mensagem enviada com SUCESSO pela Evolution API!');
    console.dir(responseJson || responseText, { depth: null });
  } else {
    console.error('⚠️ A Evolution API respondeu com erro:');
    console.dir(responseJson || responseText, { depth: null });
    console.log('\n💡 Dicas para diagnóstico:');
    console.log('1. Verifique se a instância "' + instanceName + '" está com status CONNECTED (QR Code escaneado).');
    console.log('2. Verifique se a API Key informada no .env confere com o painel.');
  }
} catch (error) {
  console.error('❌ Erro de conexão ao tentar se comunicar com a Evolution API:', error);
}
console.log('--------------------------------------------------\n');
