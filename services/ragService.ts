

const API_BASE = 'http://localhost:3001/api/rag';

export interface GameMetadata {
    title: string;
    paradigm: 'Resource Gathering' | 'Story Weaving' | 'Logic Puzzle';
    createdAt: string;
    totalUsers: number;
    avgCompletionTime: number;
}

export const uploadGamePDF = async (file: File, gameId: string, title: string, paradigm: string) => {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('gameId', gameId);
    formData.append('title', title);
    formData.append('paradigm', paradigm);

    const res = await fetch(`${API_BASE}/upload-survey`, {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) throw new Error(await res.text());
    return res.json();
};

export const generateGameElements = async (gameId: string, userInput: string, type: 'ingredients' | 'threads') => {
    const res = await fetch(`${API_BASE}/generate-elements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, userInput, type }),
    });

    if (!res.ok) {
        const text = await res.text();
        console.error('[RAG Error]', text);
        // Fallback if the backend dies or local RAG is down
        if (type === 'ingredients') return ["Deep abdominal breathing", "5-4-3-2-1 grounding exercise", "Fact-checking thoughts"];
        return ["Call a trusted friend", "Go for a short walk"];
    }

    const data = await res.json();
    return data.elements || [];
};

export const getForgedGames = async (): Promise<Record<string, GameMetadata>> => {
    try {
        const res = await fetch(`${API_BASE}/games`);
        if (!res.ok) return {};
        const metadata = await res.json();
        return metadata;
    } catch (e) {
        return {};
    }
};
