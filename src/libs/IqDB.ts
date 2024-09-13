import axios from 'axios'
import * as cheerio from 'cheerio'
import { FormData } from 'formdata-node'
import { fileFromPath } from 'formdata-node/file-from-path'

export const BASE_URL = 'https://iqdb.org/'

export type IqDBReq = {
  discolor?: boolean
  services: servicesKeys[]
} & (
  | {
      url: string
    }
  | {
      imagePath: string
    }
)

type servicesKeys =
  | 'danbooru'
  | 'konachan'
  | 'yandere'
  | 'gelbooru'
  | 'sankaku_channel'
  | 'e_shuushuu'
  | 'zerochan'
  | 'anime_pictures'

export type IqDBRes = {
  url: string
  image: string
  similarity: number
  resolution: string
  level: string
}[]

export async function IqDB(req: IqDBReq): Promise<IqDBRes> {
  const form = new FormData()

  if ('imagePath' in req && req.imagePath) {
    form.append('file', await fileFromPath(req.imagePath))
  } else if ('url' in req && req.url) {
    form.append('url', req.url)
  } else {
    throw Error('please input imagePath or url')
  }

  const { services, discolor = true } = req

  if (services) services.forEach((s, index) => form.append(`service.${index}`, s.toString()))
  if (discolor) form.append('forcegray', 'on')

  const response = await axios.post<string>(BASE_URL, form)
  const data = response.data
  const $ = cheerio.load(data)
  return $('table')
    .toArray()
    .map((result) => {
      const content = $(result).text()
      const [link] = $('td.image > a', result)
      const [image] = $('td.image img', result)

      // 忽略自己的图片
      if (!link) return

      const [, similarity] = content.match(/(\d+%)\s*similarity/) ?? []
      const [, level] = content.match(/\[(\w+)\]/) ?? []
      const [, resolution] = content.match(/(\d+×\d+)/) ?? []

      return {
        url: new URL(link.attribs.href, BASE_URL).toString(),
        image: new URL(image.attribs.src, BASE_URL).toString(),
        similarity: parseFloat(similarity),
        resolution,
        level: level.toLowerCase()
      }
    })
    .filter((v) => v !== undefined)
    .sort((a, b) => b.similarity - a.similarity)
}
