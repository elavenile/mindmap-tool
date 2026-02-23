// Multi-provider AI service: Gemini, ChatGPT, Claude

const ENDPOINTS = {
    gemini: (key) => ({
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        buildBody: (prompt) => ({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.9, maxOutputTokens: 256 },
        }),
        parseResponse: (data) => data.candidates?.[0]?.content?.parts?.[0]?.text || '[]',
    }),

    chatgpt: (key) => ({
        url: 'https://api.openai.com/v1/chat/completions',
        headers: { Authorization: `Bearer ${key}` },
        buildBody: (prompt) => ({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.9,
            max_tokens: 256,
        }),
        parseResponse: (data) => data.choices?.[0]?.message?.content || '[]',
    }),

    claude: (key) => ({
        url: 'https://api.anthropic.com/v1/messages',
        headers: {
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
        },
        buildBody: (prompt) => ({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 256,
            messages: [{ role: 'user', content: prompt }],
        }),
        parseResponse: (data) => {
            const block = data.content?.find((b) => b.type === 'text');
            return block?.text || '[]';
        },
    }),
};

export const AI_PROVIDERS = [
    { id: 'gemini', name: 'Gemini', placeholder: 'AIzaSy...' },
    { id: 'chatgpt', name: 'ChatGPT', placeholder: 'sk-...' },
    { id: 'claude', name: 'Claude', placeholder: 'sk-ant-...' },
];

function buildPrompt(nodeLabel, parentPath, siblingLabels) {
    const context = parentPath.length > 0
        ? `The path from root to this idea is: ${parentPath.join(' → ')} → ${nodeLabel}`
        : `The central topic is: ${nodeLabel}`;

    const siblings = siblingLabels.length > 0
        ? `\nExisting sub-topics: ${siblingLabels.join(', ')}`
        : '';

    return `You are an expert brainstorming assistant for mind mapping. Given the following context, suggest 5 creative and diverse sub-topics or related ideas that would be valuable branches to explore.

${context}${siblings}

Requirements:
- Each suggestion should be unique and insightful
- Provide a mix of practical, creative, and analytical angles
- Keep each suggestion concise (2-6 words each)
- Don't repeat existing sub-topics

Return ONLY a JSON array of strings, no other text. Example: ["Idea 1", "Idea 2", "Idea 3", "Idea 4", "Idea 5"]`;
}

export async function suggestBranches(provider, apiKey, nodeLabel, parentPath = [], siblingLabels = []) {
    if (!apiKey) {
        throw new Error(`Please set your ${provider} API key in the sidebar settings.`);
    }

    if (!ENDPOINTS[provider]) {
        throw new Error(`Unknown AI provider: ${provider}`);
    }

    const config = ENDPOINTS[provider](apiKey);
    const prompt = buildPrompt(nodeLabel, parentPath, siblingLabels);
    const body = config.buildBody(prompt);

    const response = await fetch(config.url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(config.headers || {}),
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const msg = err.error?.message || err.message || `API error: ${response.status}`;
        throw new Error(msg);
    }

    const data = await response.json();
    const text = config.parseResponse(data);

    // Extract JSON array from response
    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) throw new Error('Could not parse AI response');

    try {
        return JSON.parse(match[0]);
    } catch {
        throw new Error('Invalid AI response format');
    }
}
