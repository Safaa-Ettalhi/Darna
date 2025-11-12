import { DataBase } from "./db.js";

export class ConnectionManager {
    #db;
    #retries = 5;

    constructor (url) {
        this.#db = new DataBase(url);
    }

    async connectWithRetry () {
        try {
            await this.#db.connect();
        }catch (e) {
            await this.#db.disconnect();
            console.log("MongoDB disconnected! Attempting to reconnect...");
            setTimeout(async () => {
                if (this.#retries > 0) {
                    await this.#db.connect();
                    this.#retries--;
                }
            }, 5000);
        }
    }
}