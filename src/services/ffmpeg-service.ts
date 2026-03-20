import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class FFmpegService {
	private ffmpegPath: string;

	constructor(ffmpegPath: string = '') {
		this.ffmpegPath = ffmpegPath;
	}

	isFFmpegAvailable(): boolean {
		const { execSync } = require('child_process');
		try {
			const cmd = this.ffmpegPath ? `"${this.ffmpegPath}" -version` : 'ffmpeg -version';
			execSync(cmd, { stdio: 'ignore' });
			return true;
		} catch (error) {
			return false;
		}
	}

	async extractFrames(videoPath: string, numberOfFrames: number, outputDir?: string): Promise<string[]> {
		const { exec } = require('child_process');
		const util = require('util');
		const execPromise = util.promisify(exec);

		const tempDir = outputDir || path.join(os.tmpdir(), 'video-categorizer', Date.now().toString());
		
		if (!fs.existsSync(tempDir)) {
			await fs.promises.mkdir(tempDir, { recursive: true });
		}

		const duration = await this.getVideoDuration(videoPath);
		if (duration <= 0) {
			throw new Error('Could not determine video duration');
		}

		const framePaths: string[] = [];
		const interval = duration / numberOfFrames;

		for (let i = 0; i < numberOfFrames; i++) {
			const timestamp = interval * (i + 0.5);
			const framePath = path.join(tempDir, `frame_${i}.jpg`);
			
			const cmd = this.ffmpegPath
				? `"${this.ffmpegPath}" -ss ${timestamp} -i "${videoPath}" -vframes 1 -q:v 2 "${framePath}"`
				: `ffmpeg -ss ${timestamp} -i "${videoPath}" -vframes 1 -q:v 2 "${framePath}"`;

			await execPromise(cmd);
			
			if (fs.existsSync(framePath)) {
				framePaths.push(framePath);
			}
		}

		return framePaths;
	}

	private async getVideoDuration(videoPath: string): Promise<number> {
		const { exec } = require('child_process');
		const util = require('util');
		const execPromise = util.promisify(exec);

		try {
			const cmd = this.ffmpegPath
				? `"${this.ffmpegPath}" -i "${videoPath}" 2>&1 | find "Duration"`
				: `ffmpeg -i "${videoPath}" 2>&1 | find "Duration"`;
			
			const { stdout } = await execPromise(cmd);
			const match = stdout.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
			
			if (match) {
				const hours = parseInt(match[1]);
				const minutes = parseInt(match[2]);
				const seconds = parseFloat(match[3]);
				return hours * 3600 + minutes * 60 + seconds;
			}
			
			return 0;
		} catch (error) {
			console.error('Error getting video duration:', error);
			return 0;
		}
	}

	async cleanupTempDir(tempDir: string): Promise<void> {
		try {
			if (fs.existsSync(tempDir)) {
				await fs.promises.rm(tempDir, { recursive: true, force: true });
			}
		} catch (error) {
			console.error('Error cleaning up temp directory:', error);
		}
	}
}
