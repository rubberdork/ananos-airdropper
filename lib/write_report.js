import { open } from 'fs/promises'
import { promisify } from 'util'
import csv from 'csv'

const stringify = promisify(csv.stringify)

export function writeReport (filePath, data, columns) {
  const file = open(filePath, 'a')
  data = stringify(data, { columns })
  return Promise.all([file, data]).then(([file, data]) => {
    return file.appendFile(data)
  })
}
