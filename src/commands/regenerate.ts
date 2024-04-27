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
import { ListEmojis } from '@/list-emojis'

export class RegenerateCommand implements BaseCommand {
  definition():
    | SlashCommandSubcommandBuilder
    | SlashCommandSubcommandGroupBuilder
    | null {
    return new SlashCommandSubcommandBuilder()
      .setName('regenerate')
      .setDescription('絵文字一覧を再生成します。')
  }

  conditions(guild: BaseGuild): boolean {
    const server = new WatchGuildServer(guild)
    return server.isRegistered() && server.getChannelId('list-emoji') !== null
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
            title: '❌ 絵文字一覧の再生成に失敗',
            description: 'このコマンドはDiscordサーバ内でのみ実行できます。',
            color: 0xff_00_00,
            timestamp: new Date().toISOString(),
          },
        ],
      })
      return
    }

    const guild = interaction.guild

    const server = new WatchGuildServer(guild)
    const channelId = server.getChannelId('list-emoji')
    if (!channelId) {
      await interaction.editReply({
        embeds: [
          {
            title: '❌ 絵文字一覧の再生成に失敗',
            description:
              '絵文字一覧チャンネルが設定されていません。\n`/watch-guilds set-channel list-emoji` で設定してください。',
            color: 0xff_00_00,
            timestamp: new Date().toISOString(),
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
            title: '❌ 絵文字一覧の再生成に失敗',
            description: 'Botのサーバメンバーを取得できませんでした。',
            color: 0xff_00_00,
            timestamp: new Date().toISOString(),
          },
        ],
      })
      return
    }

    const channel = guild.channels.resolve(channelId)
    if (
      !channel ||
      !channel.isTextBased() ||
      !channel.permissionsFor(botMember).has('SendMessages')
    ) {
      await interaction.editReply({
        embeds: [
          {
            title: '❌ 絵文字一覧の再生成に失敗',
            description:
              '絵文字一覧チャンネルが見つからないか、Botがメッセージを送信できません。',
            color: 0xff_00_00,
            timestamp: new Date().toISOString(),
          },
        ],
      })
      return
    }

    logger.info('⚙️ Start regenerate list-emoji channel.')
    const message = await interaction.editReply({
      embeds: [
        {
          title: '⚙️ 絵文字一覧の再生成中',
          description: '絵文字一覧を再生成しています。',
          color: 0x00_00_ff,
          timestamp: new Date().toISOString(),
        },
      ],
    })

    await new ListEmojis(discord).generate(guild)

    logger.info('✅ Regenerate list-emoji channel.')
    await message.edit({
      embeds: [
        {
          title: '✅ 絵文字一覧の再生成完了',
          description: '絵文字一覧を再生成しました。',
          color: 0x00_ff_00,
          timestamp: new Date().toISOString(),
        },
      ],
    })
  }
}
