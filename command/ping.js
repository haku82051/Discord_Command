const { Client, EmbedBuilder } = require('discord.js');
const fs = require('fs');

module.exports = {
  data: {
    name: 'ping',
    description: '送信確認',
  },
  async execute(interaction) {
    await interaction.reply('Pong!');
  },
};
