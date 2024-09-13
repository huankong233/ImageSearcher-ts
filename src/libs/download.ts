import axios from 'axios'
import fs from 'fs'
import mime from 'mime-types'
import path from 'path'
import url from 'url'

export const getRangeCode = (len = 6) => {
  var orgStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let returnStr = ''
  for (var i = 0; i < len; i++) {
    returnStr += orgStr.charAt(Math.floor(Math.random() * orgStr.length))
  }
  return returnStr
}

export function removeFileDir(path: string) {
  if (fs.existsSync(path)) {
    var files = fs.readdirSync(path)
    for (let item of files) {
      var stats = fs.statSync(`${path}/${item}`)
      if (stats.isDirectory()) {
        removeFileDir(`${path}/${item}`)
      } else {
        fs.unlinkSync(`${path}/${item}`)
      }
    }
    fs.rmdirSync(path)
  }
}

const basePath = path.dirname(url.fileURLToPath(import.meta.url))
const tempPath = path.join(basePath, '../temp')

/**
 * 下载文件
 * @param url 下载链接
 * @param ext 如果是下载文件类型未知则使用的文件后缀
 * @returns 完整的下载路径
 */
export async function download(url: string, ext = '.png') {
  if (fs.existsSync(tempPath)) removeFileDir(tempPath)
  fs.mkdirSync(tempPath)

  const fileName = getRangeCode(10) + '.temp'
  const fullPath = path.join(tempPath, fileName)
  const filePath = await _download(url, fullPath)

  const contentType = mime.lookup(filePath)
  if (contentType) {
    const extension = mime.extension(contentType)
    if (extension) ext = '.' + extension
  }

  fs.renameSync(filePath, fullPath + ext)

  return fullPath + ext
}

/**
 * 内部方法!!!请勿调用
 * @param url 地址
 * @param fullPath 完整路径
 * @returns
 */
async function _download(url: string, fullPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    axios
      .get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          Refer: url
        }
      })
      .then((res) => {
        const buffer = Buffer.from(res.data, 'binary')
        fs.writeFileSync(fullPath, buffer)
        resolve(fullPath)
      })
      .catch((error) => reject(error))
  })
}
