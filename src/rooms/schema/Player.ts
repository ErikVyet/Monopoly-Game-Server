import { schema, t } from "@colyseus/schema";

export class Player extends schema({
    id: t.string(),
    name: t.string(),
    cash: t.number().default(1500),
    position: t.number().default(0),
    inJail: t.boolean().default(false),
    jailTurns: t.number().default(0),
    getOutOfJailCards: t.number().default(0),
    isBankrupt: t.boolean().default(false),
    isReady: t.boolean().default(false)
}){};