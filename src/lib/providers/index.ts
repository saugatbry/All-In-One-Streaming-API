import { ProviderInfo } from '../types'
import * as allmovieland from './allmovieland'
import * as animedekho from './animedekho'
import * as animedubhindi from './animedubhindi'
import * as hdhub4u from './hdhub4u'
import * as hindmoviez from './hindmoviez'
import * as iptvplayer from './iptvplayer'
import * as multimovies from './multimovies'
import * as publicsportsiptv from './publicsportsiptv'
import * as uhdmovies from './uhdmovies'

export interface ProviderModule {
  id: string
  name: string
  lang: string
  type: string
  baseUrl: string
  mainPage: (page?: number) => Promise<any>
  search: (query: string, page?: number) => Promise<any>
  info: (url: string) => Promise<any>
  streams: (data: any) => Promise<any>
}

const providers: Record<string, ProviderModule> = {
  allmovieland,
  animedekho,
  animedubhindi,
  hdhub4u,
  hindmoviez,
  iptvplayer,
  multimovies,
  publicsportsiptv,
  uhdmovies,
}

export function getProvider(id: string): ProviderModule | undefined {
  return providers[id]
}

export function listProviders(): ProviderInfo[] {
  return Object.values(providers).map((p) => ({
    id: p.id,
    name: p.name,
    lang: p.lang,
    type: p.type,
    baseUrl: p.baseUrl,
  }))
}
