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
  prerelease?: boolean
  assets: GithubReleaseAsset[]
}

export interface UpdateCheckResult {
  currentVersion: string
  latestVersion: string
  hasUpdate: boolean
  releaseUrl: string
  publishedAt: string
  installerUrl: string | null
  channel: 'stable' | 'beta'
  rollbackVersion: string | null
  rollbackUrl: string | null
}

const RELEASE_API_URL = 'https://api.github.com/repos/louisxie0830/maplestory-hud/releases/latest'
const RELEASE_LIST_API_URL = 'https://api.github.com/repos/louisxie0830/maplestory-hud/releases?per_page=15'

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

function getReleaseList(): Promise<GithubRelease[]> {
  return new Promise((resolve, reject) => {
    const req = request(
      RELEASE_LIST_API_URL,
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
            resolve(JSON.parse(body) as GithubRelease[])
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

export async function checkForUpdates(channel: 'stable' | 'beta' = 'stable'): Promise<UpdateCheckResult> {
  const currentVersion = app.getVersion()
  const latest = channel === 'stable'
    ? await getLatestRelease()
    : (await getReleaseList())[0]
  if (!latest) throw new Error('No releases found')

  const releaseList = await getReleaseList()
  const stableReleases = releaseList.filter((r) => !r.prerelease)
  const betaReleases = releaseList
  const selected = channel === 'stable' ? stableReleases : betaReleases
  const latestInChannel = selected[0] ?? latest
  const previousInChannel = selected[1] ?? null

  const latestVersion = latestInChannel.tag_name.replace(/^v/i, '')
  const installer = latestInChannel.assets.find((asset) => asset.name.endsWith('.exe')) ?? null
  return {
    currentVersion,
    latestVersion,
    hasUpdate: isVersionNewer(latestVersion, currentVersion),
    releaseUrl: latestInChannel.html_url,
    publishedAt: latestInChannel.published_at,
    installerUrl: installer?.browser_download_url ?? null,
    channel,
    rollbackVersion: previousInChannel ? previousInChannel.tag_name.replace(/^v/i, '') : null,
    rollbackUrl: previousInChannel?.html_url ?? null
  }
}
