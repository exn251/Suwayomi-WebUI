import { useState } from 'react';
import { useMangaObserver } from '@/Mangatan/hooks/useMangaObserver';
import { ImageOverlay } from '@/Mangatan/components/ImageOverlay';
import { SettingsModal } from '@/Mangatan/components/SettingsModal';

export const OCRManager = () => {
    const images = useMangaObserver();
    const [showSettings, setShowSettings] = useState(false);

    return (
        <>
            {images.map((img) => (
                <ImageOverlay key={img.src} img={img} />
            ))}

            <div className="ocr-controls">
                <button type="button" onClick={() => setShowSettings(true)}>
                    ⚙️
                </button>
            </div>

            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        </>
    );
};
