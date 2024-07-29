import { existsSync, mkdirSync } from 'fs';
import SQLite, { RunResult } from 'better-sqlite3';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let Static = require('../../config/static.json');

export interface GlobalSettings {
    key: string;
    value: string;
}

export class GlobalSettingsSchema {
    private readonly dbPath: string = './database/global_settings.sqlite';
    private readonly tableName: string = 'GLOBAL_SETTINGS';
    private database: SQLite.Database;
    private getSettingStmt: SQLite.Statement<[string], GlobalSettings>;
    private setSettingStmt: SQLite.Statement<GlobalSettings, void>;
    private getAllSettingsStmt: SQLite.Statement<[], GlobalSettings>;

    constructor(database: SQLite.Database = null, dbPath: string = './database/global_settings.sqlite') {
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
                    KEY TEXT PRIMARY KEY,
                    VALUE TEXT
                );`).run();
            this.database.prepare(`CREATE UNIQUE INDEX UNQ_IDX_GLOBAL_SETTINGS ON ${this.tableName} (KEY);`).run();
            this.database.pragma('synchronous = 1');
            this.database.pragma('journal_mode = wal');
        }
    }

    private prepareStatements(): void {
        this.getSettingStmt = this.database.prepare(`SELECT * FROM ${this.tableName} WHERE KEY = ?`);
        this.setSettingStmt = this.database.prepare(`
            INSERT OR REPLACE INTO ${this.tableName} (
                KEY, VALUE
            ) VALUES (
                @key, @value
            );
        `);
        this.getAllSettingsStmt = this.database.prepare(`SELECT * FROM ${this.tableName}`);
    }

    private convertToGlobalSettings(dbSettingData: any): GlobalSettings {
        return {
            key: dbSettingData.KEY,
            value: dbSettingData.VALUE
        };
    }

    public getSetting(key: string): string | null {
        try {
            const setting = this.getSettingStmt.get(key);
            return setting ? this.convertToGlobalSettings(setting).value : null;
        } catch (error) {
            console.error('Error getting setting:', error);
            throw error;
        }
    }

    public setSetting(key: string, value: string): RunResult {
        try {
            const setting: GlobalSettings = { key, value };
            return this.setSettingStmt.run(setting);
        } catch (error) {
            console.error('Error setting setting:', error);
            throw error;
        }
    }

    public getAllSettings(): GlobalSettings[] {
        try {
            const settings = this.getAllSettingsStmt.all() as GlobalSettings[];
            return settings.map(this.convertToGlobalSettings);
        } catch (error) {
            console.error('Error getting all settings:', error);
            throw error;
        }
    }
}
