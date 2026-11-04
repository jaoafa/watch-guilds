import { AuditLogEvent, GuildSoundboardSound } from 'discord.js'
import { BaseDiscordEvent } from '.'
import { Logger } from '@book000/node-utils'
import { WatchGuildServer } from '@/server'
import {
  emojiText,
  fetchSoundboardExecutor,
  quoted,
  toEmbedAuthor,
} from './soundboard-sound-utils'

interface SoundChange {
  type: 'Name' | 'Volume' | 'Emoji'
  before: string
  after: string
}

export class DiscordSoundboardSoundUpdateEvent extends BaseDiscordEvent {
  readonly eventName = 'guildSoundboardSoundUpdate'

  async execute(
    oldSound: GuildSoundboardSound | null,
    newSound: GuildSoundboardSound
  ) {
    const logger = Logger.configure('Discord.onSoundboardSoundUpdate')
    const guild = newSound.guild

    const server = new WatchGuildServer(guild)
    const channelId = server.getChannelId('notifier-sound-board')
    if (channelId === null || !server.isRegistered()) {
      return
    }
    const channel = guild.channels.cache.get(channelId)
    if (!channel?.isTextBased()) {
      return
    }

    if (!oldSound) {
      logger.info(
        `ℹ️ Skipped soundboard sound update without cached old state: ${newSound.name} (${newSound.soundId})`
      )
      return
    }

    const changes = this.getChanges(oldSound, newSound)
    if (changes.length === 0) {
      logger.info(
        `ℹ️ Skipped soundboard sound update without detectable changes: ${newSound.name} (${newSound.soundId})`
      )
      return
    }

    logger.info(
      `🔄 Soundboard sound updated (${changes.map((c) => c.type).join(', ')}): ${oldSound.name} (${oldSound.soundId})`
    )

    const updatedBy = await fetchSoundboardExecutor(
      guild,
      AuditLogEvent.SoundboardSoundUpdate,
      newSound.soundId
    )

    try {
      await channel.send({
        embeds: [
          {
            title: `:repeat: UPDATED SOUNDBOARD SOUND (${changes.map((c) => c.type).join(', ')}) : ${newSound.name}`,
            fields: changes.flatMap((change) => [
              {
                name: `Before (${change.type})`,
                value: quoted(change.before),
                inline: true,
              },
              {
                name: `After (${change.type})`,
                value: quoted(change.after),
                inline: true,
              },
            ]),
            author: toEmbedAuthor(updatedBy),
            color: 0xff_a5_00,
            timestamp: new Date().toISOString(),
          },
        ],
      })
    } catch (error: unknown) {
      logger.error(
        `❌ Failed to send notification: ${guild.name} (${guild.id})`,
        error as Error
      )
    }
  }

  getChanges(
    oldSound: GuildSoundboardSound,
    newSound: GuildSoundboardSound
  ): SoundChange[] {
    const changes: SoundChange[] = []
    if (oldSound.name !== newSound.name) {
      changes.push({
        type: 'Name',
        before: oldSound.name,
        after: newSound.name,
      })
    }
    if (oldSound.volume !== newSound.volume) {
      changes.push({
        type: 'Volume',
        before: `${Math.round(oldSound.volume * 100)}%`,
        after: `${Math.round(newSound.volume * 100)}%`,
      })
    }
    const oldEmoji = emojiText(oldSound)
    const newEmoji = emojiText(newSound)
    if (oldEmoji !== newEmoji) {
      changes.push({ type: 'Emoji', before: oldEmoji, after: newEmoji })
    }
    return changes
  }
}
