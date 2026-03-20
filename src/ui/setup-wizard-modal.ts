import { App, Modal, Setting, Notice } from "obsidian";
import VideoCategorizerPlugin from "../main";
import { getOS, INSTALLATION_INSTRUCTIONS } from "../constants";

export class SetupWizardModal extends Modal {
	private currentStep: number = 0;
	private ffmpegPath: string = '';
	private plugin: VideoCategorizerPlugin;
	private os: 'windows' | 'macos' | 'linux';

	constructor(
		app: App,
		plugin: VideoCategorizerPlugin
	) {
		super(app);
		this.plugin = plugin;
		this.os = getOS();
	}

	onOpen(): void {
		this.titleEl.setText('Video Categorizer - Setup Wizard');
		this.renderStep();
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}

	private renderStep(): void {
		const { contentEl } = this;
		contentEl.empty();

		switch (this.currentStep) {
			case 0:
				this.renderWelcome();
				break;
			case 1:
				this.renderInstallationInstructions();
				break;
			case 2:
				this.renderVerification();
				break;
		}
	}

	private renderWelcome(): void {
		const { contentEl } = this;

		contentEl.createEl('p', {
			text: 'Welcome! This plugin uses AI to analyze your videos and generate categorized notes in Obsidian.'
		});

		contentEl.createEl('p', {
			text: 'To work, it needs FFmpeg to extract frames from your videos.'
		});

		const instructions = contentEl.createEl('div');
		instructions.style.marginTop = '20px';
		instructions.style.padding = '15px';
		instructions.style.backgroundColor = 'var(--background-modifier-form-field)';
		instructions.style.borderRadius = '8px';

		instructions.createEl('h4', { text: 'What is FFmpeg?' });
		instructions.createEl('p', {
			text: 'FFmpeg is a free, open-source software for handling video, audio, and other multimedia files. This plugin uses it to extract frames from your videos so the AI can analyze them.'
		});

		new Setting(contentEl)
			.addButton(button => {
				button.setButtonText('Get Started');
				button.setCta();
				button.onClick(() => {
					this.currentStep = 1;
					this.renderStep();
				});
			})
			.addButton(button => {
				button.setButtonText('Cancel');
				button.onClick(() => {
					this.close();
				});
			});
	}

	private renderInstallationInstructions(): void {
		const { contentEl } = this;

		const instructions = INSTALLATION_INSTRUCTIONS[this.os];

		contentEl.createEl('h3', { text: `Step 1: Install FFmpeg for ${instructions.title}` });

		const methodContainer = contentEl.createEl('div');
		methodContainer.style.marginTop = '20px';

		if ('homebrew' in instructions) {
			const brewMethod = instructions.homebrew || instructions.chocolatey || instructions.scoop;
			if (brewMethod) {
				const methodBox = methodContainer.createEl('div');
				methodBox.style.padding = '15px';
				methodBox.style.backgroundColor = 'var(--background-modifier-form-field)';
				methodBox.style.borderRadius = '8px';
				methodBox.style.marginBottom = '20px';

				methodBox.createEl('h4', { text: 'Recommended Method (Package Manager)' });
				methodBox.createEl('p', { text: brewMethod.description });

				const codeBlock = methodBox.createEl('pre');
				codeBlock.style.backgroundColor = 'var(--background-primary)';
				codeBlock.style.padding = '10px';
				codeBlock.style.borderRadius = '4px';
				codeBlock.style.overflow = 'auto';
				codeBlock.createEl('code', { text: brewMethod.command });

				new Setting(methodBox).addButton(button => {
					button.setButtonText('Copy Command');
					button.onClick(() => {
						navigator.clipboard.writeText(brewMethod.command);
						new Notice('Command copied to clipboard');
					});
				});
			}
		}

		if ('apt' in instructions) {
			const aptMethod = instructions.apt;
			const methodBox = methodContainer.createEl('div');
			methodBox.style.padding = '15px';
			methodBox.style.backgroundColor = 'var(--background-modifier-form-field)';
			methodBox.style.borderRadius = '8px';
			methodBox.style.marginBottom = '20px';

			methodBox.createEl('h4', { text: 'Debian/Ubuntu' });
			methodBox.createEl('p', { text: aptMethod.description });

			const codeBlock = methodBox.createEl('pre');
			codeBlock.style.backgroundColor = 'var(--background-primary)';
			codeBlock.style.padding = '10px';
			codeBlock.style.borderRadius = '4px';
			codeBlock.style.overflow = 'auto';
			codeBlock.createEl('code', { text: aptMethod.command });

			new Setting(methodBox).addButton(button => {
				button.setButtonText('Copy Command');
				button.onClick(() => {
					navigator.clipboard.writeText(aptMethod.command);
					new Notice('Command copied to clipboard');
				});
			});
		}

		const manualContainer = contentEl.createEl('div');
		manualContainer.style.marginTop = '20px';
		manualContainer.style.padding = '15px';
		manualContainer.style.border = '1px solid var(--background-modifier-border)';
		manualContainer.style.borderRadius = '8px';

		manualContainer.createEl('h4', { text: 'Alternative: Manual Installation' });
		
		const stepsList = manualContainer.createEl('ol');
		instructions.manual.steps.forEach((step: string) => {
			const li = stepsList.createEl('li');
			li.textContent = step;
			li.style.marginBottom = '8px';
		});

		new Setting(contentEl)
			.addButton(button => {
				button.setButtonText('I\'ve Installed FFmpeg');
				button.setCta();
				button.onClick(() => {
					this.currentStep = 2;
					this.renderStep();
				});
			})
			.addButton(button => {
				button.setButtonText('Back');
				button.onClick(() => {
					this.currentStep = 0;
					this.renderStep();
				});
			});
	}

