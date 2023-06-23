import fetch from 'node-fetch'
import { fileFrom } from 'fetch-blob/from.js'
import { FormData } from 'formdata-polyfill/esm.min.js'

export const PROXY_URL = 'https://ascii2d.obfs.dev'
export const BASE_URL = 'https://ascii2d.net'

interface ascii2d {
  type: 'color' | 'bovw'
  proxy: boolean
  imagePath?: string
  url?: string
}

export async function ascii2d(req: ascii2d) {
  const { type, imagePath, url, proxy } = req
  const form = new FormData()
  if (imagePath) {
    form.append('file', await fileFrom(imagePath))
  } else if (url) {
    form.append('uri', url)
  } else {
    throw Error('please input imagePath or url')
  }

  const colorResponse = await fetch(
    `${proxy ? PROXY_URL : BASE_URL}/search/${imagePath ? 'file' : 'uri'}`,
    {
      method: 'POST',
      body: form
    }
  )

  if (colorResponse.status === 200) {
    let response
    if (type === 'color') {
      response = await colorResponse.text()
    } else {
      const bovwUrl = colorResponse.url.replace('/color/', '/bovw/')
      response = await fetch(bovwUrl).then(res => res.text())
    }
    return parse(response)
  } else {
    throw new Error('The request failed, possibly triggering cloudflare js-challenge')
  }
}

import * as cheerio from 'cheerio'
import _ from 'lodash'

export function parse(body: string) {
  const $ = cheerio.load(body, { decodeEntities: true })
  return _.map($('.item-box'), item => {
    const detail = $('.detail-box', item),
      hash = $('.hash', item),
      info = $('.info-box > .text-muted', item),
      [image] = $('.image-box > img', item),
      [source, author] = $('a[rel=noopener]', detail)

    if (!source && !author) return

    return {
      hash: hash.text(),
      info: info.text(),
      image: new URL(image.attribs['src'] ?? image.attribs['data-cfsrc'], BASE_URL).toString(),
      source: source ? { link: source.attribs.href, text: $(source).text() } : undefined,
      author: author ? { link: author.attribs.href, text: $(author).text() } : undefined
    }
  }).filter(<T>(v: T | undefined): v is T => v !== undefined)
}
