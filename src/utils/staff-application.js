const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  ModalBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const { accentColor } = require("../constants/branding");
const {
  footerText,
  panelDescription,
  panelDivider,
  panelHeading,
} = require("./panel-style");

const STAFF_APPLICATION_OPEN_ID = "staffapp:open";
const STAFF_APPLICATION_MODAL_ID = "staffapp:modal";
const STAFF_APPLICATION_ROBLOX_ID = "staffapp:roblox";
const STAFF_APPLICATION_AVAILABILITY_ID = "staffapp:availability";
const STAFF_APPLICATION_MOTIVATION_ID = "staffapp:motivation";
const STAFF_APPLICATION_EXPERIENCE_ID = "staffapp:experience";
const STAFF_APPLICATION_SCENARIO_ID = "staffapp:scenario";
const STAFF_APPLICATION_APPROVE_PREFIX = "staffapp:approve:";
const STAFF_APPLICATION_DENY_PREFIX = "staffapp:deny:";

function createStaffApplicationButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(STAFF_APPLICATION_OPEN_ID)
      .setLabel("Apply for Staff")
      .setStyle(ButtonStyle.Success),
  );
}

function createStaffApplicationModal() {
  return new ModalBuilder()
    .setCustomId(STAFF_APPLICATION_MODAL_ID)
    .setTitle("OSRP Staff Application")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(STAFF_APPLICATION_ROBLOX_ID)
          .setLabel("Roblox username")
          .setStyle(TextInputStyle.Short)
          .setMinLength(3)
          .setMaxLength(40)
          .setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(STAFF_APPLICATION_AVAILABILITY_ID)
          .setLabel("Timezone and availability")
          .setStyle(TextInputStyle.Short)
          .setMinLength(3)
          .setMaxLength(100)
          .setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(STAFF_APPLICATION_MOTIVATION_ID)
          .setLabel("Why do you want to join OSRP staff?")
          .setStyle(TextInputStyle.Paragraph)
          .setMinLength(40)
          .setMaxLength(1000)
          .setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(STAFF_APPLICATION_EXPERIENCE_ID)
          .setLabel("Relevant experience")
          .setStyle(TextInputStyle.Paragraph)
          .setMinLength(20)
          .setMaxLength(1000)
          .setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(STAFF_APPLICATION_SCENARIO_ID)
          .setLabel("How would you handle a disruptive player?")
          .setStyle(TextInputStyle.Paragraph)
          .setMinLength(40)
          .setMaxLength(1000)
          .setRequired(true),
      ),
    );
}

function createStaffApplicationReviewMessage(application) {
  const pending = application.status === "Pending";
  const body = new ContainerBuilder()
    .setAccentColor(pending ? accentColor : application.status === "Approved" ? 0x315B33 : 0x8A4B2A)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(panelHeading("Staff Application")),
      new TextDisplayBuilder().setContent(
        panelDescription([
          `Applicant: <@${application.discordUserId}>`,
          `Roblox: **${application.robloxUsername}**`,
          `Application: **${application.applicationId}**`,
          `Status: **${application.status}**`,
        ].join("\n")),
      ),
    )
    .addSeparatorComponents(panelDivider())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### Availability\n${application.availability}`),
      new TextDisplayBuilder().setContent(`### Motivation\n${application.motivation}`),
      new TextDisplayBuilder().setContent(`### Experience\n${application.experience}`),
      new TextDisplayBuilder().setContent(`### Scenario\n${application.scenario}`),
    );

  if (pending) {
    body.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`${STAFF_APPLICATION_APPROVE_PREFIX}${application.applicationId}`)
          .setLabel("Approve")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`${STAFF_APPLICATION_DENY_PREFIX}${application.applicationId}`)
          .setLabel("Deny")
          .setStyle(ButtonStyle.Danger),
      ),
    );
  } else {
    body.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `Reviewed by: <@${application.reviewedByUserId}> • <t:${Math.floor(new Date(application.reviewedAt).getTime() / 1000)}:R>`,
      ),
    );
  }

  body
    .addSeparatorComponents(panelDivider({ visible: false }))
    .addTextDisplayComponents(footerText(application.applicationId));

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [body],
    allowedMentions: { parse: [] },
  };
}

module.exports = {
  STAFF_APPLICATION_APPROVE_PREFIX,
  STAFF_APPLICATION_AVAILABILITY_ID,
  STAFF_APPLICATION_DENY_PREFIX,
  STAFF_APPLICATION_EXPERIENCE_ID,
  STAFF_APPLICATION_MODAL_ID,
  STAFF_APPLICATION_MOTIVATION_ID,
  STAFF_APPLICATION_OPEN_ID,
  STAFF_APPLICATION_ROBLOX_ID,
  STAFF_APPLICATION_SCENARIO_ID,
  createStaffApplicationButton,
  createStaffApplicationModal,
  createStaffApplicationReviewMessage,
};
