import { OPENROUTER_API_URL } from '../constants';

export interface VideoAnalysis {
	title: string;
	description: string;
	category: string;
	tags: string[];
	events: Array<{ timestamp: string; description: string }>;
	duration?: string;
	format?: string;
}

export class AICategorizer {
	private apiKey: string;
	private model: string;

	constructor(apiKey: string, model: string) {
		this.apiKey = apiKey;
		this.model = model;
	}

	async analyzeVideo(frames: string[], videoName: string): Promise<VideoAnalysis> {
		const frameData = await Promise.all(
			frames.map(async (framePath) => {
				const fs = require('fs');
				const base64 = fs.readFileSync(framePath, { encoding: 'base64' });
				return base64;
			})
		);

		const content = [
			{
				type: 'text',
				text: this.buildPrompt(videoName)
			},
			...frameData.map((base64) => ({
				type: 'image_url' as const,
				image_url: {
					url: `data:image/jpeg;base64,${base64}`
				}
			}))
		];

		const response = await fetch(OPENROUTER_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${this.apiKey}`,
				'HTTP-Referer': 'https://obsidian.md',
				'X-Title': 'Video Categorizer Plugin'
			},
			body: JSON.stringify({
				model: this.model,
				messages: [
					{
						role: 'user',
						content: content
					}
				],
				max_tokens: 2000,
				temperature: 0.7
			})
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
		}

		const data = await response.json();
		const contentText = data.choices[0].message.content;

		return this.parseResponse(contentText);
	}

	private buildPrompt(videoName: string): string {
		return `Analyze these frames extracted from a video called "${videoName}".

Generate a structured note with the following format:

# {Descriptive Title}

## Description
{Brief description of the video content}

## Category
{Main category: Tutorial, Documentary, Entertainment, Music, Lecture, Vlog, etc.}

## Tags
{List of 5-10 relevant tags}

## Important Events
- {timestamp}: {event description}
- {timestamp}: {event description}

Respond ONLY in JSON format with this exact structure:
{
  "title": "...",
  "description": "...",
  "category": "...",
  "tags": ["tag1", "tag2"],
  "events": [{ "timestamp": "00:00", "description": "..." }],
  "duration": "...",
  "format": "..."
}

Base your analysis on what you can see in the frames. If you can see timestamps, progress bars, or chapter markers, use them to estimate event timings.`;
	}

	private parseResponse(content: string): VideoAnalysis {
		try {
			const jsonMatch = content.match(/\{[\s\S]*\}/);
			if (!jsonMatch) {
				throw new Error('No JSON found in response');
			}

			const json = JSON.parse(jsonMatch[0]);
			
			return {
				title: json.title || 'Untitled Video',
				description: json.description || 'No description available',
				category: json.category || 'General',
				tags: Array.isArray(json.tags) ? json.tags : [],
				events: Array.isArray(json.events) ? json.events : [],
				duration: json.duration,
				format: json.format
			};
		} catch (error) {
			console.error('Error parsing AI response:', error);
			return {
				title: 'Video Analysis',
				description: content.substring(0, 500),
				category: 'General',
				tags: [],
				events: []
			};
		}
	}
}
