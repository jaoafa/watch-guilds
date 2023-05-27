import {
  BaseInteraction,
  CacheType,
  Client,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder,
} from 'discord.js'
import { Logger } from '@book000/node-utils'
import { WGConfiguration } from './config'
import { BaseCommand } from './commands'
import { RegisterCommand } from './commands/register'
import { UnregisterCommand } from './commands/unregister'
import { SetChannelCommand } from './commands/set-channel'
import { RemoveChannelCommand } from './commands/remove-channel'
import { BaseDiscordEvent } from './events'
import { DiscordInteractionCreateEvent } from './events/interaction-create'
import { DiscordEmojiCreateEvent } from './events/emoji-create'
import { DiscordEmojiUpdateEvent } from './events/emoji-update'
import { DiscordEmojiDeleteEvent } from './events/emoji-delete'
import { DiscordStickerCreateEvent } from './events/sticker-create'
import { DiscordStickerUpdateEvent } from './events/sticker-update'
import { DiscordStickerDeleteEvent } from './events/sticker-delete'

export class Discord {
  public readonly client: Client

  public static readonly routes: BaseCommand[] = [
    new RegisterCommand(),
    new UnregisterCommand(),
    new SetChannelCommand(),
    new RemoveChannelCommand(),
  ]

  constructor(config: WGConfiguration) {
    this.client = new Client({
      intents: ['Guilds', 'GuildMessages', 'GuildEmojisAndStickers'],
    })
    this.client.on('ready', this.onReady.bind(this))

    const events: BaseDiscordEvent[] = [
      new DiscordInteractionCreateEvent(this),
      new DiscordEmojiCreateEvent(this),
      new DiscordEmojiUpdateEvent(this),
      new DiscordEmojiDeleteEvent(this),
      new DiscordStickerCreateEvent(this),
      new DiscordStickerUpdateEvent(this),
      new DiscordStickerDeleteEvent(this),
    ]
    for (const event of events) {
      event.register()
    }

    this.client.on('interactionCreate', this.onInteractionCreate.bind(this))

    this.client.login(config.get('discord').token)
  }

  public getClient() {
    return this.client
  }

  public close() {
    this.client.destroy()
  }

  async onReady() {
    const logger = Logger.configure('Discord.onReady')
    logger.info(`👌 ready: ${this.client.user?.tag}`)

    await this.updateCommands()

    // 1時間ごとに interactionCreate を再登録する
    setInterval(() => {
      const logger = Logger.configure('Discord.onReady.setInterval')
      logger.info('🔄 Re-registering interactionCreate handler')
      this.client.off('interactionCreate', this.onInteractionCreate.bind(this))
      this.client.on('interactionCreate', this.onInteractionCreate.bind(this))

      this.updateCommands()
    }, 1000 * 60 * 60)
  }

  async onInteractionCreate(interaction: BaseInteraction<CacheType>) {
    if (!interaction.isChatInputCommand()) {
      return
    }

    if (!interaction.command || interaction.command.name !== 'watch-guilds') {
      return
    }
    const guild = interaction.guild
    if (!guild) {
      return
    }
    const command = Discord.routes.find((route) => {
      const group = interaction.options.getSubcommandGroup()
      const subcommand = interaction.options.getSubcommand()
      const definition = route.definition(guild)
      return definition && definition.name === (group ?? subcommand)
    })
    if (!command) return

    if (command.permissions) {
      const permissions = command.permissions.map((permission) => {
        if (permission.identifier) {
          switch (permission.type) {
            case 'USER': {
              return interaction.user.id === permission.identifier
            }
            case 'ROLE': {
              if (!interaction.guild) {
                return false
              }
              const user = interaction.guild.members.resolve(interaction.user)
              if (!user) return false
              return user.roles.cache.has(permission.identifier)
            }
            case 'PERMISSION': {
              if (!interaction.guild) {
                return false
              }
              const user = interaction.guild.members.resolve(interaction.user)
              if (!user) return false
              return user.permissions.has(permission.identifier)
            }
          }
        }
        return true
      })
      if (!permissions.every(Boolean)) {
        await interaction.reply({
          content: 'このコマンドを実行する権限がありません。',
          ephemeral: true,
        })
        return
      }
    }
    await command.execute(this, interaction)
  }

  async updateCommands() {
    const logger = Logger.configure('Discord.updateCommands')
    logger.info('🔄 Updating commands')

    const guilds = await this.client.guilds.fetch()
    for (const guild of guilds.values()) {
      logger.info(`🖥️ Guild: ${guild.name} (${guild.id})`)

      if (!this.client.application) {
        throw new Error('Client#Application is not found.')
      }

      const builder = new SlashCommandBuilder()
        .setName('watch-guilds')
        .setDescription('watch-guilds commands')

      for (const route in Discord.routes) {
        if (!Discord.routes[route].conditions(guild)) {
          continue
        }
        const definition = Discord.routes[route].definition(guild)
        if (!definition) {
          continue
        }
        logger.info('🖥️ SubCommand: ' + definition.name)
        if (definition instanceof SlashCommandSubcommandBuilder) {
          builder.addSubcommand(definition)
        }
        if (definition instanceof SlashCommandSubcommandGroupBuilder) {
          builder.addSubcommandGroup(definition)
        }
      }

      await this.client.application.commands.set([builder.toJSON()], guild.id)
    }

    logger.info('👌 Commands updated')
  }

  waitReady() {
    return new Promise<void>((resolve) => {
      if (this.client.isReady()) {
        resolve()
      }
      this.client.once('ready', () => {
        resolve()
      })
    })
  }
}
