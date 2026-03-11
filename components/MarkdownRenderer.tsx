import React from 'react';

/**
 * Lightweight Markdown renderer for Wellness Wall posts.
 * Supports: **bold**, *italic*, [links](url), - bullet lists, 1. numbered lists,
 * line breaks, and basic nested formatting.
 * Zero external dependencies.
 */

const renderInlineMarkdown = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    // Regex: bold **text**, italic *text*, links [text](url)
    const inlineRe = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(\[([^\]]+)\]\(([^)]+)\))/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = inlineRe.exec(text)) !== null) {
        // Push text before match
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }

        if (match[1]) {
            // Bold **text**
            parts.push(<strong key={`b-${match.index}`} className="font-bold">{match[2]}</strong>);
        } else if (match[3]) {
            // Italic *text*
            parts.push(<em key={`i-${match.index}`} className="italic">{match[4]}</em>);
        } else if (match[5]) {
            // Link [text](url)
            parts.push(
                <a key={`a-${match.index}`} href={match[7]} target="_blank" rel="noopener noreferrer"
                    className="text-[#8A9A5B] underline hover:text-[#76854d] transition-colors">
                    {match[6]}
                </a>
            );
        }

        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
};

interface MarkdownRendererProps {
    text: string;
    className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ text, className = '' }) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listBuffer: { type: 'ul' | 'ol'; items: string[] } | null = null;

    const flushList = () => {
        if (!listBuffer) return;
        const Tag = listBuffer.type === 'ul' ? 'ul' : 'ol';
        const listClass = listBuffer.type === 'ul'
            ? 'list-disc list-inside space-y-1 ml-2 my-1'
            : 'list-decimal list-inside space-y-1 ml-2 my-1';

        elements.push(
            <Tag key={`list-${elements.length}`} className={listClass}>
                {listBuffer.items.map((item, i) => (
                    <li key={i} className="text-inherit leading-relaxed">
                        {renderInlineMarkdown(item)}
                    </li>
                ))}
            </Tag>
        );
        listBuffer = null;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Unordered list: "- item" or "• item" or "* item" (but not **bold**)
        const ulMatch = trimmed.match(/^[-•]\s+(.+)$/) || trimmed.match(/^\*\s+(?!\*)(.+)$/);
        // Ordered list: "1. item", "2. item" etc.
        const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);

        if (ulMatch) {
            if (listBuffer?.type !== 'ul') {
                flushList();
                listBuffer = { type: 'ul', items: [] };
            }
            listBuffer!.items.push(ulMatch[1]);
        } else if (olMatch) {
            if (listBuffer?.type !== 'ol') {
                flushList();
                listBuffer = { type: 'ol', items: [] };
            }
            listBuffer!.items.push(olMatch[1]);
        } else {
            flushList();

            if (trimmed === '') {
                // Empty line = paragraph break
                elements.push(<div key={`br-${i}`} className="h-2" />);
            } else {
                elements.push(
                    <p key={`p-${i}`} className="leading-relaxed">
                        {renderInlineMarkdown(trimmed)}
                    </p>
                );
            }
        }
    }

    flushList();

    return <div className={`space-y-0.5 ${className}`}>{elements}</div>;
};

export default MarkdownRenderer;
