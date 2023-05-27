import { SlashCommandSubcommandBuilder } from '@discordjs/builders'
import {
  CacheType,
  ChatInputCommandInteraction,
  BaseGuild,
  SlashCommandSubcommandGroupBuilder,
} from 'discord.js'
import { BaseCommand, Permission } from '.'
import { WatchGuildServer } from '@/server'
import { Discord } from '@/discord'
import { Logger } from '@book000/node-utils'

export class RegisterCommand implements BaseCommand {
  definition():
    | SlashCommandSubcommandBuilder
    | SlashCommandSubcommandGroupBuilder
    | null {
    return new SlashCommandSubcommandBuilder()
      .setName('register')
      .setDescription('このサーバを watch-guilds の対象サーバに設定します。')
  }

  conditions(guild: BaseGuild): boolean {
    const server = new WatchGuildServer(guild)
    return !server.isRegistered()
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
            title: '❌ 登録に失敗',
            description: 'このコマンドはDiscordサーバ内でのみ実行できます。',
            color: 0xff_00_00,
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

    if (!botMember.permissions.has('ViewAuditLog')) {
      await interaction.editReply({
        embeds: [
          {
            title: '❌ 登録に失敗',
            description:
              'このコマンドを実行するには、Botに監査ログの表示権限が必要です。',
            color: 0xff_00_00,
            timestamp: new Date().toISOString(),
          },
        ],
      })
      return
    }

    const server = new WatchGuildServer(interaction.guild)
    server.register()

    await interaction.editReply({
      embeds: [
        {
          title: '✅ 登録に成功',
          description: 'このサーバを watch-guilds の対象サーバに設定しました。',
          footer: {
            text: '絵文字などの変更通知機能等を利用するには、さらにチャンネルの設定が必要です。',
          },
          color: 0x00_ff_00,
          timestamp: new Date().toISOString(),
        },
      ],
    })
    logger.info(`✅ Registered guild: ${guild.name} (${guild.id})`)

    await discord.updateCommands()
  }
}
