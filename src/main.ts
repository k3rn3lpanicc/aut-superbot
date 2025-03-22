import { Credentials } from './credentials';
import Courses from './modules/courses/courses';
import { creds } from '../credentials.json';

const credentials = new Credentials(creds.courses.username, creds.courses.password);
const coursesModule = new Courses(credentials);
await coursesModule.initialize();

const allEvents = await coursesModule.getAllEvents();

console.log(JSON.stringify(allEvents, null, 2));
