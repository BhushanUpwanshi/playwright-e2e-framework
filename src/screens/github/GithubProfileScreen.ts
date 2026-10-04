import type { Page } from 'playwright';
import { SoftAssert } from '@core/assertions/SoftAssert';
import { BASE_URLS } from '@core/config/env';
import { click } from '@core/interactions/click';
import { getText, isVisible } from '@core/interactions/query';
import locators from '@locators/githubProfile.locators.json';
import { BaseScreen } from '../BaseScreen';
import { GithubRepositoriesScreen } from './GithubRepositoriesScreen';

export class GithubProfileScreen extends BaseScreen {
    protected readonly path: string;
    protected readonly anchor = locators.profileHeadline;

    private readonly username: string;

    protected override get baseUrl(): string {
        return BASE_URLS.github;
    }

    constructor(page: Page, username: string, soft?: SoftAssert) {
        super(page, soft);
        this.username = username;
        this.path = `/${username}`;
    }

    async headline(): Promise<string> {
        return getText(this.page, locators.profileHeadline);
    }

    async tagline(): Promise<string> {
        return getText(this.page, locators.profileTagline);
    }

    async hasProfileReadme(): Promise<boolean> {
        return isVisible(this.page, locators.profileHeadline, 5_000);
    }
    
    async openRepositories(): Promise<GithubRepositoriesScreen> {
        await click(this.page, `${locators.repositoriesTab} >> nth=0`);
        return new GithubRepositoriesScreen(this.page, this.username, this.soft).waitUntilLoaded();
    }
}
