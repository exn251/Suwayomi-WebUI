declare const GMXmlXttpRequest: any;

export const logDebug = (msg: string, isDebug: boolean) => {
    // eslint-disable-next-line no-console
    if (isDebug) console.log(`[OCR PC Hybrid] ${new Date().toLocaleTimeString()} ${msg}`);
};

export const apiRequest = async <T>(
    url: string,
    options: { method?: string; body?: any; headers?: any } = {},
): Promise<T> => {
    const isUserScript = typeof GMXmlXttpRequest !== 'undefined';

    if (isUserScript) {
        return new Promise((resolve, reject) => {
            GMXmlXttpRequest({
                url,
                method: options.method || 'GET',
                headers: { 'Content-Type': 'application/json', ...options.headers },
                data: options.body ? JSON.stringify(options.body) : undefined,
                onload: (res: any) => {
                    try {
                        const json = JSON.parse(res.responseText);
                        if (res.status >= 400) reject(json);
                        else resolve(json);
                    } catch (e) {
                        reject(e);
                    }
                },
                onerror: reject,
                ontimeout: reject,
            });
        });
    }

    const response = await fetch(url, {
        method: options.method || 'GET',
        headers: { 'Content-Type': 'application/json', ...options.headers },
        body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const json = await response.json();
    if (!response.ok) throw json;
    return json;
};

export const cleanPunctuation = (text: string): string => {
    if (!text) return text;
    let t = text
        .replace(/[ ]*!!+/g, '‼')
        .replace(/[ ]*\?\?+/g, '⁇')
        .replace(/[ ]*\.\.+/g, '…')
        .replace(/[ ]*(!\?)+/g, '⁉')
        .replace(/[ ]*(\?!)+/g, '⁈')
        .replace(/[ ]*\u2026+/g, '…')
        .replace(/[ ]*\u30FB\u30FB+/g, '…')
        .replace(/[ ]*-+/g, 'ー')
        .replace(/[ ]*\u2013+/g, '―')
        .replace(/[ ]*:+[ ]*/g, '…');

    t = t
        .replace(/^[!?:]+$/g, '')
        .replace(/([⁉⁈‼⁇])[!?:]+/g, '$1')
        .replace(/[!?:]+([⁉⁈‼⁇])/g, '$1');
    return t.replace(/\u0020/g, '');
};
