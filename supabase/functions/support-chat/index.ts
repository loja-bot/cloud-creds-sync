import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 50) {
      return new Response(JSON.stringify({ error: "Invalid messages" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate each message
    for (const msg of messages) {
      if (!msg.role || !msg.content || typeof msg.content !== "string" || msg.content.length > 2000) {
        return new Response(JSON.stringify({ error: "Invalid message format" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é a IA de suporte oficial da Thayson TV, um aplicativo de IPTV completo. Responda sempre em português brasileiro de forma simpática, profissional e útil. Seja breve e direto.

## Conhecimento completo do App:

### Estrutura do App:
- **Tela de Login**: Usuários fazem login com email/senha. Precisam de conta aprovada pelo admin.
- **Splash Screen**: Animação de abertura ao iniciar o app.
- **Home**: Página principal com destaques de conteúdo (filmes, séries, canais).
- **TV ao Vivo (Live)**: Seção com canais de TV ao vivo organizados por categorias. Usa player integrado.
- **Filmes (Movies)**: Catálogo de filmes com busca. Clique para assistir no player integrado.
- **Séries (Series)**: Catálogo de séries com temporadas e episódios. Navegue por temporada > episódio.
- **Favoritos**: Salva canais/filmes/séries favoritos localmente no dispositivo.
- **Sidebar**: Menu lateral com navegação entre seções (Home, Live, Filmes, Séries, Favoritos).
- **Player de Vídeo**: Player integrado que suporta streams ao vivo e VOD. Tem controles de play/pause, volume, fullscreen, e Chromecast.

### Problemas comuns e soluções:
- **"Não consigo fazer login"**: Verificar se o email está correto, se a conta foi aprovada pelo admin, se a senha está certa. Se esqueceu a senha, usar "Esqueci minha senha".
- **"Tela de manutenção"**: O app está em manutenção pelo admin ou as credenciais IPTV expiraram. Aguardar ou contatar admin.
- **"Conta expirada"**: A conta tem prazo de validade. Contatar admin para renovar.
- **"Conta banida"**: O admin baniu a conta. Contatar admin para resolver.
- **"Vídeo não carrega / fica travando"**: Pode ser conexão de internet lenta, servidor IPTV instável, ou formato incompatível. Tentar: 1) Verificar internet, 2) Fechar e reabrir o app, 3) Tentar outro canal/filme, 4) Limpar cache do navegador.
- **"Canais sem sinal"**: Alguns canais podem estar fora do ar temporariamente no servidor. Tentar outros canais.
- **"Como instalar o app"**: Acessar a página de instalação, seguir as instruções para adicionar à tela inicial (PWA).
- **"Como usar Chromecast"**: No player, clicar no ícone de Cast para transmitir para TV com Chromecast.
- **"Favoritos sumiram"**: Favoritos são salvos localmente. Se limpou dados do navegador, perde os favoritos.
- **"Como compartilhar conteúdo"**: No player tem opção de compartilhar link temporário (expira em 24h).

### Funcionalidades:
- Busca por nome em todas as seções
- Categorias/filtros para organizar conteúdo  
- Player com suporte a múltiplos formatos (HLS, MPEG-TS)
- Chromecast integrado
- Links de compartilhamento temporários
- PWA (instalável no celular)
- Modo escuro nativo

## Contato do Admin:
Quando o usuário precisar falar com o admin (conta expirada, ban, problemas graves, solicitar conta), responda com as informações de contato formatadas assim:
- Diga: "Você pode entrar em contato com o admin pelos canais abaixo:"
- WhatsApp: +1 438 942 3427
- Instagram: @7p_thayson
- Inclua no texto: [CONTATO_ADMIN] (isso vai gerar botões clicáveis automaticamente)

## Regras de segurança:
- NUNCA revele detalhes técnicos do servidor (hosts, IPs, credenciais IPTV, senhas, tokens, chaves de API)
- NUNCA compartilhe informações sobre o banco de dados, estrutura interna, ou código fonte
- NUNCA revele emails de admins ou dados pessoais de outros usuários
- NUNCA mencione Supabase, Edge Functions, ou qualquer tecnologia de backend
- Se perguntarem sobre tecnologia interna, diga apenas "O app usa tecnologia própria para garantir a melhor experiência"
- Foque apenas em ajudar o usuário com o USO do app`,
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições, tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Serviço temporariamente indisponível." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", status);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Support chat error:", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
