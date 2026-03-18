export interface CounselorKnowledgeItem {
    id: string;
    title: string;
    category: 'policy' | 'clinical' | 'protocol';
    text: string;
}

export const COUNSELOR_KNOWLEDGE_BASE: CounselorKnowledgeItem[] = [
    {
        id: 'policy_01',
        title: 'SPJIMR Confidentiality Agreement',
        category: 'policy',
        text: 'All counseling sessions are strictly confidential. Exceptions to confidentiality only occur when there is clear and imminent danger to the student or others, or in cases of severe medical emergencies. Faculty are never informed of student attendance without explicit written consent.'
    },
    {
        id: 'policy_02',
        title: 'Academic Concession Protocol',
        category: 'policy',
        text: 'If a student is experiencing severe mental health duress affecting academic performance, the counselor may recommend a temporary academic concession. This requires a formal email to the PGP Dean with the student\'s casefile ID (not name), outlining the duration of recommended relief.'
    },
    {
        id: 'protocol_01',
        title: 'Severe Depression Escalation',
        category: 'protocol',
        text: 'If a student presents with severe depressive symptoms including suicidal ideation, the immediate protocol requires breaking confidentiality to inform the designated campus medical officer and the emergency contact on file. Immediate handover to emergency psychiatric services is mandatory.'
    },
    {
        id: 'protocol_02',
        title: 'Anxiety Attack Grounding',
        category: 'protocol',
        text: 'For acute anxiety or panic attacks during a session or reported via the app, recommend immediate physiological grounding: The 5-4-3-2-1 sensory technique, splashing cold water on the face (mammalian dive reflex), and Box Breathing (4 seconds inhale, 4 hold, 4 exhale, 4 hold).'
    },
    {
        id: 'clinical_01',
        title: 'CBT techniques for Academic Burnout',
        category: 'clinical',
        text: 'Cognitive Behavioral Therapy (CBT) for burnout involves Cognitive Restructuring (identifying "all-or-nothing" thinking regarding grades), Behavioral Activation (scheduling small, low-effort rewarding tasks), and establishing strict boundary settings between study environments and rest spaces.'
    },
    {
        id: 'clinical_02',
        title: 'DBT Distress Tolerance',
        category: 'clinical',
        text: 'Dialectical Behavior Therapy (DBT) distress tolerance skills are highly effective for MBA students under pressure. Recommend the TIPP skill: Temperature (cold exposure), Intense exercise, Paced breathing, and Paired muscle relaxation. Also utilize Radical Acceptance of current unchangeable academic deadlines.'
    }
];

export async function searchOfflineCounselorKnowledge(query: string): Promise<CounselorKnowledgeItem[]> {
    const lowercaseQuery = query.toLowerCase();
    const keywords = lowercaseQuery.split(' ').filter(word => word.length > 3);

    if (keywords.length === 0) return [];

    // Very basic scoring based on keyword frequency in the text
    const scoredItems = COUNSELOR_KNOWLEDGE_BASE.map(item => {
        let score = 0;
        const textToSearch = (item.title + ' ' + item.text + ' ' + item.category).toLowerCase();
        keywords.forEach(kw => {
            if (textToSearch.includes(kw)) score++;
        });
        return { item, score };
    });

    return scoredItems
        .filter(si => si.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(si => si.item);
}


