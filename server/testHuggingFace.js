require('dotenv').config();

const MODELS = [
    'Qwen/Qwen2.5-7B-Instruct',
    'Qwen/Qwen2.5-3B-Instruct',
    'meta-llama/Llama-3.2-3B-Instruct',
    'microsoft/Phi-3.5-mini-instruct',
    'HuggingFaceH4/zephyr-7b-beta',
    'TinyLlama/TinyLlama-1.1B-Chat-v1.0',
];

const testHF = async () => {
    const { default: fetch } = await import('node-fetch');
    for (const model of MODELS) {
        try {
            const res = await fetch('https://router.huggingface.co/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.HF_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: 'hello' }],
                    max_tokens: 10
                }),
                signal: AbortSignal.timeout(5000)
            });
            const text = await res.text();
            if (res.status === 200) {
                console.log(`✅ ${model} WORKS! Response: ${text.slice(0, 150)}`);
            } else {
                console.log(`❌ ${model} failed: ${res.status}`);
            }
        } catch (e) {
            console.log(`⚠️  ${model} timeout/error`);
        }
    }
};

testHF();
