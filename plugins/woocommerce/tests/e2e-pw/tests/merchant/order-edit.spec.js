const { test, expect } = require( '@playwright/test' );
const wcApi = require( '@woocommerce/woocommerce-rest-api' ).default;
const uuid = require( 'uuid' );

/**
 * Steps to add a product in the "Downloadable product permissions" section.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} productName
 */
const addDownloadableProduct = async ( page, productName ) => {
	await test.step( `Add downloadable product permissions`, async () => {
		await test.step( `In the 'Donwloadable product permissions' section, search for the product "${ productName }".`, async () => {
			await page
				.getByPlaceholder( 'Search for a downloadable product…' )
				.type( productName );
		} );

		await test.step( `Select it.`, async () => {
			const matchingListItem = page.getByRole( 'option', {
				name: productName,
				selected: true,
			} );

			await matchingListItem.click();
		} );

		await test.step( `Click 'Grant access'.`, async () => {
			await page.getByRole( 'button', { name: 'Grant access' } ).click();
		} );
	} );
};

/**
 * Steps to verify the downloadable product permission details.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} productName
 */
const verifyDownloadableProductPermissionDetails = async (
	page,
	productName
) => {
	await test.step( `Expect "${ productName }" to be added to the list of downloadable products.`, async () => {
		const pattern = `#\\d+ .* ${ productName } .* Downloaded \\d+ times`;
		const regex = new RegExp( pattern );
		const downloadableProduct = page.getByText( regex );

		await expect( downloadableProduct ).toBeVisible();
	} );

	await test.step( `Expect 'Downloads remaining' to be visible.`, async () => {
		const downloadsRemainingTextbox = page
			.getByRole( 'cell', { name: 'Downloads remaining' } )
			.getByPlaceholder( 'Unlimited' );

		await expect( downloadsRemainingTextbox ).toBeVisible();
	} );

	await test.step( `Expect 'Access expires' to be 'Never'.`, async () => {
		const accessExpiresTextbox = page
			.getByRole( 'cell', { name: 'Access expires' } )
			.getByPlaceholder( 'Never' );

		await expect( accessExpiresTextbox ).toBeVisible();
	} );

	await test.step( `Expect 'Revoke access' button to be visible.`, async () => {
		const revokeAccessButton = page
			.getByRole( 'heading', {
				name: productName,
			} )
			.getByRole( 'button', { name: 'Revoke access' } );

		await expect( revokeAccessButton ).toBeVisible();
	} );

	await test.step( `Expect 'Copy link' to be visible.`, async () => {
		await expect(
			page.getByRole( 'link', { name: 'Copy link' } )
		).toBeVisible();
	} );

	await test.step( `Expect 'View report' to be visible.`, async () => {
		await expect(
			page.getByRole( 'link', { name: 'View report' } )
		).toBeVisible();
	} );
};

