import { StandAloneClass } from 'playwright-standalone';
import { SoftAssert } from '@core/assertions/SoftAssert';
import { forEnv } from '@core/config/dataset';
import { GithubProfileScreen } from '@screens/github/GithubProfileScreen';
import type { GithubRepositoriesScreen } from '@screens/github/GithubRepositoriesScreen';
import githubData from '@data/githubProfile.data.json';

/**
 * The GitHub profile journey, driven without a test runner.
 *
 * Pairs with tests/runner/github-profile.spec.ts: same screens, same locators,
 * same data, different engine. Running one flow both ways is the point — it is
 * what shows the domain layer really is runner-agnostic rather than just
 * claimed to be.
 *
 * Sequential by nature, which suits GitHub: five parallel unauthenticated
 * requests get served a page without the profile README, which is why the spec
 * version has to ask for serial mode explicitly.
 *
 * Run with: npm run test:standalone:github
 */
const data = forEnv(githubData);
const soft = new SoftAssert();

const journey = new StandAloneClass({
    launchOptions: { headless: true },
    allureResultsDir: 'allure-results',
    ctrfDir: 'ctrf/github',
    artifactsDir: 'test-results/standalone',
    screenshotsDir: 'test-results/standalone/failed-screenshots',
});

journey.describe('GitHub profile journey', () => {
    let profile: GithubProfileScreen;
    let repositories: GithubRepositoriesScreen;

    journey.setup(async (page) => {
        profile = await new GithubProfileScreen(page, data.username, soft).open();
    });

    journey.run('TC-01 | the profile README renders', async () => {
        soft.assertEquals(await profile.headline(), data.expectedHeadline, 'profile headline');
        soft.assertEquals(await profile.tagline(), data.expectedTagline, 'profile tagline');
    });

    // Every later step needs this listing, so stop rather than cascade.
    journey.run(
        'TC-02 | the Repositories tab lists repositories',
        async () => {
            repositories = await profile.openRepositories();

            soft.assertContains(repositories.currentUrl(), 'tab=repositories', 'repositories URL');
            soft.assertTrue(
                (await repositories.repositoryNames()).length > 0,
                'the Repositories tab should list something'
            );
        },
        { skipOnFail: true }
    );

    journey.run('TC-03 | filtering narrows the list rather than emptying it', async () => {
        const unfiltered = (await repositories.repositoryNames()).length;
        await repositories.filterBy(data.repositoriesToFind[0]!.name);
        const filtered = (await repositories.repositoryNames()).length;

        soft.assertTrue(filtered > 0, 'filtering should leave at least one repository');
        soft.assertTrue(
            filtered <= unfiltered,
            `filtering should not add repositories (${unfiltered} -> ${filtered})`
        );
    });

    for (const repository of data.repositoriesToFind) {
        journey.run(`TC-04 | opens ${repository.name}`, async () => {
            // Re-opened each time: the journey walks forward through one browser
            // context, so getting back to the listing is part of the flow rather
            // than something a fixture resets.
            repositories = await repositories.open().then((list) => list.filterBy(repository.name));

            const opened = await repositories.openRepository(repository.name);

            soft.assertContains(
                opened.currentUrl(),
                `/${data.username}/${repository.name}`,
                'repository URL'
            );
            soft.assertEquals(await opened.name(), repository.name, 'repository name in the header');
            soft.assertTrue(await opened.hasAboutPanel(), 'About panel should be present');
        });
    }

    journey.teardown(async () => {
        soft.assertAll();
    });
});

void (async () => {
    process.exit(await journey.execute({ video: true }));
})();
