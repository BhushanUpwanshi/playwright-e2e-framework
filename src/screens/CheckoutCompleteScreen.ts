import { click } from '@core/interactions/click';
import { downloadFile, type DownloadedFile } from '@core/interactions/files';
import { getText } from '@core/interactions/query';
import locators from '@locators/checkout.locators.json';
import { BaseScreen } from './BaseScreen';
import { InventoryScreen } from './InventoryScreen';
import { HeaderComponent } from './components/HeaderComponent';

/**
 * The order confirmation.
 */
export class CheckoutCompleteScreen extends BaseScreen {
    protected readonly path = '/checkout-complete.html';
    protected readonly anchor = locators.completeHeader;

    readonly header = new HeaderComponent(this.page);

    /** The confirmation heading, e.g. `Thank you for your order!`. */
    async heading(): Promise<string> {
        return getText(this.page, locators.completeHeader);
    }

    /** The confirmation body text. */
    async message(): Promise<string> {
        return getText(this.page, locators.completeText);
    }

    /**
     * Downloads the order as a PDF.
     *
     * @param saveDir - Where to save it. Defaults to a temp directory.
     *
     * @returns The suggested filename and where it was saved.
     */
    async downloadOrderPdf(saveDir?: string): Promise<DownloadedFile> {
        return downloadFile(
            this.page,
            () => click(this.page, locators.generatePdfButton),
            saveDir
        );
    }

    /**
     * Returns to the product list.
     *
     * @returns The inventory screen, carrying this screen's assertion buffer.
     */
    async backToProducts(): Promise<InventoryScreen> {
        await click(this.page, locators.backHomeButton);
        return new InventoryScreen(this.page, this.soft).waitUntilLoaded();
    }
}
