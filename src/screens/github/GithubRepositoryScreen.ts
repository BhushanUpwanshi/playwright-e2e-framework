import type { Page } from 'playwright';
import { SoftAssert } from '@core/assertions/SoftAssert';
import { BASE_URLS } from '@core/config/env';
import { getText, isVisible } from '@core/interactions/query';
import locators from '@locators/githubProfile.locators.json';
import { BaseScreen } from '../BaseScreen';

export class GithubRepositoryScreen extends BaseScreen {
    protected readonly path: string;
    protected readonly anchor = locators.repositoryName;

    protected override get baseUrl(): string {
        return BASE_URLS.github;
    }

    constructor(page: Page, username: string, repository: string, soft?: SoftAssert) {
        super(page, soft);
        this.path = `/${username}/${repository}`;
    }

    async name(): Promise<string> {
        return getText(this.page, locators.repositoryName);
    }

    async hasAboutPanel(): Promise<boolean> {
        return isVisible(this.page, locators.aboutHeading, 5_000);
    }
}
