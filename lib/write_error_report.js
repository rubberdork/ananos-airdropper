import { open } from 'fs/promises'
import { promisify } from 'util'
import csv from 'csv'

const stringify = promisify(csv.stringify)

export function writeErrorReport (filePath, invalidIDs, columns) {
  const file = open(filePath, 'a')
  const data = stringify(invalidIDs, { columns })
  return Promise.all([file, data]).then(([file, data]) => {
    return file.appendFile(data)
  })
}
