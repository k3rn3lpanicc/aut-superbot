import axios from 'axios';
import { AxiosInstance } from 'axios';
import { Credentials } from '../../credentials';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import { Course } from './interfaces/course.interface';
import {
	CourseEventDetailed,
	CourseEventSimple,
} from './interfaces/course-event.interface';
import * as cheerio from 'cheerio';
export enum FETCHING_STRATEGY {
	ALL = 'all',
	FAVOURITES = 'favourites',
}

class Courses {
	private client: AxiosInstance;
	private courses: {
		all: Course[];
		favourites: Course[];
	};
	constructor(private credentials: Credentials, private loggedIn: boolean = false) {
		this.courses = {
			all: [],
			favourites: [],
		};
		this.credentials = credentials;
		const jar = new CookieJar();
		this.client = wrapper(axios.create({ jar, withCredentials: true }));
	}

	public async initialize() {
		console.log('[*] Initializing courses');
		await this.getCourses(FETCHING_STRATEGY.ALL);
		await this.getCourses(FETCHING_STRATEGY.FAVOURITES);
		console.log('[*] Courses initialized');
	}

	private async handleLogin() {
		if (!this.loggedIn) {
			console.log('[*] Logging in with credentials');
			const executionText = await this.getExecutionText();
			const formData = new URLSearchParams();
			formData.append('username', this.credentials.username);
			formData.append('password', this.credentials.password);
			formData.append('execution', executionText);
			formData.append('_eventId', 'submit');
			formData.append('geolocation', '');
			const response = await this.client.post(
				'https://accounts.aut.ac.ir/cas/login',
				formData.toString(),
				{
					headers: {
						accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
						'accept-language':
							'en-GB,en;q=0.9,fa-IR;q=0.8,fa;q=0.7,en-US;q=0.6',
						'cache-control': 'no-cache',
						'content-type':
							'application/x-www-form-urlencoded',
						pragma: 'no-cache',
						'sec-ch-ua':
							'"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
						'sec-ch-ua-mobile': '?0',
						'sec-ch-ua-platform': '"Windows"',
						'sec-fetch-dest': 'document',
						'sec-fetch-mode': 'navigate',
						'sec-fetch-site': 'same-origin',
						'sec-fetch-user': '?1',
						'upgrade-insecure-requests': '1',
						cookie: 'SERVERID-cas=sso01',
						Referer: 'https://accounts.aut.ac.ir/cas/login?service=https%3A%2F%2Fcourses.aut.ac.ir%2Flogin%2Findex.php%3FauthCASattras%3DCASattras',
						'Referrer-Policy':
							'strict-origin-when-cross-origin',
					},
					withCredentials: true,
				}
			);
			console.log(`[*] Logged in with status ${response.status}`);
			this.loggedIn = true;
		}
	}

	private async getExecutionText() {
		const getUrl =
			'https://accounts.aut.ac.ir/cas/login?service=https%3A%2F%2Fcourses.aut.ac.ir%2Flogin%2Findex.php%3FauthCASattras%3DCASattras';

		const response = await this.client.get(getUrl);
		const text = response.data.toString();
		const match = text.match(
			/<input[^>]*name=["']execution["'][^>]*value=["']([^"']*)["']/
		);
		if (match) {
			return match[1];
		} else {
			throw new Error('Execution value not found');
		}
	}

	private handleLogout() {
		if (this.loggedIn) {
			console.log('[*] Logging out');
			this.loggedIn = false;
		}
	}

	private async getSesskey() {
		try {
			const response = await this.client.get(
				'https://courses.aut.ac.ir/my/'
			);
			const text = response.data.toString();
			const match = text.match(/sesskey=([^"&]+)/);
			if (match) {
				return match[1];
			}
			throw new Error('Sesskey not found');
		} catch (error) {
			console.error('Error getting sesskey:', error);
			throw error;
		}
	}

	public async getCourses(
		strategy: FETCHING_STRATEGY = FETCHING_STRATEGY.ALL
	): Promise<Course[]> {
		if (this.courses[strategy].length !== 0) return this.courses[strategy];
		await this.handleLogin();
		console.log('[*] Getting courses');

		try {
			const sesskey = await this.getSesskey();
			const url = `https://courses.aut.ac.ir/lib/ajax/service.php?sesskey=${sesskey}&info=core_course_get_enrolled_courses_by_timeline_classification`;

			const requestBody = [
				{
					index: 0,
					methodname: 'core_course_get_enrolled_courses_by_timeline_classification',
					args: {
						offset: 0,
						limit: 0,
						classification: strategy,
						sort: 'ul.timeaccess desc',
						customfieldname: '',
						customfieldvalue: '',
						requiredfields: [
							'id',
							'fullname',
							'shortname',
							'showcoursecategory',
							'showshortname',
							'visible',
							'enddate',
						],
					},
				},
			];

			const response = await this.client.post(url, requestBody, {
				headers: {
					accept: 'application/json, text/javascript, */*; q=0.01',
					'content-type': 'application/json',
					'x-requested-with': 'XMLHttpRequest',
					Referer: 'https://courses.aut.ac.ir/my/',
					'Referrer-Policy':
						'strict-origin-when-cross-origin',
				},
			});

			if (response.data && response.data[0] && response.data[0].data) {
				this.courses[strategy] = response.data[0].data
					.courses as Course[];
				console.log('[*] Courses retrieved successfully');
				return this.courses[strategy];
			} else {
				console.error(
					'[!] Unexpected response format:',
					response.data
				);
				return [];
			}
		} catch (error) {
			console.error('[!] Error fetching courses:', error);
			throw error;
		}
	}

	public async getEventsBasedOnDate(): Promise<CourseEventSimple[]> {
		await this.handleLogin();
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

	private getEventTitle(text: string) {
		const $ = cheerio.load(text);
		const heading = $('.page-header-headings h1.h2').text().trim();
		return heading;
	}

	private getEventRemainingTime(text: string) {
		const $ = cheerio.load(text);

		const remainingTime = $('td.timeremaining').text().trim();
		return remainingTime;
	}

	private getEventAttachments(text: string) {
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

	private getEventCourse(text: string) {
		const $ = cheerio.load(text);
		const courseLink = $(
			'ol.breadcrumb a[href*="/course/view.php?id="]'
		).first();

		const courseTitle = courseLink.text().trim();
		const courseHref = courseLink.attr('href');

		return { title: courseTitle, href: courseHref };
	}

	public async getMoreDetailedEvent(eventUrl: string) {
		await this.handleLogin();
		const response = await this.client.get(eventUrl);
		const text = response.data as string;
		const results = this.getOpenedAndDueDates(text);
		const course = this.getEventCourse(text);
		const result: CourseEventDetailed = {
			url: eventUrl,
			title: this.getEventTitle(text),
			done: !text.includes('No submissions have been made yet'),
			attachments: this.getEventAttachments(text),
			opened: results[0].opened ?? '',
			due: results[0].due ?? '',
			remainingTime: this.getEventRemainingTime(text),
			course: this.courses.all.find((c) => c.viewurl === course.href)!,
		};
		return result;
	}

	public async getAllEvents(): Promise<CourseEventDetailed[]> {
		const events = await this.getEventsBasedOnDate();
		const detailedEvents: CourseEventDetailed[] = [];

		for (const event of events) {
			const detailedEvent = await this.getMoreDetailedEvent(event.url);
			detailedEvents.push(detailedEvent);
		}

		return detailedEvents;
	}
}

export default Courses;
