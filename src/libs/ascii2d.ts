import axios from 'axios'
import * as cheerio from 'cheerio'
import { FormData } from 'formdata-node'
import { fileFromPath } from 'formdata-node/file-from-path'

export const PROXY_URL = 'https://ascii2d.obfs.dev'
export const BASE_URL = 'https://ascii2d.net'

export type ascii2dReq = {
  type: 'color' | 'bovw'
  proxy?: boolean
} & (
  | {
      imagePath: string
    }
  | {
      url: string
    }
)

export type ascii2dRes = {
  hash: string
  info: string
  image: string
  source:
    | {
        link: string
        text: string
      }
    | undefined
  author:
    | {
        link: string
        text: string
      }
    | undefined
}[]

export async function ascii2d(req: ascii2dReq): Promise<ascii2dRes> {
  const { type, proxy = true } = req

  const form = new FormData()
  if ('imagePath' in req && req.imagePath) {
    form.append('file', await fileFromPath(req.imagePath))
  } else if ('url' in req && req.url) {
    form.append('uri', req.url)
  } else {
    throw Error('please input imagePath or url')
  }

  const colorResponse = await axios.post<string>(
    `${proxy ? PROXY_URL : BASE_URL}/search/${
      'imagePath' in req && req.imagePath ? 'file' : 'uri'
    }`,
    form
  )

  let response: string
  if (type === 'color') {
    response = colorResponse.data
  } else {
    const bovwUrl = colorResponse.request.path.replace('/color/', '/bovw/')
    const bovwRes = await axios.get<string>(`${req.proxy ? PROXY_URL : BASE_URL}${bovwUrl}`)
    response = bovwRes.data
  }

  const $ = cheerio.load(response)
  return $('.item-box')
    .toArray()
    .map((item) => {
      const detail = $('.detail-box', item)
      const hash = $('.hash', item)
      const info = $('.info-box > .text-muted', item)
      const [image] = $('.image-box > img', item)
      const [source, author] = $('a[rel=noopener]', detail)

      return {
        hash: hash.text(),
        info: info.text(),
        image: new URL(
          image.attribs['src'] ?? image.attribs['data-cfsrc'],
          req.proxy ? PROXY_URL : BASE_URL
        ).toString(),
        source: source ? { link: source.attribs.href, text: $(source).text() } : undefined,
        author: author ? { link: author.attribs.href, text: $(author).text() } : undefined
      }
    })
}
