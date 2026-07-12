import { GuildEmoji } from 'discord.js'

export function mentionEmoji(emoji: GuildEmoji): string {
  return `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`
}
