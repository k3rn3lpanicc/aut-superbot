import axios from 'axios';
import * as cheerio from 'cheerio';
import { AxiosInstance } from 'axios';
import { Credentials } from '../../credentials';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

export class Samad {
	private client: AxiosInstance;
	private loggedIn: boolean = false;

	constructor(private readonly credentials: Credentials) {
		const jar = new CookieJar();
		this.client = wrapper(axios.create({ jar, withCredentials: true }));
	}

	private async getCSRF() {
		const getUrl = 'https://samad.aut.ac.ir/index.rose';

		const response = await this.client.get(getUrl);
		const text = response.data.toString();
		const $ = cheerio.load(text);
		const csrfToken = $('input[name="_csrf"]').attr('value');
		if (!csrfToken) {
			throw new Error('CSRF token not found');
		}
		return csrfToken;
	}

	private async handleLogin() {
		if (!this.loggedIn) {
			console.log('[*] Logging in with credentials');
			const csrfToken = await this.getCSRF();
			console.log(`[*] CSRF token: ${csrfToken}`);

			const formData = new URLSearchParams();
			formData.append('username', this.credentials.username);
			formData.append('password', this.credentials.password);
			formData.append('login', 'ورود');
			formData.append('_csrf', csrfToken);
			const response = await this.client.post(
				'https://samad.aut.ac.ir/j_security_check',
				formData.toString(),
				{
					headers: {
						'Content-Type':
							'application/x-www-form-urlencoded',
					},
					withCredentials: true,
				}
			);
			console.log(`[*] Logged in with status ${response.status}`);
			this.loggedIn = true;
		}
	}

	private extractCredit(text: string) {
		const $ = cheerio.load(text);
		const creditValue = $('#creditId').text().trim();
		if (!creditValue) {
			throw new Error('Credit value not found');
		}
		return creditValue;
	}

	public async getFoods() {
		await this.handleLogin();
		const selfURL =
			'https://samad.aut.ac.ir/nurture/user/multi/reserve/showPanel.rose?selectedSelfDefId=12';
		const response = await this.client.get(selfURL);
		console.log(response.data as string);
		const credit = this.extractCredit(response.data as string);
		console.log(`[*] Credit: ${credit}`);
	}
}
