import { PluggyClient } from 'pluggy-sdk'

export function getPluggyClient() {
  return new PluggyClient({
    clientId: process.env.PLUGGY_CLIENT_ID,
    clientSecret: process.env.PLUGGY_CLIENT_SECRET,
  })
}
