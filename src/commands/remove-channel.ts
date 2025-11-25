import {
  ChatInputCommandInteraction,
  BaseGuild,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder,
} from 'discord.js'
import { BaseCommand, Permission } from '.'
import { WatchGuildServer, wgChannelTypes, WGChannelType } from '@/server'
import { Discord } from '@/discord'
import { Logger } from '@book000/node-utils'

export class RemoveChannelCommand implements BaseCommand {
  definition(
    guild: BaseGuild
  ): SlashCommandSubcommandBuilder | SlashCommandSubcommandGroupBuilder | null {
    const subCommandBuilders = wgChannelTypes.map((type) => {
      return new SlashCommandSubcommandBuilder()
        .setName(type)
        .setDescription(`${type} のチャンネル設定を解除します。`)
    })

    const server = new WatchGuildServer(guild)
    const groupBuilder = new SlashCommandSubcommandGroupBuilder()
      .setName('remove-channel')
      .setDescription('チャンネル設定を解除します。')
    let needRegister = false
    for (const builder of subCommandBuilders) {
      if (server.getChannelId(builder.name as WGChannelType) === null) {
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

    const type = interaction.options.getSubcommand(true)
    if (!this.isWGChannelType(type)) {
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
    const logger = Logger.configure(
      this.constructor.name + '.executeRemoveChannel'
    )

    if (server.getChannelId(type) === null) {
      await interaction.editReply({
        embeds: [
          {
            title: '❌ 設定に失敗',
            description: 'このチャンネルは設定されていません。',
            color: 0xff_00_00,
            timestamp: new Date().toISOString(),
          },
        ],
      })
      return
    }

    const channel = server.removeChannel(type)
    if (!channel) {
      await interaction.editReply({
        embeds: [
          {
            title: '❌ 設定に失敗',
            description: 'チャンネルの設定解除に失敗しました。',
            color: 0xff_00_00,
            timestamp: new Date().toISOString(),
          },
        ],
      })
      return
    }

    logger.info(`✅ Channel removed: ${interaction.guildId} -> ${type}`)
    await interaction.editReply({
      embeds: [
        {
          title: '⏩ 設定に成功',
          description: `${type} のチャンネルの設定を解除しました。`,
          footer: {
            text: 'コマンドの再登録を行っています…',
          },
          color: 0xff_a5_00,
          timestamp: new Date().toISOString(),
        },
      ],
    })

    await discord.updateCommands(interaction.guild)

    await interaction.editReply({
      embeds: [
        {
          title: '✅ 設定に成功',
          description: `${type} のチャンネルの設定を解除しました。`,
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
