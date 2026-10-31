import { schema, t } from "@colyseus/schema";

export class PropertyRentTier extends schema({
    tier: t.uint8(),
    price: t.number()
}){};