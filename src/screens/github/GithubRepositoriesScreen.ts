import type { Page } from 'playwright';
import { SoftAssert } from '@core/assertions/SoftAssert';
import { BASE_URLS } from '@core/config/env';
import { click } from '@core/interactions/click';
import { fill } from '@core/interactions/input';
import { getAllText } from '@core/interactions/query';
import { waitForVisible } from '@core/interactions/waits';
import locators from '@locators/githubProfile.locators.json';
import { BaseScreen } from '../BaseScreen';
import { GithubRepositoryScreen } from './GithubRepositoryScreen';

export class GithubRepositoriesScreen extends BaseScreen {
    protected readonly path: string;
    protected readonly anchor = locators.repositoryFilter;

    private readonly username: string;

    protected override get baseUrl(): string {
        return BASE_URLS.github;
    }

    constructor(page: Page, username: string, soft?: SoftAssert) {
        super(page, soft);
        this.username = username;
        this.path = `/${username}?tab=repositories`;
    }

    async repositoryNames(): Promise<string[]> {
        return getAllText(this.page, locators.repositoryLink);
    }

    async filterBy(name: string): Promise<this> {
        await fill(this.page, locators.repositoryFilter, name);
        await waitForVisible(this.page, this.repositoryLinkFor(name));
        return this;
    }

   async openRepository(name: string): Promise<GithubRepositoryScreen> {
        await click(this.page, this.repositoryLinkFor(name));
        return new GithubRepositoryScreen(this.page, this.username, name, this.soft).waitUntilLoaded();
    }

    private repositoryLinkFor(name: string): string {
        return `a[href="/${this.username}/${name}"]`;
    }
}
