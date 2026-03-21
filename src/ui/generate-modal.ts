import { App, Modal, Setting, Notice, ButtonComponent } from 'obsidian';
import VideoCategorizerPlugin from '../main';
import { VideoScanner } from '../services/video-scanner';
import { FFmpegService } from '../services/ffmpeg-service';
import { AICategorizer } from '../services/ai-categorizer';
import { NoteManager } from '../services/note-manager';

export class GenerateModal extends Modal {
	private plugin: VideoCategorizerPlugin;
	private progressBar: HTMLProgressElement | null = null;
	private progressEl: HTMLElement | null = null;
	private statusEl: HTMLElement | null = null;
	private cancelButton: ButtonComponent | null = null;
	private isCancelled = false;

	constructor(app: App, plugin: VideoCategorizerPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen(): void {
		const { contentEl } = this;
		this.titleEl.setText('Generating Video Notes');

		const container = contentEl.createEl('div');
		container.style.padding = '20px';

		container.createEl('p', {
			text: 'Scanning videos and generating notes with AI...'
		});

		const statsContainer = container.createEl('div');
		statsContainer.style.marginBottom = '20px';
		statsContainer.style.display = 'grid';
		statsContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';
		statsContainer.style.gap = '10px';

		const videosFoundEl = statsContainer.createEl('div');
		videosFoundEl.style.padding = '10px';
		videosFoundEl.style.backgroundColor = 'var(--background-modifier-form-field)';
		videosFoundEl.style.borderRadius = '8px';
		videosFoundEl.style.textAlign = 'center';
		videosFoundEl.createEl('div', { 
			text: '0', 
			cls: 'stat-value',
			attr: { style: 'font-size: 24px; font-weight: bold;' }
		});
		videosFoundEl.createEl('div', { 
			text: 'Videos Found', 
			cls: 'stat-label',
			attr: { style: 'font-size: 12px; opacity: 0.7;' }
		});

		const alreadyProcessedEl = statsContainer.createEl('div');
		alreadyProcessedEl.style.padding = '10px';
		alreadyProcessedEl.style.backgroundColor = 'var(--background-modifier-form-field)';
		alreadyProcessedEl.style.borderRadius = '8px';
		alreadyProcessedEl.style.textAlign = 'center';
		alreadyProcessedEl.createEl('div', { 
			text: '0', 
			cls: 'stat-value',
			attr: { style: 'font-size: 24px; font-weight: bold;' }
		});
		alreadyProcessedEl.createEl('div', { 
			text: 'Already Processed', 
			cls: 'stat-label',
			attr: { style: 'font-size: 12px; opacity: 0.7;' }
		});

		const toProcessEl = statsContainer.createEl('div');
		toProcessEl.style.padding = '10px';
		toProcessEl.style.backgroundColor = 'var(--background-modifier-form-field)';
		toProcessEl.style.borderRadius = '8px';
		toProcessEl.style.textAlign = 'center';
		toProcessEl.createEl('div', { 
			text: '0', 
			cls: 'stat-value',
			attr: { style: 'font-size: 24px; font-weight: bold;' }
		});
		toProcessEl.createEl('div', { 
			text: 'To Process', 
			cls: 'stat-label',
			attr: { style: 'font-size: 12px; opacity: 0.7;' }
		});

		const progressContainer = container.createEl('div');
		progressContainer.style.marginTop = '20px';

		this.progressEl = progressContainer.createEl('div', {
			text: '0%',
			attr: { style: 'text-align: center; margin-bottom: 10px; font-weight: bold;' }
		});

		this.progressBar = progressContainer.createEl('progress') as HTMLProgressElement;
		this.progressBar.max = 100;
		this.progressBar.value = 0;
		this.progressBar.style.width = '100%';
		this.progressBar.style.height = '8px';

		this.statusEl = container.createEl('p', {
			text: 'Initializing...',
			attr: { style: 'margin-top: 20px; font-style: italic; color: var(--text-muted);' }
		});

		const logContainer = container.createEl('div');
		logContainer.style.marginTop = '20px';
		logContainer.style.maxHeight = '200px';
		logContainer.style.overflowY = 'auto';
		logContainer.style.backgroundColor = 'var(--background-primary)';
		logContainer.style.padding = '10px';
		logContainer.style.borderRadius = '8px';
		logContainer.style.fontSize = '12px';
		logContainer.style.fontFamily = 'monospace';

		const logEl = logContainer.createEl('div');
		const addLog = (message: string) => {
			const line = logEl.createEl('div');
			line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
			logContainer.scrollTop = logContainer.scrollHeight;
		};

		new Setting(container)
			.addButton(button => {
				this.cancelButton = button;
				button.setButtonText('Cancel');
				button.setWarning();
				button.onClick(() => {
					this.isCancelled = true;
					this.close();
				});
			});

		this.processVideos(videosFoundEl, alreadyProcessedEl, toProcessEl, addLog);
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}

	private async processVideos(
		videosFoundEl: HTMLElement,
		alreadyProcessedEl: HTMLElement,
		toProcessEl: HTMLElement,
		addLog: (message: string) => void
	): Promise<void> {
		try {
			const videoScanner = new VideoScanner(this.plugin.settings.videoFolderPath);
			const noteManager = new NoteManager(this.app, this.plugin.settings.obsidianNoteFolder);

			this.updateStatus('Scanning video folder...');
			addLog(`Scanning: ${this.plugin.settings.videoFolderPath}`);

			const videos = await videoScanner.scan();
			this.updateStat(videosFoundEl, videos.length.toString());

			if (videos.length === 0) {
				this.updateStatus('No videos found in the specified folder');
				addLog('No videos found');
				new Notice('No videos found in the specified folder');
				return;
			}

			const videosToProcess = [];
			let alreadyProcessed = 0;

			for (const video of videos) {
				const exists = await noteManager.noteExists(video);
				if (exists) {
					alreadyProcessed++;
					addLog(`Already processed: ${video.name}`);
				} else {
					videosToProcess.push(video);
				}
			}

			this.updateStat(alreadyProcessedEl, alreadyProcessed.toString());
			this.updateStat(toProcessEl, videosToProcess.length.toString());

			if (videosToProcess.length === 0) {
				this.updateStatus('All videos have already been processed');
				addLog('All videos already processed');
				new Notice('All videos have already been processed');
				return;
			}

			const aiCategorizer = new AICategorizer(
				this.plugin.settings.openRouterApiKey,
				this.plugin.settings.selectedModel
			);

			let processedCount = alreadyProcessed;
			const totalCount = videos.length;

			for (const video of videosToProcess) {
				if (this.isCancelled) {
					this.updateStatus('Cancelled by user');
					addLog('Cancelled by user');
					return;
				}

				this.updateStatus(`Processing: ${video.name}${video.extension}`);
				addLog(`Extracting frames from: ${video.name}`);

				const { frames, tempDir } = await this.extractFrames(video);

				if (!frames || frames.length === 0) {
					addLog(`Failed to extract frames from: ${video.name}`);
					continue;
				}

				addLog(`Analyzing with AI: ${video.name}`);

				try {
					const analysis = await aiCategorizer.analyzeVideo(frames, video.name);
					
					addLog(`Creating note: ${video.name}`);
					await noteManager.createNote(video, analysis);
					
					this.plugin.settings.generatedNotes[video.path] = noteManager.getNotePath(video);
					await this.plugin.saveSettings();
					
					addLog(`✓ Completed: ${video.name}`);
				} catch (error: any) {
					addLog(`Error analyzing ${video.name}: ${error.message}`);
					console.error(error);
				} finally {
					await this.plugin.ffmpegService.cleanupTempDir(tempDir);
				}

				processedCount++;
				const progress = Math.round((processedCount / totalCount) * 100);
				this.updateProgress(progress);
			}

			this.updateStatus(`Completed! Generated ${videosToProcess.length} notes`);
			addLog(`Generation complete. Total: ${videosToProcess.length} notes created`);
			new Notice(`Successfully generated ${videosToProcess.length} video notes`);

			if (this.cancelButton) {
				this.cancelButton.setButtonText('Close');
				this.cancelButton.setCta();
				this.cancelButton.onClick(() => this.close());
			}

		} catch (error: any) {
			this.updateStatus(`Error: ${error.message}`);
			addLog(`Error: ${error.message}`);
			console.error(error);
			new Notice(`Error: ${error.message}`);
		}
	}

	private async extractFrames(video: any): Promise<{ frames: string[], tempDir: string }> {
		const path = require('path');
		const os = require('os');
		const tempDir = path.join(os.tmpdir(), 'video-categorizer', Date.now().toString());
		const frames = await this.plugin.ffmpegService.extractFrames(
			video.path,
			this.plugin.settings.numberOfFrames,
			tempDir
		);
		return { frames, tempDir };
	}

	private updateProgress(percent: number): void {
		if (this.progressBar) {
			this.progressBar.value = percent;
		}
		if (this.progressEl) {
			this.progressEl.setText(`${percent}%`);
		}
	}

	private updateStatus(status: string): void {
		if (this.statusEl) {
			this.statusEl.setText(status);
		}
	}

	private updateStat(element: HTMLElement, value: string): void {
		const valueEl = element.querySelector('.stat-value');
		if (valueEl) {
			valueEl.textContent = value;
		}
	}
}
