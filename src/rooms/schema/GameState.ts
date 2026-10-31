import { ArraySchema, schema, SchemaType, t } from "@colyseus/schema";
import { Player } from "./Player.js";
import { Property } from "./Property.js";
import { RoomStatus } from "../../constants/RoomStatus.js";
import { ChatMessage } from "./ChatMessage.js";
import { Railroad } from "./Railroad.js";
import { Utility } from "./Utility.js";

export class GameState extends schema({
    hostId: t.string(),
    name: t.string(),
    status: t.string().default(RoomStatus.LOBBY),
    players: t.map(Player),
    properties: t.map(Property),
    railroads: t.map(Railroad),
    utilities: t.map(Utility),
    propertiesToAuction: t.array("string").default(new ArraySchema()),
    availableHouses: t.number().default(28),
    availableHotels: t.number().default(12),
    messages: t.array(ChatMessage).default(new ArraySchema())
}){};