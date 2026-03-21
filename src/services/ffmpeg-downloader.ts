import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

const RELEASES_API = 'https://api.github.com/repos/eugeneware/ffmpeg-static/releases/latest';
const RELEASES_DOWNLOAD = 'https://github.com/eugeneware/ffmpeg-static/releases/download';

export interface FFmpegRelease {
	tag: string;
	publishedAt: string;
}

export class FFmpegDownloader {
	/**
	 * Returns the platform-specific binary asset name used in ffmpeg-static releases.
	 * Examples: 'ffmpeg-win32-x64', 'ffmpeg-darwin-x64', 'ffmpeg-linux-x64'
	 */
	static getBinaryName(): string {
		const platform = process.platform;
		const arch = process.arch === 'arm64' ? 'arm64' : 'x64';

		if (platform === 'win32') return `ffmpeg-win32-${arch}`;
		if (platform === 'darwin') return `ffmpeg-darwin-${arch}`;
		return `ffmpeg-linux-${arch}`;
	}

	/**
	 * Returns the absolute path where the ffmpeg binary should be stored.
	 */
	static getLocalPath(pluginDir: string): string {
		const name = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
		return path.join(pluginDir, name);
	}

	/**
	 * Queries the GitHub API and returns the latest release tag and date.
	 */
	static getLatestRelease(): Promise<FFmpegRelease> {
		return new Promise((resolve, reject) => {
			const options = {
				headers: {
					'User-Agent': 'obsidian-video-categorizer',
					'Accept': 'application/vnd.github.v3+json'
				}
			};

			https.get(RELEASES_API, options, (res) => {
				if (res.statusCode !== 200) {
					reject(new Error(`GitHub API returned ${res.statusCode}`));
					return;
				}

				let data = '';
				res.on('data', (chunk) => data += chunk);
				res.on('end', () => {
					try {
						const json = JSON.parse(data);
						resolve({
							tag: json.tag_name as string,
							publishedAt: json.published_at as string
						});
					} catch (e) {
						reject(new Error('Failed to parse GitHub API response'));
					}
				});
			}).on('error', reject);
		});
	}

	/**
	 * Downloads the ffmpeg binary for the current platform into pluginDir.
	 * Calls onProgress with a percentage (0-100) as the download proceeds.
	 */
	static download(
		pluginDir: string,
		tag: string,
		onProgress: (pct: number) => void
	): Promise<void> {
		return new Promise((resolve, reject) => {
			const binaryName = FFmpegDownloader.getBinaryName();
			const url = `${RELEASES_DOWNLOAD}/${tag}/${binaryName}`;
			const destPath = FFmpegDownloader.getLocalPath(pluginDir);

			// Ensure plugin directory exists
			if (!fs.existsSync(pluginDir)) {
				fs.mkdirSync(pluginDir, { recursive: true });
			}

			const doRequest = (requestUrl: string, redirectCount = 0) => {
				if (redirectCount > 5) {
					reject(new Error('Too many redirects'));
					return;
				}

				const protocol = requestUrl.startsWith('https') ? https : http;
				const options = { headers: { 'User-Agent': 'obsidian-video-categorizer' } };

				protocol.get(requestUrl, options, (res) => {
					// Follow redirects (GitHub releases redirect to CDN)
					if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
						const location = res.headers.location;
						if (!location) { reject(new Error('Redirect with no location')); return; }
						res.resume();
						doRequest(location, redirectCount + 1);
						return;
					}

					if (res.statusCode !== 200) {
						reject(new Error(`Download failed: HTTP ${res.statusCode} for ${requestUrl}`));
						return;
					}

					const totalSize = parseInt(res.headers['content-length'] ?? '0', 10);
					let downloaded = 0;

					const fileStream = fs.createWriteStream(destPath);
					res.on('data', (chunk: Buffer) => {
						downloaded += chunk.length;
						if (totalSize > 0) {
							onProgress(Math.round((downloaded / totalSize) * 100));
						}
					});
					res.pipe(fileStream);
					fileStream.on('finish', () => {
						fileStream.close();
						// Make executable on Unix systems
						if (process.platform !== 'win32') {
							fs.chmodSync(destPath, 0o755);
						}
						resolve();
					});
					fileStream.on('error', (err) => {
						fs.unlink(destPath, () => {}); // clean up partial file
						reject(err);
					});
				}).on('error', reject);
			};

			doRequest(url);
		});
	}

	/**
	 * Runs `ffmpeg -version` on the local binary and returns the version string,
	 * or null if it fails.
	 */
	static async getLocalVersion(ffmpegPath: string): Promise<string | null> {
		if (!fs.existsSync(ffmpegPath)) return null;
		try {
			const { execSync } = require('child_process');
			const output: string = execSync(`"${ffmpegPath}" -version`, { encoding: 'utf8' });
			// First line is like: "ffmpeg version N-107999-g2b9b3ab5e0 Copyright..."
			const match = output.match(/ffmpeg version (\S+)/);
			return match?.[1] ?? null;
		} catch {
			return null;
		}
	}
}
