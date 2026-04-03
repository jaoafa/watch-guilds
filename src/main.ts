import { Logger } from '@book000/node-utils'
import { Discord } from './discord'
import { WGConfiguration } from './config'

function main() {
  const logger = Logger.configure('main')
  logger.info('🚀 Starting...')

  const config = new WGConfiguration('data/config.json')
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
    logger.info('👋 SIGINT signal received.')
    discord
      .close()
      .then(() => {
        process.exit(0)
      })
      .catch((err: unknown) => {
        logger.error('❌ Failed to close Discord client', err as Error)
        process.exit(1)
      })
  })
}

main()
