const { EmbedBuilder } = require("discord.js");
const { accentColor, embedFooter } = require("../constants/branding");

function createBaseEmbed({ title, description }) {
  return new EmbedBuilder()
    .setColor(accentColor)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: embedFooter })
    .setTimestamp();
}

module.exports = {
  createBaseEmbed,
};
