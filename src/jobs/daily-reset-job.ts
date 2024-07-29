import { createRequire } from 'node:module';

import { Job } from './index.js';
import { BotSite } from '../models/config-models.js';
import { HttpService, Lang, Logger } from '../services/index.js';
import { GlobalSettingsSchema, UserSchema } from '../schemas/index.js';

const require = createRequire(import.meta.url);
let BotSites: BotSite[] = require('../../config/bot-sites.json');
let Config = require('../../config/config.json');
let Logs = require('../../lang/logs.json');

export class DailyResetJob extends Job {
    public name = 'Daily Reset';
    public schedule: string = Config.jobs.dailyReset.schedule;
    public log: boolean = Config.jobs.dailyReset.log;
    public runOnce: boolean = Config.jobs.dailyReset.runOnce;
    public initialDelaySecs: number = Config.jobs.dailyReset.initialDelaySecs;

    private userSchema: UserSchema;
    private globalSchema: GlobalSettingsSchema;

    constructor() {
        super();
        this.userSchema = new UserSchema();
        this.globalSchema = new GlobalSettingsSchema();
    }

    public async run(): Promise<void> {
        try {
            const interestRate = Math.random() * 0.0001 + 1;
            this.globalSchema.setSetting('LAST_INTEREST_RATE', interestRate.toString());
            this.userSchema.dailyResetUpdate(interestRate);
            Logger.info(`${Logs.info.dailyResetCompleted} with interest rate: ${interestRate}`);
        } catch (error) {
            Logger.error('Error in DailyResetJob:', error);
        }
    }
}
