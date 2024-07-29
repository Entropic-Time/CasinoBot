// PermissionNeeded may need to go in place of CommandCategory
export enum PermissionNeeded {
    ERROR = -1,
    NONE = 1,
    SERVER_MOD = 2,
    SERVER_ADMIN = 3,
    BOT_TRANSLATOR = 4,
    BOT_ADMIN = 5,
    BOT_DEVELOPER = 6
}

export enum OptionType {
    ERROR = -1,
    SUBCOMMAND = 1,
    SUBCOMMANDGROUP = 2,
    STRING = 3,
    INTEGER = 4,
    BOOLEAN = 5,
    USER = 6,
    CHANNEL = 7,
    ROLE = 8,
    MENTIONABLE = 9,
    NUMBER = 10,
    ATTACHMENT = 11,
    CHOICE = 12
}

export enum CommandCategory {
    ERROR = -1,
    CALLS = 1,
    GAMES = 2,
    UPGRADES = 3,
    PROMOTIONALS = 4,
    MISC = 5,
    SERVER_MOD = 6,
    BOT_TRANSLATOR = 7,
    BOT_ADMIN = 8,
    BOT_DEVELOPER = 9
}
