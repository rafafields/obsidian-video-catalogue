import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import VideoCategorizerPlugin from "./main";
import { AI_MODELS, getOS, INSTALLATION_INSTRUCTIONS } from "./constants";

export interface VideoCategorizerSettings {
	videoFolderPath: string;
	obsidianNoteFolder: string;
	openRouterApiKey: string;
	selectedModel: string;
	generatedNotes: Record<string, string>;
	ffmpegPath: string;
	numberOfFrames: number;
	hasCompletedSetup: boolean;
}

export const DEFAULT_SETTINGS: VideoCategorizerSettings = {
	videoFolderPath: '',
	obsidianNoteFolder: '',
	openRouterApiKey: '',
	selectedModel: AI_MODELS[0].id,
	generatedNotes: {},
	ffmpegPath: '',
	numberOfFrames: 5,
	hasCompletedSetup: false
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

		const ffmpegStatus = this.plugin.ffmpegService.isFFmpegAvailable();
		
		new Setting(containerEl)
			.setName('FFmpeg Status')
			.setDesc(ffmpegStatus 
				? `✅ FFmpeg detected: ${this.plugin.settings.ffmpegPath || 'in PATH'}`
				: '❌ FFmpeg not detected. Please install FFmpeg to use this plugin.')
			.addButton(button => {
				button.setButtonText('Setup Wizard');
				button.onClick(() => {
					this.plugin.showSetupWizard();
				});
			});

		containerEl.createEl('h3', { text: 'Video Sources' });

		new Setting(containerEl)
			.setName('Video folder path')
			.setDesc('Absolute path to the folder containing your videos on your system')
			.addText(text => text
				.setPlaceholder('C:\\Videos or /home/user/Videos')
				.setValue(this.plugin.settings.videoFolderPath)
				.onChange(async (value) => {
					this.plugin.settings.videoFolderPath = value;
					await this.plugin.saveSettings();
				}))
			.addButton(button => {
				button.setButtonText('Browse');
				button.onClick(async () => {
					const result = await this.showDirectoryPicker();
					if (result) {
						this.plugin.settings.videoFolderPath = result;
						await this.plugin.saveSettings();
						this.display();
					}
				});
			});

		new Setting(containerEl)
			.setName('Obsidian note folder')
			.setDesc('Folder in your vault where video notes will be created')
			.addDropdown(dropdown => {
				const folders = this.getVaultFolders();
				folders.forEach(folder => {
					dropdown.addOption(folder, folder);
				});
				dropdown
					.setValue(this.plugin.settings.obsidianNoteFolder)
					.onChange(async (value) => {
						this.plugin.settings.obsidianNoteFolder = value;
						await this.plugin.saveSettings();
					});
			});

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

		containerEl.createEl('h3', { text: 'Generate Notes' });

		new Setting(containerEl)
			.setName('Generate notes for all videos')
			.setDesc('Scan the video folder and generate notes for videos without notes')
			.addButton(button => {
				button.setButtonText('Generate Notes');
				button.setCta();
				button.onClick(async () => {
					if (!ffmpegStatus) {
						new Notice('Please install FFmpeg first');
						this.plugin.showSetupWizard();
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

	private async showDirectoryPicker(): Promise<string | null> {
		return new Promise((resolve) => {
			const input = document.createElement('input');
			input.type = 'file';
			(input as any).webkitdirectory = true;
			(input as any).directory = true;
			
			input.onchange = (e: any) => {
				const files = e.target.files;
				if (files && files.length > 0) {
					const path = files[0].path;
					const folderPath = path.substring(0, path.lastIndexOf('\\'));
					resolve(folderPath);
				} else {
					resolve(null);
				}
			};
			
			input.click();
		});
	}

	private getVaultFolders(): string[] {
		const vault = this.app.vault;
		const allFiles = vault.getAllLoadedFiles();
		
		const uniqueFolders = new Set<string>();
		uniqueFolders.add('/');
		
		allFiles.forEach(file => {
			if (file.parent) {
				uniqueFolders.add(file.parent.path);
			}
		});

		return Array.from(uniqueFolders).filter(f => f).sort();
	}
		});

		return Array.from(uniqueFolders).filter(f => f).sort();
	}
}