test.describe( 'Edit order', () => {
	test.use( { storageState: process.env.ADMINSTATE } );

	let orderId;

	test.beforeAll( async ( { baseURL } ) => {
		const api = new wcApi( {
			url: baseURL,
			consumerKey: process.env.CONSUMER_KEY,
			consumerSecret: process.env.CONSUMER_SECRET,
			version: 'wc/v3',
		} );

		await test.step( `Create test order`, async () => {
			await api
				.post( 'orders', {
					status: 'processing',
				} )
				.then( ( response ) => {
					orderId = response.data.id;
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

		await test.step( `Delete test order.`, async () => {
			await api.delete( `orders/${ orderId }`, { force: true } );
		} );
	} );

	test( 'can view single order', async ( { page } ) => {
		await test.step( `Go to orders page`, async () => {
			await page.goto( 'wp-admin/edit.php?post_type=shop_order' );
		} );

		await test.step( `Confirm we're on the orders page`, async () => {
			await expect( page.locator( 'h1.components-text' ) ).toContainText(
				'Orders'
			);
		} );

		await test.step( `Open order we created`, async () => {
			await page.goto(
				`wp-admin/post.php?post=${ orderId }&action=edit`
			);
		} );

		await test.step( `Make sure we're on the order details page`, async () => {
			await expect(
				page.locator( 'h1.wp-heading-inline' )
			).toContainText( /Edit [oO]rder/ );
		} );
	} );

	test( 'can update order status', async ( { page } ) => {
		await test.step( `Open order we created`, async () => {
			await page.goto(
				`wp-admin/post.php?post=${ orderId }&action=edit`
			);
		} );

		await test.step( `Update order status to Completed`, async () => {
			await page
				.locator( '#order_status' )
				.selectOption( 'wc-completed' );
			await page.locator( 'button.save_order' ).click();
		} );

		await test.step( `Verify order status changed and note added`, async () => {
			await expect( page.locator( '#order_status' ) ).toHaveValue(
				'wc-completed'
			);
			await expect(
				page.locator(
					'#woocommerce-order-notes .note_content >> nth=0'
				)
			).toContainText(
				'Order status changed from Processing to Completed.'
			);
		} );
	} );

	test( 'can update order details', async ( { page } ) => {
		await test.step( `Open order we created`, async () => {
			await page.goto(
				`wp-admin/post.php?post=${ orderId }&action=edit`
			);
		} );

		await test.step( `Update order date`, async () => {
			await page.locator( 'input[name=order_date]' ).fill( '2018-12-14' );
			await page.locator( 'button.save_order' ).click();
		} );

		await test.step( `Verify changes`, async () => {
			await expect(
				page
					.locator( 'div.notice-success > p' )
					.filter( { hasText: 'Order updated.' } )
			).toBeVisible();
			await expect(
				page.locator( 'input[name=order_date]' )
			).toHaveValue( '2018-12-14' );
		} );
	} );
} );

test.describe( 'Edit order > Downloadable product permissions', () => {
	test.use( { storageState: process.env.ADMINSTATE } );

	const productName = 'TDP 001';
	const product2Name = 'TDP 002';
	const customerBilling = {
		email: 'john.doe@example.com',
	};

	let orderId,
		productId,
		product2Id,
		noProductOrderId,
		initialGrantAccessAfterPaymentSetting;

	/**
	 * Enable the "Grant access to downloadable products after payment" setting in WooCommerce > Settings > Products > Downloadable products.
	 */
	const enableGrantAccessAfterPaymentSetting = async ( api ) => {
		const endpoint =
			'settings/products/woocommerce_downloads_grant_access_after_payment';

		// Get current value
		const response = await api.get( endpoint );
		initialGrantAccessAfterPaymentSetting = response.data.value;

		// Enable
		if ( initialGrantAccessAfterPaymentSetting !== 'yes' ) {
			await api.put( endpoint, {
				value: 'yes',
			} );
		}
	};

	const revertGrantAccessAfterPaymentSetting = async ( api ) => {
		const endpoint =
			'settings/products/woocommerce_downloads_grant_access_after_payment';

		await api.put( endpoint, {
			value: initialGrantAccessAfterPaymentSetting,
		} );
	};

	test.beforeEach( async ( { baseURL } ) => {
		const api = new wcApi( {
			url: baseURL,
			consumerKey: process.env.CONSUMER_KEY,
			consumerSecret: process.env.CONSUMER_SECRET,
			version: 'wc/v3',
		} );

		await test.step( `Enable "Grant access after payment" setting.`, async () => {
			await enableGrantAccessAfterPaymentSetting( api );
		} );

		await test.step( `Create test products`, async () => {
			const payload_product1 = {
				name: productName,
				downloadable: true,
				download_limit: -1,
				downloads: [
					{
						id: uuid.v4(),
						name: 'Single',
						file: 'https://demo.woothemes.com/woocommerce/wp-content/uploads/sites/56/2017/08/single.jpg',
					},
				],
			};
			const payload_product2 = {
				name: product2Name,
				downloadable: true,
				download_limit: -1,
				downloads: [
					{
						id: uuid.v4(),
						name: 'Single',
						file: 'https://demo.woothemes.com/woocommerce/wp-content/uploads/sites/56/2017/08/single.jpg',
					},
				],
			};

			const createdProducts =
				await test.step( `Send request to batch create the test products`, async () => {
					const response = await api.post( 'products/batch', {
						create: [ payload_product1, payload_product2 ],
					} );
					return response.data.create;
				} );

			await test.step( `Save product id of product 1.`, async () => {
				productId = createdProducts.find(
					( { name } ) => name === productName
				).id;
			} );

			await test.step( `Save product id of product 2.`, async () => {
				product2Id = createdProducts.find(
					( { name } ) => name === product2Name
				).id;
			} );
		} );

		await test.step( `Create test order.`, async () => {
			const createdOrders =
				await test.step( `Send request to batch create the test orders.`, async () => {
					const payload_orderWithProduct = {
						status: 'processing',
						line_items: [
							{
								product_id: productId,
								quantity: 1,
							},
						],
						billing: customerBilling,
					};
					const payload_orderNoProduct = {
						status: 'processing',
						billing: customerBilling,
					};
					const response = await api.post( 'orders/batch', {
						create: [
							payload_orderWithProduct,
							payload_orderNoProduct,
						],
					} );

					return response.data.create;
				} );

			await test.step( `Save order id of order with product.`, async () => {
				orderId = createdOrders.find(
					( order ) => order.line_items.length > 0
				).id;
			} );

			await test.step( `Save order id of order with no product.`, async () => {
				noProductOrderId = createdOrders.find(
					( order ) => order.line_items.length === 0
				).id;
			} );
		} );
	} );

	test.afterEach( async ( { baseURL } ) => {
		const api = new wcApi( {
			url: baseURL,
			consumerKey: process.env.CONSUMER_KEY,
			consumerSecret: process.env.CONSUMER_SECRET,
			version: 'wc/v3',
		} );

		await test.step( `Clean up test products.`, async () => {
			await api.post( `products/batch`, {
				delete: [ productId, product2Id ],
			} );
		} );

		await test.step( `Clean up test order`, async () => {
			await api.post( `orders/batch`, {
				delete: [ orderId, noProductOrderId ],
			} );
		} );

		await revertGrantAccessAfterPaymentSetting( api );
	} );

	test( 'can add downloadable product permissions to order without product', async ( {
		page,
	} ) => {
		await test.step( `Go to the order with no products`, async () => {
			await page.goto(
				`wp-admin/post.php?post=${ noProductOrderId }&action=edit`
			);
		} );

		await addDownloadableProduct( page, productName );

		await verifyDownloadableProductPermissionDetails( page, productName );
	} );

	test( 'can add downloadable product permissions to order with product', async ( {
		page,
	} ) => {
		await test.step( `Open the order that already has a product assigned`, async () => {
			await page.goto(
				`wp-admin/post.php?post=${ orderId }&action=edit`
			);
		} );

		await addDownloadableProduct( page, product2Name );

		await verifyDownloadableProductPermissionDetails( page, product2Name );
	} );

	test( 'can edit downloadable product permissions', async ( { page } ) => {
		const expectedDownloadsRemaining = '10';
		const expectedDownloadsExpirationDate = '2050-01-01';

		await test.step( `Open the order that already has a product assigned`, async () => {
			await page.goto(
				`wp-admin/post.php?post=${ orderId }&action=edit`
			);
		} );

		await test.step( `Expand product download permissions`, async () => {
			await page
				.locator(
					'#woocommerce-order-downloads > div.inside > div > div.wc-metaboxes > div > h3 > strong'
				)
				.click();
		} );

		await test.step( `Enter "${ expectedDownloadsRemaining }" in the 'Downloads remaining' textbox.`, async () => {
			await page
				.locator(
					'#woocommerce-order-downloads > div.inside > div > div.wc-metaboxes > div > table > tbody > tr > td:nth-child(1) > input.short'
				)
				.fill( expectedDownloadsRemaining );
		} );

		await test.step( `Enter "${ expectedDownloadsExpirationDate }" in the 'Access expires' textbox.`, async () => {
			await page
				.locator(
					'#woocommerce-order-downloads > div.inside > div > div.wc-metaboxes > div > table > tbody > tr > td:nth-child(2) > input.short'
				)
				.fill( expectedDownloadsExpirationDate );
		} );

		await test.step( `Save changes to the order.`, async () => {
			await page.locator( 'button.save_order' ).click();
		} );

		await test.step( `Verify new downloadable product permissions were saved.`, async () => {
			await page
				.locator(
					'#woocommerce-order-downloads > div.inside > div > div.wc-metaboxes > div > h3 > strong'
				)
				.click();
			await expect(
				page.locator(
					'#woocommerce-order-downloads > div.inside > div > div.wc-metaboxes > div > table > tbody > tr > td:nth-child(1) > input.short'
				)
			).toHaveValue( expectedDownloadsRemaining );
			await expect(
				page.locator(
					'#woocommerce-order-downloads > div.inside > div > div.wc-metaboxes > div > table > tbody > tr > td:nth-child(2) > input.short'
				)
			).toHaveValue( expectedDownloadsExpirationDate );
		} );
	} );

	test( 'can revoke downloadable product permissions', async ( { page } ) => {
		await test.step( `Open the order that already has a product assigned`, async () => {
			await page.goto(
				`wp-admin/post.php?post=${ orderId }&action=edit`
			);
		} );

		await test.step( `Expand product download permissions`, async () => {
			await page
				.locator(
					'#woocommerce-order-downloads > div.inside > div > div.wc-metaboxes > div > h3 > strong'
				)
				.click();
		} );

		await test.step( `Verify prior state before revoking`, async () => {
			await expect(
				page.locator(
					'#woocommerce-order-downloads > div.inside > div > div.wc-metaboxes > div > h3 > strong'
				)
			).toHaveCount( 1 );
		} );

		await test.step( `Click revoke access`, async () => {
			page.on( 'dialog', ( dialog ) => dialog.accept() );
			await page.locator( 'button.revoke_access' ).click();
			await page.waitForLoadState( 'networkidle' );
		} );

		await test.step( `Verify permissions gone`, async () => {
			await expect(
				page.locator(
					'#woocommerce-order-downloads > div.inside > div > div.wc-metaboxes > div > h3 > strong'
				)
			).toHaveCount( 0 );
		} );
	} );

	test( 'should not allow downloading a product if download attempts are exceeded', async ( {
		page,
	} ) => {
		const expectedReason =
			'Sorry, you have reached your download limit for this file';

		await test.step( `Open the order that already has a product assigned`, async () => {
			await page.goto(
				`wp-admin/post.php?post=${ orderId }&action=edit`
			);
		} );

		await test.step( `Expand product download permissions`, async () => {
			await page
				.locator(
					'#woocommerce-order-downloads > div.inside > div > div.wc-metaboxes > div > h3 > strong'
				)
				.click();
		} );

		await test.step( `Set the download limit to 0`, async () => {
			await page
				.locator(
					'#woocommerce-order-downloads > div.inside > div > div.wc-metaboxes > div > table > tbody > tr > td:nth-child(1) > input.short'
				)
				.fill( '0' );
		} );

		await test.step( `Save changes to the order.`, async () => {
			await page.locator( 'button.save_order' ).click();
		} );

		const downloadPage =
			await test.step( `Get the download link`, async () => {
				await page
					.locator(
						'#woocommerce-order-downloads > div.inside > div > div.wc-metaboxes > div > h3 > strong'
					)
					.click();
				const link = await page
					.locator( 'a#copy-download-link' )
					.getAttribute( 'href' );
				return link;
			} );

		await test.step( `Open download page`, async () => {
			await page.goto( downloadPage );
		} );

		await test.step( `Expect message "${ expectedReason }" to be shown.`, async () => {
			await expect( page.getByText( expectedReason ) ).toBeVisible();
		} );
	} );

	test( 'should not allow downloading a product if expiration date has passed', async ( {
		page,
	} ) => {
		const expectedReason = 'Sorry, this download has expired';

		await test.step( `Open the order that already has a product assigned`, async () => {
			await page.goto(
				`wp-admin/post.php?post=${ orderId }&action=edit`
			);
		} );

		await test.step( `Expand product download permissions`, async () => {
			await page
				.locator(
					'#woocommerce-order-downloads > div.inside > div > div.wc-metaboxes > div > h3 > strong'
				)
				.click();
		} );

		await test.step( `Set a past expiry date.`, async () => {
			await page
				.locator(
					'#woocommerce-order-downloads > div.inside > div > div.wc-metaboxes > div > table > tbody > tr > td:nth-child(2) > input.short'
				)
				.fill( '2018-12-14' );
		} );

		await test.step( `Save changes to the order.`, async () => {
			await page.locator( 'button.save_order' ).click();
		} );

		const downloadPage =
			await test.step( `Get the download link`, async () => {
				await page
					.locator(
						'#woocommerce-order-downloads > div.inside > div > div.wc-metaboxes > div > h3 > strong'
					)
					.click();
				const link = await page
					.locator( 'a#copy-download-link' )
					.getAttribute( 'href' );
				return link;
			} );

		await test.step( `Open download page`, async () => {
			await page.goto( downloadPage );
		} );

		await test.step( `Expect "${ expectedReason }" to be shown.`, async () => {
			await expect( page.getByText( expectedReason ) ).toBeVisible();
		} );
	} );
} );
