import { schema, t } from "@colyseus/schema";
import { UtilityState } from "./UtilityState.js";

export class Utility extends schema({
    id: t.string(),
    name: t.string(),
    position: t.number(),
    group: t.string(),
    price: t.number(),
    mortgageValue: t.number(),
    state: t.ref(UtilityState)
}){};