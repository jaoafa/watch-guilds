import { ClientEvents, GuildEmoji } from 'discord.js'
import { BaseDiscordEvent } from '.'
import { Logger } from '@book000/node-utils'
import { WatchGuildServer } from '@/server'
import { mentionEmoji } from '@/utils'
import { ListEmojis } from '@/list-emojis'
import { EmojisCache } from '@/emojis-caches'

export class DiscordEmojiCreateEvent extends BaseDiscordEvent {
  get eventName(): keyof ClientEvents {
    return 'emojiCreate'
  }

  async execute(emoji: GuildEmoji) {
    const logger = Logger.configure('Discord.onEmojiCreate')
    const guild = emoji.guild
    if (!emoji.name) {
      throw new Error('Emoji has no name')
    }

    const server = new WatchGuildServer(guild)
    const channelId = server.getChannelId('notifier-emoji')
    if (!server.isRegistered() || channelId === null) {
      return
    }
    const channel = guild.channels.cache.get(channelId)
    if (!channel || !channel.isTextBased()) {
      return
    }
    const author = await emoji.fetchAuthor()

    logger.info(
      `🆕 Emoji created: ${emoji.name} (${emoji.id}) in ${guild.name} (${guild.id}) by ${author.username}#${author.discriminator} (${author.id})`
    )

    const matchEmojis = EmojisCache.getFromEmojiName(emoji.name)
    const matchEmojisMention = matchEmojis.map(
      (e) => `- <:${e.name}:${e.id}>: ${e.name} (${e.guild.name})`
    )
    const matchEmojisField = matchEmojisMention
      ? {
          name: 'Duplicate emojis',
          value: matchEmojisMention.join('\n'),
        }
      : undefined

    const fields = matchEmojisField ? [matchEmojisField] : undefined

    await channel.send({
      embeds: [
        {
          title: `:new:NEW EMOJI : ${mentionEmoji(emoji)} (\`${emoji.name}\`)`,
          thumbnail: {
            url: emoji.url,
          },
          author: {
            name: `${author.username}#${author.discriminator}`,
            url: `https://discord.com/users/${author.id}`,
            icon_url: author.avatarURL() ?? author.defaultAvatarURL,
          },
          fields,
          color: 0x00_ff_00,
          timestamp: new Date().toISOString(),
        },
      ],
    })

    await new ListEmojis(this.discord).generate(guild)
  }
}
