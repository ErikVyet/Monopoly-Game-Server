import { defineServer, defineRoom, monitor, playground, createRouter, createEndpoint, matchMaker, LobbyRoom } from "colyseus";
import { GameRoom } from "./rooms/GameRoom.js";
import { HttpResponse } from "./constants/Http.js";
import { env } from "process";

matchMaker.controller.getCorsHeaders = function (req) {
    return {
        "Access-Control-Allow-Origin": env.CLIENT_URL,
        "Access-Control-Allow-Credentials": "true",
        "Vary": "Origin",
    }
}

const server = defineServer({

    /**
     * Define your room handlers:
     */
    rooms: {
        room: defineRoom(GameRoom).enableRealtimeListing(),
        lobby: defineRoom(LobbyRoom)
    },

    /**
     * Experimental: Define API routes. Built-in integration with the "playground" and SDK.
     *
     * Usage from SDK:
     *   client.http.get("/api/hello").then((response) => {})
     *
     */
    routes: createRouter({
        health: createEndpoint("/api/health", { method: "GET" }, async (context) => {
            return {
                status: HttpResponse.OK,
                message: "OK",
            };
        }),
    }),

    /**
     * Bind your custom express routes here:
     * Read more: https://expressjs.com/en/starter/basic-routing.html
     */
    express: (app) => {
        app.get("/hi", (req, res) => {
            res.send("It's time to kick ass and chew bubblegum!");
        });

        /**
         * Use @colyseus/monitor
         * If you expose it in production, make sure to protect it with a password:
         * https://docs.colyseus.io/tools/monitoring#password-protection
         */
        if (process.env.NODE_ENV !== "production") {
            app.use("/monitor", monitor());
        }

        /**
         * Use @colyseus/playground
         * (It is not recommended to expose this route in a production environment)
         */
        if (process.env.NODE_ENV !== "production") {
            app.use("/", playground());
        }
    }
});

export default server;