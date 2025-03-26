import { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { Course } from '../interfaces/course.interface';
import {
	CourseEventDetailed,
	CourseEventSimple,
} from '../interfaces/course-event.interface';

export class EventService {
	constructor(private readonly client: AxiosInstance) {}

	public async getEventsBasedOnDate(): Promise<CourseEventSimple[]> {
		const response = await this.client.get(
			'https://courses.aut.ac.ir/calendar/view.php?view=month'
		);
		const $ = cheerio.load(response.data);

		const matches: CourseEventSimple[] = [];

		$('a[data-action="view-event"]').each((_, el) => {
			const url = $(el).attr('href');
			const title = $(el).attr('title');

			if (url && title) {
				matches.push({ url, title });
			}
		});

		return matches;
	}

	private getOpenedAndDueDates(text: string) {
		const $ = cheerio.load(text);
		const results: { opened?: string; due?: string }[] = [];

		$('[data-region="activity-dates"]').each((_, el) => {
			const opened = $(el)
				.find('strong:contains("Opened:")')
				.parent()
				.text()
				.replace('Opened:', '')
				.trim();
			const due = $(el)
				.find('strong:contains("Due:")')
				.parent()
				.text()
				.replace('Due:', '')
				.trim();

			results.push({ opened, due });
		});

		return results;
	}

	private getEventTitle(text: string): string {
		const $ = cheerio.load(text);
		return $('.page-header-headings h1.h2').text().trim();
	}

	private getEventRemainingTime(text: string): string {
		const $ = cheerio.load(text);
		return $('td.timeremaining').text().trim();
	}

	private getEventAttachments(text: string): { href: string; name: string }[] {
		const $ = cheerio.load(text);
		const attachments: { href: string; name: string }[] = [];

		$('.fileuploadsubmission a').each((_, el) => {
			const href = $(el).attr('href');
			const name = $(el).text().trim();

			if (href && name) {
				attachments.push({ href, name });
			}
		});

		return attachments;
	}

	private getEventCourse(text: string): { title: string; href: string } {
		const $ = cheerio.load(text);
		const courseLink = $(
			'ol.breadcrumb a[href*="/course/view.php?id="]'
		).first();

		return {
			title: courseLink.text().trim(),
			href: courseLink.attr('href') || '',
		};
	}

	public async getMoreDetailedEvent(
		eventUrl: string,
		courses: Course[]
	): Promise<CourseEventDetailed> {
		const response = await this.client.get(eventUrl);
		const text = response.data as string;
		const results = this.getOpenedAndDueDates(text);
		const course = this.getEventCourse(text);

		return {
			url: eventUrl,
			title: this.getEventTitle(text),
			done: !text.includes('No submissions have been made yet'),
			attachments: this.getEventAttachments(text),
			opened: results[0].opened ?? '',
			due: results[0].due ?? '',
			remainingTime: this.getEventRemainingTime(text),
			course: courses.find((c) => c.viewurl === course.href)!,
		};
	}

	public async getDetailedEvents(
		events: CourseEventSimple[],
		courses: Course[]
	): Promise<CourseEventDetailed[]> {
		const detailedEvents: CourseEventDetailed[] = [];
		for (const event of events) {
			const detailedEvent = await this.getMoreDetailedEvent(
				event.url,
				courses
			);
			detailedEvents.push(detailedEvent);
		}
		return detailedEvents;
	}
}
