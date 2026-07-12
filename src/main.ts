import { Logger } from '@book000/node-utils'
import { Discord } from './discord'
import { WGConfig } from './config'

function main() {
  const logger = Logger.configure('main')
  logger.info('🚀 Starting...')

  const config = new WGConfig('data/config.json')
  config.load()
  if (!config.validate()) {
    logger.error('❌ Configuration is invalid')
    logger.error(
      `💡 Missing check(s): ${config.getValidateFailures().join(', ')}`
    )
    process.exitCode = 1
    return
  }

  const discord = new Discord(config)
  process.once('SIGINT', () => {
    ;(async () => {
      logger.info('👋 SIGINT signal received.')
      try {
        await discord.close()
        process.exit(0)
      } catch (error) {
        logger.error('❌ Failed to close Discord client', error as Error)
        process.exit(1)
      }
    })()
  })
}

main()
