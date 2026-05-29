import { ProviderManifest } from '@/core/types'
import { manifest as animedubhindi } from './animedubhindi/index'
import { manifest as animedekho } from './animedekho/index'
import { manifest as hdhub4u } from './hdhub4u/index'

const manifests: Record<string, ProviderManifest> = {
  animedubhindi, animedekho, hdhub4u,
}

export const providerList: ProviderManifest[] = Object.values(manifests)

export function getProviderManifest(id: string): ProviderManifest | undefined {
  return manifests[id.toLowerCase()]
}

export function isProvider(id: string): boolean {
  return id.toLowerCase() in manifests
}
