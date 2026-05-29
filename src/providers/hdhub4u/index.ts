import { ProviderManifest } from '@/core/types'
import { getDomainUrl } from './headers'

export const manifest: ProviderManifest = {
  id: 'hdhub4u',
  name: 'HDHub4U',
  lang: 'hi',
  type: ['movie', 'series', 'anime'],
  baseUrl: 'https://hdhub4u.rehab',
}
