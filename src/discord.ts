import {
  BaseGuild,
  BaseInteraction,
  Client,
  GatewayIntentBits,
  Guild,
  GuildPremiumTier,
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
import { DiscordEmojiCreateEvent } from './events/emoji-create'
import { DiscordEmojiUpdateEvent } from './events/emoji-update'
import { DiscordEmojiDeleteEvent } from './events/emoji-delete'
import { DiscordStickerCreateEvent } from './events/sticker-create'
import { DiscordStickerUpdateEvent } from './events/sticker-update'
import { DiscordStickerDeleteEvent } from './events/sticker-delete'
import { RegenerateCommand } from './commands/regenerate'
import { UpdateCommand } from './commands/update-command'
import { DiscordGuildCreateEvent } from './events/guild-create'
import { EmojisCache } from './emojis-caches'
import { CheckPermissionsCommand } from './commands/check-permissions'

export class Discord {
  public readonly client: Client

  private onInteractionFunction: (interaction: BaseInteraction) => void

  public static readonly routes: BaseCommand[] = [
    new RegisterCommand(),
    new UnregisterCommand(),
    new SetChannelCommand(),
    new RemoveChannelCommand(),
    new RegenerateCommand(),
    new UpdateCommand(),
    new CheckPermissionsCommand(),
  ]

  constructor(config: WGConfiguration) {
    const logger = Logger.configure('Discord.constructor')
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildExpressions,
      ],
    })
    this.client.on('ready', () => {
      this.onReady().catch((error: unknown) => {
        logger.error('❌ Failed to onReady', error as Error)
      })
    })
    this.client.on('guildCreate', (guild) => {
      this.updateCommands(guild).catch((error: unknown) => {
        logger.error('❌ Failed to updateCommands', error as Error)
      })
    })

    const events: BaseDiscordEvent[] = [
      new DiscordGuildCreateEvent(this),
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

    this.onInteractionFunction = (interaction) => {
      this.onInteractionCreate(interaction).catch((error: unknown) => {
        logger.error('❌ Failed to run onInteractionCreate', error as Error)
      })
    }
    this.client.on('interactionCreate', this.onInteractionFunction)

    this.client.login(config.get('discord').token).catch((error: unknown) => {
      logger.error('❌ Failed to login', error as Error)
    })
  }

  public getClient() {
    return this.client
  }

  public async close() {
    await this.client.destroy()
  }

  async onReady() {
    const logger = Logger.configure('Discord.onReady')
    logger.info(`👌 ready: ${this.client.user?.tag}`)

    await this.updateAllGuildCommands()
    await this.fetchAllGuildEmojis()

    // 1時間ごとに interactionCreate を再登録する
    setInterval(
      () => {
        const logger = Logger.configure('Discord.onReady.setInterval')
        logger.info('🔄 Re-registering interactionCreate handler')
        this.client.off('interactionCreate', this.onInteractionFunction)
        this.client.on('interactionCreate', this.onInteractionFunction)

        this.updateAllGuildCommands().catch((error: unknown) => {
          logger.error('❌ Failed to update commands', error as Error)
        })
      },
      1000 * 60 * 60
    )
  }

  async onInteractionCreate(interaction: BaseInteraction) {
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

  async fetchAllGuildEmojis() {
    const logger = Logger.configure('Discord.fetchAllGuildEmojis')
    logger.info('🔄 Fetching emojis')

    const guilds = await this.client.guilds.fetch()
    for (const guild of guilds.values()) {
      await EmojisCache.refresh(await guild.fetch())
    }

    logger.info('👌 Emojis fetched')
  }

  async updateAllGuildCommands() {
    const logger = Logger.configure('Discord.updateAllGuildCommands')
    logger.info('🔄 Updating commands')

    const guilds = await this.client.guilds.fetch()
    for (const guild of guilds.values()) {
      await this.updateCommands(guild)
    }

    logger.info('👌 Commands updated')
  }

  async updateCommands(guild: BaseGuild) {
    const logger = Logger.configure('Discord.updateCommands')
    logger.info(`🖥️ Guild: ${guild.name} (${guild.id})`)

    if (!this.client.application) {
      throw new Error('Client#Application is not found.')
    }

    const builder = new SlashCommandBuilder()
      .setName('watch-guilds')
      .setDescription('watch-guilds commands')

    for (const route of Discord.routes) {
      if (!route.conditions(guild)) {
        continue
      }
      const definition = route.definition(guild)
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

    await this.client.application.commands.create(builder.toJSON(), guild.id)
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

  public static async getNormalEmojiCount(guild: Guild) {
    const emojis = await guild.emojis.fetch()
    return emojis.filter((emoji) => !emoji.animated).size
  }

  public static async getAnimatedEmojiCount(guild: Guild) {
    const emojis = await guild.emojis.fetch()
    return emojis.filter((emoji) => emoji.animated).size
  }

  public static async getStickerCount(guild: Guild) {
    const stickers = await guild.stickers.fetch()
    return stickers.size
  }

  public static getMaxEmojiCount(guild: Guild) {
    switch (guild.premiumTier) {
      case GuildPremiumTier.Tier1: {
        // レベル1 = 100 絵文字スロット
        return 100
      }
      case GuildPremiumTier.Tier2: {
        // レベル2 = 150 絵文字スロット
        return 150
      }
      case GuildPremiumTier.Tier3: {
        // レベル3 = 250 絵文字スロット
        return 250
      }
      default: {
        // レベル0 = 50 絵文字スロット
        return 50
      }
    }
  }

  public static getMaxStickerCount(guild: Guild) {
    switch (guild.premiumTier) {
      case GuildPremiumTier.Tier1: {
        // レベル1 = 15 ステッカースロット
        return 15
      }
      case GuildPremiumTier.Tier2: {
        // レベル2 = 30 ステッカースロット
        return 30
      }
      case GuildPremiumTier.Tier3: {
        // レベル3 = 60 ステッカースロット
        return 60
      }
      default: {
        // レベル0 = 5 ステッカースロット
        return 5
      }
    }
  }
}
