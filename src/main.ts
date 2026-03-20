import { Plugin, Notice } from 'obsidian';
import { VideoCategorizerSettings, DEFAULT_SETTINGS, VideoCategorizerSettingTab } from './settings';
import { SetupWizardModal } from './ui/setup-wizard-modal';
import { GenerateModal } from './ui/generate-modal';
import { VideoScanner } from './services/video-scanner';
import { FFmpegService } from './services/ffmpeg-service';
import { AICategorizer } from './services/ai-categorizer';
import { NoteManager } from './services/note-manager';

export default class VideoCategorizerPlugin extends Plugin {
	settings: VideoCategorizerSettings;
	ffmpegService: FFmpegService;

	async onload() {
		await this.loadSettings();

		this.ffmpegService = new FFmpegService(this.settings.ffmpegPath);

		this.addSettingTab(new VideoCategorizerSettingTab(this.app, this));

		if (!this.settings.hasCompletedSetup || !this.ffmpegService.isFFmpegAvailable()) {
			this.showSetupWizard();
		}

		this.addCommand({
			id: 'generate-video-notes',
			name: 'Generate notes for all videos',
			callback: async () => {
				if (!this.settings.hasCompletedSetup || !this.ffmpegService.isFFmpegAvailable()) {
					new Notice('Please complete FFmpeg setup first');
					this.showSetupWizard();
					return;
				}
				await this.startGeneration();
			}
		});
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.ffmpegService = new FFmpegService(this.settings.ffmpegPath);
	}

	showSetupWizard() {
		const modal = new SetupWizardModal(this.app, () => {
			new Notice('FFmpeg setup completed!');
		});
		modal.open();
	}

	async startGeneration() {
		const modal = new GenerateModal(this.app, this);
		modal.open();
	}
}
