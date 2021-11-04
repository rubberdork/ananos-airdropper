import fs from 'fs-extra'
const { ensureFile, promises: { open } } = fs

import { promisify } from 'util'
import csv from 'csv'
const stringify = promisify(csv.stringify)

async function writeFile (filePath, data) {
  await ensureFile(filePath)
  const file = open(filePath, 'a')
  return Promise.all([file, data]).then(([file, data]) => {
    return file.appendFile(data).then(() => file.close())
  })
}

export function writeReport (filePath, data, columns) {
  return writeFile(filePath, stringify(data, { header: true, columns }))
}

export function writeLog (filePath, data) {
  return writeFile(filePath, JSON.stringify(data, null, 2))
}
