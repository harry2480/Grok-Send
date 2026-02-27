/**
 * Grok Send Control Extension
 * Prevents accidental sending with Enter key alone.
 */

const findSendButton = (): HTMLElement | null => {
    const selectors = [
        '[data-testid="sendButton"]', // Grok.com
        '[data-testid="grok_send_button"]', // X.com
        'button[aria-label="Grok send"]',
        'button[aria-label="Grok送信"]',
        'button[aria-label*="Send" i]',
        'button[aria-label*="送信" i]',
        '[role="button"][aria-label*="Send" i]',
        '[role="button"][aria-label*="送信" i]',
    ];

    for (const s of selectors) {
        const el = document.querySelector<HTMLElement>(s);
        if (el) return el;
    }

    // Fallback: search for buttons with a "send-like" icon
    const btns = document.querySelectorAll('button, [role="button"]');
    for (let i = 0; i < btns.length; i++) {
        const btn = btns[i] as HTMLElement;
        const label = (btn.getAttribute('aria-label') || '').toLowerCase();
        const text = (btn.innerText || '').toLowerCase();
        if (label.includes('send') || label.includes('送信') || text.includes('send') || text.includes('送信')) {
            return btn;
        }
        if (btn.querySelector('svg')) {
            const rect = btn.getBoundingClientRect();
            if (rect.top > window.innerHeight / 2 && rect.right > window.innerWidth / 2) {
                return btn;
            }
        }
    }
    return null;
};

const simulateClick = (el: HTMLElement) => {
    console.log('[Grok-Fix] Simulating click on:', el);
    el.click();
    ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click'].forEach(type => {
        el.dispatchEvent(new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerType: 'mouse'
        }));
    });
};

const blockEnter = (e: KeyboardEvent): boolean => {
    if (e.key !== 'Enter' && e.keyCode !== 13) return false;

    const target = e.composedPath()[0] as HTMLElement;
    if (!target) return false;

    const isInput = target.isContentEditable ||
        target.getAttribute('contenteditable') === 'true' ||
        target.closest('[contenteditable="true"]') !== null ||
        target.getAttribute('role') === 'textbox' ||
        target.tagName === 'TEXTAREA' || target.tagName === 'INPUT';

    if (!isInput) return false;
    if (e.isComposing || e.keyCode === 229) return false;

    const isModifier = e.ctrlKey || e.metaKey;

    if (isModifier) {
        if (e.type === 'keydown') {
            console.log('[Grok-Fix] Ctrl/Cmd + Enter detected. Searching button...');
            const btn = findSendButton();
            if (btn) {
                simulateClick(btn);
            } else {
                console.error('[Grok-Fix] Send button not found!');
            }
        }
        e.stopImmediatePropagation();
        e.preventDefault();
        return true;
    }

    if (!e.shiftKey) {
        if (e.type === 'keydown') {
            console.log('[Grok-Fix] Enter alone. Inserting newline.');
            document.execCommand('insertText', false, '\n');
        }
        e.stopImmediatePropagation();
        e.preventDefault();
        return true;
    }

    return false;
};

// Intercept all related events at the earliest possible stage
window.addEventListener('keydown', blockEnter, { capture: true });
window.addEventListener('keypress', blockEnter, { capture: true });
window.addEventListener('keyup', blockEnter, { capture: true });

console.log('[Grok-Fix] Extension active with aggressive blocking. Domains:', location.hostname);
