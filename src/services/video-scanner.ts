import * as fs from 'fs';
import * as path from 'path';
import { SUPPORTED_VIDEO_EXTENSIONS } from '../constants';

export interface VideoFile {
	path: string;
	name: string;
	extension: string;
	size: number;
	mtime: Date;
}

export class VideoScanner {
	private videoFolderPath: string;

	constructor(videoFolderPath: string) {
		this.videoFolderPath = videoFolderPath;
	}

	async scan(): Promise<VideoFile[]> {
		if (!this.videoFolderPath) {
			throw new Error('Video folder path not configured');
		}

		if (!fs.existsSync(this.videoFolderPath)) {
			throw new Error(`Video folder does not exist: ${this.videoFolderPath}`);
		}

		const files = await fs.promises.readdir(this.videoFolderPath);
		const videos: VideoFile[] = [];

		for (const file of files) {
			const ext = path.extname(file).toLowerCase();
			if (SUPPORTED_VIDEO_EXTENSIONS.includes(ext)) {
				const fullPath = path.join(this.videoFolderPath, file);
				const stats = await fs.promises.stat(fullPath);
				
				videos.push({
					path: fullPath,
					name: path.basename(file, ext),
					extension: ext,
					size: stats.size,
					mtime: stats.mtime
				});
			}
		}

		return videos.sort((a, b) => a.name.localeCompare(b.name));
	}

	async getVideoDuration(videoPath: string): Promise<number> {
		const { exec } = require('child_process');
		const util = require('util');
		const execPromise = util.promisify(exec);

		try {
			const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;
			const { stdout } = await execPromise(cmd);
			return parseFloat(stdout.trim());
		} catch (error) {
			console.error('Error getting video duration:', error);
			return 0;
		}
	}
}
