import { Course } from './course.interface';

export interface CourseEventSimple {
	url: string;
	title: string;
}

export interface CourseEventDetailed extends CourseEventSimple {
	done: boolean;
	attachments: { href: string; name: string }[];
	opened: string;
	due: string;
	remainingTime: string;
	course: Course;
}
