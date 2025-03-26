import { AxiosInstance } from 'axios';
import { Credentials } from '../../../credentials';

export class AuthService {
	private loggedIn: boolean = false;

	constructor(
		private readonly client: AxiosInstance,
		private readonly credentials: Credentials
	) {}

	public async handleLogin(): Promise<void> {
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

	private async getExecutionText(): Promise<string> {
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

	public handleLogout(): void {
		if (this.loggedIn) {
			console.log('[*] Logging out');
			this.loggedIn = false;
		}
	}
}
