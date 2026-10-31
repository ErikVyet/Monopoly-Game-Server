import { schema, t } from "@colyseus/schema";

export class ChatMessage extends schema({
    senderId: t.string(),
    senderName: t.string(),
    content: t.string(),
    sentAt: t.ref(Date).noSync()
}){};