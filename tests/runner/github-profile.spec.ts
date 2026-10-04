import { test, expect } from './fixtures/screens.fixture';
import { forEnv } from '@core/config/dataset';
import { GithubProfileScreen } from '@screens/github/GithubProfileScreen';
import githubData from '@data/githubProfile.data.json';

const data = forEnv(githubData);

test.describe('GitHub profile', { tag: '@external' }, () => {
    test.describe.configure({ mode: 'serial' });

    test('shows the profile README', async ({ page, soft }) => {
        const profile = await new GithubProfileScreen(page, data.username, soft).open();

        soft.assertEquals(await profile.headline(), data.expectedHeadline, 'profile headline');
        soft.assertEquals(await profile.tagline(), data.expectedTagline, 'profile tagline');
    });

    test('lists repositories under the Repositories tab', async ({ page, soft }) => {
        const repositories = await new GithubProfileScreen(page, data.username, soft)
            .open()
            .then((profile) => profile.openRepositories());

        expect(repositories.currentUrl()).toContain('tab=repositories');
        soft.assertTrue(
            (await repositories.repositoryNames()).length > 0,
            'the Repositories tab should list something'
        );
    });

    for (const repository of data.repositoriesToFind) {
        test(`finds and opens ${repository.name} — ${repository.note}`, async ({ page, soft }) => {
            const repositories = await new GithubProfileScreen(page, data.username, soft)
                .open()
                .then((profile) => profile.openRepositories())
                .then((list) => list.filterBy(repository.name));

            soft.assertTrue(
                (await repositories.repositoryNames()).some((name) =>
                    name.trim().includes(repository.name)
                ),
                `filtering should surface ${repository.name}`
            );

            const opened = await repositories.openRepository(repository.name);

            expect(opened.currentUrl()).toContain(`/${data.username}/${repository.name}`);
            soft.assertEquals(await opened.name(), repository.name, 'repository name in the header');
            soft.assertTrue(await opened.hasAboutPanel(), 'About panel should be present');
        });
    }

    test('filtering narrows the list rather than emptying it', async ({ page, soft }) => {
        const repositories = await new GithubProfileScreen(page, data.username, soft)
            .open()
            .then((profile) => profile.openRepositories());

        const unfiltered = (await repositories.repositoryNames()).length;
        await repositories.filterBy(data.repositoriesToFind[0]!.name);
        const filtered = (await repositories.repositoryNames()).length;

        soft.assertTrue(filtered > 0, 'filtering should leave at least one repository');
        soft.assertTrue(
            filtered <= unfiltered,
            `filtering should not add repositories (${unfiltered} -> ${filtered})`
        );
    });
});
