import { Guild } from 'discord.js';
import { existsSync, mkdirSync } from 'fs';
import SQLite, { RunResult } from 'better-sqlite3';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let Static = require('../../config/static.json');

export interface GuildData {
    id: string;
    guildName: string;
    prefix: string;
    countChannelId: string;
    recentUser: string;
    usersIds: string;
    nextNumber: number;
    topNumber: number;
    lastPlayed: string;
}

export class GuildSchema {
    private readonly dbPath: string = './database/guilds.sqlite';
    private readonly tableName: string = 'GUILDS';
    private database: SQLite.Database;
    private getGuildStmt: SQLite.Statement<[string], GuildData>;
    private setGuildStmt: SQLite.Statement<GuildData, void>;

    constructor(database: SQLite.Database = null, dbPath: string = './database/guilds.sqlite') {
        this.dbPath = dbPath;
        this.makeDatabaseDir();
        this.database = (database == null) ? new SQLite(this.dbPath) : database;
        this.setup();
    }

    private makeDatabaseDir(): void {
        try {
            if (!existsSync('./database')) {
                mkdirSync('./database');
            }
        } catch (error) {
            console.error('Error making database dir:', error);
            throw error;
        }
    }

    private setup(): void {
        try {
            this.createTableIfNotExists();
            this.prepareStatements();
        } catch (error) {
            console.error('Error setting up database:', error);
            throw error;
        }
    }

    private createTableIfNotExists(): void {
        const tableExists = this.database.prepare(
            `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='${this.tableName}';`
        ).get()['count'] > 0;

        if (!tableExists) {
            this.database.prepare(`
                CREATE TABLE ${this.tableName} (
                    ID TEXT PRIMARY KEY,
                    GUILD_NAME TEXT,
                    PREFIX TEXT,
                    COUNT_CHANNEL_ID TEXT,
                    RECENT_USER TEXT,
                    USERS_IDS TEXT,
                    NEXT_NUMBER INTEGER,
                    TOP_NUMBER INTEGER,
                    LAST_PLAYED TEXT
                );`).run();
            this.database.prepare(`CREATE UNIQUE INDEX UNQ_IDX_GUILDS ON ${this.tableName} (ID);`).run();
            this.database.pragma('synchronous = 1');
            this.database.pragma('journal_mode = wal');
        }
    }

    private prepareStatements(): void {
        this.getGuildStmt = this.database.prepare(`SELECT * FROM ${this.tableName} WHERE ID = ?`);
        this.setGuildStmt = this.database.prepare(`
            INSERT OR REPLACE INTO ${this.tableName} (
                ID, GUILD_NAME, PREFIX, COUNT_CHANNEL_ID, RECENT_USER, USERS_IDS, NEXT_NUMBER, TOP_NUMBER, LAST_PLAYED
            ) VALUES (
                @id, @guildName, @prefix, @countChannelId, @recentUser, @usersIds, @nextNumber, @topNumber, @lastPlayed
            );
        `);
    }

    public getOrCreateGuildData(guildId: string, guildName: string): GuildData {
        try {
            let guildData = this.getGuildStmt.get(guildId);
            if (!guildData) {
                guildData = this.createDefaultGuildData(guildId, guildName);
                this.setGuildStmt.run(guildData);
            }
            return guildData;
        } catch (error) {
            console.error('Error getting guild data:', error);
            throw error;
        }
    }

    private createDefaultGuildData(guildId: string, guildName: string): GuildData {
        return {
            id: guildId,
            guildName: guildName,
            prefix: Static.defaultPrefix,
            countChannelId: '',
            recentUser: '',
            usersIds: JSON.stringify([]),
            nextNumber: 1,
            topNumber: 10,
            lastPlayed: new Date().toISOString()
        };
    }
}
