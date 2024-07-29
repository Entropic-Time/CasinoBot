import { Client, User } from 'discord.js';
import { existsSync, mkdirSync } from 'fs';
import SQLite, { RunResult } from 'better-sqlite3';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let Static = require('../../config/static.json');

export interface UserData {
    id: string;
    userName: string;
    balance: number;
    bank: number;
    level: number;
    luck: number;
    occupation: string;
    achievements: string;
    collectDaily: string; // ISO 8601 date string
    collectVote: string; // ISO 8601 date string
    dailiesCollected: number;
    votesCollected: number;
}

interface DailyUpdate {
    interestRate: number;
}

export class UserSchema {
    private readonly dbPath: string = './database/users.sqlite';
    private readonly tableName: string = 'USERS';
    private database: SQLite.Database;
    private getUserStmt: SQLite.Statement<[string], UserData>;
    private setUserStmt: SQLite.Statement<UserData, void>;
    private updateDailyAllUserStmt: SQLite.Statement<DailyUpdate, RunResult>;
    private getTopIdsByBalance: SQLite.Statement<[number], UserData>;
    private getTopIdsByBalanceAndBank: SQLite.Statement<[number], UserData>;
    private deleteUser: SQLite.Statement<[string], RunResult>;

    constructor(database: SQLite.Database = null, dbPath: string = './database/users.sqlite') {
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
                    USER_NAME TEXT,
                    BALANCE FLOAT,
                    BANK FLOAT,
                    LEVEL FLOAT,
                    LUCK FLOAT,
                    OCCUPATION TEXT,
                    ACHIEVEMENTS TEXT,
                    COLLECT_DAILY TEXT,
                    COLLECT_VOTE TEXT,
                    DAILIES_COLLECTED INTEGER,
                    VOTES_COLLECTED INTEGER
                );`).run();
            this.database.prepare(`CREATE UNIQUE INDEX UNQ_IDX_USERS ON ${this.tableName} (ID);`).run();
            this.database.pragma('synchronous = 1');
            this.database.pragma('journal_mode = wal');
        }
    }

    private prepareStatements(): void {
        this.getUserStmt = this.database.prepare(`SELECT * FROM ${this.tableName} WHERE ID = ?`);
        this.setUserStmt = this.database.prepare(`
            INSERT OR REPLACE INTO ${this.tableName} (
                ID, USER_NAME, BALANCE, BANK, LEVEL, LUCK, OCCUPATION, ACHIEVEMENTS, COLLECT_DAILY, COLLECT_VOTE, DAILIES_COLLECTED, VOTES_COLLECTED 
            ) VALUES (
                @id, @userName, @balance, @bank, @level, @luck, @occupation, @achievements, @collectDaily, @collectVote, @dailiesCollected, @votesCollected
            );
        `);
        this.updateDailyAllUserStmt = this.database.prepare(`
            UPDATE ${this.tableName}
            SET BANK = BANK * @interestRate;
        `);
        this.getTopIdsByBalance = this.database.prepare(`
            SELECT * FROM ${this.tableName}
            ORDER BY BALANCE DESC
            LIMIT ?;
        `);
        this.getTopIdsByBalanceAndBank = this.database.prepare(`
            SELECT * FROM ${this.tableName}
            ORDER BY (BALANCE + BANK) DESC
            LIMIT ?;
        `);
        this.deleteUser = this.database.prepare(`
            DELETE FROM ${this.tableName}
            WHERE ID = ?;
        `);
    }

    private convertToUserData(dbUserData: any): UserData {
        return {
            id: dbUserData.ID,
            userName: dbUserData.USER_NAME,
            balance: dbUserData.BALANCE,
            bank: dbUserData.BANK,
            level: dbUserData.LEVEL,
            luck: dbUserData.LUCK,
            occupation: dbUserData.OCCUPATION,
            achievements: dbUserData.ACHIEVEMENTS,
            collectDaily: dbUserData.COLLECT_DAILY,
            collectVote: dbUserData.COLLECT_VOTE,
            dailiesCollected: dbUserData.DAILIES_COLLECTED,
            votesCollected: dbUserData.VOTES_COLLECTED,
        };
    }

    public getOrCreateUserData(userId: string, username: string): UserData {
        try {
            let userData = this.getUserStmt.get(userId);
            if (!userData) {
                userData = this.createDefaultUserData(userId, username);
                this.setUserStmt.run(userData);
            } else {
                userData = this.convertToUserData(userData);
            }
            return userData;
        } catch (error) {
            console.error('Error getting user data:', error);
            throw error;
        }
    }

    public resetOrCreateUserData(userId: string, username: string): UserData {
        try {
            let userData = this.createDefaultUserData(userId, username);
            this.setUserStmt.run(userData);
            return userData;
        } catch (error) {
            console.error('Error resetting user data:', error);
            throw error;
        }
    }

    public deleteUserData(user: User): RunResult {
        try {
            return this.deleteUser.run(user.id);
        } catch (error) {
            console.error('Error deleting user data:', error);
            throw error;
        }
    }

    public getLeaderBoardByBalance(limit: number = 10): UserData[] {
        try {
            const usersData = this.getTopIdsByBalance.all(limit) as UserData[];
            return usersData.map(this.convertToUserData);
        } catch (error) {
            console.error('Error getting leaderboard data:', error);
            throw error;
        }
    }

    public getLeaderBoardByAll(limit: number = 10): UserData[] {
        try {
            const usersData = this.getTopIdsByBalanceAndBank.all(limit) as UserData[];
            return usersData.map(this.convertToUserData);
        } catch (error) {
            console.error('Error getting all leaderboard data:', error);
            throw error;
        }
    }

    public setUserData(userData: UserData): RunResult {
        try {
            return this.setUserStmt.run(userData);
        } catch (error) {
            console.error('Error setting data:', error);
            throw error;
        }
    }

    public dailyResetUpdate(interestRate: number = Math.random() * 0.0001 + 1): RunResult {
        try {
            const dailyUpdate = { interestRate: interestRate };
            return this.updateDailyAllUserStmt.run(dailyUpdate);
        } catch (error) {
            console.error('Error updating daily reset:', error);
            throw error;
        }
    }

    private createDefaultUserData(userId: string, username: string): UserData {
        const now = new Date(0).toISOString();
        return {
            id: userId,
            userName: username,
            balance: Static.startBalance,
            bank: 0.00,
            level: 1.000,
            luck: 1.00,
            occupation: JSON.stringify({ name: "None", multiplier: 0 }),
            achievements: JSON.stringify([]),
            collectDaily: now,
            collectVote: now,
            dailiesCollected: 0,
            votesCollected: 0
        };
    }
}
