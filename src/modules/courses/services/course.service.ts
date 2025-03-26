import { AxiosInstance } from 'axios';
import { Course } from '../interfaces/course.interface';
import { FETCHING_STRATEGY } from '../courses';

export class CourseService {
	constructor(private readonly client: AxiosInstance) {}

	public async getSesskey(): Promise<string> {
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

	public async fetchCourses(strategy: FETCHING_STRATEGY): Promise<Course[]> {
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
				'Referrer-Policy': 'strict-origin-when-cross-origin',
			},
		});

		if (response.data && response.data[0] && response.data[0].data) {
			return response.data[0].data.courses as Course[];
		} else {
			console.error('[!] Unexpected response format:', response.data);
			return [];
		}
	}
}
