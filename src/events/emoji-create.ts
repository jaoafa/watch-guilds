import { ClientEvents, GuildEmoji } from 'discord.js'
import { BaseDiscordEvent } from '.'
import { Logger } from '@book000/node-utils'
import { WatchGuildServer } from '@/server'
import { mentionEmoji } from '@/utils'
import { ListEmojis } from '@/list-emojis'
import { EmojisCache } from '@/emojis-caches'
import { Discord } from '@/discord'

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
    if (!server.isRegistered()) {
      return
    }
    const listGeneratorPromise = new ListEmojis(this.discord).generate(guild)

    if (channelId === null) {
      await listGeneratorPromise
      return
    }
    const channel = guild.channels.cache.get(channelId)
    if (!channel || !channel.isTextBased()) {
      await listGeneratorPromise
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
    const matchEmojisField =
      matchEmojisMention.length > 0
        ? {
            name: 'Duplicate emojis',
            value: matchEmojisMention.join('\n'),
          }
        : undefined

    const normalEmojiCount = await Discord.getNormalEmojiCount(guild)
    const animatedEmojiCount = await Discord.getAnimatedEmojiCount(guild)
    const maxEmojiCount = Discord.getMaxEmojiCount(guild)

    const emojiCountField = {
      name: 'Can be add emoji count',
      value: `Normal: ${normalEmojiCount} / ${maxEmojiCount}\nAnimated: ${animatedEmojiCount} / ${maxEmojiCount}`,
    }

    const fields = matchEmojisField
      ? [matchEmojisField, emojiCountField]
      : [emojiCountField]

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

    await listGeneratorPromise
  }
}
