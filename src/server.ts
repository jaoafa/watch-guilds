import { BaseGuild, NewsChannel, TextChannel } from 'discord.js'
import fs from 'node:fs'

export const wgChannelTypes = [
  'list-emoji',
  'notifier-emoji',
  'notifier-sticker',
  'notifier-sound-board',
] as const
export type WGChannelType = (typeof wgChannelTypes)[number]

interface WatchGuildServerData {
  id: string
  name: string
  channels: { [key in WGChannelType]: string | null }
}

export class WatchGuildServer {
  private readonly path: string
  private readonly guild: BaseGuild

  constructor(guild: BaseGuild) {
    this.guild = guild

    const baseServerDirectory = './data/servers/'
    if (!fs.existsSync(baseServerDirectory)) {
      fs.mkdirSync(baseServerDirectory, { recursive: true })
    }

    this.path = `${baseServerDirectory}${guild.id}.json`
  }

  register(): boolean {
    if (fs.existsSync(this.path)) {
      return false
    }

    const data: WatchGuildServerData = {
      id: this.guild.id,
      name: this.guild.name,
      channels: {
        'list-emoji': null,
        'notifier-emoji': null,
        'notifier-sticker': null,
        'notifier-sound-board': null,
      },
    }

    fs.writeFileSync(this.path, JSON.stringify(data, null, 2))
    return true
  }

  unregister(): boolean {
    if (!fs.existsSync(this.path)) {
      return false
    }

    fs.unlinkSync(this.path)
    return true
  }

  getChannelId(type: WGChannelType): string | null {
    if (!fs.existsSync(this.path)) {
      return null
    }

    const data: WatchGuildServerData = JSON.parse(
      fs.readFileSync(this.path, 'utf8')
    )
    return data.channels[type] ?? null
  }

  setChannel(type: WGChannelType, channel: TextChannel | NewsChannel): boolean {
    if (!fs.existsSync(this.path)) {
      return false
    }

    const data: WatchGuildServerData = JSON.parse(
      fs.readFileSync(this.path, 'utf8')
    )
    data.channels[type] = channel.id

    fs.writeFileSync(this.path, JSON.stringify(data, null, 2))
    return true
  }

  removeChannel(type: WGChannelType): boolean {
    if (!fs.existsSync(this.path)) {
      return false
    }

    const data: WatchGuildServerData = JSON.parse(
      fs.readFileSync(this.path, 'utf8')
    )
    data.channels[type] = null

    fs.writeFileSync(this.path, JSON.stringify(data, null, 2))
    return true
  }

  isRegistered() {
    return fs.existsSync(this.path)
  }

  isActive(type: WGChannelType): boolean {
    if (!fs.existsSync(this.path)) {
      return false
    }
    const data: WatchGuildServerData = JSON.parse(
      fs.readFileSync(this.path, 'utf8')
    )
    return data.channels[type] !== null
  }
}
