import { schema, t } from "@colyseus/schema";

export class PropertyState extends schema({
    ownerId: t.string(),
    houses: t.number().default(0),
    isMortgaged: t.boolean().default(false),
    isTradeLocked: t.boolean().default(false)
}){};