import { Plugin, Notice, FileSystemAdapter } from 'obsidian';
import * as path from 'path';
import * as fs from 'fs';
import { VideoCategorizerSettings, DEFAULT_SETTINGS, VideoCategorizerSettingTab } from './settings';
import { GenerateModal } from './ui/generate-modal';
import { FFmpegService } from './services/ffmpeg-service';
import { FFmpegDownloader } from './services/ffmpeg-downloader';

export default class VideoCategorizerPlugin extends Plugin {
	settings: VideoCategorizerSettings;
	ffmpegService: FFmpegService;
	pluginDir: string;

	async onload() {
		await this.loadSettings();

		// Resolve absolute path to this plugin's directory
		const adapter = this.app.vault.adapter as FileSystemAdapter;
		this.pluginDir = path.join(adapter.getBasePath(), this.manifest.dir ?? '');

		const ffmpegPath = FFmpegDownloader.getLocalPath(this.pluginDir);
		this.ffmpegService = new FFmpegService(ffmpegPath);

		this.addSettingTab(new VideoCategorizerSettingTab(this.app, this));

		// Auto-download FFmpeg silently if binary is missing
		if (!fs.existsSync(ffmpegPath)) {
			this.autoDownloadFFmpeg();
		}

		this.addCommand({
			id: 'generate-video-notes',
			name: 'Generate notes for all videos',
			callback: async () => {
				if (!this.ffmpegService.isFFmpegAvailable()) {
					new Notice('FFmpeg no está listo todavía. Espera a que termine la descarga automática.');
					return;
				}
				await this.startGeneration();
			}
		});
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async startGeneration() {
		const modal = new GenerateModal(this.app, this);
		modal.open();
	}

	private async autoDownloadFFmpeg(): Promise<void> {
		const notice = new Notice('Video Categorizer: descargando FFmpeg...', 0);
		try {
			const { tag } = await FFmpegDownloader.getLatestRelease();
			await FFmpegDownloader.download(this.pluginDir, tag, (pct) => {
				notice.setMessage(`Video Categorizer: descargando FFmpeg... ${pct}%`);
			});
			this.settings.ffmpegVersion = tag;
			await this.saveSettings();
			notice.setMessage('✅ FFmpeg listo');
			setTimeout(() => notice.hide(), 3000);
		} catch (e: any) {
			notice.setMessage('❌ Error descargando FFmpeg. Comprueba tu conexión o descárgalo manualmente desde Ajustes.');
			setTimeout(() => notice.hide(), 7000);
		}
	}
}
