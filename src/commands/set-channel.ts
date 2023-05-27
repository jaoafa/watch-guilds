import { SlashCommandSubcommandBuilder } from '@discordjs/builders'
import {
  CacheType,
  ChannelType,
  ChatInputCommandInteraction,
  BaseGuild,
  SlashCommandSubcommandGroupBuilder,
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
        identifier: 'Administrator',
        type: 'PERMISSION',
      },
    ]
  }

  async execute(
    discord: Discord,
    interaction: ChatInputCommandInteraction<CacheType>
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
              'このサーバは watch-guilds の対象サーバではありません。まずは /watch-guilds register を実行してください。',
            color: 0xff_00_00,
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
          },
        ],
      })
      return
    }

    const guild = interaction.guild
    if (!guild) {
      await interaction.editReply({
        embeds: [
          {
            title: '❌ 登録に失敗',
            description: 'このコマンドはDiscordサーバ内でのみ実行できます。',
            color: 0xff_00_00,
          },
        ],
      })
      return
    }
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
    if (!targetChannel.permissionsFor(botMember).has('SendMessages')) {
      await interaction.editReply({
        embeds: [
          {
            title: '❌ 設定に失敗',
            description:
              'Botには指定されたチャンネルにメッセージを送信する権限がありません。',
            color: 0xff_00_00,
          },
        ],
      })
      return
    }

    const channel = server.setChannel(channelType, targetChannel)
    if (!channel) {
      await interaction.editReply({
        embeds: [
          {
            title: '❌ 設定に失敗',
            description: 'チャンネルの設定に失敗しました。',
            color: 0xff_00_00,
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
          title: '✅ 設定に成功',
          description: `<#${targetChannel.id}> を ${channelType} のチャンネルとして設定しました。`,
          color: 0x00_ff_00,
        },
      ],
    })
    await discord.updateCommands()
  }

  isWGChannelType(type: string): type is WGChannelType {
    return wgChannelTypes.includes(type as any)
  }
}
