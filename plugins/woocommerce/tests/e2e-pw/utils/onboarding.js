const { expect, test } = require( '@playwright/test' );

const STORE_DETAILS_URL = 'wp-admin/admin.php?page=wc-admin&path=/setup-wizard';
const INDUSTRY_DETAILS_URL =
	'wp-admin/admin.php?page=wc-admin&path=%2Fsetup-wizard&step=industry';
const PRODUCT_TYPES_URL =
	'wp-admin/admin.php?page=wc-admin&path=%2Fsetup-wizard&step=product-types';
const BUSINESS_DETAILS_URL =
	'wp-admin/admin.php?page=wc-admin&path=%2Fsetup-wizard&step=business-details';

const onboarding = {
	completeStoreDetailsSection: async ( page, store ) => {
		await test.step( `Go to ${ STORE_DETAILS_URL }`, async () => {
			await page.goto( STORE_DETAILS_URL );
		} );

		await test.step( 'Type and select the requested country/region', async () => {
			await page
				.locator( '#woocommerce-select-control-0__control-input' )
				.click();
			await page
				.locator( '#woocommerce-select-control-0__control-input' )
				.fill( store.country );
			await page.locator( `button >> text=${ store.country }` ).click();
		} );

		await test.step( "Fill store's address - first line", async () => {
			await page
				.locator( '#inspector-text-control-0' )
				.fill( store.address );
		} );

		await test.step( 'Fill postcode of the store', async () => {
			await page.locator( '#inspector-text-control-1' ).fill( store.zip );
		} );

		await test.step( 'Fill the city where the store is located', async () => {
			await page
				.locator( '#inspector-text-control-2' )
				.fill( store.city );
		} );

		await test.step( "Fill store's email address", async () => {
			await page
				.locator( '#inspector-text-control-3' )
				.fill( store.email );
		} );

		await test.step( "Verify that checkbox next to 'Get tips, product updates and inspiration straight to your mailbox' is selected", async () => {
			await page.locator( '#inspector-checkbox-control-0' ).check();
		} );

		await test.step( 'Click continue button', async () => {
			await page.locator( 'button >> text=Continue' ).click();
		} );

		await test.step( "In the usage tracking dialog, select 'No thanks'", async () => {
			await page.textContent( '.components-modal__header-heading' );
			await page.locator( 'button >> text=No thanks' ).click();
			await page.waitForLoadState( 'networkidle' ); // not autowaiting for form submission
		} );
	},

	completeIndustrySection: async (
		page,
		industries,
		expectedNumberOfIndustries
	) => {
		await test.step( `Go to ${ INDUSTRY_DETAILS_URL }`, async () => {
			await page.goto( INDUSTRY_DETAILS_URL );
		} );

		await test.step( `Expect heading to contain 'In which industry does the store operate?'`, async () => {
			const pageHeading = await page.textContent(
				'div.woocommerce-profile-wizard__step-header > h2'
			);

			expect( pageHeading ).toContain(
				'In which industry does the store operate?'
			);
		} );

		await test.step( `Check that there are the correct number of options listed`, async () => {
			const numCheckboxes = page.locator(
				'.components-checkbox-control__input'
			);
			await expect( numCheckboxes ).toHaveCount(
				expectedNumberOfIndustries
			);
		} );

		await test.step( `Uncheck any currently checked industries`, async () => {
			for ( let i = 0; i < expectedNumberOfIndustries; i++ ) {
				const currentCheck = `#inspector-checkbox-control-${ i }`;
				await page.locator( currentCheck ).uncheck();
			}

			for ( let industry of Object.values( industries ) ) {
				await page.getByLabel( industry, { exact: true } ).click();
			}
		} );
	},

	handleSaveChangesModal: async ( page, { saveChanges } ) => {
		// Save changes? Modal
		await page.textContent( '.components-modal__header-heading' );

		if ( saveChanges ) {
			await page.locator( 'button >> text=Save' ).click();
		} else {
			await page.locator( 'button >> text=Discard' ).click();
		}
		await page.waitForLoadState( 'networkidle' );
	},

	completeProductTypesSection: async ( page, products ) => {
		// There are 7 checkboxes on the page, adjust this constant if we change that
		const expectedProductTypes = 7;

		await test.step( `Go to ${ PRODUCT_TYPES_URL }`, async () => {
			await page.goto( PRODUCT_TYPES_URL );
			const pageHeading = await page.textContent(
				'div.woocommerce-profile-wizard__step-header > h2'
			);
			expect( pageHeading ).toContain(
				'What type of products will be listed?'
			);
		} );

		await test.step( `Check that there are the correct number of options listed`, async () => {
			const numCheckboxes = page.locator(
				'.components-checkbox-control__input'
			);
			await expect( numCheckboxes ).toHaveCount( expectedProductTypes );
		} );

		await test.step( `Uncheck any currently checked products`, async () => {
			for ( let i = 0; i < expectedProductTypes; i++ ) {
				const currentCheck = `#inspector-checkbox-control-${ i }`;
				await page.locator( currentCheck ).uncheck();
			}
		} );

		await test.step( `Check the desired products`, async () => {
			Object.keys( products ).forEach( async ( product ) => {
				await test.step( `Check product '${ product }'`, async () => {
					await page
						.getByLabel( products[ product ], { exact: true } )
						.click();
				} );
			} );
		} );
	},

	completeBusinessDetailsSection: async ( page ) => {
		await test.step( `Go to ${ BUSINESS_DETAILS_URL }`, async () => {
			await page.goto( BUSINESS_DETAILS_URL );
		} );

		await test.step( `Expect page heading to be correct`, async () => {
			const pageHeading = await page.textContent(
				'div.woocommerce-profile-wizard__step-header > h2'
			);
			expect( pageHeading ).toContain( 'Tell us about your business' );
		} );

		await test.step( `Select 1 - 10 for products`, async () => {
			await page
				.locator( '#woocommerce-select-control-0__control-input' )
				.click( {
					force: true,
				} );
			await page
				.locator( '#woocommerce-select-control__option-0-1-10' )
				.click();
		} );

		await test.step( `Select No for selling elsewhere`, async () => {
			await page
				.locator( '#woocommerce-select-control-1__control-input' )
				.click( {
					force: true,
				} );
			await page
				.locator( '#woocommerce-select-control__option-1-no' )
				.click();
		} );
	},

	/**
	 * Uncheck all checkboxes in the 'Included business features' screen.
	 *
	 * @param {import('@playwright/test').Page} page
	 * @param {boolean} expect_wc_pay
	 */
	unselectBusinessFeatures: async ( page, expect_wc_pay = true ) => {
		await test.step( `Go to ${ BUSINESS_DETAILS_URL }`, async () => {
			await page.goto( BUSINESS_DETAILS_URL );
		} );

		await test.step( `Click the Free features tab`, async () => {
			await page.locator( '#tab-panel-0-business-features' ).click();
		} );

		await test.step( `Expect the page heading to be correct`, async () => {
			const pageHeading = await page.textContent(
				'div.woocommerce-profile-wizard__step-header > h2'
			);
			expect( pageHeading ).toContain( 'Included business features' );
		} );

		await test.step( `Expand list of features`, async () => {
			await page
				.locator(
					'button.woocommerce-admin__business-details__selective-extensions-bundle__expand'
				)
				.click();
		} );

		await test.step( `Check to see if WC Payments is present`, async () => {
			const wcPay = page.locator(
				'.woocommerce-admin__business-details__selective-extensions-bundle__description a[href*=woocommerce-payments]'
			);

			if ( expect_wc_pay ) {
				await expect( wcPay ).toBeVisible();
			} else {
				await expect( wcPay ).not.toBeVisible();
			}
		} );

		await test.step( `Uncheck all business features`, async () => {
			await page
				.locator(
					'.woocommerce-admin__business-details__selective-extensions-bundle__extension',
					{ hasText: 'Add recommended business features to my site' }
				)
				.getByRole( 'checkbox' )
				.uncheck();
		} );
	},
};

module.exports = onboarding;
