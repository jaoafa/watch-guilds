import { Guild } from 'discord.js'
import fs from 'node:fs'

interface User {
  username: string
  discriminator: string
  id: string
  avatar: string
  public_flags: number
}

export interface Emoji {
  id: string
  name: string
  roles: string[]
  user: User
  require_colons: boolean
  managed: boolean
  animated: boolean
}

export class EmojisCache {
  private static baseServerDirectory = process.env.BASE_EMOJIS_CACHE_DIR
    ? `${process.env.BASE_EMOJIS_CACHE_DIR}/`
    : './data/emojis-cache/'

  public static getFromEmojiName(emojiName: string): Emoji[] {
    const guildIds = this.getFileGuildIds()
    const matchEmojis = []
    for (const guildId of guildIds) {
      const emojis = this.get(guildId)
      matchEmojis.push(
        ...emojis.filter((emoji: Emoji) => emoji.name === emojiName)
      )
    }
    return matchEmojis
  }

  public static get(guildId: string) {
    const path = this.getFilePath(guildId)
    if (!fs.existsSync(path)) {
      return []
    }

    return JSON.parse(fs.readFileSync(path, 'utf8'))
  }

  static async refresh(guild: Guild) {
    const emojis = await guild.emojis.fetch()

    const guildId = guild.id
    const path = this.getFilePath(guildId)
    fs.writeFileSync(path, JSON.stringify(emojis))
  }

  private static getFileGuildIds() {
    const files = fs.readdirSync(this.baseServerDirectory)
    return files.map((file) => file.replace('.json', ''))
  }

  private static getFilePath(guildId: string) {
    return `${this.baseServerDirectory}${guildId}.json`
  }
}
