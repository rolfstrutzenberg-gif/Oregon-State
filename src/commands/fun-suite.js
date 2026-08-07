const { SlashCommandBuilder } = require("discord.js");
const { replyPanel } = require("../utils/command-response");

function pick(values) {
  return values[Math.floor(Math.random() * values.length)];
}

function publicReply(interaction, options) {
  return replyPanel(interaction, options, { ephemeral: false });
}

const eightBallAnswers = [
  "Yes.", "Definitely.", "Most likely.", "Signs point to yes.",
  "Ask again later.", "Not enough information.", "I wouldn’t count on it.",
  "Probably not.", "No.", "Absolutely not.",
];

const eightball = {
  data: new SlashCommandBuilder().setName("8ball").setDescription("Ask the Magic 8 Ball a question.")
    .addStringOption((option) => option.setName("question").setDescription("Your question.").setRequired(true).setMaxLength(300)),
  async execute(interaction) {
    await publicReply(interaction, {
      title: "Magic 8 Ball",
      description: `> ${interaction.options.getString("question", true)}`,
      lines: [`**${pick(eightBallAnswers)}**`],
    });
  },
};

const coinflip = {
  data: new SlashCommandBuilder().setName("coinflip").setDescription("Flip a coin."),
  async execute(interaction) {
    const result = Math.random() < 0.5 ? "Heads" : "Tails";
    await publicReply(interaction, { title: "Coin Flip", description: `The coin landed on **${result}**.` });
  },
};

const dice = {
  data: new SlashCommandBuilder().setName("dice").setDescription("Roll one or more dice.")
    .addIntegerOption((option) => option.setName("sides").setDescription("Sides per die.").setMinValue(2).setMaxValue(100))
    .addIntegerOption((option) => option.setName("count").setDescription("Number of dice.").setMinValue(1).setMaxValue(10)),
  async execute(interaction) {
    const sides = interaction.options.getInteger("sides") || 6;
    const count = interaction.options.getInteger("count") || 1;
    const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
    await publicReply(interaction, {
      title: "Dice Roll",
      description: `Rolled ${count}d${sides}: **${rolls.join(", ")}**`,
      lines: count > 1 ? [`> Total: **${rolls.reduce((sum, value) => sum + value, 0)}**`] : [],
    });
  },
};

const choose = {
  data: new SlashCommandBuilder().setName("choose").setDescription("Let the bot choose from a list.")
    .addStringOption((option) => option.setName("options").setDescription("Choices separated by commas.").setRequired(true).setMaxLength(1000)),
  async execute(interaction) {
    const options = interaction.options.getString("options", true).split(",").map((value) => value.trim()).filter(Boolean);
    if (options.length < 2) return replyPanel(interaction, { title: "More Choices Needed", description: "Enter at least two choices separated by commas.", tone: "danger" });
    await publicReply(interaction, { title: "OSRP Chooses", description: `**${pick(options)}**`, lines: [`> Chosen from **${options.length}** options.`] });
  },
};

const randomnumber = {
  data: new SlashCommandBuilder().setName("randomnumber").setDescription("Pick a random number in a range.")
    .addIntegerOption((option) => option.setName("minimum").setDescription("Lowest possible number.").setRequired(true).setMinValue(-1_000_000).setMaxValue(1_000_000))
    .addIntegerOption((option) => option.setName("maximum").setDescription("Highest possible number.").setRequired(true).setMinValue(-1_000_000).setMaxValue(1_000_000)),
  async execute(interaction) {
    const minimum = interaction.options.getInteger("minimum", true);
    const maximum = interaction.options.getInteger("maximum", true);
    if (minimum > maximum) return replyPanel(interaction, { title: "Invalid Range", description: "The minimum must be less than or equal to the maximum.", tone: "danger" });
    const result = Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
    await publicReply(interaction, { title: "Random Number", description: `The number is **${result.toLocaleString()}**.`, lines: [`> Range: **${minimum.toLocaleString()} – ${maximum.toLocaleString()}**`] });
  },
};

const rps = {
  data: new SlashCommandBuilder().setName("rps").setDescription("Play rock, paper, scissors against the bot.")
    .addStringOption((option) => option.setName("choice").setDescription("Your move.").setRequired(true).addChoices(
      { name: "Rock", value: "rock" }, { name: "Paper", value: "paper" }, { name: "Scissors", value: "scissors" },
    )),
  async execute(interaction) {
    const userChoice = interaction.options.getString("choice", true);
    const botChoice = pick(["rock", "paper", "scissors"]);
    const wins = { rock: "scissors", paper: "rock", scissors: "paper" };
    const outcome = userChoice === botChoice ? "It’s a tie." : wins[userChoice] === botChoice ? "You win." : "The bot wins.";
    await publicReply(interaction, {
      title: "Rock Paper Scissors",
      description: `**${outcome}**`,
      lines: [`> You: **${userChoice}**`, `> Bot: **${botChoice}**`],
    });
  },
};

const slotSymbols = ["🌲", "🦌", "🚔", "🛣️", "💰", "⭐"];
const slots = {
  data: new SlashCommandBuilder().setName("slots").setDescription("Spin the OSRP slots."),
  async execute(interaction) {
    const reels = [pick(slotSymbols), pick(slotSymbols), pick(slotSymbols)];
    const allMatch = reels.every((symbol) => symbol === reels[0]);
    const pair = new Set(reels).size === 2;
    await publicReply(interaction, {
      title: "OSRP Slots",
      description: `## ${reels.join("  |  ")}`,
      lines: [`**${allMatch ? "Jackpot!" : pair ? "Two matched!" : "No match this time."}**`],
      tone: allMatch ? "success" : "info",
      footer: "Cosmetic game • Currency system coming later",
    });
  },
};

module.exports = [eightball, coinflip, dice, choose, randomnumber, rps, slots];
