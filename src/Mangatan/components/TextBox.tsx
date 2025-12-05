import React, { useRef, useState, useLayoutEffect } from 'react';
import { OcrBlock } from '@/Mangatan/types';
import { useOCR } from '@/Mangatan/context/OCRContext';
import { cleanPunctuation } from '@/Mangatan/utils/api';

const calculateFontSize = (text: string, w: number, h: number, isVertical: boolean, settings: any) => {
    // 1. Analyze Structure
    const lines = text.split('\n');
    const lineCount = lines.length || 1;
    // Calculate max length of any single line
    const maxLineLength = Math.max(...lines.map((l) => l.length)) || 1;

    let size = 16;

    // Buffer to prevent text touching borders (15% padding)
    const safeW = w * 0.85;
    const safeH = h * 0.85;

    if (isVertical) {
        // Vertical Text:
        // Width constrains the NUMBER OF COLUMNS (lines)
        const maxFontSizeByWidth = safeW / lineCount;

        // Height constrains the LENGTH OF THE LONGEST LINE
        const maxFontSizeByHeight = safeH / maxLineLength;

        size = Math.min(maxFontSizeByWidth, maxFontSizeByHeight);
        size *= settings.fontMultiplierVertical;
    } else {
        // Horizontal Text:
        // Height constrains the NUMBER OF LINES
        const maxFontSizeByHeight = safeH / lineCount;

        // Width constrains the LENGTH OF THE LONGEST LINE
        const maxFontSizeByWidth = safeW / maxLineLength;

        size = Math.min(maxFontSizeByHeight, maxFontSizeByWidth);
        size *= settings.fontMultiplierHorizontal;
    }

    // Clamp font size to sane limits
    return Math.max(10, Math.min(size, 200));
};

export const TextBox: React.FC<{
    block: OcrBlock;
    index: number;
    imgSrc: string;
    containerRect: DOMRect;
    onUpdate: (idx: number, txt: string) => void;
    onMerge: (src: number, target: number) => void;
    onDelete: (idx: number) => void;
}> = ({ block, index, imgSrc, containerRect, onUpdate, onMerge, onDelete }) => {
    const { settings, mergeAnchor, setMergeAnchor } = useOCR();
    const [isEditing, setIsEditing] = useState(false);
    const [fontSize, setFontSize] = useState(16);
    const ref = useRef<HTMLDivElement>(null);

    const isVertical =
        block.forcedOrientation === 'vertical' ||
        (settings.textOrientation === 'smart' && block.tightBoundingBox.height > block.tightBoundingBox.width * 1.5) ||
        settings.textOrientation === 'forceVertical';

    // Box Adjustment (Padding) from settings
    const adj = settings.boundingBoxAdjustment || 0;

    useLayoutEffect(() => {
        if (!ref.current) return;
        const pxW = block.tightBoundingBox.width * containerRect.width;
        const pxH = block.tightBoundingBox.height * containerRect.height;

        if (!isEditing) {
            // Replicate the exact display string for calculation (replacing zero-width spaces with newlines)
            const displayTxt = cleanPunctuation(block.text).replace(/\u200B/g, '\n');
            // We calculate using the *expanded* box size (pxW + adj)
            setFontSize(calculateFontSize(displayTxt, pxW + adj, pxH + adj, isVertical, settings));
        }
    }, [block, containerRect, settings, isEditing, isVertical]);

    const handleInteract = (e: React.MouseEvent) => {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed) return;

        if (isEditing) return;
        e.stopPropagation();

        const isDelete = settings.deleteModifierKey === 'Alt' ? e.altKey : e.ctrlKey;
        const isMerge = settings.mergeModifierKey === 'Control' ? e.ctrlKey : e.altKey;

        if (isDelete) {
            e.preventDefault();
            onDelete(index);
        } else if (isMerge) {
            e.preventDefault();
            if (!mergeAnchor) setMergeAnchor({ imgSrc, index });
            else {
                if (mergeAnchor.imgSrc === imgSrc && mergeAnchor.index !== index) onMerge(mergeAnchor.index, index);
                setMergeAnchor(null);
            }
        }
    };

    // Fix for jsx-a11y/click-events-have-key-events
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (isEditing) return;
        // Allow entering edit mode via Enter or Space
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsEditing(true);
        }
        // Allow delete via Delete key
        if (e.key === 'Delete') {
            e.preventDefault();
            onDelete(index);
        }
    };

    const isMergedTarget = mergeAnchor?.imgSrc === imgSrc && mergeAnchor?.index === index;

    // Final Content Logic
    let content = isEditing ? block.text : cleanPunctuation(block.text);
    content = content.replace(/\u200B/g, '\n');

    return (
        <div
            ref={ref}
            // Accessibility Props
            role="button"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            className={`gemini-ocr-text-box ${isVertical ? 'vertical' : ''} ${isEditing ? 'editing' : ''} ${isMergedTarget ? 'merge-target' : ''}`}
            contentEditable={isEditing}
            suppressContentEditableWarning
            onDoubleClick={() => setIsEditing(true)}
            onBlur={() => {
                setIsEditing(false);
                const raw = ref.current?.innerText || '';
                // When saving, convert back to zero-width space format
                if (raw !== content) onUpdate(index, raw.replace(/\n/g, '\u200B'));
            }}
            onClick={handleInteract}
            style={{
                left: `calc(${block.tightBoundingBox.x * 100}% - ${adj / 2}px)`,
                top: `calc(${block.tightBoundingBox.y * 100}% - ${adj / 2}px)`,
                width: `calc(${block.tightBoundingBox.width * 100}% + ${adj}px)`,
                height: `calc(${block.tightBoundingBox.height * 100}% + ${adj}px)`,
                fontSize: `${fontSize}px`,
                color: settings.focusFontColor === 'difference' ? 'white' : 'var(--ocr-text-color)',
                mixBlendMode: settings.focusFontColor === 'difference' ? 'difference' : 'normal',
                whiteSpace: 'pre',
            }}
        >
            {content}
        </div>
    );
};
