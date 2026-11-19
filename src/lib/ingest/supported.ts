import path from 'node:path'

export const SUPPORTED_EXTENSIONS = ['.csv', '.pdf']

/** Accept only plain `.csv` / `.pdf` names (no hidden files, no double extensions like `.csv.exe`). */
export function isSupportedFile(fileName: string): boolean {
  if (fileName.startsWith('.')) return false
  return SUPPORTED_EXTENSIONS.includes(path.extname(fileName).toLowerCase())
}
