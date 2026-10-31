import { ArraySchema, schema, t } from "@colyseus/schema";
import { PropertyState } from "./PropertyState.js";
import { PropertyRentTier } from "./PropertyRentTier.js";

export class Property extends schema({
    id: t.string(),
    name: t.string(),
    position: t.uint8(),
    group: t.string(),
    price: t.uint16(),
    houseCost: t.uint16(),
    mortgageValue: t.uint16(),
    rentTier: t.array(PropertyRentTier).default(new ArraySchema()),
    state: t.ref(PropertyState)
}){};