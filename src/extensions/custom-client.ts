import { ActivityType, Client, ClientOptions, Presence, SweeperOptions } from 'discord.js';

export class CustomClient extends Client {
    constructor(clientOptions: ClientOptions) {
        const sweeperOptions: SweeperOptions = {
            messages: {
                interval: 3600, //1h
                lifetime: 1800 //.5h
            },
            users: {
                interval: 3600 * 2, //2h
                filter: () => user => user.bot && user.id !== this.user?.id
            },
            threads: {
                interval: 3600 * 24, //24h
                lifetime: 3600 * 24 * 7 //1w
            },
        };

        super({
            ...clientOptions,
            sweepers: sweeperOptions
        });
    }

    public setPresence(
        type: Exclude<ActivityType, ActivityType.Custom>,
        name: string,
        url: string
    ): Presence {
        return this.user?.setPresence({
            activities: [
                {
                    type,
                    name,
                    url,
                },
            ],
        });
    }
}