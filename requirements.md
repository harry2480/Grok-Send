# Requirements Definition: Grok Send Control Extension (Grok-Enter-Fix)

## 1. プロジェクト概要

Grok (x.ai) ウェブ版において、Enterキー単体での誤送信を完全に防止し、Ctrl+Enter（または Cmd+Enter）でのみ送信を許可する機能を提供するブラウザ拡張機能の仕様。既存の汎用拡張機能がGrok独自のイベントリスナーによって無効化（貫通）される問題を、ブラウザのイベント配送の最上流（キャプチャリングフェーズ）で介入することで解決する。

---

## 2. 技術スタック (Technology Stack)

2026年時点でのブラウザ拡張機能開発におけるデファクトスタンダードを採用し、保守性とパフォーマンスを最大化する。

- **Language:** TypeScript 5.x
  - DOM要素やKeyboardEventの型定義を厳密に行い、GrokのUI変更に伴うランタイムエラーを防止。
- **Build Tool:** Vite 5.x + @crxjs/vite-plugin
  - HMR（Hot Module Replacement）による高速な開発サイクルと、最適化されたManifest V3ファイルの生成。
- **Manifest:** Manifest V3
  - 最新のブラウザセキュリティ基準に準拠。
- **Core API:** Vanilla DOM API (Custom Event handling)
  - フレームワーク依存を排除し、タイピングラグをゼロにする超軽量設計。

---

## 3. 機能要件 (Functional Requirements)

### 3.1 イベントインターセプトの挙動

- **キャプチャリングフェーズの利用:**
  - `window.addEventListener('keydown', handleKeydown, { capture: true })` を使用し、GrokのReactコンポーネントにイベントが到達する前に検閲を行う。
- **Enterキー単体押下時の制御:**
  - `event.isComposing` が `true`（IME変換中）の場合は無視。
  - `false` かつ Modifiers（Ctrl, Cmd, Shift）がない場合、`stopImmediatePropagation()` でイベントを破棄し、`preventDefault()` でデフォルト動作を抑制する。
  - 遮断後、エディタ内に `document.execCommand('insertText', false, '\n')` を用いて改行を挿入し、エディタの内部状態を更新させる。
- **Ctrl + Enter / Cmd + Enter 押下時の制御:**
  - 送信ボタンを動的に特定し、`.click()` を実行する。
  - ブラウザ標準のショートカットとの競合を避けるため、Grokの入力フィールド内でのみ有効化する。

### 3.2 送信ボタンの動的特定ロジック

GrokのHTML構造の変化に対応するため、以下の優先順位でボタンを検索する。

1. `[data-testid="sendButton"]` (データ属性)
2. `button[aria-label*="Send"]`, `button[aria-label*="送信"]` (アクセシビリティラベル)
3. `button` タグのうち、内部に `path` 属性が特定の形状（紙飛行機等）を持つSVGを保持する要素。

---

## 4. 非機能要件 (Non-Functional Requirements)

- **パフォーマンス:** - キー入力ごとの処理時間を 1ms 未満に抑え、ユーザーに拡張機能の存在を感じさせない応答性を確保する。
- **堅牢性:** - GrokはSPA（Single Page Application）であるため、ページ遷移やチャットルームの切り替えが発生してもリスナーが解除されないよう、`window` オブジェクトに対して永続的にリスニングを行う。
- **プライバシー:** - 外部サーバーへの通信は一切行わない。
  - 必要最小限の権限 (`activeTab` のみ) で動作させる。

---

## 5. 詳細設計コードイメージ (TypeScript)

```typescript
// src/content/index.ts

const handleKeydown = (e: KeyboardEvent): void => {
  const target = e.target as HTMLElement;
  const isInput = target.getAttribute('contenteditable') === 'true' || target.tagName === 'TEXTAREA';

  if (!isInput || e.isComposing) return;

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const isModifierPressed = isMac ? e.metaKey : e.ctrlKey;
  const isEnter = e.key === 'Enter';

  // Case: Ctrl/Cmd + Enter -> Force Send
  if (isEnter && isModifierPressed) {
    e.stopImmediatePropagation();
    e.preventDefault();
    const sendBtn = document.querySelector<HTMLElement>('button[data-testid="sendButton"], button[aria-label*="Send"]');
    sendBtn?.click();
    return;
  }

  // Case: Enter alone -> Prevent Send and Insert Newline
  if (isEnter && !isModifierPressed && !e.shiftKey) {
    e.stopImmediatePropagation();
    e.preventDefault();
    document.execCommand('insertText', false, '\n');
  }
};

// Start intercepting in the capture phase to bypass Grok's own listeners
window.addEventListener('keydown', handleKeydown, { capture: true });

## 6. テスト項目 (Test Cases)

- [ ] Enterキー単体で送信が実行されず、改行が1行挿入されること。
- [ ] 日本語入力中の確定（Enter）で改行が挿入されたり送信されたりしないこと。
- [ ] Ctrl + Enter でメッセージが即座に送信されること。
- [ ] Cmd + Enter (Mac環境) でメッセージが即座に送信されること。
- [ ] Shift + Enter で標準通り改行が挿入されること。
