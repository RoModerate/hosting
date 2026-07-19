import { CommandInteraction } from 'discord.js';
import { Command } from '../types';

const hailCommand: Command = {
    name: 'hail',
    description: 'Responds with susuelmo',
    async execute(interaction: CommandInteraction) {
        await interaction.reply('susuelmo');
    },
};

export default hailCommand;
