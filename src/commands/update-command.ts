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

export class UpdateCommand implements BaseCommand {
  definition():
    | SlashCommandSubcommandBuilder
    | SlashCommandSubcommandGroupBuilder
    | null {
    return new SlashCommandSubcommandBuilder()
      .setName('update-commands')
      .setDescription('このサーバのコマンドを更新します。')
  }

  conditions(guild: BaseGuild): boolean {
    const server = new WatchGuildServer(guild)
    return server.isRegistered()
  }

  get permissions(): Permission[] {
    return []
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

    logger.info(`✅ Unregistered guild: ${guild.name} (${guild.id})`)
    await interaction.editReply({
      embeds: [
        {
          title: '⏩ コマンド更新中…',
          description: 'コマンドの再登録を行っています。',
          color: 0xff_a5_00,
          timestamp: new Date().toISOString(),
        },
      ],
    })

    await discord.updateCommands(guild)

    await interaction.editReply({
      embeds: [
        {
          title: '✅ コマンド更新完了',
          description: 'コマンドの再登録が完了しました。',
          color: 0x00_ff_00,
          timestamp: new Date().toISOString(),
        },
      ],
    })
  }
}
