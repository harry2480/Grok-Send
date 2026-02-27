/**
 * Grok Send Control Extension
 * Prevents accidental sending with Enter key alone.
 */

const findSendButton = (): HTMLElement | null => {
    // 1. Precise data-testid (most reliable for Grok.com)
    const byTestId = document.querySelector<HTMLElement>('[data-testid="sendButton"]');
    if (byTestId) return byTestId;

    // 2. Aria-label (common in accessible apps, including X.com)
    const byAriaLabel = document.querySelector<HTMLElement>(
        'button[aria-label*="Send" i], button[aria-label*="送信" i], button[aria-label="Grok send"]'
    );
    if (byAriaLabel) return byAriaLabel;

    // 3. X.com specific: looking for the send icon (it often has a specific SVG)
    // On X.com, it might be a button with a specific testid or just the last button.
    const xSendBtn = document.querySelector<HTMLElement>('button[data-testid="grok_send_button"]');
    if (xSendBtn) return xSendBtn;

    // 4. Fallback: Button with SVG in the chat input area
    const buttons = document.querySelectorAll('button');
    for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i];
        if (button.innerText.includes('Send') || button.innerText.includes('送信')) return button;
        const svg = button.querySelector('svg');
        if (svg) {
            // Very likely the send button if it's in the bottom right area
            return button;
        }
    }

    return null;
};

const handleKeydown = (e: KeyboardEvent): void => {
    const target = e.composedPath()[0] as HTMLElement;
    if (!target) return;

    // More robust check for input-like elements
    const isContentEditable = target.isContentEditable ||
        target.getAttribute('contenteditable') === 'true' ||
        target.closest('[contenteditable="true"]') !== null;
    const isInputOrTextArea = target.tagName === 'TEXTAREA' || target.tagName === 'INPUT';

    if (!isContentEditable && !isInputOrTextArea) return;

    // Always ignore if IME is composing
    if (e.isComposing || e.keyCode === 229) return;

    const isModifierPressed = e.ctrlKey || e.metaKey;
    const isEnter = e.key === 'Enter';

    if (!isEnter) return;

    console.log('[Grok-Fix] Enter detected. Modifier:', isModifierPressed, 'Shift:', e.shiftKey);

    // Case: Ctrl/Cmd + Enter -> Force Send
    if (isModifierPressed) {
        e.stopImmediatePropagation();
        e.preventDefault();
        const sendBtn = findSendButton();
        console.log('[Grok-Fix] Attempting to click send button:', sendBtn);
        if (sendBtn) {
            sendBtn.click();
        }
        return;
    }

    // Case: Enter alone (without Shift) -> Prevent Send and Insert Newline
    if (!isModifierPressed && !e.shiftKey) {
        e.stopImmediatePropagation();
        e.preventDefault();

        console.log('[Grok-Fix] Preventing default Enter, inserting newline');

        // Attempt to insert newline
        // For many React apps, execCommand is still the silver bullet for updating state correctly.
        const success = document.execCommand('insertText', false, '\n');

        // Fallback if execCommand fails (though it rarely does for text insertion)
        if (!success && isInputOrTextArea) {
            const input = target as HTMLInputElement | HTMLTextAreaElement;
            const start = input.selectionStart || 0;
            const end = input.selectionEnd || 0;
            const value = input.value;
            input.value = value.substring(0, start) + '\n' + value.substring(end);
            input.selectionStart = input.selectionEnd = start + 1;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
};

// Intercept at capturing phase
window.addEventListener('keydown', handleKeydown, { capture: true });
// Also intercept keypress just in case Grok uses it (rare nowadays but possible)
window.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.stopImmediatePropagation();
        e.preventDefault();
    }
}, { capture: true });


console.log('[Grok-Fix] Extension loaded and intercepting Enter key.');
