export interface ChatReplyPreview {
  id: string
  sender: string
  snippet: string
}

export interface ChatMessage {
  id: string
  conversationEmail: string
  senderEmail: string
  recipientEmail: string
  text: string
  imageUrl?: string
  replyTo?: ChatReplyPreview
  reactions?: Record<string, string[]> // emoji -> array of user emails
  createdAt: string
}

const CHAT_STORAGE_KEY = 'postgen_chat_messages_v1'
const SHARE_REACTIONS_STORAGE_KEY = 'postgen_share_reactions_v1'
const PINNED_STORAGE_KEY = 'postgen_chat_pinned_v1'

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

export function sendChatMessage(input: {
  senderEmail: string
  recipientEmail: string
  text: string
  imageUrl?: string
  replyTo?: ChatReplyPreview
}): ChatMessage {
  const list = loadChatMessages()
  const cleanRecipient = input.recipientEmail.trim().toLowerCase()
  const cleanSender = input.senderEmail.trim().toLowerCase()
  const msg: ChatMessage = {
    id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    conversationEmail: cleanRecipient,
    senderEmail: cleanSender,
    recipientEmail: cleanRecipient,
    text: input.text.trim(),
    imageUrl: input.imageUrl,
    replyTo: input.replyTo,
    reactions: {},
    createdAt: new Date().toISOString(),
  }
  saveChatMessages([...list, msg])
  return msg
}

export function deleteChatMessage(messageId: string): void {
  const list = loadChatMessages().filter((m) => m.id !== messageId)
  saveChatMessages(list)
}

export function clearChatConversation(contactEmail: string, userEmail: string): void {
  const cleanContact = contactEmail.trim().toLowerCase()
  const cleanUser = userEmail.trim().toLowerCase()
  const remaining = loadChatMessages().filter((m) => {
    const isThisThread =
      (m.senderEmail === cleanUser && m.recipientEmail === cleanContact) ||
      (m.senderEmail === cleanContact && m.recipientEmail === cleanUser) ||
      m.conversationEmail === cleanContact
    return !isThisThread
  })
  saveChatMessages(remaining)
}

export function toggleMessageReaction(
  messageId: string,
  emoji: string,
  userEmail: string,
): void {
  const list = loadChatMessages()
  const cleanUser = userEmail.trim().toLowerCase()
  const updated = list.map((msg) => {
    if (msg.id !== messageId) return msg
    const reactions = { ...(msg.reactions ?? {}) }
    const currentList = reactions[emoji] ?? []
    if (currentList.includes(cleanUser)) {
      // Remove reaction
      const filtered = currentList.filter((e) => e !== cleanUser)
      if (filtered.length === 0) {
        delete reactions[emoji]
      } else {
        reactions[emoji] = filtered
      }
    } else {
      // Add reaction
      reactions[emoji] = [...currentList, cleanUser]
    }
    return { ...msg, reactions }
  })
  saveChatMessages(updated)
}

// Reactions on shared items (Posts, Prompts, Projects)
export function loadShareReactions(): Record<string, Record<string, string[]>> {
  try {
    const raw = localStorage.getItem(SHARE_REACTIONS_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* fallback to empty */
  }
  return {}
}

export function saveShareReactions(data: Record<string, Record<string, string[]>>) {
  try {
    localStorage.setItem(SHARE_REACTIONS_STORAGE_KEY, JSON.stringify(data))
    window.dispatchEvent(new Event('postgen_share_reactions_updated'))
  } catch {
    /* ignore */
  }
}

export function toggleShareReaction(
  shareId: string,
  emoji: string,
  userEmail: string,
): void {
  const all = loadShareReactions()
  const cleanUser = userEmail.trim().toLowerCase()
  const shareMap = { ...(all[shareId] ?? {}) }
  const currentList = shareMap[emoji] ?? []
  if (currentList.includes(cleanUser)) {
    const filtered = currentList.filter((e) => e !== cleanUser)
    if (filtered.length === 0) {
      delete shareMap[emoji]
    } else {
      shareMap[emoji] = filtered
    }
  } else {
    shareMap[emoji] = [...currentList, cleanUser]
  }
  all[shareId] = shareMap
  saveShareReactions(all)
}

// Pinned Conversations
export function loadPinnedChats(): string[] {
  try {
    const raw = localStorage.getItem(PINNED_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as string[]
  } catch {
    /* fallback */
  }
  return []
}

export function togglePinnedChat(email: string): boolean {
  const clean = email.trim().toLowerCase()
  const current = loadPinnedChats()
  let isPinned = false
  let updated: string[]
  if (current.includes(clean)) {
    updated = current.filter((e) => e !== clean)
    isPinned = false
  } else {
    updated = [...current, clean]
    isPinned = true
  }
  try {
    localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new Event('postgen_pinned_chats_updated'))
  } catch {
    /* ignore */
  }
  return isPinned
}
