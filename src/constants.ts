export const SUPPORTED_VIDEO_EXTENSIONS = [
	'.mp4',
	'.mov',
	'.avi',
	'.mkv',
	'.webm',
	'.flv',
	'.wmv',
	'.m4v',
	'.mpeg',
	'.mpg',
	'.3gp'
];

export const AI_MODELS = [
	{
		id: 'google/gemini-3-flash-preview',
		name: 'Google Gemini 3 Flash',
		supportsImages: true,
		recommended: true
	},
	{
		id: 'google/gemini-3.1-flash-lite-preview',
		name: 'Google Gemini 3.1 Flash Lite',
		supportsImages: true,
		recommended: false
	},
	{
		id: 'openai/gpt-5.4-mini',
		name: 'OpenAI GPT-5.4 Mini',
		supportsImages: true,
		recommended: false
	},
	{
		id: 'openai/gpt-5.4',
		name: 'OpenAI GPT-5.4',
		supportsImages: true,
		recommended: false
	},
	{
		id: 'anthropic/claude-sonnet-4.6',
		name: 'Claude Sonnet 4.6',
		supportsImages: true,
		recommended: false
	},
	{
		id: 'anthropic/claude-opus-4.6',
		name: 'Claude Opus 4.6',
		supportsImages: true,
		recommended: false
	}
];

export const DEFAULT_NUMBER_OF_FRAMES = 5;
export const MIN_NUMBER_OF_FRAMES = 1;
export const MAX_NUMBER_OF_FRAMES = 10;

export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const INSTALLATION_INSTRUCTIONS = {
	windows: {
		title: 'Windows',
		chocolatey: {
			command: 'choco install ffmpeg',
			description: 'Run in PowerShell as Administrator'
		},
		scoop: {
			command: 'scoop install ffmpeg',
			description: 'Run in Command Prompt or PowerShell'
		},
		manual: {
			steps: [
				'Download from https://ffmpeg.org/download.html',
				'Extract to C:\\ffmpeg\\',
				'Add C:\\ffmpeg\\bin to system PATH',
				'Restart Obsidian'
			]
		}
	},
	macos: {
		title: 'macOS',
		homebrew: {
			command: 'brew install ffmpeg',
			description: 'Run in Terminal'
		},
		manual: {
			steps: [
				'Download from https://ffmpeg.org/download.html',
				'Extract to /usr/local/ffmpeg/',
				'Add /usr/local/ffmpeg/bin to PATH',
				'Restart Obsidian'
			]
		}
	},
	linux: {
		title: 'Linux',
		apt: {
			command: 'sudo apt install ffmpeg',
			description: 'Debian/Ubuntu'
		},
		dnf: {
			command: 'sudo dnf install ffmpeg',
			description: 'Fedora/RHEL'
		},
		pacman: {
			command: 'sudo pacman -S ffmpeg',
			description: 'Arch Linux'
		},
		manual: {
			steps: [
				'Run: sudo apt install ffmpeg (Debian/Ubuntu)',
				'Or: sudo dnf install ffmpeg (Fedora/RHEL)',
				'Or: sudo pacman -S ffmpeg (Arch Linux)',
				'Restart Obsidian'
			]
		}
	}
};

export function getOS(): 'windows' | 'macos' | 'linux' {
	const platform = navigator.platform.toLowerCase();
	if (platform.includes('win')) return 'windows';
	if (platform.includes('mac')) return 'macos';
	return 'linux';
}
