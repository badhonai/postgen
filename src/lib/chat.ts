export interface ChatMessage {
  id: string
  conversationEmail: string
  senderEmail: string
  recipientEmail: string
  text: string
  createdAt: string
}

const CHAT_STORAGE_KEY = 'postgen_chat_messages_v1'

export function loadChatMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as ChatMessage[]
  } catch {
    /* fallback to empty */
  }
  return []
}

export function saveChatMessages(messages: ChatMessage[]) {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages))
    window.dispatchEvent(new Event('postgen_chat_messages_updated'))
  } catch {
    /* ignore */
  }
}

export function sendChatMessage(
  senderEmail: string,
  recipientEmail: string,
  text: string,
): ChatMessage {
  const list = loadChatMessages()
  const cleanRecipient = recipientEmail.trim().toLowerCase()
  const cleanSender = senderEmail.trim().toLowerCase()
  const msg: ChatMessage = {
    id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    conversationEmail: cleanRecipient,
    senderEmail: cleanSender,
    recipientEmail: cleanRecipient,
    text: text.trim(),
    createdAt: new Date().toISOString(),
  }
  saveChatMessages([...list, msg])
  return msg
}
