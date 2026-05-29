import { HomeResponse, SearchResult, InfoResponse, EpisodeInfo, WatchResponse } from '@/core/types'

import * as animedubhindiHomeMod from './animedubhindi/home'
import * as animedubhindiSearchMod from './animedubhindi/search'
import * as animedubhindiInfoMod from './animedubhindi/info'
import * as animedubhindiEpisodesMod from './animedubhindi/episodes'
import * as animedubhindiWatchMod from './animedubhindi/watch'

import * as animedekhoHomeMod from './animedekho/home'
import * as animedekhoSearchMod from './animedekho/search'
import * as animedekhoInfoMod from './animedekho/info'
import * as animedekhoEpisodesMod from './animedekho/episodes'
import * as animedekhoWatchMod from './animedekho/watch'

import * as hdhub4uHomeMod from './hdhub4u/home'
import * as hdhub4uSearchMod from './hdhub4u/search'
import * as hdhub4uInfoMod from './hdhub4u/info'
import * as hdhub4uEpisodesMod from './hdhub4u/episodes'
import * as hdhub4uWatchMod from './hdhub4u/watch'

interface ProviderModule {
  home: (provider: string, page?: number) => Promise<HomeResponse>
  search: (provider: string, query: string, page?: number) => Promise<SearchResult[]>
  info: (provider: string, url: string) => Promise<InfoResponse>
  episodes: (provider: string, url: string) => Promise<EpisodeInfo[]>
  watch: (provider: string, type: string, id: string) => Promise<WatchResponse>
}

const registry: Record<string, ProviderModule> = {
  animedubhindi: {
    home: (p, pg) => animedubhindiHomeMod.home(p, pg), search: (p, q, pg) => animedubhindiSearchMod.search(p, q),
    info: (p, u) => animedubhindiInfoMod.info(p, u), episodes: (p, u) => animedubhindiEpisodesMod.episodes(p, u),
    watch: (p, t, i) => animedubhindiWatchMod.watch(p, t, i),
  },
  animedekho: {
    home: (p, pg) => animedekhoHomeMod.home(p), search: (p, q, pg) => animedekhoSearchMod.search(p, q),
    info: (p, u) => animedekhoInfoMod.info(p, u), episodes: (p, u) => animedekhoEpisodesMod.episodes(p, u),
    watch: (p, t, i) => animedekhoWatchMod.watch(p, t, i),
  },
  hdhub4u: {
    home: (p, pg) => hdhub4uHomeMod.home(p, pg), search: (p, q, pg) => hdhub4uSearchMod.search(p, q, pg),
    info: (p, u) => hdhub4uInfoMod.info(p, u), episodes: (p, u) => hdhub4uEpisodesMod.episodes(p, u),
    watch: (p, t, i) => hdhub4uWatchMod.watch(p, t, i),
  },
}

export function getProviderModule(id: string): ProviderModule | undefined {
  return registry[id]
}
