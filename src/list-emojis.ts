import {
  Guild,
  BaseGuild,
  TextBasedChannel,
  Message,
  PartialGroupDMChannel,
} from 'discord.js'
import { Discord } from './discord'
import { mentionEmoji } from './utilities'
import fs from 'node:fs'
import { WatchGuildServer } from './server'
import { Logger } from '@book000/node-utils'
import natsort from 'natsort'

export class ListEmojis {
  private readonly discord: Discord
  private readonly baseDirectory: string
  private readonly MESSAGE_LIMIT = 1900

  constructor(discord: Discord) {
    this.discord = discord

    const baseServerDirectory = process.env.BASE_EMOJI_LISTS_DIR
      ? `${process.env.BASE_EMOJI_LISTS_DIR}/`
      : './data/emoji-lists/'
    if (!fs.existsSync(baseServerDirectory)) {
      fs.mkdirSync(baseServerDirectory, { recursive: true })
    }

    this.baseDirectory = baseServerDirectory
  }

  public async run() {
    const guilds = await this.discord.client.guilds.fetch()
    for (const oauth2guild of guilds.values()) {
      await this.generate(oauth2guild)
    }
  }

  public async generate(baseGuild: BaseGuild) {
    const logger = Logger.configure('ListEmojis.generate')
    const guild = await baseGuild.fetch()

    const server = new WatchGuildServer(guild)
    if (!server.isRegistered()) {
      return
    }

    const channelId = server.getChannelId('list-emoji')
    if (!channelId) {
      return
    }
    logger.info(`📝 Generating list for ${guild.name} (${guild.id})`)

    const channel = await this.discord.client.channels.fetch(channelId)
    if (!channel?.isTextBased()) {
      logger.warn(`❌ Channel not found: ${channelId}`)
      return
    }
    if (channel.isDMBased()) {
      logger.warn(`❌ Channel is unsupported (DM): ${channelId}`)
      return
    }

    let messages = await this.getListMessages(guild, channel)
    logger.info(`📝 Found ${messages.length} messages`)

    const isRefresh = await this.deleteMessagesIfAlreadyDeleted(messages)
    if (isRefresh) {
      this.deleteListMessagesCache(guild)
      messages = []

      logger.info('📝 Refreshing list')
    }

    const emojis = await this.getEmojis(guild)
    const messageContents = this.splitText(emojis, this.MESSAGE_LIMIT)
    logger.info(
      `📝 Found ${emojis.length} emojis. Split into ${messageContents.length} messages`
    )

    const newMessages = await this.replaceOrCreateMessage(
      channel,
      messages,
      messageContents
    )
    this.saveListMessages(guild, newMessages)

    // 不要なメッセージを削除する: messagesにはあるけど、newMessagesにはないメッセージを削除する
    const messagesToDelete = messages.filter((message) =>
      newMessages.every((newMessage) => newMessage.id !== message?.id)
    )
    await Promise.all(
      messagesToDelete.map(async (message) => {
        if (!message) return
        try {
          await message.delete()
        } catch {
          // 既に削除されている場合は無視する
        }
      })
    )

    logger.info('📝 Generated!')
  }

  private async replaceOrCreateMessage(
    channel: Exclude<TextBasedChannel, PartialGroupDMChannel>,
    messages: (Message | null)[],
    contents: string[]
  ) {
    const promises: Promise<Message>[] = []
    // eslint-disable-next-line unicorn/no-for-loop
    for (let index = 0; index < contents.length; index++) {
      const content = contents[index]
      const message = messages.length > index ? messages[index] : null
      if (message) {
        promises.push(message.edit(content))
      } else {
        promises.push(channel.send(content))
      }
    }
    return await Promise.all(promises)
  }

  /**
   * メッセージが一つでも削除されている場合、すべてのメッセージを削除する
   *
   * @param channel チャンネル
   * @param messageIds メッセージID
   */
  private async deleteMessagesIfAlreadyDeleted(messages: (Message | null)[]) {
    // 一つでもメッセージが存在しなかったら、すべてのメッセージを削除する
    if (messages.every(Boolean)) {
      return false
    }

    await Promise.all(
      messages.map(async (message) => {
        if (!message) return
        try {
          await message.delete()
        } catch {
          // 既に削除されている場合は無視する
        }
      })
    )
    return true
  }

  private async getListMessages(guild: Guild, channel: TextBasedChannel) {
    const path = `${this.baseDirectory}${guild.id}.json`
    if (!fs.existsSync(path)) {
      return []
    }

    const messageIds: string[] = JSON.parse(fs.readFileSync(path, 'utf8'))

    return await Promise.all(
      messageIds.map((messageId) => this.getMessage(channel, messageId))
    )
  }

  private deleteListMessagesCache(guild: Guild) {
    const path = `${this.baseDirectory}${guild.id}.json`
    if (!fs.existsSync(path)) {
      return
    }

    fs.unlinkSync(path)
  }

  private saveListMessages(guild: Guild, messages: Message[]) {
    const path = `${this.baseDirectory}${guild.id}.json`
    const messageIds = messages.map((message) => message.id)

    fs.writeFileSync(path, JSON.stringify(messageIds))
  }

  private async getMessage(channel: TextBasedChannel, messageId: string) {
    try {
      return await channel.messages.fetch(messageId)
    } catch {
      return null
    }
  }

  private async getEmojis(guild: Guild) {
    const emojis = await guild.emojis.fetch()
    const sorter = natsort()
    return emojis
      .values()
      .toArray()
      .toSorted((a, b) => {
        if (!a.name) return 0
        if (!b.name) return 0

        return sorter(a.name, b.name)
      })
      .map((emoji) => {
        return `${mentionEmoji(emoji)} = \`${emoji.name}\``
      })
  }

  private splitText(texts: string[], limit: number) {
    const result: string[] = []
    let current = ''
    for (const text of texts) {
      if (current.length + text.length > limit) {
        result.push(current)
        current = ''
      }
      current += text + '\n'
    }
    result.push(current)

    // 空白配列を削除する
    return result.filter((text) => text.length > 0)
  }
}
