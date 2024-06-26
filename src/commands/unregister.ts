import { SlashCommandSubcommandBuilder } from '@discordjs/builders'
import {
  ChatInputCommandInteraction,
  BaseGuild,
  SlashCommandSubcommandGroupBuilder,
} from 'discord.js'
import { BaseCommand, Permission } from '.'
import { WatchGuildServer } from '@/server'
import { Discord } from '@/discord'
import { Logger } from '@book000/node-utils'

export class UnregisterCommand implements BaseCommand {
  definition():
    | SlashCommandSubcommandBuilder
    | SlashCommandSubcommandGroupBuilder
    | null {
    return new SlashCommandSubcommandBuilder()
      .setName('unregister')
      .setDescription('このサーバの watch-guilds の対象サーバから外します。')
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
            title: '❌ 登録解除に失敗',
            description: 'このコマンドはDiscordサーバ内でのみ実行できます。',
            color: 0xff_00_00,
          },
        ],
      })
      return
    }

    const guild = interaction.guild

    const server = new WatchGuildServer(interaction.guild)
    server.unregister()

    logger.info(`✅ Unregistered guild: ${guild.name} (${guild.id})`)
    await interaction.editReply({
      embeds: [
        {
          title: '⏩ 登録解除に成功',
          description: 'このサーバをwatch-guildsの対象サーバから外しました。',
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
          title: '✅ 登録解除に成功',
          description: 'このサーバをwatch-guildsの対象サーバから外しました。',
          footer: {
            text: 'コマンドの再登録が完了しました',
          },
          color: 0x00_ff_00,
          timestamp: new Date().toISOString(),
        },
      ],
    })
  }
}
