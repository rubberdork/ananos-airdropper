import { open } from 'fs/promises'
import { promisify } from 'util'
import csv from 'csv'

const stringify = promisify(csv.stringify)

function writeFile (filePath, data) {
  const file = open(filePath, 'a')
  return Promise.all([file, data]).then(([file, data]) => {
    return file.appendFile(data)
  })
}

export function writeReport (filePath, data, columns) {
  return writeFile(filePath, stringify(data, { columns }))
}

export function writeLog (filePath, data) {
  return writeFile(filePath, JSON.stringify(data, null, 2))
}
