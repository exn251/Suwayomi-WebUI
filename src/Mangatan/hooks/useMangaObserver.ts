import { useEffect, useState } from 'react';
import { useOCR } from '@/Mangatan/context/OCRContext';

export const useMangaObserver = () => {
    const { settings } = useOCR();
    const [images, setImages] = useState<HTMLImageElement[]>([]);

    useEffect(() => {
        const { imageContainerSelectors: selectors } = settings.site;

        const scan = () => {
            const found: HTMLImageElement[] = [];

            selectors.forEach((sel) => {
                const nodes = document.querySelectorAll(sel);
                nodes.forEach((node) => {
                    if (node instanceof HTMLImageElement) found.push(node);
                    else node.querySelectorAll('img').forEach((img) => found.push(img));
                });
            });

            if (found.length === 0) {
                document.querySelectorAll('img[src*="/chapter/"]').forEach((img) => {
                    if (img instanceof HTMLImageElement && img.naturalHeight > 400) found.push(img);
                });
            }

            const unique = Array.from(new Set(found)).filter((img) => {
				if (!img.isConnected || img.src.includes('thumbnail')) return false;
				if (img.naturalHeight <= 200) return false;

				// 2. SUWAYOMI SPECIFIC: Display Check
				// In Suwayomi's paged reader, inactive pages are often set to 'display: none'.
				// offsetParent is null if the element or any parent is hidden.
				const isDisplayed = img.offsetParent !== null;
				if (!isDisplayed) return false;

				// 3. VIEWPORT CHECK (Optional but recommended)
				// If Suwayomi uses a "Webtoon" or "Continuous" scroll mode, 
				// we only want OCR for what is actually on the screen.
				const rect = img.getBoundingClientRect();
				const isInViewport = (
					rect.top < (window.innerHeight || document.documentElement.clientHeight) &&
					rect.bottom > 0
				);
				
				// If it's paged mode, isDisplayed is usually enough. 
				// If it's webtoon mode, you need isInViewport.
				return isDisplayed && isInViewport;
			});

            setImages((prev) => {
                if (prev.length === unique.length && prev.every((img, i) => img.src === unique[i].src)) return prev;
                return unique;
            });
        };

        scan();

        const observer = new MutationObserver((mutations) => {
			const shouldRescan = mutations.some((m) => 
				m.addedNodes.length > 0 || 
				m.attributeName === 'src' || 
				m.attributeName === 'class' || // Suwayomi toggles classes for active pages
				m.attributeName === 'style'    // Suwayomi toggles display styles
			);
			if (shouldRescan) scan();
		});

		observer.observe(document.body, { 
			childList: true, 
			subtree: true, 
			attributes: true, 
			// Important: watch these attributes
			attributeFilter: ['src', 'class', 'style'] 
		});

		// Also: Add a scroll listener if you use Webtoon/Vertical mode
		window.addEventListener('scroll', scan, { passive: true });

		return () => {
			observer.disconnect();
			window.removeEventListener('scroll', scan);
		};
	}, [settings.site, settings.debugMode]);

    return images;
};
