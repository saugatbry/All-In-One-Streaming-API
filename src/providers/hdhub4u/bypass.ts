import { hdhub4uRedirect } from '@/core/extractors'

export async function bypass(url: string): Promise<string> {
  return (await hdhub4uRedirect(url)) || url
}
