import {
  ChannelType,
  ChatInputCommandInteraction,
  BaseGuild,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder,
  PermissionResolvable,
} from 'discord.js'
import { BaseCommand, Permission } from '.'
import { WatchGuildServer, wgChannelTypes, WGChannelType } from '@/server'
import { Discord } from '@/discord'
import { Logger } from '@book000/node-utils'

export class SetChannelCommand implements BaseCommand {
  definition(
    guild: BaseGuild
  ): SlashCommandSubcommandBuilder | SlashCommandSubcommandGroupBuilder | null {
    const subCommandBuilders = wgChannelTypes.map((type) => {
      return new SlashCommandSubcommandBuilder()
        .setName(type)
        .setDescription(`${type} のチャンネルを設定します。`)
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('送信先のチャンネル')
            .addChannelTypes(
              ChannelType.GuildText,
              ChannelType.GuildAnnouncement
            )
            .setRequired(true)
        )
    })

    const server = new WatchGuildServer(guild)
    const groupBuilder = new SlashCommandSubcommandGroupBuilder()
      .setName('set-channel')
      .setDescription('チャンネルを設定します。')
    let needRegister = false
    for (const builder of subCommandBuilders) {
      if (server.getChannelId(builder.name as WGChannelType) !== null) {
        continue
      }
      groupBuilder.addSubcommand(builder)
      needRegister = true
    }
    if (!needRegister) {
      return null
    }
    return groupBuilder
  }

  conditions(guild: BaseGuild): boolean {
    const server = new WatchGuildServer(guild)
    return server.isRegistered()
  }

  get permissions(): Permission[] {
    return [
      {
        identifier: 'ManageGuild',
        type: 'PERMISSION',
      },
    ]
  }

  async execute(
    discord: Discord,
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    const logger = Logger.configure(this.constructor.name + '.execute')
    await interaction.deferReply()

    if (!interaction.guild) {
      await interaction.editReply({
        embeds: [
          {
            title: '❌ 設定に失敗',
            description: 'このコマンドはDiscordサーバ内でのみ実行できます。',
            color: 0xff_00_00,
            timestamp: new Date().toISOString(),
          },
        ],
      })
      return
    }

    const server = new WatchGuildServer(interaction.guild)
    if (!server.isRegistered()) {
      await interaction.editReply({
        embeds: [
          {
            title: '❌ 設定に失敗',
            description:
              'このサーバは watch-guilds の対象サーバではありません。まずは `/watch-guilds register` を実行してください。',
            color: 0xff_00_00,
            timestamp: new Date().toISOString(),
          },
        ],
      })
      return
    }

    const channelType = interaction.options.getSubcommand(true)
    if (!this.isWGChannelType(channelType)) {
      await interaction.editReply({
        embeds: [
          {
            title: '❌ 設定に失敗',
            description: '不正なチャンネルタイプです。',
            color: 0xff_00_00,
            timestamp: new Date().toISOString(),
          },
        ],
      })
      return
    }

    const targetChannel = interaction.options.getChannel<
      ChannelType.GuildText | ChannelType.GuildAnnouncement
    >('channel', true)

    if (targetChannel.guildId !== interaction.guildId) {
      await interaction.editReply({
        embeds: [
          {
            title: '❌ 設定に失敗',
            description:
              'このチャンネルはこのサーバのチャンネルではありません。',
            color: 0xff_00_00,
            timestamp: new Date().toISOString(),
          },
        ],
      })
      return
    }

    const guild = interaction.guild
    const botMember = guild.members.resolve(interaction.client.user)
    if (!botMember) {
      await interaction.editReply({
        embeds: [
          {
            title: '❌ 登録に失敗',
            description: 'Botのサーバメンバーを取得できませんでした。',
            color: 0xff_00_00,
            timestamp: new Date().toISOString(),
          },
        ],
      })
      return
    }

    const needPerms = {
      ViewChannel: '閲覧',
      SendMessages: 'メッセージ送信',
      EmbedLinks: '埋め込みリンク',
      ReadMessageHistory: 'メッセージ履歴の閲覧',
    }

    for (const [perm, permText] of Object.entries(needPerms)) {
      if (
        !targetChannel
          .permissionsFor(botMember)
          .has(perm as PermissionResolvable)
      ) {
        await interaction.editReply({
          embeds: [
            {
              title: '❌ 設定に失敗',
              description: `Botには、指定されたチャンネルの${permText}権限がありません。`,
              color: 0xff_00_00,
              timestamp: new Date().toISOString(),
            },
          ],
        })
        return
      }
    }

    const channel = server.setChannel(channelType, targetChannel)
    if (!channel) {
      await interaction.editReply({
        embeds: [
          {
            title: '❌ 設定に失敗',
            description: 'チャンネルの設定に失敗しました。',
            color: 0xff_00_00,
            timestamp: new Date().toISOString(),
          },
        ],
      })
      return
    }

    logger.info(
      `✅ Channel set: ${channelType} (${targetChannel.guildId}#${targetChannel.id}) -> ${targetChannel.id}`
    )
    await interaction.editReply({
      embeds: [
        {
          title: '⏩ 設定に成功',
          description: `<#${targetChannel.id}> を ${channelType} のチャンネルとして設定しました。`,
          footer: {
            text: 'コマンドの再登録を行っています…',
          },
          color: 0xff_a5_00,
          timestamp: new Date().toISOString(),
        },
      ],
    })

    await discord.updateCommands(guild)

    await interaction.editReply({
      embeds: [
        {
          title: '✅ 設定に成功',
          description: `<#${targetChannel.id}> を ${channelType} のチャンネルとして設定しました。`,
          footer: {
            text: 'コマンドの再登録が完了しました',
          },
          color: 0x00_ff_00,
          timestamp: new Date().toISOString(),
        },
      ],
    })
  }

  isWGChannelType(type: string): type is WGChannelType {
    return wgChannelTypes.includes(type as any)
  }
}
