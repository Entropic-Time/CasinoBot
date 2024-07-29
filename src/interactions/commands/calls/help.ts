import { ChatInputCommandInteraction, EmbedBuilder, PermissionsString } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';
import { EventData } from '../../../models/internal-models.js';
import { InteractionUtils } from '../../../utils/index.js';
import { CommandJSON, ChoiceJSON, ChatCommandMetadataArgsRaw, Command, CommandDeferType } from '../../index.js';
import { CommandCategory, PermissionNeeded } from '../../../enums/common.js';
import { createRequire } from 'node:module';
import { Lang } from '../../../services/lang.js';

const require = createRequire(import.meta.url);
const Config = require('../../../../config/config.json');

export class HelpCommand implements Command {
    public names = [ChatCommandMetadataArgsRaw['help'].name];
    public cooldown = new RateLimiter(1, 5000);
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    private commands: CommandJSON[] = Object.values(ChatCommandMetadataArgsRaw);

    private readonly OPTIONS = {
        CALLS: 'calls',
        GAMES: 'games',
        UPGRADES: 'upgrades',
        PROMOTIONALS: 'promotionals',
        SERVER_MOD: 'serverMod',
        BOT_TRANSLATOR: 'botTranslator',
        BOT_ADMIN: 'botAdmin',
        BOT_DEVELOPER: 'botDeveloper',
        SUPPORT: 'support',
        USAGE: 'usage'
    };

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        try {
            const option = intr.options.getString(ChatCommandMetadataArgsRaw['help'].getOptionNameByKey('option'));
            const optionObj = ChatCommandMetadataArgsRaw['help'].getOptionByKey('option').getChoiceByValue(option);
            const userPermission = this.getUserPermission(intr);

            if (!option) {
                await this.sendGeneralHelp(intr);
                return;
            }

            if (option === this.OPTIONS.SUPPORT) {
                await this.sendSupportHelp(intr);
                return;
            }

            if (option === this.OPTIONS.USAGE) {
                await this.sendUsageHelp(intr);
                return;
            }

            const permissionNeeded = this.getPermissionNeededForOption(optionObj);
            if (userPermission < permissionNeeded) {
                await this.sendPermissionError(intr, optionObj);
                return;
            }

            await this.sendHelpForOption(intr, optionObj, userPermission);
        } catch (error) {
            console.error('Error in HelpCommand:', error);
            await InteractionUtils.send(intr, 'An error occurred while fetching help information.');
        }
    }

    private getUserPermission(intr: ChatInputCommandInteraction): PermissionNeeded {
        if (Config.developers.includes(intr.user.id)) return PermissionNeeded.BOT_DEVELOPER;
        if (Config.admin.includes(intr.user.id)) return PermissionNeeded.BOT_ADMIN;
        if (Config.translators.includes(intr.user.id)) return PermissionNeeded.BOT_TRANSLATOR;
        if (intr.memberPermissions?.has('Administrator')) return PermissionNeeded.SERVER_ADMIN;
        if (intr.memberPermissions?.has('ManageGuild')) return PermissionNeeded.SERVER_MOD;
        return PermissionNeeded.NONE;
    }

    private getPermissionNeededForOption(option: ChoiceJSON): PermissionNeeded {
        switch (option.value) {
            case this.OPTIONS.CALLS:
            case this.OPTIONS.GAMES:
            case this.OPTIONS.UPGRADES:
            case this.OPTIONS.PROMOTIONALS:
                return PermissionNeeded.NONE;
            case this.OPTIONS.SERVER_MOD:
                return PermissionNeeded.SERVER_MOD;
            case this.OPTIONS.BOT_TRANSLATOR:
                return PermissionNeeded.BOT_TRANSLATOR;
            case this.OPTIONS.BOT_ADMIN:
                return PermissionNeeded.BOT_ADMIN;
            case this.OPTIONS.BOT_DEVELOPER:
                return PermissionNeeded.BOT_DEVELOPER;
            default:
                return PermissionNeeded.ERROR;
        }
    }

    private async sendGeneralHelp(intr: ChatInputCommandInteraction): Promise<void> {
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Help Information')
            .setDescription('Use this command with an option to get specific help. Available options:')
            .addFields(
                { name: 'Calls', value: 'Basic commands for all users' },
                { name: 'Games', value: 'Game-related commands' },
                { name: 'Upgrades', value: 'Upgrade-related commands' },
                { name: 'Promotionals', value: 'Promotional commands' },
                { name: 'Support', value: 'Get support information' },
                { name: 'Usage', value: 'Learn how to use commands' },
                { name: 'Mod', value: 'Commands for server moderators' },
                { name: 'Admin', value: 'Commands for bot administrators' },
                { name: 'Developer', value: 'Commands for bot developers' }
            );
        await InteractionUtils.send(intr, { embeds: [embed] });
    }

    private async sendSupportHelp(intr: ChatInputCommandInteraction): Promise<void> {
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Support Information')
            .setDescription('Need help? Here are some ways to get support:')
            .addFields(
                { name: 'Discord Server', value: `Join our support server: ${Config.supportServerInvite}` },
                // { name: 'Documentation', value: 'Check out our documentation: [Link to docs]' },
                { name: 'Report a Bug', value: 'Use the `/report` command or visit the support server to report any issues' },
                { name: 'Translators', value: 'As of now, not needed though looking into this possibility' },
                { name: 'Template', value: `Used this decent template: ${Lang.getCom('links.template')}` }
            );
        await InteractionUtils.send(intr, { embeds: [embed] });
    }

    private async sendUsageHelp(intr: ChatInputCommandInteraction): Promise<void> {
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Command Usage Guide')
            .setDescription('Here are some tips on how to use our commands:')
            .addFields(
                { name: 'Command Structure', value: '`/command [required] <optional>`' },
                { name: 'Amounts', value: 'k: 1e3, m:1e6, b:1e9' },
                { name: 'User Mentions', value: 'When a command asks for a user, you can @mention them or use their ID' },
                { name: 'Cooldowns', value: 'Most commands have cooldowns to prevent spam. Wait a bit before using again' },
                { name: 'Permissions', value: 'Some commands require specific permissions. Check the help for each command' }
            );
        await InteractionUtils.send(intr, { embeds: [embed] });
    }

    private async sendPermissionError(intr: ChatInputCommandInteraction, option: ChoiceJSON): Promise<void> {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('Permission Error')
            .setDescription(`You do not have the required permissions to access help for the \`${option.name}\` option.`);
        await InteractionUtils.send(intr, { embeds: [embed], ephemeral: true });
    }

    private async sendHelpForOption(intr: ChatInputCommandInteraction, option: ChoiceJSON, userPermission: PermissionNeeded): Promise<void> {
        const filteredCommands = this.filterCommandsByOption(option.value, userPermission);
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`Help Information: ${option.name.charAt(0).toUpperCase() + option.name.slice(1)}`)
            .setDescription(`Available commands for ${option.name}:`)
            .setFooter({text: `[...] for required and <...> for optional. For amounts/bets, you can use multiple identifiers. See USAGE for more information`});

        for (const command of filteredCommands) {
            embed.addFields({
                name: `/${command.name}`,
                value: `Description: ${command.description}\nUsage: /${command.name} ${this.getCommandUsage(command)}`
            });
        }

        if (filteredCommands.length === 0) {
            embed.setDescription(`No commands available for ${option.name} or this option is still in development.`);
        }

        await InteractionUtils.send(intr, { embeds: [embed] });
    }

    private filterCommandsByOption(optionValue: string, userPermission: PermissionNeeded): CommandJSON[] {
        return this.commands.filter(command => {
            return this.isCommandInOption(command, optionValue) && userPermission >= command.permissionNeeded;
        });
    }

    private isCommandInOption(command: CommandJSON, optionValue: string): boolean {
        switch (optionValue) {
            case this.OPTIONS.CALLS:
                return command.category === CommandCategory.CALLS;
            case this.OPTIONS.GAMES:
                return command.category === CommandCategory.GAMES;
            case this.OPTIONS.UPGRADES:
                return command.category === CommandCategory.UPGRADES;
            case this.OPTIONS.PROMOTIONALS:
                return command.category === CommandCategory.PROMOTIONALS;
            case this.OPTIONS.SERVER_MOD:
                return command.category === CommandCategory.SERVER_MOD;
            case this.OPTIONS.BOT_TRANSLATOR:
                return command.category === CommandCategory.BOT_TRANSLATOR;
            case this.OPTIONS.BOT_ADMIN:
                return command.category === CommandCategory.BOT_ADMIN;
            case this.OPTIONS.BOT_DEVELOPER:
                return command.category === CommandCategory.BOT_DEVELOPER;
            default:
                return false;
        }
    }

    private getCommandUsage(command: CommandJSON): string {
        if (!command.options || command.options.length === 0) {
            return '';
        }
        return command.options.map(arg => {
            const argName = arg.required ? `[${arg.name}]` : `<${arg.name}>`;
            return argName;
        }).join(' ');
    }
}
