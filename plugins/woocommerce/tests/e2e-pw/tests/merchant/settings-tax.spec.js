const { test, expect } = require( '@playwright/test' );
const wcApi = require( '@woocommerce/woocommerce-rest-api' ).default;

test.describe( 'WooCommerce Tax Settings > enable', () => {
	test.use( { storageState: process.env.ADMINSTATE } );

	test( 'can enable tax calculation', async ( { page } ) => {
		await page.goto( 'wp-admin/admin.php?page=wc-settings&tab=general' );

		await test.step( `Make sure the general tab is active`, async () => {
			await expect( page.locator( 'a.nav-tab-active' ) ).toContainText(
				'General'
			);
		} );

		await test.step( `Enable tax calculation`, async () => {
			await page.locator( '#woocommerce_calc_taxes' ).check();
			await page.locator( 'text=Save changes' ).click();
		} );

		await test.step( `Verify that settings have been saved`, async () => {
			await expect( page.locator( 'div.updated.inline' ) ).toContainText(
				'Your settings have been saved.'
			);
			await expect(
				page.locator( '#woocommerce_calc_taxes' )
			).toBeChecked();
		} );

		await test.step( `Verify that tax settings are now present`, async () => {
			await expect(
				page.locator( 'a.nav-tab:has-text("Tax")' )
			).toBeVisible();
		} );
	} );
} );

