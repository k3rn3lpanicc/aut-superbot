import axios, { AxiosInstance } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import * as cheerio from 'cheerio';
import { Credentials } from '../../credentials';
import { Course } from './interfaces/course.interface';
import {
	CourseEventDetailed,
	CourseEventSimple,
} from './interfaces/course-event.interface';
import { AuthService } from './services/auth.service';
import { CourseService } from './services/course.service';
import { EventService } from './services/event.service';

export enum FETCHING_STRATEGY {
	ALL = 'all',
	FAVOURITES = 'favourites',
}

class Courses {
	private readonly authService: AuthService;
	private readonly courseService: CourseService;
	private readonly eventService: EventService;
	private courses: {
		all: Course[];
		favourites: Course[];
	};

	constructor(private credentials: Credentials) {
		this.courses = {
			all: [],
			favourites: [],
		};
		const jar = new CookieJar();
		const client = wrapper(axios.create({ jar, withCredentials: true }));

		this.authService = new AuthService(client, credentials);
		this.courseService = new CourseService(client);
		this.eventService = new EventService(client);
	}

	public async initialize(): Promise<void> {
		console.log('[*] Initializing courses');
		await this.getCourses(FETCHING_STRATEGY.ALL);
		await this.getCourses(FETCHING_STRATEGY.FAVOURITES);
		console.log('[*] Courses initialized');
	}

	public async getCourses(
		strategy: FETCHING_STRATEGY = FETCHING_STRATEGY.ALL
	): Promise<Course[]> {
		if (this.courses[strategy].length !== 0) return this.courses[strategy];

		await this.authService.handleLogin();
		console.log('[*] Getting courses');

		try {
			this.courses[strategy] = await this.courseService.fetchCourses(
				strategy
			);
			console.log('[*] Courses retrieved successfully');
			return this.courses[strategy];
		} catch (error) {
			console.error('[!] Error fetching courses:', error);
			throw error;
		}
	}

	public async getEvents(): Promise<CourseEventDetailed[]> {
		await this.authService.handleLogin();
		const events = await this.eventService.getEventsBasedOnDate();
		return await this.eventService.getDetailedEvents(
			events,
			this.courses.all
		);
	}
}

export default Courses;
