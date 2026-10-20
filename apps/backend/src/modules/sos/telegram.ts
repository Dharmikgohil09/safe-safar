/** Anything that can send a Telegram message. Tests use a fake; production uses the Bot API. */
export interface Messenger {
  send(chatId: string, text: string): Promise<void>;
}

export class TelegramMessenger implements Messenger {
  constructor(private token: string, private fetchFn: typeof fetch = fetch) {}

  async send(chatId: string, text: string): Promise<void> {
    const res = await this.fetchFn(`https://api.telegram.org/bot${this.token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: false }),
    });
    if (!res.ok) throw new Error(`telegram ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

/** Used when no bot token is configured, so the server still runs. */
export class ConsoleMessenger implements Messenger {
  async send(chatId: string, text: string): Promise<void> {
    console.log(`[telegram:dev] -> ${chatId}: ${text}`);
  }
}
