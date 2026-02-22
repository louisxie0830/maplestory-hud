import { request } from 'https'
import { app } from 'electron'

interface GithubReleaseAsset {
  name: string
  browser_download_url: string
}

interface GithubRelease {
  tag_name: string
  html_url: string
  published_at: string
  assets: GithubReleaseAsset[]
}

export interface UpdateCheckResult {
  currentVersion: string
  latestVersion: string
  hasUpdate: boolean
  releaseUrl: string
  publishedAt: string
  installerUrl: string | null
}

const RELEASE_API_URL = 'https://api.github.com/repos/louisxie0830/maplestory-hud/releases/latest'

function parseSemver(version: string): [number, number, number] {
  const normalized = version.replace(/^v/i, '')
  const [major, minor, patch] = normalized.split('.').map((n) => parseInt(n, 10) || 0)
  return [major, minor, patch]
}

function isVersionNewer(latest: string, current: string): boolean {
  const a = parseSemver(latest)
  const b = parseSemver(current)
  if (a[0] !== b[0]) return a[0] > b[0]
  if (a[1] !== b[1]) return a[1] > b[1]
  return a[2] > b[2]
}

function getLatestRelease(): Promise<GithubRelease> {
  return new Promise((resolve, reject) => {
    const req = request(
      RELEASE_API_URL,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'MapleStory-HUD-Updater',
          Accept: 'application/vnd.github+json'
        }
      },
      (res) => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => { body += chunk })
        res.on('end', () => {
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`GitHub API returned ${res.statusCode ?? 'unknown'}`))
            return
          }
          try {
            resolve(JSON.parse(body) as GithubRelease)
          } catch (err) {
            reject(err)
          }
        })
      }
    )
    req.on('error', reject)
    req.end()
  })
}

export async function checkForUpdates(): Promise<UpdateCheckResult> {
  const currentVersion = app.getVersion()
  const latest = await getLatestRelease()
  const latestVersion = latest.tag_name.replace(/^v/i, '')
  const installer = latest.assets.find((asset) => asset.name.endsWith('.exe')) ?? null
  return {
    currentVersion,
    latestVersion,
    hasUpdate: isVersionNewer(latestVersion, currentVersion),
    releaseUrl: latest.html_url,
    publishedAt: latest.published_at,
    installerUrl: installer?.browser_download_url ?? null
  }
}