test.describe.serial( 'WooCommerce Tax Settings', () => {
	test.use( { storageState: process.env.ADMINSTATE } );

	test.beforeAll( async ( { baseURL } ) => {
		const api = new wcApi( {
			url: baseURL,
			consumerKey: process.env.CONSUMER_KEY,
			consumerSecret: process.env.CONSUMER_SECRET,
			version: 'wc/v3',
		} );

		await test.step( `Enable tax rates and calculation.`, async () => {
			await api.put( 'settings/general/woocommerce_calc_taxes', {
				value: 'yes',
			} );
		} );
	} );

	test.afterAll( async ( { baseURL } ) => {
		const api = new wcApi( {
			url: baseURL,
			consumerKey: process.env.CONSUMER_KEY,
			consumerSecret: process.env.CONSUMER_SECRET,
			version: 'wc/v3',
		} );

		await test.step( `Disable tax rates and calculation`, async () => {
			await api.put( 'settings/general/woocommerce_calc_taxes', {
				value: 'no',
			} );
		} );
	} );

	test.beforeEach( async ( { page } ) => {
		await test.step( `Go to WooCommerce > Settings > Tax`, async () => {
			await page.goto( 'wp-admin/admin.php?page=wc-settings&tab=tax', {
				waitUntil: 'networkidle',
			} );
		} );

		await test.step( `Make sure Tax tab is active.`, async () => {
			await expect( page.locator( 'a.nav-tab-active' ) ).toContainText(
				'Tax'
			);
		} );
	} );

	test( 'can set tax options', async ( { page } ) => {
		await test.step( `Set prices exclusive of tax`, async () => {
			await page
				.locator( 'text=No, I will enter prices exclusive of tax' )
				.check();
		} );

		await test.step( `Set tax based on customer shipping address`, async () => {
			await page
				.locator( '#woocommerce_tax_based_on' )
				.selectOption( 'shipping' );
		} );

		await test.step( `Set standard tax class for shipping`, async () => {
			await page
				.locator( '#woocommerce_shipping_tax_class' )
				.selectOption( {
					label: 'Standard',
				} );
		} );

		await test.step( `Leave rounding unchecked`, async () => {
			await page
				.getByLabel(
					'Round tax at subtotal level, instead of rounding per line'
				)
				.uncheck();
		} );

		await test.step( `Display prices excluding tax`, async () => {
			await page
				.locator( '#woocommerce_tax_display_shop' )
				.selectOption( 'excl' );
		} );

		await test.step( `Display prices including tax in cart and at checkout`, async () => {
			await page
				.locator( '#woocommerce_tax_display_cart' )
				.selectOption( 'incl' );
		} );

		await test.step( `Display a single tax total`, async () => {
			await page
				.locator( '#woocommerce_tax_total_display' )
				.selectOption( 'single' );
			await page.locator( 'text=Save changes' ).click();
		} );

		await test.step( `Verify that settings have been saved`, async () => {
			await expect( page.locator( 'div.updated.inline' ) ).toContainText(
				'Your settings have been saved.'
			);
			await expect(
				page.locator( 'text=No, I will enter prices exclusive of tax' )
			).toBeChecked();
			await expect(
				page.locator( '#woocommerce_tax_based_on' )
			).toHaveValue( 'shipping' );
			await expect(
				page.locator( '#woocommerce_shipping_tax_class' )
			).toContainText( 'Standard' );
			await expect(
				page.locator( '#woocommerce_tax_display_shop' )
			).toHaveValue( 'excl' );
			await expect(
				page.locator( '#woocommerce_tax_display_cart' )
			).toHaveValue( 'incl' );
			await expect(
				page.locator( '#woocommerce_tax_total_display' )
			).toHaveValue( 'single' );
		} );
	} );

	test( 'can add tax classes', async ( { page } ) => {
		await test.step( `Clear out existing tax classes`, async () => {
			await page.locator( '#woocommerce_tax_classes' ).fill( '' );
			await page.locator( 'text=Save changes' ).click();
		} );

		await test.step( `Verify that the settings have been saved`, async () => {
			await expect( page.locator( 'div.updated.inline' ) ).toContainText(
				'Your settings have been saved.'
			);
			await expect(
				page.locator( '#woocommerce_tax_classes' )
			).toHaveValue( '' );
		} );

		await test.step( `Add a "fancy" tax class`, async () => {
			await page.locator( '#woocommerce_tax_classes' ).fill( 'Fancy' );
			await page.locator( 'text=Save changes' ).click();
		} );

		await test.step( `Verify that the settings have been saved`, async () => {
			await expect( page.locator( 'div.updated.inline' ) ).toContainText(
				'Your settings have been saved.'
			);
			await expect(
				page.locator( 'ul.subsubsub > li > a >> nth=2' )
			).toContainText( 'Fancy rates' );
		} );
	} );

	test( 'can set rate settings', async ( { page } ) => {
		await test.step( `Go to "Fancy rates".`, async () => {
			await page.getByRole( 'link', { name: 'Fancy rates' } ).click();
			await page
				.getByRole( 'cell', { name: 'Loading…' } )
				.waitFor( { state: 'detached' } );
		} );

		await test.step( `Make sure the "fancy" subsection is active`, async () => {
			await expect(
				page.locator( 'ul.subsubsub > li > a.current' )
			).toContainText( 'Fancy rates' );
		} );

		await test.step( `Create a state tax`, async () => {
			await page.locator( '.wc_tax_rates a.insert' ).click();
			await page
				.locator( 'input[name^="tax_rate_country[new-0"]' )
				.fill( 'US' );
			await page
				.locator( 'input[name^="tax_rate_state[new-0"]' )
				.fill( 'CA' );
			await page.locator( 'input[name^="tax_rate[new-0"]' ).fill( '7.5' );
			await page
				.locator( 'input[name^="tax_rate_name[new-0"]' )
				.fill( 'CA State Tax' );
		} );

		await test.step( `Create a federal tax`, async () => {
			await page.locator( '.wc_tax_rates a.insert' ).click();
			await page
				.locator( 'input[name^="tax_rate_country[new-1"]' )
				.fill( 'US' );
			await page.locator( 'input[name^="tax_rate[new-1"]' ).fill( '1.5' );
			await page
				.locator( 'input[name^="tax_rate_priority[new-1"]' )
				.fill( '2' );
			await page
				.locator( 'input[name^="tax_rate_name[new-1"]' )
				.fill( 'Federal Tax' );
			await page
				.locator( 'input[name^="tax_rate_shipping[new-1"]' )
				.click();
		} );

		await test.step( `Save changes`, async () => {
			await page.locator( 'text=Save changes' ).click();
			await expect( page.locator( '.blockOverlay' ) ).not.toBeVisible();
		} );

		await test.step( `Verify that there are 2 rates`, async () => {
			await expect( page.locator( '#rates tr' ) ).toHaveCount( 2 );
		} );

		await test.step( `Delete federal rate`, async () => {
			await page.locator( 'input[value="Federal Tax"]' ).click();
			await page
				.getByRole( 'link', { name: 'Remove selected row(s)' } )
				.click();
		} );

		await test.step( `Save changes`, async () => {
			await page.locator( 'text=Save changes' ).click();
			await expect( page.locator( '.blockOverlay' ) ).not.toBeVisible();
		} );

		await test.step( `Verify that there is 1 tax rate left`, async () => {
			await expect( page.locator( '#rates tr' ) ).toHaveCount( 1 );
			await expect(
				page.locator(
					'#rates tr:first-of-type input[name^="tax_rate_state"][value="CA"]'
				)
			).toBeVisible();
		} );

		await test.step( `Delete State tax`, async () => {
			await page.locator( '[value="CA State Tax"]' ).click();
			await page.locator( '.wc_tax_rates a.remove_tax_rates' ).click();
			await page.locator( 'text=Save changes' ).click();
			await expect( page.locator( '.blockOverlay' ) ).not.toBeVisible();
		} );
	} );

	test( 'can remove tax classes', async ( { page } ) => {
		await test.step( `Remove "Fancy" tax class`, async () => {
			await page.locator( '#woocommerce_tax_classes' ).fill( '' );
			await page.locator( 'text=Save changes' ).click();
			await expect( page.locator( '.blockOverlay' ) ).not.toBeVisible();
		} );

		await test.step( `Verify that settings have been saved`, async () => {
			await expect( page.locator( 'div.updated.inline' ) ).toContainText(
				'Your settings have been saved.'
			);
			await expect(
				page.locator( '#woocommerce_tax_classes' )
			).toHaveValue( '' );
			await expect(
				page.locator( 'ul.subsubsub > li > a:has-text("Fancy rates")' )
			).toHaveCount( 0 );
		} );
	} );
} );