	private renderVerification(): void {
		const { contentEl } = this;

		contentEl.createEl('h3', { text: 'Step 2: Verify Installation' });

		contentEl.createEl('p', {
			text: 'Enter the path to your FFmpeg executable, or leave empty if it\'s in your system PATH.'
		});

		const inputSetting = new Setting(contentEl)
			.setName('FFmpeg executable path')
			.setDesc('Leave empty if FFmpeg is in your system PATH')
			.addText(text => {
				text
					.setPlaceholder('C:\\ffmpeg\\bin\\ffmpeg.exe or /usr/local/bin/ffmpeg')
					.setValue(this.ffmpegPath)
					.onChange((value) => {
						this.ffmpegPath = value;
					});
				text.inputEl.style.width = '100%';
			})
			.addButton(button => {
				button.setButtonText('Browse');
				button.onClick(async () => {
			const result = await this.showFilePicker();
			if (result) {
				this.ffmpegPath = result;
				const input = inputSetting.controlEl.querySelector('input') as HTMLInputElement;
				if (input) {
					input.value = result;
				}
			}
				});
			});

		const statusEl = contentEl.createEl('div');
		statusEl.style.marginTop = '20px';
		statusEl.style.padding = '15px';
		statusEl.style.borderRadius = '8px';
		statusEl.style.fontWeight = 'bold';

		const checkFFmpeg = async () => {
			const { exec } = require('child_process');
			const util = require('util');
			const execPromise = util.promisify(exec);

			try {
				const cmd = this.ffmpegPath ? `"${this.ffmpegPath}" -version` : 'ffmpeg -version';
				await execPromise(cmd);
				statusEl.style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
				statusEl.style.color = 'var(--text-success)';
				statusEl.setText('✅ FFmpeg detected and ready to use!');
				return true;
			} catch (error) {
				statusEl.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
				statusEl.style.color = 'var(--text-error)';
				statusEl.setText('❌ FFmpeg not detected. Please check the path or installation.');
				return false;
			}
		};

		new Setting(contentEl)
			.addButton(button => {
				button.setButtonText('Check Again');
				button.onClick(async () => {
					await checkFFmpeg();
				});
			})
			.addButton(button => {
				button.setButtonText('Finish Setup');
				button.setCta();
				button.onClick(async () => {
					const isDetected = await checkFFmpeg();
					if (isDetected) {
						this.plugin.settings.ffmpegPath = this.ffmpegPath;
						this.plugin.settings.hasCompletedSetup = true;
						await this.plugin.saveSettings();
						new Notice('Setup completed successfully!');
						this.close();
					} else {
						new Notice('Please install FFmpeg or configure the correct path');
					}
				});
			})
			.addButton(button => {
				button.setButtonText('Back');
				button.onClick(() => {
					this.currentStep = 1;
					this.renderStep();
				});
			});

		checkFFmpeg();
	}

	private async showFilePicker(): Promise<string | null> {
		return new Promise((resolve) => {
			const input = document.createElement('input');
			input.type = 'file';
			
			input.onchange = (e: any) => {
				const files = e.target.files;
				if (files && files.length > 0) {
					resolve(files[0].path);
				} else {
					resolve(null);
				}
			};
			
			input.click();
		});
	}
}
