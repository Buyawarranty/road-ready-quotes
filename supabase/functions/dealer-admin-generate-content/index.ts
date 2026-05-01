// Dealer Admin: AI content generator for blog posts and landing pages
// Uses Lovable AI Gateway. Returns structured JSON via tool calling.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateRequest {
  type: 'blog' | 'landing';
  topic: string;
  keywords?: string[];
  tone?: string;
  target_location?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const body = (await req.json()) as GenerateRequest;
    if (!body?.topic || !body?.type) {
      return new Response(JSON.stringify({ error: 'topic and type are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isBlog = body.type === 'blog';
    const sysBase = `You are a senior content writer for Buy a Warranty, a UK used-car warranty company.
Tone: ${body.tone || 'helpful, clear, sentence case'}.
Rules: never use negative wording (e.g. "won't pay") — explain what is designed for. Use sentence case headings.
Do not invent statistics. UK English spelling.`;

    const tool = isBlog
      ? {
          type: 'function',
          function: {
            name: 'create_blog_post',
            description: 'Create a complete SEO-ready blog post.',
            parameters: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                slug: { type: 'string', description: 'kebab-case url slug' },
                excerpt: { type: 'string', description: '1-2 sentence summary' },
                meta_title: { type: 'string', description: '<60 chars' },
                meta_description: { type: 'string', description: '<160 chars' },
                keywords: { type: 'array', items: { type: 'string' } },
                content: {
                  type: 'string',
                  description: 'Full markdown body, 600-1200 words, with H2/H3 sections',
                },
              },
              required: ['title', 'slug', 'excerpt', 'meta_title', 'meta_description', 'keywords', 'content'],
              additionalProperties: false,
            },
          },
        }
      : {
          type: 'function',
          function: {
            name: 'create_landing_page',
            description: 'Create an SEO-ready landing page for a target location or audience.',
            parameters: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                slug: { type: 'string' },
                hero_heading: { type: 'string' },
                hero_subheading: { type: 'string' },
                body_content: { type: 'string', description: 'Markdown body with sections + benefits + FAQ' },
                cta_label: { type: 'string' },
                meta_title: { type: 'string' },
                meta_description: { type: 'string' },
                keywords: { type: 'array', items: { type: 'string' } },
              },
              required: [
                'title',
                'slug',
                'hero_heading',
                'hero_subheading',
                'body_content',
                'cta_label',
                'meta_title',
                'meta_description',
                'keywords',
              ],
              additionalProperties: false,
            },
          },
        };

    const userPrompt = isBlog
      ? `Topic: ${body.topic}\nKeywords: ${(body.keywords || []).join(', ') || '(suggest your own)'}\nWrite a complete blog post.`
      : `Audience/location: ${body.target_location || 'UK drivers'}\nTopic/offer: ${body.topic}\nKeywords: ${(body.keywords || []).join(', ') || '(suggest your own)'}\nCreate the landing page.`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: sysBase },
          { role: 'user', content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: 'function', function: { name: tool.function.name } },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: 'Rate limit reached, try again shortly.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (aiRes.status === 402) {
      return new Response(
        JSON.stringify({ error: 'AI credits exhausted. Add funds in Settings → Workspace → Usage.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error('AI gateway error', aiRes.status, t);
      return new Response(JSON.stringify({ error: 'AI generation failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await aiRes.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) throw new Error('No tool call returned');
    const parsed = JSON.parse(call.function.arguments);

    return new Response(JSON.stringify({ result: parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('generate-content error', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
