import { CronJob } from 'cron';

export class TimeUtils {

    public static differenceInTime(startTime: Date, endTime: Date, includeTimePrefixes: boolean = true): string {
        const diff = endTime.getTime() - startTime.getTime();

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if (includeTimePrefixes) return `${days > 0 ? (days.toString().padStart(2, '0')+'d') : ''} ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
        return `${days > 0 ? (days.toString().padStart(2, '0')) : ''} ${hours.toString().padStart(2, '0')} ${minutes.toString().padStart(2, '0')} ${seconds.toString().padStart(2, '0')}`;
    }

    public static displayInTime(diff: number, includeTimePrefixes: boolean = true): string {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if (includeTimePrefixes) return `${days > 0 ? (days.toString().padStart(2, '0')+'d') : ''} ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
        return `${days > 0 ? (days.toString().padStart(2, '0')) : ''} ${hours.toString().padStart(2, '0')} ${minutes.toString().padStart(2, '0')} ${seconds.toString().padStart(2, '0')}`;
    }


    public static getTimeUntilNextCron(cronString: string, includeTimePrefixes: boolean = false): string {
        const now = new Date();
    
        const job = new CronJob(cronString, () => {}, null, true);
        const nextRun = job.nextDate().toJSDate();
    
        return TimeUtils.differenceInTime(now, nextRun);
    }

    public static isValidCronString(cronString: string): boolean {
        try {
            new CronJob(cronString, () => {});
            return true;
        } catch (e) {
            return false;
        }
    }
}