import { Credentials } from './credentials';
import Courses from './modules/courses/courses';
import { creds } from '../credentials.json';
import { Samad } from './modules/samad/samad';

const credentials = new Credentials(creds.courses.username, creds.courses.password);
const coursesModule = new Courses(credentials);
await coursesModule.initialize();
const allEvents = await coursesModule.getEvents();
console.log(JSON.stringify(allEvents, null, 2));

// const samadModule = new Samad(credentials);
// await samadModule.getFoods();
