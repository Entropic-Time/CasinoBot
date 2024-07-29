import {
    APIApplicationCommandBasicOption,
    APIApplicationCommandOptionChoice,
    ApplicationCommandOptionType,
    ApplicationCommandType,
    Locale,
    LocalizationMap,
    PermissionFlagsBits,
    PermissionsBitField,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';

import { Language } from '../models/enum-helpers/index.js';
import { Lang } from '../services/index.js';
import { PermissionNeeded, OptionType, CommandCategory } from '../enums/index.js';

//needs work
export class ChoiceJSON {
    value: string; //key
    name: string;
    name_localizations: { [value: string]: string };

    constructor(
        value: string,
        name: string,
    ) {
        this.value = value;
        this.name = name;
        this.name_localizations = null;
    }

    generateChoice(): APIApplicationCommandOptionChoice<string> {
        return {
            value: this.value,
            name: this.name,
            name_localizations: this.name_localizations,
        }
    }

}

export class OptionJSON {
    key: string;
    name: string;
    type: OptionType;
    required: boolean;
    choices?: ChoiceJSON[];
    name_localizations: { [key: string]: string };
    description_localizations: { [key: string]: string };


    constructor(
        key: string,
        name: string,
        type: OptionType,
        required: boolean,
        choices: ChoiceJSON[]
    ) {
        this.key = key;
        this.name = name;
        this.type = type;
        this.required = required;
        this.choices = choices;
        this.name_localizations = {}
        this.description_localizations = {}
    }

    getChoiceByValue(value: string): ChoiceJSON {
        if (this.choices.length < 1)
            return null;
        let choice = this.choices.find(chc => chc.value === value || chc.name === value)
        return choice
    }

    getChoiceNameByValue(value: string): string {
        let choice = this.getChoiceByValue(value);
        if (choice == null) return null;
        return choice.name;
    }


    getOptionCorrespondent(returnEnum: boolean): any {
        switch (this.type) {
            case OptionType.SUBCOMMAND:
                if (returnEnum) return ApplicationCommandOptionType.Subcommand
                else return Lang.getRef('argumentTypes.subcommand', Language.Default);
            case OptionType.SUBCOMMANDGROUP:
                if (returnEnum) return ApplicationCommandOptionType.SubcommandGroup
                else return Lang.getRef('argumentTypes.subcommandGroup', Language.Default);
            case OptionType.STRING:
                if (returnEnum) return ApplicationCommandOptionType.String
                else return Lang.getRef('argumentTypes.string', Language.Default);
            case OptionType.INTEGER:
                if (returnEnum) return ApplicationCommandOptionType.Integer
                else return Lang.getRef('argumentTypes.integer', Language.Default);
            case OptionType.BOOLEAN:
                if (returnEnum) return ApplicationCommandOptionType.Boolean
                else return Lang.getRef('argumentTypes.boolean', Language.Default);
            case OptionType.USER:
                if (returnEnum) return ApplicationCommandOptionType.User
                else return Lang.getRef('argumentTypes.user', Language.Default);
            case OptionType.CHANNEL:
                if (returnEnum) return ApplicationCommandOptionType.Channel
                else return Lang.getRef('argumentTypes.channel', Language.Default);
            case OptionType.ROLE:
                if (returnEnum) return ApplicationCommandOptionType.Role
                else return Lang.getRef('argumentTypes.role', Language.Default);
            case OptionType.MENTIONABLE:
                if (returnEnum) return ApplicationCommandOptionType.Mentionable
                else return Lang.getRef('argumentTypes.mentionable', Language.Default);
            case OptionType.NUMBER:
                if (returnEnum) return ApplicationCommandOptionType.Number
                else return Lang.getRef('argumentTypes.number', Language.Default);
            case OptionType.ATTACHMENT:
                if (returnEnum) return ApplicationCommandOptionType.Attachment
                else return Lang.getRef('argumentTypes.attachment', Language.Default);
            case OptionType.CHOICE:
                if (returnEnum) return ApplicationCommandOptionType.String
                else return Lang.getRef('argumentTypes.choice', Language.Default);
            default:
                return '';
        }
    }

    generateOption(): APIApplicationCommandBasicOption {
        return {
            name: this.name,
            name_localizations: this.name_localizations,
            description: this.getOptionCorrespondent(false),
            description_localizations: this.description_localizations,
            type: this.getOptionCorrespondent(true),
            choices: this.choices.map(choice => choice.generateChoice()),
            required: this.required
        };
    }
}

export class CommandJSON {
    key: string;
    name: string;
    description: string;
    permissionNeeded: PermissionNeeded;
    category: CommandCategory;
    dataEmbed: string;
    options: OptionJSON[];
    name_localizations: { [key: string]: string };
    description_localizations: { [key: string]: string };


    constructor(
        key: string,
        name: string,
        description: string,
        permissionNeeded: PermissionNeeded,
        category: CommandCategory,
        dataEmbed: string,
        jsonOptions: OptionJSON[]
    ) {
        this.key = key;
        this.name = name;
        this.description = description;
        this.permissionNeeded = permissionNeeded;
        this.category = category;
        this.dataEmbed = dataEmbed;
        this.options = jsonOptions;
        this.name_localizations = {}
        this.description_localizations = {}
    }

    getOptionByKey(key: string): OptionJSON {
        return this.options.find(opt => opt.key === key);
    }

    getOptionNameByKey(key: string): string {
        let opt = this.getOptionByKey(key);
        if (opt == null) return null;
        return opt.name;
    }

    getNthOptionByType(type: OptionType, n: number): OptionJSON {
        if (this.options.length < n)
            return null;
        let possibleOptions = this.options.filter(opt => opt.type === type);
        if (possibleOptions.length < n)
            return null;
        return possibleOptions[n - 1];
    }

    getNthOptionNameByType(type: OptionType, n: number): string {
        let opt = this.getNthOptionByType(type, n);
        if (opt == null) return null;
        return opt.name;
    }

    getFirstOptionNameByType(type: OptionType): string {
        return this.getNthOptionNameByType(type, 1);
    }

    getPermissions(): bigint {
        switch (this.permissionNeeded) {
            case PermissionNeeded.BOT_DEVELOPER:
                return PermissionsBitField.resolve([
                ])
            case PermissionNeeded.BOT_ADMIN:
                return PermissionsBitField.resolve([
                ])
            case PermissionNeeded.BOT_TRANSLATOR:
                return PermissionsBitField.resolve([
                ])
            case PermissionNeeded.SERVER_ADMIN:
                return PermissionsBitField.resolve([
                    PermissionFlagsBits.Administrator,
                    PermissionFlagsBits.UseApplicationCommands
                ])
            case PermissionNeeded.SERVER_MOD:
                return PermissionsBitField.resolve([
                    PermissionFlagsBits.ManageGuild,
                    PermissionFlagsBits.ManageChannels,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.UseApplicationCommands
                ])
            case PermissionNeeded.NONE:
                return PermissionsBitField.resolve([
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.UseApplicationCommands
                ])
            case PermissionNeeded.ERROR:
                return PermissionsBitField.resolve([
                    PermissionFlagsBits.Administrator
                ])
            default:
                return PermissionsBitField.resolve([
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.UseApplicationCommands
                ]);
        }
    }

    generateMetadata(): RESTPostAPIChatInputApplicationCommandsJSONBody {
        const options = this.options.map(opt => {
            return opt.generateOption()
        });

        return {
            type: ApplicationCommandType.ChatInput,
            name: this.name,
            name_localizations: this.name_localizations,
            description: this.description,
            description_localizations: this.description_localizations,
            dm_permission: true,
            default_member_permissions: this.getPermissions().toString(),
            options: options,
        };
    }
}

function jsonToCommand(command: any): CommandJSON {
    const opts = command.options.map((opt: any) => {
        const choices = opt.choices?.map((chc: any) => new ChoiceJSON(chc.value, chc.name)) || [];
        return new OptionJSON(opt.key, opt.name, opt.type, opt.required || false, choices);
    });

    const permissionNeeded = command.permissionNeeded || PermissionNeeded.ERROR;
    const category = command.category || CommandCategory.ERROR;

    return new CommandJSON(command.key, command.name, command.description, permissionNeeded, category, command.dataEmbed, opts);
}

function generateChatCommandMetadata(chatCommandsArr: CommandJSON[]) {
    const metadata: {
        [command: string]: RESTPostAPIChatInputApplicationCommandsJSONBody;
    } = {};

    chatCommandsArr.forEach(command => {
        metadata[command.name] = command.generateMetadata();
    });

    return metadata;
}

/*Doesn't even matter till I get another file*/
function generateChatCommandMetadataWithLocalizationMap(localizationMap: { [key: string]: any }) {
    let metadata: { [command: string]: RESTPostAPIChatInputApplicationCommandsJSONBody }
        = generateChatCommandMetadata(Lang.getRawData('commands.chatInput', Language.Default).map(jsonToCommand));

    for (const [langCodeString, localizedString] of Object.entries(localizationMap)) {
        const commands = localizedString.map(jsonToCommand);
        commands.forEach((command: CommandJSON) => {
            metadata[command.name].name_localizations[langCodeString] = command.name;
            metadata[command.name].description_localizations[langCodeString] = command.description;

            command.options.forEach((jsonOption: OptionJSON) => {
                let findOption = metadata[command.name].options.find(opt => opt.name === jsonOption.name);
                if (findOption) {
                    findOption.name_localizations[langCodeString] = jsonOption.name;
                    findOption.description_localizations[langCodeString] = jsonOption.getOptionCorrespondent(false);

                    // argument.choices.forEach((choice: Choice) => {
                    //     metadata[command.title].options.find(opt => opt.name === argument.name).
                    //     const option = findArgument..find(opt => opt.name === argument.name);
                    // }
                }
            });
        });
    }
    return metadata;
}

export const ChatCommandMetadataArgsWithLocalizationMap: {
    [command: string]: RESTPostAPIChatInputApplicationCommandsJSONBody;
} = generateChatCommandMetadataWithLocalizationMap(
    Lang.getRawLocalizationMap('commands.chatInput')
);

export const ChatCommandMetadataArgs: {
    [command: string]: RESTPostAPIChatInputApplicationCommandsJSONBody;
} = generateChatCommandMetadata(
    Lang.getRawData('commands.chatInput', Language.Default).map(jsonToCommand)
);

export const ChatCommandMetadataArgsRaw: {
    [command: string]: CommandJSON;
} = Lang.getRawData('commands.chatInput', Language.Default)
    .reduce((acc: { [command: string]: CommandJSON }, rawCommand: any) => {
        const command = jsonToCommand(rawCommand);
        acc[command.key] = command;
        return acc;
    }, {});