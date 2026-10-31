import { ArraySchema } from "@colyseus/schema";
import { AuthContext, Client, CloseCode, Delayed, Room } from "colyseus";
import boardData from "../assets/data/board.json" assert { type: "json" };
import { BankruptReason } from "../constants/BankruptReason.js";
import { ExtendErrorCode } from "../constants/ExtendErrorCode.js";
import { HttpResponse } from "../constants/Http.js";
import { MessageType } from "../constants/MessageType.js";
import { RoomStatus } from "../constants/RoomStatus.js";
import { ChatMessage } from "./schema/ChatMessage.js";
import { GameState } from "./schema/GameState.js";
import { Player } from "./schema/Player.js";
import { Property } from "./schema/Property.js";
import { PropertyRentTier } from "./schema/PropertyRentTier.js";
import { BoardSpace } from "../interfaces/BoardSpace.js";
import { Railroad } from "./schema/Railroad.js";
import { Utility } from "./schema/Utility.js";
import { Tax } from "../interfaces/Tax.js";


/* JSON structure when creating room
{
	name?: string,
	roomName: string,
	password?: string
}
*/
export class GameRoom extends Room<{ state: GameState }> {
	maxClients = 4;
	state = new GameState();

	private password: string;
	private roomStatusCheckInterval: Delayed;
	private taxes: Tax[];
	private spaces: BoardSpace[];

	// Initialization
	private initializeBoard(): void {
		this.taxes = Array.from({ length: 2 });
		this.spaces = Array.from({ length: 40 });

		this.spaces[0] = { id: "go", type: "GO" };
		this.spaces[10] = { id: "jail", type: "JAIL" };
		this.spaces[20] = { id: "parking", type: "FREE_PARKING" };
		this.spaces[30] = { id: "go-to-jail", type: "GO_TO_JAIL" };

		boardData.chests.forEach(chest => {
			this.spaces[chest.position] = { id: chest.id, type: "COMMUNITY_CHEST" };
		});

		boardData.chances.forEach(chance => {
			this.spaces[chance.position] = { id: chance.id, type: "CHANCE" };
		});
		
		boardData.taxes.forEach(tax => {
			this.taxes.push({...tax});
			this.spaces[tax.position] = { id: tax.id, type: "TAX" };
		});

		boardData.properties.forEach(property => {
			const initialProperty = new Property({
				...property,
				rentTier: new ArraySchema(...property.rentTier.map(rentTier => new PropertyRentTier({...rentTier})))
			});
			this.spaces[property.position] = { id: property.id, type: "PROPERTY" };
			this.state.properties.set(property.id, initialProperty);
		});

		boardData.railroads.forEach(railroad => {
			const initialRailroad = new Railroad({...railroad});
			this.spaces[railroad.position] = { id: railroad.id, type: "RAILROAD" };
			this.state.railroads.set(railroad.id, initialRailroad);
		});

		boardData.utilities.forEach(utility => {
			const initialUtility = new Utility({...utility});
			this.spaces[utility.position] = { id: utility.id, type: "UTILITY" };
			this.state.utilities.set(utility.id, initialUtility);
		});
	}

