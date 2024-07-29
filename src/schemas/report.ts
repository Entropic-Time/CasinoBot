import SQLite, { RunResult } from 'better-sqlite3';

interface ReportData {
    id?: number;
    userId: string;
    type: string;
    description: string;
    status: string;
    createdAt: number;
    updatedAt: number;
}

export class ReportSchema {
    private readonly dbPath: string = './database/reports.sqlite';
    private readonly tableName: string = 'REPORTS';
    private database: SQLite.Database;
    private createReportStmt: SQLite.Statement<ReportData, RunResult>;
    private getReportByIdStmt: SQLite.Statement<[number], ReportData>;
    private getReportsByUserIdStmt: SQLite.Statement<[string], ReportData>;
    private updateReportStatusStmt: SQLite.Statement<[string, number, number], RunResult>;

    constructor(database: SQLite.Database = null, dbPath: string = './database/reports.sqlite') {
        this.dbPath = dbPath;
        this.database = (database == null) ? new SQLite(this.dbPath) : database;
        this.setup();
    }

    private setup(): void {
        this.createTableIfNotExists();
        this.prepareStatements();
    }

    private createTableIfNotExists(): void {
        const tableExists = this.database.prepare(
            `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='${this.tableName}';`
        ).get()['count'] > 0;

        if (!tableExists) {
            this.database.prepare(`
                CREATE TABLE ${this.tableName} (
                    ID INTEGER PRIMARY KEY AUTOINCREMENT,
                    USER_ID TEXT,
                    TYPE TEXT,
                    DESCRIPTION TEXT,
                    STATUS TEXT,
                    CREATED_AT INTEGER,
                    UPDATED_AT INTEGER
                );`).run();
            this.database.prepare(`CREATE UNIQUE INDEX UNQ_IDX_REPORTS ON ${this.tableName} (ID);`).run();
            this.database.pragma('synchronous = 1');
            this.database.pragma('journal_mode = wal');
        }
    }

    private prepareStatements(): void {
        this.createReportStmt = this.database.prepare(`
            INSERT INTO ${this.tableName} (USER_ID, TYPE, DESCRIPTION, STATUS, CREATED_AT, UPDATED_AT)
            VALUES (@userId, @type, @description, @status, @createdAt, @updatedAt);
        `);
        this.getReportByIdStmt = this.database.prepare(`SELECT * FROM ${this.tableName} WHERE ID = ?`);
        this.getReportsByUserIdStmt = this.database.prepare(`SELECT * FROM ${this.tableName} WHERE USER_ID = ?`);
        this.updateReportStatusStmt = this.database.prepare(`
            UPDATE ${this.tableName}
            SET STATUS = ?, UPDATED_AT = ?
            WHERE ID = ?;
        `);
    }

    public createReport(reportData: ReportData): RunResult {
        return this.createReportStmt.run(reportData);
    }

    public getReportById(id: number): ReportData {
        return this.getReportByIdStmt.get(id);
    }

    public getReportsByUserId(userId: string): ReportData[] {
        return this.getReportsByUserIdStmt.all(userId) as ReportData[];
    }

    public updateReportStatus(id: number, status: string): RunResult {
        return this.updateReportStatusStmt.run(status, Date.now(), id);
    }
}