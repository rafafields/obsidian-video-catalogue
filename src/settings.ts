import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import VideoCategorizerPlugin from "./main";
import { AI_MODELS } from "./constants";
import { FFmpegDownloader } from "./services/ffmpeg-downloader";

export interface VideoCategorizerSettings {
	videoFolderPath: string;
	obsidianNoteFolder: string;
	openRouterApiKey: string;
	selectedModel: string;
	generatedNotes: Record<string, string>;
	numberOfFrames: number;
	ffmpegVersion: string;
}

export const DEFAULT_SETTINGS: VideoCategorizerSettings = {
	videoFolderPath: '',
	obsidianNoteFolder: '',
	openRouterApiKey: '',
	selectedModel: AI_MODELS[0]?.id ?? '',
	generatedNotes: {},
	numberOfFrames: 5,
	ffmpegVersion: ''
};

export class VideoCategorizerSettingTab extends PluginSettingTab {
	plugin: VideoCategorizerPlugin;

	constructor(app: App, plugin: VideoCategorizerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Video Categorizer Settings' });

		// ── FFmpeg section ────────────────────────────────────────────────────
		containerEl.createEl('h3', { text: 'FFmpeg' });

		const ffmpegAvailable = this.plugin.ffmpegService.isFFmpegAvailable();
		const installedVersion = this.plugin.settings.ffmpegVersion;
		const statusText = ffmpegAvailable
			? `✅ FFmpeg ${installedVersion || 'instalado'}`
			: '⏳ FFmpeg no encontrado — se descargará al primer uso';

		const ffmpegSetting = new Setting(containerEl)
			.setName('Estado de FFmpeg')
			.setDesc(statusText);

		ffmpegSetting.addButton(button => {
			button.setButtonText('Check for Updates');
			button.onClick(async () => {
				button.setButtonText('Consultando...');
				button.setDisabled(true);
				try {
					const latest = await FFmpegDownloader.getLatestRelease();
					if (latest.tag === installedVersion) {
						new Notice(`✅ FFmpeg ${installedVersion} ya es la última versión`);
					} else {
						const msg = `Nueva versión disponible: ${latest.tag} (instalada: ${installedVersion || 'ninguna'})`;
						new Notice(msg, 8000);
						// Show download button dynamically
						ffmpegSetting.addButton(dlBtn => {
							dlBtn.setButtonText(`Descargar ${latest.tag}`);
							dlBtn.setCta();
							dlBtn.onClick(async () => {
								await this.downloadFFmpeg(latest.tag);
								this.display();
							});
						});
					}
				} catch (e) {
					new Notice('❌ No se pudo consultar GitHub. Comprueba tu conexión.');
				} finally {
					button.setButtonText('Check for Updates');
					button.setDisabled(false);
				}
			});
		});

		ffmpegSetting.addButton(button => {
			button.setButtonText(ffmpegAvailable ? 'Reinstalar' : 'Descargar ahora');
			if (!ffmpegAvailable) button.setCta();
			button.onClick(async () => {
				await this.downloadFFmpeg();
				this.display();
			});
		});

		// ── Video Sources ─────────────────────────────────────────────────────
		containerEl.createEl('h3', { text: 'Video Sources' });

		new Setting(containerEl)
			.setName('Video folder path')
			.setDesc('Absolute path to the folder containing your videos on your system')
			.addText(text => {
				text
					.setPlaceholder('C:\\Videos or /home/user/Videos')
					.setValue(this.plugin.settings.videoFolderPath)
					.onChange(async (value) => {
						this.plugin.settings.videoFolderPath = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.style.width = '100%';
			});

		new Setting(containerEl)
			.setName('Obsidian note folder')
			.setDesc('Path inside your vault where video notes will be created (e.g. Videos/Notes)')
			.addText(text => {
				text
					.setPlaceholder('Videos/Notes')
					.setValue(this.plugin.settings.obsidianNoteFolder)
					.onChange(async (value) => {
						this.plugin.settings.obsidianNoteFolder = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.style.width = '100%';
			});

		// ── AI Configuration ──────────────────────────────────────────────────
		containerEl.createEl('h3', { text: 'AI Configuration' });

		new Setting(containerEl)
			.setName('OpenRouter API Key')
			.setDesc('Your API key from OpenRouter (https://openrouter.ai)')
			.addText(text => text
				.setPlaceholder('sk-or-...')
				.setValue(this.plugin.settings.openRouterApiKey)
				.onChange(async (value) => {
					this.plugin.settings.openRouterApiKey = value;
					await this.plugin.saveSettings();
				}))
			.addExtraButton(button => {
				button.setIcon('external-link');
				button.setTooltip('Get API Key');
				button.onClick(() => {
					window.open('https://openrouter.ai/keys', '_blank');
				});
			});

		new Setting(containerEl)
			.setName('AI Model')
			.setDesc('Model to use for video analysis. Models with vision capabilities can analyze video frames.')
			.addDropdown(dropdown => {
				AI_MODELS.forEach(model => {
					const label = model.recommended ? `${model.name} (Recommended)` : model.name;
					dropdown.addOption(model.id, label);
				});
				dropdown
					.setValue(this.plugin.settings.selectedModel)
					.onChange(async (value) => {
						this.plugin.settings.selectedModel = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Number of frames to extract')
			.setDesc('How many frames to extract from each video for AI analysis (1-10)')
			.addSlider(slider => {
				slider
					.setLimits(1, 10, 1)
					.setValue(this.plugin.settings.numberOfFrames)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.numberOfFrames = value;
						await this.plugin.saveSettings();
					});
			});

		// ── Generate Notes ────────────────────────────────────────────────────
		containerEl.createEl('h3', { text: 'Generate Notes' });

		new Setting(containerEl)
			.setName('Generate notes for all videos')
			.setDesc('Scan the video folder and generate notes for videos without notes')
			.addButton(button => {
				button.setButtonText('Generate Notes');
				button.setCta();
				button.onClick(async () => {
					if (!this.plugin.ffmpegService.isFFmpegAvailable()) {
						new Notice('FFmpeg no está listo todavía. Espera a que termine la descarga.');
						return;
					}
					if (!this.plugin.settings.videoFolderPath) {
						new Notice('Please configure the video folder path first');
						return;
					}
					if (!this.plugin.settings.obsidianNoteFolder) {
						new Notice('Please configure the note folder first');
						return;
					}
					if (!this.plugin.settings.openRouterApiKey) {
						new Notice('Please configure your OpenRouter API key first');
						return;
					}
					await this.plugin.startGeneration();
				});
			});

		if (Object.keys(this.plugin.settings.generatedNotes).length > 0) {
			containerEl.createEl('h3', { text: 'Generated Notes' });

			const count = Object.keys(this.plugin.settings.generatedNotes).length;
			new Setting(containerEl)
				.setName('Total notes generated')
				.setDesc(`${count} videos have been processed`)
				.addButton(button => {
					button.setButtonText('Clear History');
					button.setWarning();
					button.onClick(async () => {
						this.plugin.settings.generatedNotes = {};
						await this.plugin.saveSettings();
						new Notice('Generation history cleared');
						this.display();
					});
				});
		}
	}

	private async downloadFFmpeg(tag?: string): Promise<void> {
		const notice = new Notice('Descargando FFmpeg...', 0);
		try {
			const release = tag
				? { tag }
				: await FFmpegDownloader.getLatestRelease();

			await FFmpegDownloader.download(
				this.plugin.pluginDir,
				release.tag,
				(pct) => notice.setMessage(`Descargando FFmpeg... ${pct}%`)
			);

			this.plugin.settings.ffmpegVersion = release.tag;
			await this.plugin.saveSettings();
			notice.setMessage('✅ FFmpeg instalado correctamente');
			setTimeout(() => notice.hide(), 3000);
		} catch (e: any) {
			notice.setMessage(`❌ Error: ${e.message}`);
			setTimeout(() => notice.hide(), 5000);
		}
	}

}
