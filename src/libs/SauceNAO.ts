import fetch from 'node-fetch'
import { fileFrom } from 'fetch-blob/from.js'
import { FormData } from 'formdata-polyfill/esm.min.js'

export const BASE_URL = 'https://saucenao.com'

interface SauceNAO {
  hide: boolean
  imagePath?: string
  url?: string
}

export async function SauceNAO(req: SauceNAO) {
  const { hide, imagePath, url } = req
  let form = new FormData()
  if (imagePath) {
    form.append('file', await fileFrom(imagePath))
  } else if (url) {
    form.append('url', url)
  } else {
    throw Error('please input imagePath or url')
  }

  if (hide) form.append('hide', '3')

  const response = await fetch(`${BASE_URL}/search.php`, { method: 'POST', body: form }).then(res =>
    res.text()
  )

  return parse(response)
}

import * as cheerio from 'cheerio'
import _ from 'lodash'

export function parse(body: string) {
  const $ = cheerio.load(body, { decodeEntities: true })
  return _.map($('.result'), result => {
    const image = $('.resultimage img', result),
      title = $('.resulttitle', result),
      similarity = $('.resultsimilarityinfo', result),
      misc = $('.resultmiscinfo > a', result),
      content = $('.resultcontentcolumn > *', result)
    if (title.length <= 0) return

    const imageUrl = image.attr('data-src2') ?? image.attr('data-src') ?? image.attr('src') ?? ''

    return {
      image: imageUrl,
      title: title.text(),
      similarity: parseFloat(similarity.text()),
      misc: _.map(misc, m => m.attribs.href),
      content: _.map(content, element => ({
        text: $(element).text(),
        link: element.attribs.href
      })).filter(({ text }) => text.length > 0)
    }
  })
    .filter(<T>(v: T | undefined): v is T => v !== undefined)
    .sort((a, b) => a.similarity - b.similarity)
    .reverse()
}
