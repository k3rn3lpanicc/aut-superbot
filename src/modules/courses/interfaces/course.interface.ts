export interface Course {
	id: number;
	fullname: string;
	shortname: string;
	idnumber: string;
	summary: string;
	summaryformat: number;
	startdate: number;
	enddate: number;
	visible: boolean;
	showactivitydates: boolean;
	showcompletionconditions: boolean;
	pdfexportfont: string;
	fullnamedisplay: string;
	viewurl: string;
	courseimage: string;
}

export interface CourseList {
	courses: Course[];
}