	onCreate(options: any): void | Promise<any> {
		if (!options?.roomName) {
			throw new Error("Missing room name");
		}
		this.state.name = options?.roomName as string;
		
		if (options?.password) {
			this.password = options.password as string;
		}

		this.initializeBoard();

		this.onMessage(MessageType.KICK, (client, playerId: string) => {
			const player = this.state.players.get(client.sessionId);
			if (!player) return;

			if (player.id !== this.state.hostId) {
				client.error(ExtendErrorCode.UNAUTHORIZED, "You are not authorized to do this action");
				return;
			}
			
			const kickedPlayer = this.state.players.get(playerId);
			if (!kickedPlayer) return;

			this.clients.get(playerId).leave(CloseCode.CONSENTED);
			this.state.players.delete(playerId);
		});

		this.onMessage(MessageType.SEND_MESSAGE, (client, content: string) => {
			const sender = this.state.players.get(client.sessionId);
			if (!sender) return;

			const message = new ChatMessage();
			message.senderName = sender.name;
			message.content = content;
			message.sentAt = new Date();
		});

		this.onMessage(MessageType.RENAME, (client, newName: string) => {
			const player = this.state.players.get(client.sessionId);
			if (!player || player.name === newName) return;

			let flag = true;
			this.state.players.forEach(player => {
				if (player.name === newName && player.id !== client.sessionId) {
					flag = false;
				}
			});

			if (!flag) {
				client.error(ExtendErrorCode.BAD_REQUEST, "The name is already is already being used")
			}
			else {
				player.name = newName;
				this.state.messages = new ArraySchema(...this.state.messages.map(message => {
					message.senderName = message.senderId === player.id ? newName : message.senderName;
					return message;
				}));
			}
		});

		this.onMessage(MessageType.UPDATE_READINESS, (client) => {
			const player = this.state.players.get(client.sessionId);
			if (!player) return;

			player.isReady = !player.isReady;
		});

		this.onMessage(MessageType.START_GAME, (client) => {
			if (client.sessionId !== this.state.hostId) {
				client.error(ExtendErrorCode.UNAUTHORIZED, "You are not authorized to do this action");
				return;
			}

			this.state.status = RoomStatus.IN_GAME;
		});

		this.onMessage(MessageType.GET_JAILED, (client) => {
			const player = this.state.players.get(client.sessionId);
			if (!player) return;

			player.inJail = true;
			player.jailTurns = 3;
		});

		this.onMessage(MessageType.DECLARE_BANKRUPTCY, (client, { reason, creditorId }: { reason: BankruptReason, creditorId?: string }) => {
			const bankruptedPlayer = this.state.players.get(client.sessionId);
			if (!bankruptedPlayer) return;

			bankruptedPlayer.isBankrupt = true;
			const playerProperties = this.state.properties.values().toArray().filter(property => property.state.ownerId === bankruptedPlayer.id);
			const playerRailroads = this.state.railroads.values().toArray().filter(railroad => railroad.state.ownerId === bankruptedPlayer.id);
			const playerUtilities = this.state.utilities.values().toArray().filter(utility => utility.state.ownerId === bankruptedPlayer.id);
			if (reason === BankruptReason.BANK) {
				playerProperties.forEach(property => {
					const propertyRef = this.state.properties.get(property.id);
					propertyRef.state.ownerId = undefined;
					propertyRef.state.houses = 0;
					propertyRef.state.isMortgaged = false;
					this.state.propertiesToAuction.push(property.id);
				});
				playerRailroads.forEach(railroad => {
					const railroadRef = this.state.railroads.get(railroad.id);
					railroadRef.state.ownerId = undefined;
					railroadRef.state.houses = 1;
					railroadRef.state.isMortgaged = false;
					this.state.propertiesToAuction.push(railroad.id);
				});
				playerUtilities.forEach(utility => {

				});
				this.state.status = RoomStatus.AUCTION;
			}
			else {
				const creditor = this.state.players.get(creditorId);
				if (!creditor) return;

				playerProperties.forEach(property => {
					const propertyRef = this.state.properties.get(property.id);
					propertyRef.state.ownerId = creditorId;

					// Mortgage logics

				});
			}
		});

		this.roomStatusCheckInterval = this.clock.setInterval(() => {
			let bankruptedPlayers = 0;
			this.state.players.forEach(player => {
				if (player.isBankrupt) {
					bankruptedPlayers++;
				}
			});

			if (this.state.status !== RoomStatus.LOBBY && (bankruptedPlayers === this.clients.length - 1 || this.clients.length === 1)) {
				this.state.status = RoomStatus.ENDED;
			}
		}, 1000);
	}

	onAuth(_client: Client, options: any, context: AuthContext) {
		if (this.password && options?.password !== this.password) {
			throw new Error("Invalid password");
		}
		return { ipAddress: context.ip };
	}

	onJoin(client: Client<any>, options?: any, auth?: any): void | Promise<any> {
		const newPlayer = new Player();
		newPlayer.id = client.sessionId;
		newPlayer.name = options?.name ?? `Player_${client.sessionId.slice(0, 4)}`;
		newPlayer.isReady = !Boolean(this.state.hostId);

		this.state.hostId ??= newPlayer.id;
		this.state.players.set(newPlayer.id, newPlayer);
	}

	onLeave(client: Client<any>, code?: CloseCode): void | Promise<any> {
		const player = this.state.players.get(client.sessionId);
		if (!player) return;

		if (code === CloseCode.CONSENTED) {
			if (player.id === this.state.hostId) {
				const playerIds = this.state.players.keys().toArray().filter(id => id !== player.id);
				if (playerIds.length >= 1) {
					this.state.hostId = playerIds[0];
					this.state.players.get(playerIds[0]).isReady = true;
				}
			}
			this.state.players.delete(player.id);
		}
		else {
			this.allowReconnection(client, 60).catch(() => {
				client.error(HttpResponse.INTERNAL_SERVER_ERROR, "Failed to reconnect");
			});
		}
	}

	onReconnect(client: Client<any>): void | Promise<any> {
		console.log(`Client (ID: ${client.sessionId}) reconnected!`);
	}

	onDispose(): void | Promise<any> {
		this.roomStatusCheckInterval.clear();
		console.log(`Room ${this.roomId} is disposing...`);
	}
	
};