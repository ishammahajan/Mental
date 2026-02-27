const { HfInference } = require('@huggingface/inference');

const originalFetch = global.fetch;
global.fetch = async (url, options) => {
    console.log('--- SDK CALLED URL ---');
    console.log(url);
    console.log('----------------------');
    return originalFetch(url, options);
};

const hf = new HfInference(process.env.HF_TOKEN);

async function run() {
    try {
        const out = await hf.chatCompletion({
            model: 'mistralai/Mistral-7B-Instruct-v0.2',
            messages: [{ role: 'user', content: 'hello' }],
            max_tokens: 10
        });
        console.log(out.choices[0].message);
    } catch (e) {
        console.error('API Error:', e.message);
    }
}

run();
