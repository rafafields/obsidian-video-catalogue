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
		id: 'google/gemini-2.0-flash-exp',
		name: 'Google Gemini 2.0 Flash (Multimodal)',
		supportsImages: true,
		recommended: true
	},
	{
		id: 'openai/gpt-4o',
		name: 'OpenAI GPT-4o',
		supportsImages: true,
		recommended: false
	},
	{
		id: 'anthropic/claude-sonnet-4-20250514',
		name: 'Claude Sonnet 4',
		supportsImages: true,
		recommended: false
	},
	{
		id: 'meta-llama/llama-3.2-90b-vision-instruct',
		name: 'Llama 3.2 90B Vision',
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
		}
	}
};

export function getOS(): 'windows' | 'macos' | 'linux' {
	const platform = navigator.platform.toLowerCase();
	if (platform.includes('win')) return 'windows';
	if (platform.includes('mac')) return 'macos';
	return 'linux';
}
