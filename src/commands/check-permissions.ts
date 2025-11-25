import {
  ChatInputCommandInteraction,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder,
  PermissionResolvable,
  EmbedField,
} from 'discord.js'
import { BaseCommand, Permission } from '.'
import { WatchGuildServer, wgChannelTypes } from '@/server'
import { Discord } from '@/discord'

export class CheckPermissionsCommand implements BaseCommand {
  definition():
    | SlashCommandSubcommandBuilder
    | SlashCommandSubcommandGroupBuilder
    | null {
    return new SlashCommandSubcommandBuilder()
      .setName('check-permissions')
      .setDescription(
        'watch-guilds が動作するために必要な権限があるか確認します。'
      )
  }

  conditions(): boolean {
    return true
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
    _discord: Discord,
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
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

    const fields: EmbedField[] = []

    const needPerms = {
      ViewAuditLog: '監査ログの表示',
      ManageEmojisAndStickers: '絵文字の管理',
    }
    const permStatus: Record<string, boolean> = {}
    for (const perm of Object.keys(needPerms)) {
      permStatus[perm] = botMember.permissions.has(perm as PermissionResolvable)
    }

    fields.push({
      name: 'Botがサーバで必要とする権限',
      value: Object.entries(needPerms)
        .map(([perm, permText]) => {
          return `${permStatus[perm] ? '✅' : '❌'} **${permText}**`
        })
        .join('\n'),
      inline: false,
    })

    let isAllGranted = Object.values(permStatus).every(Boolean)

    const server = new WatchGuildServer(interaction.guild)
    const needChannelPerms = {
      ViewChannel: '閲覧',
      SendMessages: 'メッセージ送信',
      EmbedLinks: '埋め込みリンク',
      ReadMessageHistory: 'メッセージ履歴の閲覧',
    }
    if (server.isRegistered()) {
      for (const channelType of wgChannelTypes) {
        const channelId = server.getChannelId(channelType)
        if (!channelId) {
          continue
        }

        const channel = guild.channels.resolve(channelId)
        if (!channel) {
          continue
        }

        const channelPerms: Record<string, boolean> = {}
        for (const perm of Object.keys(needChannelPerms)) {
          channelPerms[perm] = channel
            .permissionsFor(botMember)
            .has(perm as PermissionResolvable)
        }

        fields.push({
          name: `${channelType} チャンネル: <#${channelId}>`,
          value: Object.entries(needChannelPerms)
            .map(([perm, permText]) => {
              return `${channelPerms[perm] ? '✅' : '❌'} **${permText}**`
            })
            .join('\n'),
          inline: true,
        })

        isAllGranted =
          isAllGranted && Object.values(channelPerms).every(Boolean)
      }
    }

    const emojiAllGranted = isAllGranted ? '✅' : '❌'
    const description = isAllGranted
      ? 'watch-guilds が動作するために必要な権限がすべて付与されています。'
      : 'watch-guilds が動作するために必要な権限が付与されていません。'

    await interaction.editReply({
      embeds: [
        {
          title: `${emojiAllGranted} 権限の確認`,
          description,
          fields,
          color: isAllGranted ? 0x00_ff_00 : 0xff_00_00,
          timestamp: new Date().toISOString(),
        },
      ],
    })
  }
}
