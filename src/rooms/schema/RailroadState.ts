import { schema, t } from "@colyseus/schema";

export class RailroadState extends schema({
    ownerId: t.string(),
    houses: t.number().default(1),
    isMortgaged: t.boolean().default(false),
    isTradeLocked: t.boolean().default(false)
}){};