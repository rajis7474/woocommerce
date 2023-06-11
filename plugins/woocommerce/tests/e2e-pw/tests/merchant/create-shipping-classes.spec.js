const { test, expect } = require( '@playwright/test' );

const shippingClassSlug = {
	name: 'Small Items',
	slug: 'small-items',
	description: "Small items that don't cost much to ship.",
};
const shippingClassNoSlug = {
	name: 'Poster Pack',
	slug: '',
	description: '',
};
const shippingClasses = [ shippingClassSlug, shippingClassNoSlug ];

test.describe( 'Merchant can add shipping classes', () => {
	test.use( { storageState: process.env.ADMINSTATE } );

	test.afterEach( async ( { page } ) => {
		// No api endpoints for shipping classes, so use the UI to cleanup
		await test.step( `Go to WooCommerce > Settings > Shipping > Shipping classes`, async () => {
			await page.goto(
				'wp-admin/admin.php?page=wc-settings&tab=shipping&section=classes'
			);
		} );

		for ( const sClass of shippingClasses ) {
			await test.step( `Delete shipping class "${ sClass.name }".`, async () => {
				const row = page.getByRole( 'row', {
					name: sClass.name,
				} );
				await row.hover();
				await row.getByRole( 'link', { name: 'Remove' } ).click();
			} );
		}

		await test.step( `Click 'Save shipping classes'.`, async () => {
			await page.locator( 'text=Save shipping classes' ).click();
		} );
	} );

	test( 'can add shipping classes', async ( { page } ) => {
		await test.step( `Go to WooCommerce > Settings > Shipping > Shipping classes`, async () => {
			await page.goto(
				'wp-admin/admin.php?page=wc-settings&tab=shipping&section=classes'
			);
		} );

		await test.step( `Add shipping classes.`, async () => {
			for ( const { name, slug, description } of shippingClasses ) {
				await test.step( `Click 'Add shipping class' button.`, async () => {
					await page.locator( 'text=Add shipping class' ).click();
				} );

				await test.step( `Fill shipping class name with value "${ name }"`, async () => {
					await page
						.locator(
							'.editing:last-child [data-attribute="name"]'
						)
						.fill( name );
				} );

				await test.step( `Fill slug with value "${ slug }"`, async () => {
					await page
						.locator(
							'.editing:last-child [data-attribute="slug"]'
						)
						.fill( slug );
				} );

				await test.step( `Fill description with value "${ description }"`, async () => {
					await page
						.locator(
							'.editing:last-child [data-attribute="description"]'
						)
						.fill( description );
				} );
			}

			await test.step( `Click 'Save shipping classes' button.`, async () => {
				await page.locator( 'text=Save shipping classes' ).click();
			} );
		} );

		await test.step( `Verify that the specified shipping classes were saved.`, async () => {
			// Set the expected auto-generated slug
			shippingClassNoSlug.slug = 'poster-pack';

			for ( const { name, slug, description } of shippingClasses ) {
				await test.step( `Verify saved name to be "${ name }"`, async () => {
					await expect(
						page.locator( `text=${ name } Edit | Remove` )
					).toBeVisible();
				} );

				await test.step( `Verify saved slug to be "${ slug }"`, async () => {
					await expect(
						page.locator( `text=${ slug }` )
					).toBeVisible();
				} );

				if ( description !== '' ) {
					await test.step( `Verify saved description to be "${ description }"`, async () => {
						await expect(
							page.locator( `text=${ description }` )
						).toBeVisible();
					} );
				}
			}
		} );
	} );
} );
