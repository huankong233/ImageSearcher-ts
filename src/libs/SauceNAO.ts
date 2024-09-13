import axios from 'axios'
import * as cheerio from 'cheerio'
import { FormData } from 'formdata-node'
import { fileFromPath } from 'formdata-node/file-from-path'

export const BASE_URL = 'https://saucenao.com'

export type SauceNAOReq = {
  hide?: boolean
} & (
  | {
      imagePath: string
    }
  | {
      url: string
    }
)

export type SauceNAORes = {
  image: string
  title: string
  similarity: number
  misc: string[]
  content: {
    text: string
    link: string
  }[]
}[]

export async function SauceNAO(req: SauceNAOReq): Promise<SauceNAORes> {
  const form = new FormData()

  if ('imagePath' in req && req.imagePath) {
    form.append('file', await fileFromPath(req.imagePath))
  } else if ('url' in req && req.url) {
    form.append('url', req.url)
  } else {
    throw Error('please input imagePath or url')
  }

  if (req.hide) form.append('hide', '3')

  const response = await axios.post<string>(`${BASE_URL}/search.php`, form)
  const data = response.data

  const $ = cheerio.load(data)
  return $('.result')
    .toArray()
    .map((result) => {
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
        misc: misc.toArray().map((m) => m.attribs.href),
        content: content
          .toArray()
          .map((element) => ({
            text: $(element).text(),
            link: element.attribs.href
          }))
          .filter(({ text }) => text.length > 0)
      }
    })
    .filter((v) => v !== undefined)
    .sort((a, b) => b.similarity - a.similarity)
}
