const API_BASE = 'http://localhost:3001/api/rag';

export const detectCrisisInText = async (text: string): Promise<{ isCrisis: boolean, reason: string }> => {
    try {
        const res = await fetch(`${API_BASE}/detect-crisis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });

        if (!res.ok) {
            console.error('[AI Service Error] Crisis detect failed', await res.text());
            return { isCrisis: false, reason: '' };
        }

        return await res.json();
    } catch (e) {
        console.error('[AI Service Exception]', e);
        return { isCrisis: false, reason: '' };
    }
};

export const analyzeBurnoutRisk = async (metrics: any): Promise<string> => {
    try {
        const res = await fetch(`${API_BASE}/analyze-burnout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ metrics }),
        });

        if (!res.ok) {
            console.error('[AI Service Error] Burnout analysis failed', await res.text());
            return 'Analysis unavailable at this time due to server error.';
        }

        const data = await res.json();
        return data.analysis;
    } catch (e) {
        console.error('[AI Service Exception]', e);
        return 'Analysis unavailable at this time.';
    }
};
