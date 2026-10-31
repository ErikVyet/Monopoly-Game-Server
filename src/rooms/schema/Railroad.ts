import { schema, t } from "@colyseus/schema";
import { RailroadState } from "./RailroadState.js";

export class Railroad extends schema({
    id: t.string(),
    name: t.string(),
    position: t.number(),
    group: t.string(),
    price: t.number(),
    mortgageValue: t.number(),
    state: t.ref(RailroadState)
}){};